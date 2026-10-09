export const DRIVER_DAILY_RATE = 2000;

/**
 * One authoritative rental-day rule used by booking UI and API.
 * Any started 24-hour period counts as one rental day.
 */
export function calculateRentalDays(
  pickup: Date | string,
  returnAt: Date | string
): number {
  const start = pickup instanceof Date ? pickup : new Date(pickup);
  const end = returnAt instanceof Date ? returnAt : new Date(returnAt);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function calculateDriverCharge(
  option: "self_drive" | "with_driver",
  rentalDays: number
): number {
  return option === "with_driver"
    ? Math.max(0, rentalDays) * DRIVER_DAILY_RATE
    : 0;
}
