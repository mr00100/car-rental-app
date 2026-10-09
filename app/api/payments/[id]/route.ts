import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, bookings, vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManagePayments } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { isVehicleAvailableForDates } from "@/lib/availability";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!canManagePayments(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const paymentId = parseInt(id, 10);
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!existing) return jsonError("Payment not found", 404);

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, existing.bookingId))
      .limit(1);

    if (!booking) return jsonError("Associated booking not found", 404);

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status === "verified") {
      // Check availability before confirming
      const avail = await isVehicleAvailableForDates(
        booking.vehicleId,
        booking.pickupDate,
        booking.returnDate,
        booking.id
      );
      if (!avail.available) {
        return jsonError(
          `Cannot verify: ${avail.reason}. Resolve scheduling conflict first.`,
          409
        );
      }

      updates.status = "verified";
      updates.verifiedAt = new Date();
      updates.verifiedBy = admin.id;
      if (body.notes) updates.notes = body.notes;

      await db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, paymentId));

      await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));

      await db
        .update(vehicles)
        .set({ availability: "reserved", updatedAt: new Date() })
        .where(eq(vehicles.id, booking.vehicleId));

      if (booking.userId) {
        await createNotification({
          userId: booking.userId,
          type: "payment_verified",
          title: "Payment Verified",
          message: `Your payment for booking ${booking.bookingId} has been verified. Booking is confirmed!`,
          link: `/bookings/${booking.bookingId}`,
        });
        await createNotification({
          userId: booking.userId,
          type: "booking_confirmed",
          title: "Booking Confirmed",
          message: `Booking ${booking.bookingId} is confirmed. See you at pickup!`,
          link: `/bookings/${booking.bookingId}`,
        });
      }

      await logAudit({
        admin,
        action: "Verified payment",
        targetType: "payment",
        targetId: paymentId,
        previousValue: { status: existing.status },
        newValue: { status: "verified", bookingStatus: "confirmed" },
      });
    } else if (body.status === "rejected") {
      updates.status = "rejected";
      updates.rejectionReason = body.rejectionReason || "Payment rejected";
      if (body.notes) updates.notes = body.notes;

      await db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, paymentId));

      await db
        .update(bookings)
        .set({ status: "payment_pending", updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));

      if (booking.userId) {
        await createNotification({
          userId: booking.userId,
          type: "booking_rejected",
          title: "Payment Rejected",
          message: `Payment for ${booking.bookingId} was rejected. ${body.rejectionReason || "Please resubmit with correct details."}`,
          link: `/bookings/${booking.bookingId}`,
        });
      }

      await logAudit({
        admin,
        action: "Rejected payment",
        targetType: "payment",
        targetId: paymentId,
        previousValue: { status: existing.status },
        newValue: { status: "rejected", reason: body.rejectionReason },
      });
    } else if (body.status === "refunded") {
      updates.status = "refunded";
      if (body.notes) updates.notes = body.notes;

      await db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, paymentId));

      await logAudit({
        admin,
        action: "Refunded payment",
        targetType: "payment",
        targetId: paymentId,
        previousValue: { status: existing.status },
        newValue: { status: "refunded" },
      });
    } else if (body.notes !== undefined) {
      await db
        .update(payments)
        .set({ notes: body.notes, updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
    } else {
      return jsonError("Invalid action", 400);
    }

    const [updated] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
