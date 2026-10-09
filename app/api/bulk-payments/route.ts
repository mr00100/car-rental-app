import { NextRequest } from "next/server";
import { db } from "@/db";
import { bookings, payments } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { paymentSubmitSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const ids = Array.from(new Set(Array.isArray(body.bookingDbIds) ? body.bookingDbIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0) : []));
    if (ids.length < 1) return jsonError("Invalid bulk booking", 400);
    const parsed = paymentSubmitSchema.omit({ bookingId: true }).parse({ transactionId: body.transactionId, senderPhone: body.senderPhone, amount: Number(body.amount), screenshotUrl: body.screenshotUrl, paymentDate: body.paymentDate, notes: body.notes });
    const rows = await db.select({ booking: bookings, payment: payments }).from(bookings).leftJoin(payments, eq(payments.bookingId, bookings.id)).where(and(inArray(bookings.id, ids), eq(bookings.userId, session.id)));
    if (rows.length !== ids.length) return jsonError("One or more bookings could not be found", 404);
    const expectedTotal = rows.reduce((sum, row) => sum + row.booking.totalAmount, 0);
    if (parsed.amount !== expectedTotal) return jsonError(`Amount must match the combined booking total (Rs. ${expectedTotal})`, 400);
    const submittedAt = parsed.paymentDate ? new Date(parsed.paymentDate) : new Date();

    await db.transaction(async (tx) => {
      for (const row of rows) {
        if (!["pending", "payment_pending", "payment_submitted"].includes(row.booking.status)) throw new Error(`Payment cannot be submitted for ${row.booking.bookingId}`);
        const values = { transactionId: parsed.transactionId, senderPhone: parsed.senderPhone, amount: row.booking.totalAmount, screenshotUrl: parsed.screenshotUrl || null, paymentDate: submittedAt, notes: parsed.notes || "Combined bulk payment", status: "submitted" as const, updatedAt: new Date() };
        if (row.payment) await tx.update(payments).set(values).where(eq(payments.id, row.payment.id));
        else await tx.insert(payments).values({ bookingId: row.booking.id, ...values, method: "easypaisa" });
        await tx.update(bookings).set({ status: "payment_submitted", updatedAt: new Date() }).where(eq(bookings.id, row.booking.id));
      }
    });

    await createNotification({ userId: session.id, type: "payment_submitted", title: "Bulk Payment Submitted", message: `Your combined payment for ${rows.length} bookings has been submitted for verification.`, link: "/dashboard" });
    await notifyAdmins({ type: "new_payment", title: "Bulk Payment Awaiting Verification", message: `Combined payment of Rs. ${expectedTotal} submitted for ${rows.length} bookings. TXN: ${parsed.transactionId}`, link: "/admin/payments" });
    return jsonOk({ bookingRefs: rows.map(r => r.booking.bookingId), totalAmount: expectedTotal, status: "submitted" }, 201);
  } catch (err) { return handleApiError(err); }
}
