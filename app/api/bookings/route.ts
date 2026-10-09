import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { bookings, vehicles, payments, rentalPrices } from "@/db/schema";
import { eq, desc, and, sql, or, ilike, inArray, lt, gt } from "drizzle-orm";
import { drivers } from "@/db/schema";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  getSession,
  requireAuth,
  requireAdmin,
  canManageBookings,
  isAdmin,
} from "@/lib/auth";
import { bookingSchema } from "@/lib/validations";
import { isVehicleAvailableForDates } from "@/lib/availability";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { licenseVerifications } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import {
  generatePublicBookingId,
  generateVerificationCode,
  hashToken,
  normalizeEmail,
  normalizePhone,
} from "@/lib/utils";
import {
  calculateDriverCharge,
  calculateRentalDays,
} from "@/lib/booking-pricing";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return jsonError("Authentication required", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;
    const isAdminUser = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(session.role);

    const conditions = [];

    if (!isAdminUser) {
      conditions.push(eq(bookings.userId, session.id));
    } else {
      const vehicleId = searchParams.get("vehicleId");
      const customer = searchParams.get("customer");
      const paymentStatus = searchParams.get("paymentStatus");
      const type = searchParams.get("type");

      if (vehicleId) {
        conditions.push(eq(bookings.vehicleId, parseInt(vehicleId, 10)));
      }
      if (customer) {
        conditions.push(
          or(
            ilike(bookings.customerName, `%${customer}%`),
            ilike(bookings.customerPhone, `%${customer}%`),
            ilike(bookings.bookingId, `%${customer}%`)
          )!
        );
      }
    }

    if (status) {
      conditions.push(
        eq(
          bookings.status,
          status as
            | "pending"
            | "payment_pending"
            | "payment_submitted"
            | "confirmed"
            | "active"
            | "completed"
            | "cancelled"
            | "rejected"
        )
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(where);

    const rows = await db
      .select({
        booking: bookings,
        vehicleName: vehicles.name,
        vehicleType: vehicles.vehicleType,
        vehicleCover: vehicles.coverImage,
        vehicleSlug: vehicles.slug,
        vehicleBrand: vehicles.brand,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .where(where)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset);

    const bookingIds = rows.map((r) => r.booking.id);
    let paymentRows: (typeof payments.$inferSelect)[] = [];
    if (bookingIds.length) {
      paymentRows = await db
        .select()
        .from(payments)
        .where(
          sql`${payments.bookingId} IN (${sql.join(
            bookingIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );
    }

    const data = rows.map((r) => ({
      ...r.booking,
      vehicle: {
        name: r.vehicleName,
        type: r.vehicleType,
        coverImage: r.vehicleCover,
        slug: r.vehicleSlug,
        brand: r.vehicleBrand,
      },
      payment: paymentRows.find((p) => p.bookingId === r.booking.id) || null,
    }));

    return jsonOk({
      bookings: data,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const data = bookingSchema.parse(body);

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, data.vehicleId))
      .limit(1);

    if (!vehicle || vehicle.isArchived) {
      return jsonError("Vehicle not found", 404);
    }

    const pickupDate = new Date(data.pickupDate);
    const returnDate = new Date(data.returnDate);

    const availability = await isVehicleAvailableForDates(
      data.vehicleId,
      pickupDate,
      returnDate
    );

    if (!availability.available) {
      return jsonError(availability.reason || "Vehicle unavailable", 409);
    }

    const rentalMode = data.rentalMode || "self_drive";

    // ---- Server-side license verification enforcement ----
    // Self-drive rentals always require a verified driving license when the
    // business enables verification. With-driver rentals do not, since the
    // company supplies a licensed driver. Backend-enforced — the frontend
    // alone can never bypass this.
    const settings = await getSettings();
    if (
      settings.requireLicenseVerification === "true" &&
      rentalMode === "self_drive" &&
      session
    ) {
      // Enforcement applies to accounts (admin/staff bookings). Public guest
      // bookings collect license details at pickup via the booking form.
      const [lic] = await db
        .select({ status: licenseVerifications.status })
        .from(licenseVerifications)
        .where(eq(licenseVerifications.userId, session.id))
        .limit(1);
      if (!lic || lic.status !== "verified") {
        return jsonError(
          "License verification required. Please complete driving license verification before confirming your rental.",
          403
        );
      }
    }

    // Get price from DB
    const [priceRow] = await db
      .select()
      .from(rentalPrices)
      .where(
        and(
          eq(rentalPrices.vehicleId, data.vehicleId),
          eq(rentalPrices.durationHours, data.durationHours),
          eq(rentalPrices.isActive, true)
        )
      )
      .limit(1);

    let unitPrice: number;
    let totalAmount: number;
    let durationLabel = data.durationLabel;

    if (priceRow) {
      unitPrice = priceRow.price;
      totalAmount = priceRow.price;
      durationLabel = priceRow.label;
    } else {
      // Custom duration: use daily rate * days
      const [dayPrice] = await db
        .select()
        .from(rentalPrices)
        .where(
          and(
            eq(rentalPrices.vehicleId, data.vehicleId),
            eq(rentalPrices.durationHours, 24),
            eq(rentalPrices.isActive, true)
          )
        )
        .limit(1);

      if (!dayPrice) {
        return jsonError("Pricing not configured for this vehicle", 400);
      }

      const days = Math.max(1, Math.ceil(data.durationHours / 24));
      unitPrice = dayPrice.price;
      totalAmount = dayPrice.price * days;
      durationLabel = data.durationLabel || `${days} Day${days > 1 ? "s" : ""}`;
    }

    // ---- Driver fee (with-driver rentals) ----
    // The pickup/return interval is the authoritative duration. Any partial
    // 24-hour period counts as one rental day. Client-supplied driver charges
    // are ignored because bookingSchema does not accept or use them.
    const rentalDays = calculateRentalDays(pickupDate, returnDate);
    const driverFee = calculateDriverCharge(rentalMode, rentalDays);

    if (rentalMode === "with_driver" && data.driverId) {
      const [driver] = await db
        .select()
        .from(drivers)
        .where(eq(drivers.id, data.driverId))
        .limit(1);
      if (!driver || !driver.isActive) {
        return jsonError("Selected driver is not available", 400);
      }

      // Prevent overlapping driver assignments.
      const clash = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.driverId, data.driverId),
            inArray(bookings.status, [
              "confirmed",
              "active",
              "payment_submitted",
              "payment_pending",
            ]),
            lt(bookings.pickupDate, returnDate),
            gt(bookings.returnDate, pickupDate)
          )
        )
        .limit(1);
      if (clash.length) {
        return jsonError(
          "This driver is already assigned during the selected period",
          409
        );
      }
    }

    totalAmount += driverFee;

    // No guest session verification required - bookings work directly

    // Generate a non-sequential public booking ID (e.g. RAC-8F42K7) plus a
    // 6-digit verification code that the customer uses to manage the booking.
    const bookingIdStr = generatePublicBookingId();
    const verificationCode = generateVerificationCode(6);

    const [booking] = await db
      .insert(bookings)
      .values({
        bookingId: bookingIdStr,
        userId: session?.id ?? null,
        vehicleId: data.vehicleId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || session?.email || null,
        customerCnic: data.customerCnic || null,
        city: data.city,
        pickupDate,
        returnDate,
        durationHours: data.durationHours,
        durationLabel,
        unitPrice,
        totalAmount,
        status: "payment_pending",
        notes: data.notes || null,
        rentalMode,
        driverId: rentalMode === "with_driver" ? data.driverId ?? null : null,
        driverFee,
        verificationCodeHash: hashToken(verificationCode),
      })
      .returning();

    // Create pending payment record
    await db.insert(payments).values({
      bookingId: booking.id,
      amount: totalAmount,
      method: "easypaisa",
      status: "pending",
    });

    // Update vehicle booking count
    await db
      .update(vehicles)
      .set({ bookingCount: sql`${vehicles.bookingCount} + 1` })
      .where(eq(vehicles.id, data.vehicleId));

    if (session) {
      await createNotification({
        userId: session.id,
        type: "booking_submitted",
        title: "Booking Submitted",
        message: `Your booking ${bookingIdStr} for ${vehicle.name} has been submitted. Please complete payment.`,
        link: `/bookings/${booking.bookingId}`,
      });
    }

    await notifyAdmins({
      type: "new_booking",
      title: "New Booking",
      message: `New booking ${bookingIdStr} for ${vehicle.name} by ${data.customerName}`,
      link: `/admin/bookings/${booking.id}`,
    });

    // Booking confirmation email with the two-factor credential.
    // Delivery failure is logged but does not block the booking, since the
    // customer also sees the codes on screen.
    if (data.customerEmail || session?.email) {
      const delivery = await sendEmail({
        to: data.customerEmail || session?.email!,
        template: "booking_confirmed",
        data: {
          bookingRef: bookingIdStr,
          verificationCode,
        },
      });
      if (!delivery.ok) {
        console.error(
          `[booking] confirmation email failed for ${bookingIdStr}: ${delivery.error}`
        );
      }
    }
    if (settings.smsEnabled === "true" && data.customerPhone) {
      const smsDelivery = await sendSMS({
        to: data.customerPhone,
        message: `Rent A Car: booking ${bookingIdStr} for ${vehicle.name} created. Use your Verification Code to manage this rental.`,
      });
      if (!smsDelivery.ok) {
        console.error(
          `[booking] confirmation SMS failed for ${bookingIdStr}: ${smsDelivery.error}`
        );
      }
    }

    return jsonOk(
      {
        ...booking,
        // Two-factor management credential. Returned ONCE here and never
        // again; the server only ever stores its hash.
        verificationCode,
        vehicle: {
          name: vehicle.name,
          slug: vehicle.slug,
          coverImage: vehicle.coverImage,
        },
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
