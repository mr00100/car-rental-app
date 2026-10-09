import { NextRequest } from "next/server";
import { db } from "@/db";
import { bookings, vehicles, payments, rentalPrices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  getSession,
  requireAdmin,
  canManageBookings,
  isAdmin,
} from "@/lib/auth";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { isVehicleAvailableForDates } from "@/lib/availability";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    const { id } = await params;

    const isNumeric = /^\d+$/.test(id);
    const [row] = await db
      .select({
        booking: bookings,
        vehicleName: vehicles.name,
        vehicleType: vehicles.vehicleType,
        vehicleCover: vehicles.coverImage,
        vehicleSlug: vehicles.slug,
        vehicleBrand: vehicles.brand,
        vehicleColor: vehicles.color,
        vehicleYear: vehicles.modelYear,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .where(
        isNumeric
          ? eq(bookings.id, parseInt(id, 10))
          : eq(bookings.bookingId, id)
      )
      .limit(1);

    if (!row) return jsonError("Booking not found", 404);

    const isOwner = session && row.booking.userId === session.id;
    const isAdminUser = session && isAdmin(session.role);

    if (!isOwner && !isAdminUser) {
      // Allow public lookup by booking ID string for confirmation pages
      if (isNumeric) {
        return jsonError("Unauthorized", 403);
      }
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, row.booking.id))
      .limit(1);

    return jsonOk({
      ...row.booking,
      vehicle: {
        name: row.vehicleName,
        type: row.vehicleType,
        coverImage: row.vehicleCover,
        slug: row.vehicleSlug,
        brand: row.vehicleBrand,
        color: row.vehicleColor,
        modelYear: row.vehicleYear,
      },
      payment: payment || null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return jsonError("Authentication required", 401);

    const { id } = await params;
    const body = await req.json();
    const bookingId = parseInt(id, 10);

    const [existing] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!existing) return jsonError("Booking not found", 404);

    const isAdminUser = isAdmin(session.role);
    const isOwner = existing.userId === session.id;

    // Customer cancel
    if (body.status === "cancelled" && isOwner && !isAdminUser) {
      if (!["pending", "payment_pending", "payment_submitted"].includes(existing.status)) {
        return jsonError("This booking cannot be cancelled", 400);
      }

      const [updated] = await db
        .update(bookings)
        .set({
          status: "cancelled",
          cancellationReason: body.cancellationReason || "Cancelled by customer",
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      await notifyAdmins({
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Booking ${existing.bookingId} cancelled by customer`,
        link: `/admin/bookings/${bookingId}`,
      });

      return jsonOk(updated);
    }

    if (!isAdminUser || !canManageBookings(session.role)) {
      return jsonError("Forbidden", 403);
    }

    const admin = await requireAdmin();
    const isBulkRequest = typeof existing.notes === "string" && existing.notes.startsWith("Bulk booking");
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status) {
      const validStatuses = [
        "pending",
        "payment_pending",
        "payment_submitted",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "rejected",
      ];
      if (!validStatuses.includes(body.status)) {
        return jsonError("Invalid status", 400);
      }

      // Prevent overlapping when confirming
      if (["confirmed", "active"].includes(body.status) && !isBulkRequest) {
        const avail = await isVehicleAvailableForDates(
          existing.vehicleId,
          existing.pickupDate,
          existing.returnDate,
          existing.id
        );
        if (!avail.available) {
          return jsonError(
            avail.reason || "Vehicle not available for these dates",
            409
          );
        }
      }

      updates.status = body.status;
    }

    if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes;
    if (body.cancellationReason !== undefined)
      updates.cancellationReason = body.cancellationReason;

    const [updated] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, bookingId))
      .returning();

    // Update vehicle availability based on status
    if ((body.status === "confirmed" || body.status === "active") && !isBulkRequest) {
      await db
        .update(vehicles)
        .set({
          availability: body.status === "active" ? "rented" : "reserved",
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, existing.vehicleId));
    } else if (["completed", "cancelled", "rejected"].includes(body.status) && !isBulkRequest) {
      await db
        .update(vehicles)
        .set({ availability: "available", updatedAt: new Date() })
        .where(eq(vehicles.id, existing.vehicleId));
    }

    if (existing.userId && body.status) {
      const statusMessages: Record<string, { type: "booking_confirmed" | "booking_rejected" | "booking_cancelled"; title: string }> = {
        confirmed: { type: "booking_confirmed", title: "Booking Confirmed" },
        rejected: { type: "booking_rejected", title: "Booking Rejected" },
        cancelled: { type: "booking_cancelled", title: "Booking Cancelled" },
        active: { type: "booking_confirmed", title: "Rental Active" },
        completed: { type: "booking_confirmed", title: "Rental Completed" },
      };
      const msg = statusMessages[body.status];
      if (msg) {
        await createNotification({
          userId: existing.userId,
          type: msg.type,
          title: msg.title,
          message: `Your booking ${existing.bookingId} is now ${body.status}.`,
          link: `/bookings/${existing.bookingId}`,
        });
      }
    }

    await logAudit({
      admin,
      action: `Changed booking status to ${body.status || "updated"}`,
      targetType: "booking",
      targetId: existing.bookingId,
      previousValue: { status: existing.status },
      newValue: updates,
    });

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
