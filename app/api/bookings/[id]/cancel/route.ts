import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  bookings,
  vehicles,
  payments,
  cancellations,
  refunds,
} from "@/db/schema";
import { eq, and, inArray, ne } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getSession, isAdmin } from "@/lib/auth";
import { quoteCancellation } from "@/services/cancellation";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { sendEmail, sendSMS } from "@/services/notifications";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

async function loadBooking(idOrRef: string) {
  const isNumeric = /^\d+$/.test(idOrRef);
  const [row] = await db
    .select()
    .from(bookings)
    .where(
      isNumeric
        ? eq(bookings.id, parseInt(idOrRef, 10))
        : eq(bookings.bookingId, idOrRef)
    )
    .limit(1);
  return row;
}

// Authorize a cancellation: admin, the owning account, OR a guest who
// can prove the booking with a 2-factor credential (contact OR verification
// code).
async function authorize(
  session: Awaited<ReturnType<typeof getSession>>,
  booking: NonNullable<Awaited<ReturnType<typeof loadBooking>>>,
  contact?: string | null,
  verificationCode?: string | null
): Promise<boolean> {
  if (session && isAdmin(session.role)) return true;
  if (session && booking.userId === session.id) return true;
  // Guest: contact OR verification code (matching the manage-booking flow).
  if (contact) {
    const c = contact.toLowerCase().trim();
    const phone = (booking.customerPhone || "").toLowerCase().trim();
    const email = (booking.customerEmail || "").toLowerCase().trim();
    if (phone === c || email === c || phone.includes(c)) return true;
  }
  if (verificationCode && booking.verificationCodeHash) {
    const { safeEqual, hashToken } = await import("@/lib/utils");
    if (safeEqual(hashToken(verificationCode), booking.verificationCodeHash)) {
      return true;
    }
  }
  return false;
}

