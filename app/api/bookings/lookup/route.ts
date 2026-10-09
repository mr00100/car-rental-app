import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, handleApiError, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { bookings, vehicles, payments, cancellations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, hashToken, safeEqual } from "@/lib/utils";

// Find a booking using booking ID + verification code (for guest access)
async function findBookingForGuest(bookingId: string, verificationCode: string) {
  const codeHash = hashToken(verificationCode);
  const [row] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingId, bookingId.toUpperCase()))
    .limit(1);
  
  if (!row) return null;
  if (!row.verificationCodeHash) return null;
  if (!safeEqual(row.verificationCodeHash, codeHash)) return null;
  
  return row;
}

// Two-factor lookup. Never differentiate "not found" vs "wrong code" — that
// would let an attacker enumerate booking IDs.
const schema = z.object({
  bookingId: z
    .string()
    .trim()
    .regex(/^RAC-[A-Z0-9]{5,8}$/i, "Enter a valid booking reference"),
  verificationCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.safeParse(body);
    if (!data.success) {
      // Generic message — do not reveal which field failed.
      return jsonError("Unable to verify booking details.", 400);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipRate = checkRateLimit(`lookup:ip:${ip}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipRate.allowed) {
      return jsonError(
        `Too many lookup attempts. Try again in ${ipRate.retryAfterSec}s.`,
        429
      );
    }
    const idRate = checkRateLimit(`lookup:id:${data.data.bookingId.toUpperCase()}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!idRate.allowed) {
      return jsonError("Too many attempts. Try again later.", 429);
    }

    const booking = await findBookingForGuest(
      data.data.bookingId,
      data.data.verificationCode
    );

    if (!booking) {
      // Same generic response to prevent enumeration.
      return jsonError("Unable to verify booking details.", 400);
    }

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, booking.vehicleId))
      .limit(1);
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .limit(1);
    const [cancellation] = await db
      .select()
      .from(cancellations)
      .where(eq(cancellations.bookingId, booking.id))
      .limit(1);

    return jsonOk({
      bookingId: booking.bookingId,
      status: booking.status,
      rentalMode: booking.rentalMode,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      city: booking.city,
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      durationLabel: booking.durationLabel,
      totalAmount: booking.totalAmount,
      driverFee: booking.driverFee,
      amountFormatted: formatCurrency(booking.totalAmount),
      vehicle: vehicle
        ? {
            name: vehicle.name,
            brand: vehicle.brand,
            type: vehicle.vehicleType,
            href: vehicle.slug
              ? `/${vehicle.vehicleType === "bike" ? "bikes" : "cars"}/${vehicle.slug}`
              : null,
          }
        : null,
      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            amount: payment.amount,
            transactionId: payment.transactionId,
          }
        : null,
      cancellation: cancellation
        ? {
            type: cancellation.cancellationType,
            deductionAmount: cancellation.deductionAmount,
            refundAmount: cancellation.refundAmount,
            refundStatus: cancellation.refundStatus,
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
