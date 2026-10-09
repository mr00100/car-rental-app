"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { formatCurrency, extractFieldError } from "@/lib/utils";
import {
  calculateDriverCharge,
  calculateRentalDays,
  DRIVER_DAILY_RATE,
} from "@/lib/booking-pricing";
import { Calendar, Clock, Shield, AlertTriangle } from "lucide-react";

type Price = {
  id?: number;
  label: string;
  durationHours: number;
  price: number;
};

type Props = {
  vehicleId: number;
  vehicleName: string;
  prices: Price[];
  availability: string;
  cancellationPolicy?: string;
};

export function BookingForm({
  vehicleId,
  vehicleName,
  prices,
  availability,
  cancellationPolicy,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availabilityCheck, setAvailabilityCheck] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);

  const sortedPrices = useMemo(
    () => [...prices].sort((a, b) => a.durationHours - b.durationHours),
    [prices]
  );

  const defaultDuration = sortedPrices.find((p) => p.durationHours === 24)
    || sortedPrices[0];

  const [rentalMode, setRentalMode] = useState<"self_drive" | "with_driver">(
    "self_drive"
  );

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerCnic: "",
    city: "Lahore",
    durationHours: defaultDuration?.durationHours || 24,
    pickupDate: "",
    pickupTime: "10:00",
    notes: "",
  });

  const selectedPrice = sortedPrices.find(
    (p) => p.durationHours === form.durationHours
  );

  const pickupDateTime = form.pickupDate
    ? new Date(`${form.pickupDate}T${form.pickupTime || "10:00"}`)
    : null;

  const returnDateTime = useMemo(() => {
    if (!pickupDateTime || !form.durationHours) return null;
    return new Date(
      pickupDateTime.getTime() + form.durationHours * 60 * 60 * 1000
    );
  }, [pickupDateTime, form.durationHours]);

  const totalAmount = selectedPrice?.price ?? 0;
  const rentalDays =
    pickupDateTime && returnDateTime
      ? calculateRentalDays(pickupDateTime, returnDateTime)
      : Math.max(1, Math.ceil(form.durationHours / 24));
  const driverEstimate = calculateDriverCharge(rentalMode, rentalDays);
  const grandTotal = totalAmount + driverEstimate;

  // Check availability when dates change
  useEffect(() => {
    if (!pickupDateTime || !returnDateTime) {
      setAvailabilityCheck(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/availability?vehicleId=${vehicleId}&pickup=${pickupDateTime.toISOString()}&return=${returnDateTime.toISOString()}`
        );
        const json = await res.json();
        if (json.success) setAvailabilityCheck(json.data);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pickupDateTime, returnDateTime, vehicleId]);

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (availability !== "available") {
      setError("This vehicle is currently unavailable for booking.");
      return;
    }

    if (!pickupDateTime || !returnDateTime) {
      setError("Please select pickup date and time.");
      return;
    }

    if (availabilityCheck && !availabilityCheck.available) {
      setError(availabilityCheck.reason || "Vehicle not available for selected dates.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          customerName: form.customerName.trim(),
          // Strip spaces/dashes so the value matches the backend phoneRegex.
          customerPhone: form.customerPhone.replace(/[\s-]/g, "").trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          customerCnic: form.customerCnic.trim() || undefined,
          city: form.city.trim(),
          pickupDate: pickupDateTime.toISOString(),
          returnDate: returnDateTime.toISOString(),
          durationHours: form.durationHours,
          durationLabel:
            selectedPrice?.label || `${form.durationHours} Hours`,
          notes: form.notes || undefined,
          rentalMode,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        // Show the specific field problem rather than a generic message.
        setError(
          extractFieldError(json) || json.error || json.message || "Booking failed."
        );
        return;
      }

      // Success - redirect to confirmation
      router.push(`/bookings/${json.data.bookingId}/confirmation`);
    } catch (err) {
      console.error("[Booking] Submit error:", err);
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  if (availability !== "available") {
    return (
      <div className="rounded-2xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
        <h3 className="font-semibold text-orange-800 dark:text-orange-300">
          Currently Unavailable
        </h3>
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
          This vehicle cannot be booked right now. Please check other options.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="font-bold text-lg mb-1">Book {vehicleName}</h3>
        <p className="text-sm text-slate-500 flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" /> Secure booking • City-only service
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Rental Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRentalMode("self_drive")}
            className={`rounded-xl border p-3 text-left transition-all ${
              rentalMode === "self_drive"
                ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-slate-200 dark:border-slate-700 hover:border-brand-300"
            }`}
          >
            <div className="text-sm font-semibold">🚗 Self Drive</div>
            <div className="text-xs text-slate-500">
              Drive the vehicle yourself • No extra charge
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRentalMode("with_driver")}
            className={`rounded-xl border p-3 text-left transition-all ${
              rentalMode === "with_driver"
                ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-slate-200 dark:border-slate-700 hover:border-brand-300"
            }`}
          >
            <div className="text-sm font-semibold">👨‍✈️ With Driver</div>
            <div className="text-xs text-slate-500">
              +{formatCurrency(DRIVER_DAILY_RATE)}/day
            </div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Rental Duration</label>
        <div className="grid grid-cols-2 gap-2">
          {sortedPrices.map((p) => (
            <button
              key={p.durationHours}
              type="button"
              onClick={() => set("durationHours", p.durationHours)}
              className={`rounded-xl border p-3 text-left transition-all ${
                form.durationHours === p.durationHours
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-brand-300"
              }`}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="text-brand-600 font-bold text-sm">
                {formatCurrency(p.price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label="Pickup Date"
          type="date"
          required
          min={minDate}
          value={form.pickupDate}
          onChange={(e) => set("pickupDate", e.target.value)}
        />
        <Input
          label="Pickup Time"
          type="time"
          required
          value={form.pickupTime}
          onChange={(e) => set("pickupTime", e.target.value)}
        />
      </div>

      {returnDateTime && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-sm flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 text-brand-600 shrink-0" />
          <div>
            <p>
              <span className="text-slate-500">Return by:</span>{" "}
              <strong>
                {returnDateTime.toLocaleString("en-PK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
            </p>
            {availabilityCheck && (
              <p
                className={`mt-1 font-medium ${
                  availabilityCheck.available
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {availabilityCheck.available
                  ? "✓ Available for selected dates"
                  : `✗ ${availabilityCheck.reason}`}
              </p>
            )}
          </div>
        </div>
      )}

      <Input
        label="Full Name"
        required
        value={form.customerName}
        onChange={(e) => set("customerName", e.target.value)}
      />
      <Input
        label="Phone Number"
        required
        placeholder="03XXXXXXXXX"
        value={form.customerPhone}
        onChange={(e) => set("customerPhone", e.target.value)}
        hint="Pakistani mobile number"
      />
      <Input
        label="Email (optional)"
        type="email"
        value={form.customerEmail}
        onChange={(e) => set("customerEmail", e.target.value)}
      />
      <Input
        label="CNIC (optional)"
        placeholder="XXXXX-XXXXXXX-X"
        value={form.customerCnic}
        onChange={(e) => set("customerCnic", e.target.value)}
      />
      <Input
        label="City"
        required
        value={form.city}
        onChange={(e) => set("city", e.target.value)}
      />
      <Textarea
        label="Additional Notes"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Any special requests..."
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Vehicle</span>
          <span className="font-medium">{vehicleName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Duration</span>
          <span className="font-medium">{selectedPrice?.label}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Rate</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Driver
            {rentalMode === "with_driver"
              ? ` (${rentalDays} day${rentalDays === 1 ? "" : "s"})`
              : ""}
          </span>
          <span className="font-medium">
            {formatCurrency(driverEstimate)}
          </span>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg text-brand-600">
            {formatCurrency(grandTotal)}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 pt-1">
          Free cancellation up to 5 hours before pickup. Cancel later and your
          10% of payment will be conserved.
        </p>
      </div>

      {cancellationPolicy && (
        <p className="text-xs text-slate-500 leading-relaxed">
          <Calendar className="inline h-3 w-3 mr-1" />
          {cancellationPolicy}
        </p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm p-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={
          !!availabilityCheck && !availabilityCheck.available
        }
      >
        Continue to Payment — {formatCurrency(grandTotal)}
      </Button>
    </form>
  );
}
