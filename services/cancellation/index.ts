import { getSettings } from "@/lib/settings";

export type CancellationQuote = {
  // Policy
  deadlineHours: number;
  deductionPercentage: number; // 0 or configured (default 10)
  // Timing (all ISO strings, server-authoritative)
  pickupDate: string;
  cancellationDeadline: string;
  serverTime: string;
  msRemaining: number; // <= 0 once the deadline has passed
  isLate: boolean;
  // Money (integers, PKR)
  originalAmount: number;
  deductionAmount: number;
  refundAmount: number;
  // Rules
  cancellationType: "free" | "late";
  allowed: boolean;
  blockedReason?: string;
  message: string;
};

const LATE_MESSAGE = "Your 10% of payment will be conserved.";

/**
 * Authoritative cancellation calculation.
 *
 * Rule:
 *   now <  pickup - deadlineHours  -> 100% refund, 0% deduction
 *   now >= pickup - deadlineHours  -> configured deduction (default 10%), 90% refund
 *
 * Always call this on the server. The frontend countdown is guidance only.
 */
export async function quoteCancellation(params: {
  pickupDate: Date;
  originalAmount: number;
  bookingStatus: string;
  now?: Date;
}): Promise<CancellationQuote> {
  const settings = await getSettings();

  const deadlineHours = Number(settings.cancellationDeadlineHours) || 5;
  const configuredPercent = Number(settings.cancellationFeePercent) || 10;
  const lateEnabled = settings.enableLateCancellation === "true";
  const allowAfterDeadline = settings.allowCancellationAfterDeadline === "true";

  // Server time is the source of truth.
  const now = params.now ?? new Date();
  const pickup = params.pickupDate;
  const deadline = new Date(
    pickup.getTime() - deadlineHours * 60 * 60 * 1000
  );

  const msRemaining = deadline.getTime() - now.getTime();
  // Boundary: exactly at the deadline counts as LATE (now >= deadline).
  const isLate = now.getTime() >= deadline.getTime();

  const originalAmount = Math.max(0, Math.round(params.originalAmount));

  // Deduction only applies when late AND late-cancellation deduction enabled.
  const deductionPercentage = isLate && lateEnabled ? configuredPercent : 0;
  const deductionAmount = Math.round(
    (originalAmount * deductionPercentage) / 100
  );
  const refundAmount = originalAmount - deductionAmount;

  // Terminal states cannot be cancelled again.
  const terminal = ["cancelled", "completed", "rejected"];
  let allowed = true;
  let blockedReason: string | undefined;

  if (terminal.includes(params.bookingStatus)) {
    allowed = false;
    blockedReason = `This booking is already ${params.bookingStatus} and cannot be cancelled.`;
  } else if (isLate && !allowAfterDeadline) {
    allowed = false;
    blockedReason =
      "The cancellation deadline has passed and late cancellation is disabled. Please contact support.";
  }

  const message = isLate
    ? LATE_MESSAGE
    : "You are cancelling more than the required window before pickup — you are eligible for a 100% refund.";

  return {
    deadlineHours,
    deductionPercentage,
    pickupDate: pickup.toISOString(),
    cancellationDeadline: deadline.toISOString(),
    serverTime: now.toISOString(),
    msRemaining,
    isLate,
    originalAmount,
    deductionAmount,
    refundAmount,
    cancellationType: isLate ? "late" : "free",
    allowed,
    blockedReason,
    message,
  };
}

export const LATE_CANCELLATION_MESSAGE = LATE_MESSAGE;