/** Preview the cancellation outcome — server-authoritative, no mutation. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    const { id } = await params;
    const sp = new URL(req.url).searchParams;
    const contact = sp.get("contact");
    const verificationCode = sp.get("verificationCode");

    const booking = await loadBooking(id);
    if (!booking) return jsonError("Booking not found", 404);

    if (!(await authorize(session, booking, contact, verificationCode))) {
      return jsonError("You are not allowed to cancel this booking", 403);
    }

    const quote = await quoteCancellation({
      pickupDate: booking.pickupDate,
      originalAmount: booking.totalAmount,
      bookingStatus: booking.status,
    });

    return jsonOk({
      bookingRef: booking.bookingId,
      status: booking.status,
      rentalMode: booking.rentalMode,
      ...quote,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Perform the cancellation atomically. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const booking = await loadBooking(id);
    if (!booking) return jsonError("Booking not found", 404);

    const adminUser = Boolean(session && isAdmin(session.role));

    // Authorize: admin, the owning account, or a guest who proves the
    // booking with a 2-factor credential (contact OR verification code).
    if (
      !(await authorize(
        session,
        booking,
        body.contact ?? null,
        body.verificationCode ?? null
      ))
    ) {
      return jsonError("You are not allowed to cancel this booking", 403);
    }

    // Server-authoritative recalculation (never trust client figures).
    const quote = await quoteCancellation({
      pickupDate: booking.pickupDate,
      originalAmount: booking.totalAmount,
      bookingStatus: booking.status,
    });

    if (!quote.allowed) {
      return jsonError(quote.blockedReason || "Cancellation not allowed", 400);
    }

    // Guard against double-cancellation races.
    const existingCancellation = await db
      .select({ id: cancellations.id })
      .from(cancellations)
      .where(eq(cancellations.bookingId, booking.id))
      .limit(1);
    if (existingCancellation.length) {
      return jsonError("This booking has already been cancelled.", 409);
    }

    const settings = await getSettings();
    const reason =
      (body.cancellationReason as string) ||
      (adminUser ? "Cancelled by admin" : "Cancelled by customer");

    // Was the money actually captured? Only then is a refund owed.
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .limit(1);
    const wasPaid = payment?.status === "verified";

    // ---- Atomic: booking + cancellation + refund + vehicle/driver release ----
    const result = await db.transaction(async (tx) => {
      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          status: "cancelled",
          cancellationReason: reason,
          driverId: null, // release any assigned driver
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      const [cancellation] = await tx
        .insert(cancellations)
        .values({
          bookingId: booking.id,
          originalAmount: quote.originalAmount,
          cancellationDeadline: new Date(quote.cancellationDeadline),
          cancelledAt: new Date(quote.serverTime),
          cancellationType: quote.cancellationType,
          deductionPercentage: quote.deductionPercentage,
          deductionAmount: quote.deductionAmount,
          refundAmount: quote.refundAmount,
          refundStatus: wasPaid ? "pending" : "not_applicable",
          cancellationReason: reason,
          cancelledByUserId: session?.id ?? null,
        })
        .returning();

      let refundRow = null;
      if (wasPaid && quote.refundAmount > 0) {
        // Refund is NEVER auto-marked as completed. A real gateway
        // confirmation or an admin action is required.
        [refundRow] = await tx
          .insert(refunds)
          .values({
            bookingId: booking.id,
            paymentId: payment?.id ?? null,
            cancellationId: cancellation.id,
            originalAmount: quote.originalAmount,
            deductionAmount: quote.deductionAmount,
            refundAmount: quote.refundAmount,
            refundStatus: "pending",
            provider: payment?.method ?? settings.paymentProvider,
          })
          .returning();
      }

      // Release the vehicle only if no other active booking holds it.
      const blocking = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.vehicleId, booking.vehicleId),
            ne(bookings.id, booking.id),
            inArray(bookings.status, [
              "confirmed",
              "active",
              "payment_submitted",
              "payment_pending",
            ])
          )
        )
        .limit(1);

      if (blocking.length === 0) {
        await tx
          .update(vehicles)
          .set({ availability: "available", updatedAt: new Date() })
          .where(eq(vehicles.id, booking.vehicleId));
      }

      return { updatedBooking, cancellation, refundRow };
    });

    // ---- Notifications (outside the transaction) ----
    const amountLine = `Original ${formatCurrency(quote.originalAmount)} · Deduction ${formatCurrency(
      quote.deductionAmount
    )} · Refund ${formatCurrency(quote.refundAmount)}`;

    const customerMessage = quote.isLate
      ? `${quote.message} ${amountLine}`
      : `Your booking was cancelled with a full refund. ${amountLine}`;

    if (booking.userId) {
      await createNotification({
        userId: booking.userId,
        type: "booking_cancelled",
        title: quote.isLate ? "Booking Cancelled — Late" : "Booking Cancelled",
        message: customerMessage,
        link: `/bookings/${booking.bookingId}/cancellation`,
      });
    }

    if (settings.emailEnabled === "true" && booking.customerEmail) {
      await sendEmail({
        to: booking.customerEmail,
        subject: `Booking ${booking.bookingId} cancelled`,
        template: "booking_cancelled",
        data: { bookingRef: booking.bookingId },
      });
    }
    if (settings.smsEnabled === "true") {
      await sendSMS({
        to: booking.customerPhone,
        message: `Rent A Car: ${booking.bookingId} cancelled. ${
          quote.isLate ? LATE_SMS : "Full refund"
        } Refund ${formatCurrency(quote.refundAmount)}.`,
      });
    }

    await notifyAdmins({
      type: "booking_cancelled",
      title: quote.isLate ? "Late Cancellation" : "Booking Cancelled",
      message: `${booking.bookingId} cancelled. ${amountLine}`,
      link: `/admin/cancellations`,
    });

    await logAudit({
      admin: adminUser && session ? session : null,
      action: `Booking cancelled (${quote.cancellationType})`,
      targetType: "booking",
      targetId: booking.bookingId,
      previousValue: { status: booking.status },
      newValue: {
        status: "cancelled",
        deductionPercentage: quote.deductionPercentage,
        deductionAmount: quote.deductionAmount,
        refundAmount: quote.refundAmount,
      },
    });

    return jsonOk({
      bookingRef: booking.bookingId,
      cancellationType: quote.cancellationType,
      isLate: quote.isLate,
      message: quote.message,
      originalAmount: quote.originalAmount,
      deductionPercentage: quote.deductionPercentage,
      deductionAmount: quote.deductionAmount,
      refundAmount: quote.refundAmount,
      refundStatus: result.refundRow?.refundStatus ?? "not_applicable",
      cancellationDeadline: quote.cancellationDeadline,
      cancelledAt: quote.serverTime,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const LATE_SMS = "Your 10% of payment will be conserved.";
