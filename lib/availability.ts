import { db } from "@/db";
import { bookings, vehicles } from "@/db/schema";
import { and, eq, ne, or, lt, gt, inArray } from "drizzle-orm";

const BLOCKING_STATUSES = [
  "confirmed",
  "active",
  "payment_submitted",
  "payment_pending",
] as const;

export async function isVehicleAvailableForDates(
  vehicleId: number,
  pickupDate: Date,
  returnDate: Date,
  excludeBookingId?: number
): Promise<{ available: boolean; reason?: string }> {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);

  if (!vehicle) {
    return { available: false, reason: "Vehicle not found" };
  }

  if (vehicle.isArchived) {
    return { available: false, reason: "Vehicle is no longer listed" };
  }

  if (
    vehicle.availability === "maintenance" ||
    vehicle.availability === "disabled"
  ) {
    return {
      available: false,
      reason: `Vehicle is currently ${vehicle.availability}`,
    };
  }

  // Check overlapping bookings
  const conditions = [
    eq(bookings.vehicleId, vehicleId),
    inArray(bookings.status, [...BLOCKING_STATUSES]),
    // Overlap: existing.pickup < new.return AND existing.return > new.pickup
    lt(bookings.pickupDate, returnDate),
    gt(bookings.returnDate, pickupDate),
  ];

  const overlapping = await db
    .select({ id: bookings.id, bookingId: bookings.bookingId })
    .from(bookings)
    .where(
      and(
        ...conditions,
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined
      )
    )
    .limit(1);

  if (overlapping.length > 0) {
    return {
      available: false,
      reason: "Vehicle is already booked for the selected dates",
    };
  }

  return { available: true };
}

export async function getVehicleBookedRanges(vehicleId: number) {
  return db
    .select({
      id: bookings.id,
      bookingId: bookings.bookingId,
      pickupDate: bookings.pickupDate,
      returnDate: bookings.returnDate,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.vehicleId, vehicleId),
        inArray(bookings.status, [...BLOCKING_STATUSES])
      )
    );
}
