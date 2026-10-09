"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Car,
  CreditCard,
  Search,
  FileText,
  XCircle,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatDateTime, getBookingStatusColor } from "@/lib/utils";
import { CancelBookingModal } from "@/components/booking/cancel-booking-modal";

type LookupResult = {
  bookingId: string;
  customerName: string;
  vehicleName: string;
  vehicleHref: string | null;
  rentalMode: string;
  pickupDate: string;
  returnDate: string;
  durationLabel: string;
  totalAmount: number;
  driverFee: number;
  city: string;
  status: string;
  amountFormatted: string;
  payment: {
    status: string;
    method: string;
    amount: number;
    transactionId: string | null;
  } | null;
  cancellation: {
    type: string;
    deductionAmount: number;
    refundAmount: number;
    refundStatus: string;
  } | null;
};

export default function PublicDashboardPage() {
  const [bookingId, setBookingId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId.trim(),
          verificationCode: verificationCode.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Booking not found");
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancellable =
    result &&
    ["pending", "payment_pending", "payment_submitted", "confirmed"].includes(
      result.status
    );

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold">Track My Rental</h1>
            <p className="text-slate-500 mt-2">
              No account needed — enter your booking reference and verification
              code to view, pay for, or cancel your rental.
            </p>
          </div>
        </div>


        {/* Lookup form */}
        <form
          onSubmit={lookup}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm mb-8"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Booking Reference"
              placeholder="RAC-2026-000125"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              required
            />
            <Input
              label="Verification Code"
              placeholder="6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              inputMode="numeric"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3 mt-4">
              {error}
            </div>
          )}
          <Button type="submit" className="mt-4" loading={loading}>
            <Search className="h-4 w-4 mr-2" />
            Find My Booking
          </Button>
        </form>

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm text-slate-500">{result.bookingId}</p>
                <h2 className="text-xl font-bold">{result.vehicleName}</h2>
              </div>
              <Badge className={getBookingStatusColor(result.status)}>
                {result.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <Detail
                  icon={Calendar}
                  label="Pickup"
                  value={formatDateTime(result.pickupDate)}
                />
                <Detail
                  icon={Clock}
                  label="Return"
                  value={formatDateTime(result.returnDate)}
                />
                <Detail icon={Car} label="Duration" value={result.durationLabel} />
                <Detail
                  icon={Car}
                  label="Driving Option"
                  value={
                    result.rentalMode === "with_driver"
                      ? "With Driver"
                      : "Self Drive"
                  }
                />
                <Detail
                  icon={CreditCard}
                  label="Driver Charge"
                  value={formatCurrency(result.driverFee)}
                />
                <Detail icon={Car} label="City" value={result.city} />
                <Detail
                  icon={CreditCard}
                  label="Payment"
                  value={result.payment ? result.payment.status.replace(/_/g, " ") : "Not paid yet"}
                />
              </div>

              {result.payment?.transactionId && (
                <p className="text-xs text-slate-500">
                  Transaction: {result.payment.transactionId}
                </p>
              )}

              {result.cancellation && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-sm space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" /> Booking cancelled
                    {result.cancellation.type === "late" && " — late"}
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Original</span>
                    {formatCurrency(result.totalAmount)}
                  </p>
                  <p className="flex justify-between text-red-600">
                    <span>Deduction (10%)</span>
                    − {formatCurrency(result.cancellation.deductionAmount)}
                  </p>
                  <p className="flex justify-between font-bold">
                    <span>Refund</span>
                    {formatCurrency(result.cancellation.refundAmount)}
                  </p>
                  <p className="text-slate-500 text-xs pt-1">
                    Refund status:{" "}
                    {result.cancellation.refundStatus.replace(/_/g, " ")}
                  </p>
                  <Link
                    href={`/bookings/${result.bookingId}/cancellation`}
                    className="inline-flex items-center text-brand-600 font-medium text-xs mt-1"
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1" /> View cancellation slip
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-2xl font-extrabold text-brand-600">
                    {result.amountFormatted}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bookings/${result.bookingId}/confirmation`}
                  >
                    <Button variant="outline" size="sm">
                      <FileText className="h-3.5 w-3.5 mr-1" /> Receipt
                    </Button>
                  </Link>
                  {["pending", "payment_pending"].includes(result.status) && (
                    <Link href={`/bookings/${result.bookingId}/payment`}>
                      <Button size="sm">
                        Pay Now
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                  {cancellable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => setCancelOpen(true)}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public entry points when nothing searched yet */}
        {!result && (
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <QuickLink href="/cars" title="Browse Cars" desc="Explore the fleet" />
            <QuickLink href="/bikes" title="Browse Bikes" desc="Two-wheel rides" />
            <QuickLink href="/contact" title="Contact Us" desc="Need help?" />
          </div>
        )}
      </div>

      {result && (
        <CancelBookingModal
          bookingRef={result.bookingId}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          guestVerificationCode={verificationCode.trim()}
          onCancelled={() => {
            setCancelOpen(false);
            setResult(null);
            setBookingId("");
            setVerificationCode("");
          }}
        />
      )}
    </PublicShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-brand-400 hover:shadow-md transition-all"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </Link>
  );
}
