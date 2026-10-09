"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { RotateCcw, Check, AlertTriangle } from "lucide-react";

type Row = {
  id: number;
  bookingId: number;
  bookingRef: string | null;
  customerName: string | null;
  customerPhone: string | null;
  vehicleName: string | null;
  pickupDate: string | null;
  originalAmount: number;
  cancellationDeadline: string;
  cancelledAt: string;
  cancellationType: "free" | "late";
  deductionPercentage: number;
  deductionAmount: number;
  refundAmount: number;
  refundStatus: string;
  cancellationReason: string | null;
  refund: { gatewayReference: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  refunded: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  manual_required: "bg-orange-100 text-orange-800",
  not_applicable: "bg-slate-100 text-slate-600",
};

export default function AdminCancellationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/cancellations", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRows(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setStatus = async (
    cancellationId: number,
    refundStatus: string,
    gatewayReference?: string
  ) => {
    setBusy(cancellationId);
    try {
      await fetch("/api/admin/cancellations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationId, refundStatus, gatewayReference }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cancellations & Refunds</h1>
        <p className="text-sm text-slate-500">
          Every cancellation records the original amount, deduction, and refund
          separately. Refunds are never auto-completed.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No cancellations yet</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold">
                    {r.bookingRef}{" "}
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        r.cancellationType === "late"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.cancellationType === "late" ? "Late" : "Free"}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {r.customerName} · {r.customerPhone} · {r.vehicleName}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    STATUS_COLORS[r.refundStatus] || STATUS_COLORS.pending
                  }`}
                >
                  {r.refundStatus.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm mb-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-500">Original Amount</p>
                  <p className="font-bold">
                    {formatCurrency(r.originalAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-500">
                    Deduction ({r.deductionPercentage}%)
                  </p>
                  <p className="font-bold text-red-600">
                    {r.deductionAmount > 0 ? "− " : ""}
                    {formatCurrency(r.deductionAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-500">Refund</p>
                  <p className="font-bold text-brand-600">
                    {formatCurrency(r.refundAmount)}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-500 mb-4">
                <p>Deadline: {formatDateTime(r.cancellationDeadline)}</p>
                <p>Cancelled: {formatDateTime(r.cancelledAt)}</p>
                {r.cancellationReason && (
                  <p className="sm:col-span-2">
                    Reason: {r.cancellationReason}
                  </p>
                )}
              </div>

              {r.refundStatus !== "not_applicable" && (
                <div className="flex flex-wrap gap-2">
                  {r.refundStatus !== "processing" &&
                    r.refundStatus !== "refunded" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === r.id}
                        onClick={() => setStatus(r.id, "processing")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Mark Processing
                      </Button>
                    )}
                  {r.refundStatus !== "refunded" && (
                    <Button
                      size="sm"
                      variant="success"
                      loading={busy === r.id}
                      onClick={() => {
                        const ref = prompt(
                          "Gateway reference / transaction ID for this refund:"
                        );
                        if (ref !== null)
                          setStatus(r.id, "refunded", ref || undefined);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Refunded
                    </Button>
                  )}
                  {r.refundStatus !== "manual_required" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === r.id}
                      onClick={() => setStatus(r.id, "manual_required")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> Manual Required
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
