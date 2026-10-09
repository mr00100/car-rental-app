"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDateTime,
  paymentStatusLabel,
} from "@/lib/utils";
import { Check, X, RotateCcw } from "lucide-react";

type Payment = {
  id: number;
  amount: number;
  status: string;
  transactionId: string | null;
  senderPhone: string | null;
  screenshotUrl: string | null;
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
  bookingRef: string | null;
  customerName: string | null;
  customerPhone: string | null;
  vehicleName: string | null;
  bookingAmount: number | null;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("submitted");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    fetch(`/api/payments?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPayments(json.data.payments);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const act = async (
    id: number,
    newStatus: string,
    extra?: Record<string, string>
  ) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      const json = await res.json();
      if (!json.success) alert(json.error || "Failed");
      load();
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      submitted: "bg-purple-100 text-purple-800",
      verified: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
      refunded: "bg-slate-100 text-slate-700",
    };
    return map[s] || map.pending;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-slate-500">
          Verify EasyPaisa transactions manually
        </p>
      </div>

      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={[
          { value: "pending", label: "Pending" },
          { value: "submitted", label: "Submitted (needs verification)" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
          { value: "refunded", label: "Refunded" },
        ]}
        placeholder="All statuses"
        className="w-72"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold">
                    {p.bookingRef} · {formatCurrency(p.amount)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {p.customerName} · {p.customerPhone} · {p.vehicleName}
                  </p>
                </div>
                <Badge className={statusColor(p.status)}>
                  {paymentStatusLabel(p.status)}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-slate-500">Transaction ID</p>
                  <p className="font-mono font-semibold">
                    {p.transactionId || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sender Phone</p>
                  <p className="font-semibold">{p.senderPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Submitted</p>
                  <p>{formatDateTime(p.createdAt)}</p>
                </div>
              </div>

              {p.screenshotUrl && (
                <a
                  href={p.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:underline mb-3 inline-block"
                >
                  View screenshot →
                </a>
              )}

              {p.status === "submitted" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    loading={actionLoading === p.id}
                    onClick={() => act(p.id, "verified")}
                  >
                    <Check className="h-4 w-4" /> Verify & Confirm Booking
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={actionLoading === p.id}
                    onClick={() => {
                      const reason = prompt("Rejection reason:");
                      if (reason !== null)
                        act(p.id, "rejected", { rejectionReason: reason });
                    }}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}

              {p.status === "verified" && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={actionLoading === p.id}
                  onClick={() => act(p.id, "refunded")}
                >
                  <RotateCcw className="h-4 w-4" /> Mark Refunded
                </Button>
              )}
            </div>
          ))}
          {!payments.length && (
            <p className="text-center text-slate-400 py-12">
              No payments found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
