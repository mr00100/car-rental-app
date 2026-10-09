"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Copy, Check, Smartphone } from "lucide-react";

type Props = {
  bookingDbId: number;
  bookingId: string;
  amount: number;
  easypaisaNumber: string;
  easypaisaAccountName: string;
  vehicleName: string;
};

export function PaymentForm({
  bookingDbId,
  bookingId,
  amount,
  easypaisaNumber,
  easypaisaAccountName,
  vehicleName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    transactionId: "",
    senderPhone: "",
    screenshotUrl: "",
    notes: "",
  });

  const copyNumber = async () => {
    await navigator.clipboard.writeText(easypaisaNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingDbId,
          transactionId: form.transactionId,
          senderPhone: form.senderPhone,
          amount,
          screenshotUrl: form.screenshotUrl || undefined,
          notes: form.notes || undefined,
          paymentDate: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Payment submission failed");
        if (json.details) {
          const first = Object.values(json.details).flat()[0];
          if (first) setError(String(first));
        }
        return;
      }

      router.push(`/bookings/${bookingId}/confirmation`);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-6 w-6" />
          <h3 className="font-bold text-lg">EasyPaisa Payment</h3>
        </div>
        <p className="text-green-100 text-sm mb-4">
          Send exactly <strong className="text-white">{formatCurrency(amount)}</strong> to
          the account below, then submit your transaction details.
        </p>
        <div className="rounded-xl bg-white/15 backdrop-blur p-4 space-y-3">
          <div>
            <p className="text-xs text-green-200 uppercase tracking-wide">
              Account Name
            </p>
            <p className="font-semibold text-lg">{easypaisaAccountName}</p>
          </div>
          <div>
            <p className="text-xs text-green-200 uppercase tracking-wide">
              EasyPaisa Number
            </p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-2xl tracking-wide">
                {easypaisaNumber}
              </p>
              <button
                type="button"
                onClick={copyNumber}
                className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30"
                aria-label="Copy number"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-green-200 uppercase tracking-wide">
              Amount
            </p>
            <p className="font-bold text-2xl">{formatCurrency(amount)}</p>
          </div>
        </div>
        <p className="text-xs text-green-100 mt-4">
          ⚠️ Payment will remain pending until our team verifies your
          transaction. Do not close this page until you submit details.
        </p>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm space-y-1">
        <p>
          <span className="text-slate-500">Booking:</span>{" "}
          <strong>{bookingId}</strong>
        </p>
        <p>
          <span className="text-slate-500">Vehicle:</span>{" "}
          <strong>{vehicleName}</strong>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Transaction ID"
          required
          placeholder="e.g. 12345678901"
          value={form.transactionId}
          onChange={(e) =>
            setForm((f) => ({ ...f, transactionId: e.target.value }))
          }
          hint="Found in your EasyPaisa SMS/app after payment"
        />
        <Input
          label="Sender Phone Number"
          required
          placeholder="03XXXXXXXXX"
          value={form.senderPhone}
          onChange={(e) =>
            setForm((f) => ({ ...f, senderPhone: e.target.value }))
          }
        />
        <Input
          label="Payment Screenshot URL (optional)"
          placeholder="https://..."
          value={form.screenshotUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, screenshotUrl: e.target.value }))
          }
          hint="Paste a link to your payment screenshot if available"
        />
        <Textarea
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 text-sm p-3">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Submit Payment Details
        </Button>
      </form>
    </div>
  );
}
