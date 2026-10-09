import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { bookings, vehicles, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  formatCurrency,
  formatDateTime,
  bookingStatusLabel,
  paymentStatusLabel,
  getBookingStatusColor,
} from "@/lib/utils";
import { CheckCircle2, Printer, Download } from "lucide-react";
import { PrintButton } from "@/components/booking/print-button";

type Props = { params: Promise<{ id: string }> };

export default async function ConfirmationPage({ params }: Props) {
  const { id } = await params;

  const [row] = await db
    .select({
      booking: bookings,
      vehicleName: vehicles.name,
      vehicleBrand: vehicles.brand,
      vehicleCover: vehicles.coverImage,
      vehicleSlug: vehicles.slug,
      vehicleType: vehicles.vehicleType,
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

  const b = row.booking;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <div className="text-center mb-8 no-print">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Booking Submitted!
          </h1>
          <p className="text-slate-500">
            {payment?.status === "submitted"
              ? "Your payment details have been received and await verification."
              : "Your booking has been created. Complete payment to confirm."}
          </p>
        </div>

        <div
          id="receipt"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
        >
          <div className="bg-gradient-to-r from-brand-600 to-brand-800 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-200 text-sm">Booking ID</p>
                <p className="text-2xl font-bold tracking-wide">{b.bookingId}</p>
              </div>
              <Badge className={getBookingStatusColor(b.status)}>
                {bookingStatusLabel(b.status)}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-0.5">Customer</p>
                <p className="font-semibold">{b.customerName}</p>
                <p className="text-slate-600">{b.customerPhone}</p>
                {b.customerEmail && (
                  <p className="text-slate-600">{b.customerEmail}</p>
                )}
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Vehicle</p>
                <p className="font-semibold">
                  {row.vehicleBrand} {row.vehicleName}
                </p>
                <p className="text-slate-600 capitalize">{row.vehicleType}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Pickup</p>
                <p className="font-semibold">{formatDateTime(b.pickupDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Return</p>
                <p className="font-semibold">{formatDateTime(b.returnDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Duration</p>
                <p className="font-semibold">{b.durationLabel}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">Driving Option</p>
                <p className="font-semibold">
                  {b.rentalMode === "with_driver" ? "With Driver" : "Self Drive"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">City</p>
                <p className="font-semibold">{b.city}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Vehicle Rental</span>
                <span className="font-medium">
                  {formatCurrency(b.totalAmount - b.driverFee)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">
                  Driver Charge
                  {b.rentalMode === "with_driver" ? " (Rs. 2,000/day)" : ""}
                </span>
                <span className="font-medium">
                  {formatCurrency(b.driverFee)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-brand-600">
                  {formatCurrency(b.totalAmount)}
                </span>
              </div>
              {payment && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Payment Status</span>
                  <span className="font-semibold">
                    {paymentStatusLabel(payment.status)}
                    {payment.transactionId && ` • TXN: ${payment.transactionId}`}
                  </span>
                </div>
              )}
            </div>

            {b.notes && (
              <div className="text-sm">
                <p className="text-slate-500 mb-0.5">Notes</p>
                <p>{b.notes}</p>
              </div>
            )}

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200">
              This service is available inside the city only. Please bring a
              valid CNIC and driving license at pickup.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 justify-center no-print">
          <PrintButton />
          <Link href="/dashboard">
            <Button variant="outline">My Bookings</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
