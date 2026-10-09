"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Search,
  Car,
  Calendar,
  MapPin,
  CreditCard,
  Download,
  XCircle,
  Phone,
} from "lucide-react";
import { formatCurrency, formatDateTime, getBookingStatusColor } from "@/lib/utils";

type LookupResult = {
  bookingId: string;
  status: string;
  rentalMode: string;
  customerName: string;
  city: string;
  pickupDate: string;
  returnDate: string;
  durationLabel: string;
  totalAmount: number;
  driverFee: number;
  amountFormatted: string;
  vehicle: { name: string; brand: string; href: string | null } | null;
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

export default function ManageBookingPage() {
  const [ref, setRef] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    refundAmount: number;
    deductionAmount: number;
    cancellationType: string;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Auto-fill from query string for "Manage Booking" links from the
  // confirmation page (and deep-links from email).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("ref");
    const c = sp.get("code");
    if (r) setRef(r.toUpperCase());
    if (c) setCode(c);
    if (r && c) {
      // Run an auto-lookup so the user lands directly on their booking.
      void runLookup(r, c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runLookup(forceRef?: string, forceCode?: string) {
    setError("");
    setResult(null);
    setCancelResult(null);
    setLoading(true);
    try {
      const r = (forceRef ?? ref).trim();
      const c = (forceCode ?? code).trim();
      if (!r || !c) {
        setError("Enter both your booking ID and verification code.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: r, verificationCode: c }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Unable to verify booking details.");
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function requestCancellation() {
    if (!result) return;
    if (!confirm("Request cancellation of this booking?")) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(
        `/api/bookings/${result.bookingId}/cancel`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationCode: code }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Cancellation failed.");
      } else {
        setCancelResult({
          refundAmount: json.data.refundAmount,
          deductionAmount: json.data.deductionAmount,
          cancellationType: json.data.cancellationType,
        });
        await runLookup();
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const cancellable =
    !!result &&
    !["cancelled", "completed", "rejected"].includes(result.status);

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Manage My Booking</h1>
          <p className="text-slate-500 mt-2">
            No login required. Enter the two codes you received with your
            booking confirmation.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runLookup();
          }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Booking ID"
              placeholder="RAC-8F42K7"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              autoComplete="off"
              required
            />
            <Input
              label="Verification Code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>
          {error && (
            <div className="mt-3 rounded-xl bg-red-50 text-red-700 text-sm p-3">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full mt-4"
            size="lg"
            loading={loading}
          >
            <Search className="h-4 w-4 mr-1.5" /> Find My Booking
          </Button>
        </form>

        {cancelResult && (
          <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Cancellation submitted
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-300">
              {cancelResult.cancellationType === "late"
                ? "Late cancellation — your 10% of payment is conserved."
                : "Free cancellation — 100% refund."}
            </p>
            <p className="mt-1">
              Deduction: <strong>{formatCurrency(cancelResult.deductionAmount)}</strong>{" "}
              · Refund:{" "}
              <strong>{formatCurrency(cancelResult.refundAmount)}</strong>
            </p>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm text-slate-500">{result.bookingId}</p>
                <h2 className="text-xl font-bold">
                  {result.vehicle
                    ? `${result.vehicle.brand} ${result.vehicle.name}`
                    : "Your booking"}
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${getBookingStatusColor(
                  result.status
                )}`}
              >
                {result.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
              <Row icon={Calendar} label="Pickup" value={formatDateTime(result.pickupDate)} />
              <Row icon={Calendar} label="Return" value={formatDateTime(result.returnDate)} />
              <Row icon={MapPin} label="City" value={result.city} />
              <Row
                icon={Car}
                label="Driving Option"
                value={result.rentalMode === "with_driver" ? "With Driver" : "Self Drive"}
              />
              <Row
                icon={CreditCard}
                label="Driver Charge"
                value={formatCurrency(result.driverFee)}
              />
              <Row
                icon={CreditCard}
                label="Payment"
                value={
                  result.payment
                    ? result.payment.status.replace(/_/g, " ")
                    : "Not paid yet"
                }
              />
              <Row label="Total" value={result.amountFormatted} highlight />
            </div>
            {result.cancellation && (
              <div className="px-5 pb-5 text-sm">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
                  <p className="font-semibold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" /> Cancelled{" "}
                    {result.cancellation.type === "late" && "— late"}
                  </p>
                  <p className="flex justify-between mt-1">
                    <span className="text-slate-500">Deduction</span>
                    {formatCurrency(result.cancellation.deductionAmount)}
                  </p>
                  <p className="flex justify-between font-bold mt-0.5">
                    <span>Refund</span>
                    {formatCurrency(result.cancellation.refundAmount)}
                  </p>
                </div>
              </div>
            )}
            <div className="px-5 pb-5 flex flex-wrap gap-2 justify-end">
              <Link
                href={`/bookings/${result.bookingId}/confirmation`}
              >
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" /> Print
                </Button>
              </Link>
              {["pending", "payment_pending"].includes(result.status) && (
                <Link href={`/bookings/${result.bookingId}/payment`}>
                  <Button size="sm">Pay Now</Button>
                </Link>
              )}
              {cancellable && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  loading={cancelling}
                  onClick={requestCancellation}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 text-sm text-slate-500 text-center">
          Need help?{" "}
          <Link href="/contact" className="text-brand-600 font-medium">
            Contact support
          </Link>{" "}
          or call <Phone className="inline h-3.5 w-3.5" /> 0300-1234567.
        </div>
      </div>
    </PublicShell>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={highlight ? "font-extrabold text-brand-600" : "font-medium"}>
          {value}
        </p>
      </div>
    </div>
  );
}
