import { NextRequest } from "next/server";
import { db } from "@/db";
import { cancellations, refunds, bookings, vehicles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManagePayments } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        cancellation: cancellations,
        bookingRef: bookings.bookingId,
        customerName: bookings.customerName,
        customerPhone: bookings.customerPhone,
        pickupDate: bookings.pickupDate,
        userId: bookings.userId,
        vehicleName: vehicles.name,
      })
      .from(cancellations)
      .leftJoin(bookings, eq(cancellations.bookingId, bookings.id))
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .orderBy(desc(cancellations.cancelledAt));

    const refundRows = await db.select().from(refunds);

    return jsonOk(
      rows.map((r) => ({
        ...r.cancellation,
        bookingRef: r.bookingRef,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        pickupDate: r.pickupDate,
        vehicleName: r.vehicleName,
        refund:
          refundRows.find((f) => f.bookingId === r.cancellation.bookingId) ||
          null,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/** Admin updates refund progress. Never auto-completes without action. */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManagePayments(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const { cancellationId, refundStatus, gatewayReference, failureReason } =
      body as {
        cancellationId: number;
        refundStatus:
          | "pending"
          | "processing"
          | "refunded"
          | "failed"
          | "manual_required";
        gatewayReference?: string;
        failureReason?: string;
      };

    const valid = [
      "pending",
      "processing",
      "refunded",
      "failed",
      "manual_required",
    ];
    if (!valid.includes(refundStatus)) {
      return jsonError("Invalid refund status", 400);
    }

    const [cancellation] = await db
      .select()
      .from(cancellations)
      .where(eq(cancellations.id, cancellationId))
      .limit(1);
    if (!cancellation) return jsonError("Cancellation not found", 404);

    await db
      .update(cancellations)
      .set({ refundStatus })
      .where(eq(cancellations.id, cancellationId));

    await db
      .update(refunds)
      .set({
        refundStatus,
        gatewayReference: gatewayReference ?? null,
        failureReason: failureReason ?? null,
        completedAt: refundStatus === "refunded" ? new Date() : null,
        processedBy: admin.id,
      })
      .where(eq(refunds.bookingId, cancellation.bookingId));

    const [booking] = await db
      .select({ userId: bookings.userId, ref: bookings.bookingId })
      .from(bookings)
      .where(eq(bookings.id, cancellation.bookingId))
      .limit(1);

    if (booking?.userId) {
      await createNotification({
        userId: booking.userId,
        type: "system",
        title: `Refund ${refundStatus.replace("_", " ")}`,
        message: `Refund for booking ${booking.ref} is now ${refundStatus.replace(
          "_",
          " "
        )}.`,
        link: `/bookings/${booking.ref}/cancellation`,
      });
    }

    await logAudit({
      admin,
      action: `Refund marked ${refundStatus}`,
      targetType: "refund",
      targetId: cancellation.bookingId,
      previousValue: { refundStatus: cancellation.refundStatus },
      newValue: { refundStatus, gatewayReference },
    });

    return jsonOk({ refundStatus });
  } catch (err) {
    return handleApiError(err);
  }
}
