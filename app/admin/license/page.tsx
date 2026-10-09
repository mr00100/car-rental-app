"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, XCircle, Eye } from "lucide-react";

type Row = {
  id: number;
  userId: number | null;
  status: string;
  fullName: string | null;
  licenseNumberMasked: string | null;
  expiryDate: string | null;
  documentUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
  userEmail: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  under_review: "bg-amber-100 text-amber-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  not_submitted: "bg-slate-100 text-slate-700",
};

export default function AdminLicensePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/admin/license")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setRows(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (
    id: number,
    action: "verify" | "reject" | "review",
    rejectionReason?: string
  ) => {
    setBusy(id);
    try {
      await fetch("/api/admin/license", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, rejectionReason }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  const reveal = async (id: number) => {
    const res = await fetch("/api/admin/license", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reveal: true }),
    });
    const json = await res.json();
    if (json.success)
      setRevealed((r) => ({ ...r, [id]: json.data.licenseNumber || "—" }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">License Verification</h1>
        <p className="text-sm text-slate-500">
          Review and approve driving license submissions. Sensitive data is
          encrypted and access is audit-logged.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No submissions yet</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold">{r.fullName}</p>
                  <p className="text-sm text-slate-500">{r.userEmail}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] || STATUS_COLORS.not_submitted}`}
                >
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-slate-500">License #</p>
                  <p className="font-mono">
                    {revealed[r.id] || r.licenseNumberMasked || "—"}
                    {!revealed[r.id] && (
                      <button
                        onClick={() => reveal(r.id)}
                        className="ml-2 text-brand-600 inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="h-3 w-3" /> reveal
                      </button>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Expiry</p>
                  <p>{r.expiryDate || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Submitted</p>
                  <p>{formatDateTime(r.createdAt)}</p>
                </div>
              </div>

              {r.documentUrl && (
                <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    License submitted — check the uploaded license below.
                  </p>
                  <a
                    href={r.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-fit"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.documentUrl}
                      alt="Submitted driving license"
                      className="max-h-72 w-auto max-w-full rounded-xl border border-slate-200 dark:border-slate-700 object-contain"
                    />
                  </a>
                  <p className="text-xs text-slate-500 mt-2">Click the image to open the full-size license.</p>
                </div>
              )}

              {["submitted", "under_review"].includes(r.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    loading={busy === r.id}
                    onClick={() => act(r.id, "verify")}
                  >
                    <ShieldCheck className="h-4 w-4" /> Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy === r.id}
                    onClick={() => {
                      const reason = prompt("Rejection reason:");
                      if (reason !== null) act(r.id, "reject", reason);
                    }}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
