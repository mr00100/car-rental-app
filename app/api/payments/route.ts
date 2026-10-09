import { NextRequest } from "next/server";
import { db } from "@/db";
import { payments, bookings, vehicles } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  getSession,
  requireAdmin,
  canManagePayments,
  isAdmin,
} from "@/lib/auth";
import { paymentSubmitSchema } from "@/lib/validations";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManagePayments(admin.role) && admin.role !== "STAFF") {
      return jsonError("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) {
      conditions.push(
        eq(
          payments.status,
          status as "pending" | "submitted" | "verified" | "rejected" | "refunded"
        )
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(where);

    const rows = await db
      .select({
        payment: payments,
        bookingIdStr: bookings.bookingId,
        customerName: bookings.customerName,
        customerPhone: bookings.customerPhone,
        vehicleName: vehicles.name,
        totalAmount: bookings.totalAmount,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonOk({
      payments: rows.map((r) => ({
        ...r.payment,
        bookingRef: r.bookingIdStr,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        vehicleName: r.vehicleName,
        bookingAmount: r.totalAmount,
      })),
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
    const data = paymentSubmitSchema.parse(body);

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) return jsonError("Booking not found", 404);

    if (
      !["pending", "payment_pending", "payment_submitted"].includes(
        booking.status
      )
    ) {
      return jsonError("Payment cannot be submitted for this booking", 400);
    }

    // Verify amount matches
    if (data.amount !== booking.totalAmount) {
      return jsonError(
        `Amount must match booking total (Rs. ${booking.totalAmount})`,
        400
      );
    }

    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .limit(1);

    let payment;
    if (existingPayment) {
      [payment] = await db
        .update(payments)
        .set({
          transactionId: data.transactionId,
          senderPhone: data.senderPhone,
          amount: data.amount,
          screenshotUrl: data.screenshotUrl || null,
          paymentDate: data.paymentDate
            ? new Date(data.paymentDate)
            : new Date(),
          notes: data.notes || null,
          status: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existingPayment.id))
        .returning();
    } else {
      [payment] = await db
        .insert(payments)
        .values({
          bookingId: booking.id,
          amount: data.amount,
          method: "easypaisa",
          status: "submitted",
          transactionId: data.transactionId,
          senderPhone: data.senderPhone,
          screenshotUrl: data.screenshotUrl || null,
          paymentDate: data.paymentDate
            ? new Date(data.paymentDate)
            : new Date(),
          notes: data.notes || null,
        })
        .returning();
    }

    await db
      .update(bookings)
      .set({ status: "payment_submitted", updatedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    if (session || booking.userId) {
      await createNotification({
        userId: booking.userId || session?.id,
        type: "payment_submitted",
        title: "Payment Submitted",
        message: `Payment for booking ${booking.bookingId} has been submitted and is awaiting verification.`,
        link: `/bookings/${booking.bookingId}`,
      });
    }

    await notifyAdmins({
      type: "new_payment",
      title: "Payment Awaiting Verification",
      message: `Payment of Rs. ${data.amount} for ${booking.bookingId} needs verification. TXN: ${data.transactionId}`,
      link: `/admin/payments`,
    });

    return jsonOk(payment, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
