import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/booking/print-button";
import { db } from "@/db";
import { bookings, vehicles, cancellations, refunds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { XCircle } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

const REFUND_LABEL: Record<string, string> = {
  pending: "Refund Pending",
  processing: "Refund Processing",
  refunded: "Refunded",
  failed: "Refund Failed",
  manual_required: "Manual Refund Required",
  not_applicable: "No Payment Captured",
};

export default async function CancellationSlipPage({ params }: Props) {
  const { id } = await params;

  const [row] = await db
    .select({
      booking: bookings,
      vehicleName: vehicles.name,
      vehicleBrand: vehicles.brand,
    })
    .from(bookings)
    .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .where(eq(bookings.bookingId, id))
    .limit(1);

  if (!row) notFound();

  const [cancellation] = await db
    .select()
    .from(cancellations)
    .where(eq(cancellations.bookingId, row.booking.id))
    .limit(1);

  if (!cancellation) notFound();

  const [refund] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.bookingId, row.booking.id))
    .limit(1);

  const settings = await getSettings();
  const b = row.booking;
  const isLate = cancellation.cancellationType === "late";
  const refundStatus = refund?.refundStatus ?? cancellation.refundStatus;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <div className="text-center mb-8 no-print">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Booking Cancelled
          </h1>
          {isLate ? (
            <p className="text-amber-700 dark:text-amber-300 font-semibold">
              Your 10% of payment will be conserved.
            </p>
          ) : (
            <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
              100% refund — no deduction applied.
            </p>
          )}
        </div>

        <div
          id="receipt"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
        >
          <div className="bg-slate-900 text-white p-6 text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              {settings.businessName}
            </p>
            <h2 className="text-xl font-bold mt-1">Cancellation Slip</h2>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Booking ID" value={b.bookingId} strong />
              <Field label="Customer" value={b.customerName} />
              <Field
                label="Vehicle"
                value={`${row.vehicleBrand ?? ""} ${row.vehicleName ?? ""}`.trim()}
              />
              <Field label="Rental Mode" value={
                b.rentalMode === "with_driver" ? "With Driver" : "Self-Drive"
              } />
              <Field label="Pickup" value={formatDateTime(b.pickupDate)} />
              <Field label="Return" value={formatDateTime(b.returnDate)} />
              <Field
                label="Cancellation Deadline"
                value={formatDateTime(cancellation.cancellationDeadline)}
              />
              <Field
                label="Cancelled At"
                value={formatDateTime(cancellation.cancelledAt)}
              />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <Row
                label="Original Payment"
                value={formatCurrency(cancellation.originalAmount)}
              />
              <Row
                label={`Cancellation Deduction${
                  cancellation.deductionPercentage > 0
                    ? ` (${cancellation.deductionPercentage}%)`
                    : ""
                }`}
                value={`${cancellation.deductionAmount > 0 ? "− " : ""}${formatCurrency(
                  cancellation.deductionAmount
                )}`}
                negative={cancellation.deductionAmount > 0}
              />
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                <span className="font-bold">Refund Amount</span>
                <span className="text-2xl font-extrabold text-brand-600">
                  {formatCurrency(cancellation.refundAmount)}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field
                label="Cancellation Type"
                value={isLate ? "Late Cancellation" : "Free Cancellation"}
              />
              <Field
                label="Refund Status"
                value={REFUND_LABEL[refundStatus] || refundStatus}
                strong
              />
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300">
              <strong>Cancellation Policy:</strong>{" "}
              {isLate
                ? `${cancellation.deductionPercentage}% deduction applied because the booking was cancelled after the ${settings.cancellationDeadlineHours}-hour deadline.`
                : `Cancelled before the ${settings.cancellationDeadlineHours}-hour deadline — full refund, no deduction.`}
            </div>

            {refundStatus !== "refunded" &&
              refundStatus !== "not_applicable" && (
                <p className="text-xs text-slate-500">
                  Your refund is not complete until it is confirmed by the
                  payment provider or processed by our team. You will be
                  notified when the status changes.
                </p>
              )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 justify-center no-print">
          <PrintButton />
          <Link href="/dashboard">
            <Button variant="outline">My Bookings</Button>
          </Link>
          <Link href="/cars">
            <Button variant="ghost">Browse Vehicles</Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

function Field({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-slate-500 mb-0.5">{label}</p>
      <p className={strong ? "font-bold" : "font-medium"}>{value || "—"}</p>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-slate-500 text-sm">{label}</span>
      <span
        className={`font-semibold ${negative ? "text-red-600" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
