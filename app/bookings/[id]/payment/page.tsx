import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { PaymentForm } from "@/components/booking/payment-form";
import { db } from "@/db";
import { bookings, vehicles, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentPage({ params }: Props) {
  const { id } = await params;

  const [row] = await db
    .select({
      booking: bookings,
      vehicleName: vehicles.name,
    })
    .from(bookings)
    .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
    .where(eq(bookings.bookingId, id))
    .limit(1);

  if (!row) notFound();

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, row.booking.id))
    .limit(1);

  // Already submitted
  if (
    payment &&
    ["submitted", "verified"].includes(payment.status) &&
    !["payment_pending", "pending"].includes(row.booking.status)
  ) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Payment Already Submitted</h1>
          <p className="text-slate-500 mb-6">
            Your payment for {row.booking.bookingId} is {payment.status}.
          </p>
          <Link
            href={`/bookings/${row.booking.bookingId}/confirmation`}
            className="text-brand-600 font-medium hover:underline"
          >
            View confirmation →
          </Link>
        </div>
      </PublicShell>
    );
  }

  const settings = await getSettings();

  return (
    <PublicShell>
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Complete Payment</h1>
          <p className="text-slate-500 text-sm">
            Booking {row.booking.bookingId} • {row.vehicleName}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Pickup: {formatDateTime(row.booking.pickupDate)} • Total:{" "}
            <strong>{formatCurrency(row.booking.totalAmount)}</strong>
          </p>
        </div>

        <PaymentForm
          bookingDbId={row.booking.id}
          bookingId={row.booking.bookingId}
          amount={row.booking.totalAmount}
          easypaisaNumber={settings.easypaisaNumber}
          easypaisaAccountName={settings.easypaisaAccountName}
          vehicleName={row.vehicleName || "Vehicle"}
        />
      </div>
    </PublicShell>
  );
}
