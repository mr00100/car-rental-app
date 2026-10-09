"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

type Quote = {
  bookingRef: string;
  deadlineHours: number;
  deductionPercentage: number;
  pickupDate: string;
  cancellationDeadline: string;
  serverTime: string;
  msRemaining: number;
  isLate: boolean;
  originalAmount: number;
  deductionAmount: number;
  refundAmount: number;
  cancellationType: "free" | "late";
  allowed: boolean;
  blockedReason?: string;
  message: string;
};

function formatRemaining(ms: number) {
  if (ms <= 0) return "00h 00m";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
  return `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
}

export function CancelBookingModal({
  bookingRef,
  open,
  onClose,
  onCancelled,
  guestContact,
  guestVerificationCode,
}: {
  bookingRef: string;
  open: boolean;
  onClose: () => void;
  onCancelled?: () => void;
  // Guest booking credentials used by the existing cancellation API.
  guestContact?: string;
  guestVerificationCode?: string;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  // Local ticking clock, seeded from SERVER time (UI guidance only).
  const [remaining, setRemaining] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (guestContact) qs.set("contact", guestContact);
      if (guestVerificationCode) {
        qs.set("verificationCode", guestVerificationCode);
      }
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const hasGuestCredential = Boolean(
        guestContact || guestVerificationCode
      );
      const res = await fetch(
        `/api/bookings/${bookingRef}/cancel${suffix}`,
        hasGuestCredential
          ? { cache: "no-store" }
          : { credentials: "include", cache: "no-store" }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Unable to load cancellation details");
        return;
      }
      setQuote(json.data);
      setRemaining(json.data.msRemaining);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [bookingRef, guestContact, guestVerificationCode]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Live countdown; flips the UI to "late" automatically when it hits zero.
  useEffect(() => {
    if (!open || !quote) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1000;
        // Re-sync with the server exactly once when crossing the boundary.
        if (r > 0 && next <= 0) load();
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, quote, load]);

  const confirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      const hasGuestCredential = Boolean(
        guestContact || guestVerificationCode
      );
      const res = await fetch(`/api/bookings/${bookingRef}/cancel`, {
        method: "POST",
        ...(hasGuestCredential
          ? {}
          : { credentials: "include" as RequestCredentials }),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: reason || undefined,
          contact: guestContact || undefined,
          verificationCode: guestVerificationCode || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Cancellation failed");
        return;
      }
      onCancelled?.();
      router.push(`/bookings/${bookingRef}/cancellation`);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // The live countdown may flip this before the next server sync.
  const isLate = quote ? quote.isLate || remaining <= 0 : false;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : !quote ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{error || "Unable to load booking."}</p>
          </div>
        ) : (
          <div className="p-6 sm:p-7">
            {/* Header */}
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 mb-5",
                isLate
                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
              )}
            >
              {isLate ? (
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h2
                  className={cn(
                    "text-lg font-bold",
                    isLate
                      ? "text-amber-900 dark:text-amber-200"
                      : "text-emerald-900 dark:text-emerald-200"
                  )}
                >
                  {isLate ? "Late Cancellation" : "Cancel Booking?"}
                </h2>
                <p
                  className={cn(
                    "text-sm mt-0.5 font-medium",
                    isLate
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-emerald-800 dark:text-emerald-300"
                  )}
                >
                  {isLate
                    ? "Your 10% of payment will be conserved."
                    : `You are cancelling this booking more than ${quote.deadlineHours} hours before the rental starts.`}
                </p>
              </div>
            </div>

            {/* Countdown / deadline info */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-5 text-sm space-y-1.5">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="h-4 w-4" />
                {isLate ? (
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    Cancellation deadline passed
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatRemaining(remaining)}
                    </span>{" "}
                    remaining for a 100% refund
                  </span>
                )}
              </div>
              <p className="text-slate-500">
                Cancellation deadline:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatDateTime(quote.cancellationDeadline)}
                </strong>
              </p>
              <p className="text-slate-500">
                Pickup:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatDateTime(quote.pickupDate)}
                </strong>
              </p>
            </div>

            {/* Money breakdown — always fully transparent */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 mb-5">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-500 text-sm">Booking Amount</span>
                <span className="font-semibold">
                  {formatCurrency(quote.originalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-slate-500 text-sm">
                  Cancellation Deduction
                  {quote.deductionPercentage > 0 &&
                    ` (${quote.deductionPercentage}%)`}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    quote.deductionAmount > 0 ? "text-red-600" : "text-slate-700 dark:text-slate-200"
                  )}
                >
                  {quote.deductionAmount > 0 ? "− " : ""}
                  {formatCurrency(quote.deductionAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold">You will receive</span>
                <span className="text-xl font-extrabold text-brand-600">
                  {formatCurrency(quote.refundAmount)}
                </span>
              </div>
            </div>

            {!isLate && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-4">
                ✓ 100% refund eligible
              </p>
            )}

            <Textarea
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why you're cancelling..."
              className="mb-4 min-h-[70px]"
            />

            {!quote.allowed && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3 mb-4">
                {quote.blockedReason}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3 mb-4">
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Keep Booking
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={submitting}
                disabled={!quote.allowed}
                onClick={confirm}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
