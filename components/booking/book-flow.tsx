"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Car, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, availabilityLabel, cn, extractFieldError } from "@/lib/utils";
import {
  calculateDriverCharge,
  calculateRentalDays,
  DRIVER_DAILY_RATE,
} from "@/lib/booking-pricing";

type Step = "details" | "contact" | "confirmed";
type Price = { durationHours: number; label: string; price: number };

type Vehicle = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  modelYear: number;
  color: string;
  vehicleType: "car" | "bike";
  coverImage: string | null;
  availability: string;
};

type BookingResult = {
  bookingId: string;
  verificationCode: string;
  totalAmount: number;
};

export function BookFlow({
  vehicle,
  prices,
  defaultPickup,
  defaultReturn,
  defaultPickupTime,
  defaultReturnTime,
  defaultMode,
}: {
  vehicle: Vehicle;
  prices: Price[];
  defaultPickup: string;
  defaultReturn: string;
  defaultPickupTime: string;
  defaultReturnTime: string;
  defaultMode: "self_drive" | "with_driver";
}) {
  const router = useRouter();
  const sorted = useMemo(
    () => [...prices].sort((a, b) => a.durationHours - b.durationHours),
    [prices]
  );
  const default24 = sorted.find((p) => p.durationHours === 24) || sorted[0];

  const [step, setStep] = useState<Step>("details");
  const [rentalMode, setRentalMode] = useState<"self_drive" | "with_driver">(
    defaultMode
  );
  const [durationHours, setDurationHours] = useState(
    default24 ? default24.durationHours : 24
  );
  const [pickupDate, setPickupDate] = useState(defaultPickup);
  const [pickupTime, setPickupTime] = useState(defaultPickupTime);
  const [returnDate, setReturnDate] = useState(defaultReturn);
  const [returnTime, setReturnTime] = useState(defaultReturnTime);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropOffLocation, setDropOffLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCnic] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseUrl, setLicenseUrl] = useState("");
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseUploadMessage, setLicenseUploadMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState<BookingResult | null>(null);

  const selectedPrice = sorted.find((p) => p.durationHours === durationHours);
  const vehicleRentalAmount = selectedPrice?.price ?? 0;

  const pickupDateTime =
    pickupDate && pickupTime ? new Date(`${pickupDate}T${pickupTime}`) : null;
  const returnDateTime =
    returnDate && returnTime ? new Date(`${returnDate}T${returnTime}`) : null;
  const rentalDays =
    pickupDateTime && returnDateTime
      ? calculateRentalDays(pickupDateTime, returnDateTime)
      : Math.max(1, Math.ceil(durationHours / 24));
  const driverCharge = calculateDriverCharge(rentalMode, rentalDays);
  const estimatedTotal = vehicleRentalAmount + driverCharge;

  const [availability, setAvailability] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  useEffect(() => {
    if (!pickupDateTime || !returnDateTime) {
      setAvailability(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/availability?vehicleId=${vehicle.id}&pickup=${pickupDateTime.toISOString()}&return=${returnDateTime.toISOString()}`
        );
        const json = await res.json();
        if (json.success) setAvailability(json.data);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pickupDateTime, returnDateTime, vehicle.id]);

  const stepIndex: Record<Step, number> = {
    details: 0,
    contact: 1,
    confirmed: 2,
  };
  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: "details", label: "Rental details", icon: Calendar },
    { key: "contact", label: "Contact info", icon: Mail },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  ];

  const uploadLicense = async (file: File) => {
    if (!cnic.trim()) {
      setLicenseUploadMessage("CNIC is required.");
      return;
    }
    setLicenseFile(file);
    setLicenseUploadMessage("");
    setLicenseUrl("");

    if (!file.type.toLowerCase().match(/^image\/(jpeg|jpg)$/)) {
      setLicenseUploadMessage("Please select a JPG or JPEG image.");
      setLicenseFile(null);
      return;
    }

    setLicenseUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fullName", name.trim());
      formData.append("email", email.trim());
      formData.append("cnic", cnic.trim());
      const res = await fetch("/api/license-upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLicenseFile(null);
        setLicenseUploadMessage(json.error || "License upload failed.");
        return;
      }
      setLicenseUrl(json.data.url);
      setLicenseUploadMessage("License uploaded successfully.");
    } catch {
      setLicenseFile(null);
      setLicenseUploadMessage("License upload failed. Please try again.");
    } finally {
      setLicenseUploading(false);
    }
  };

  const createBooking = async () => {
    if (!name.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    // Normalize separators before validating: the backend phoneRegex accepts
    // digits only (e.g. 03001234567 or +923001234567), so spaces/dashes typed
    // by the customer are stripped here rather than sent and rejected.
    const normalizedPhone = phone.replace(/[\s-]/g, "").trim();
    if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
      setSubmitError("Please enter a valid phone number.");
      return;
    }
    const normalizedEmail = email.trim();
    if (normalizedEmail && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setSubmitError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          customerName: name.trim(),
          customerPhone: normalizedPhone,
          customerEmail: normalizedEmail || undefined,
          city: (pickupLocation || "Lahore").trim(),
          pickupDate: pickupDateTime!.toISOString(),
          returnDate: returnDateTime!.toISOString(),
          durationHours,
          durationLabel: selectedPrice?.label || `${durationHours} Hours`,
          notes: notes || undefined,
          rentalMode,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        // Surface the specific field error instead of a generic
        // "Validation failed" so the customer can correct it.
        setSubmitError(extractFieldError(json) || json.error || "Booking failed.");
        return;
      }
      setConfirmed({
        bookingId: json.data.bookingId,
        verificationCode: json.data.verificationCode,
        totalAmount: json.data.totalAmount,
      });
      setStep("confirmed");
    } catch {
      setSubmitError("Unable to connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === "details") {
      if (!pickupDate || !returnDate) {
        setSubmitError("Please select pickup and return dates.");
        return;
      }
      if (!pickupDateTime || !returnDateTime || returnDateTime <= pickupDateTime) {
        setSubmitError("Return must be after pickup.");
        return;
      }
      if (availability && !availability.available) {
        setSubmitError(availability.reason || "Vehicle unavailable.");
        return;
      }
      setSubmitError("");
      setStep("contact");
    } else if (step === "contact") {
      createBooking();
    }
  };

  const isAvailable = vehicle.availability === "available";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 text-sm text-slate-500">
        <Link
          href={vehicle.vehicleType === "bike" ? `/bikes/${vehicle.slug}` : `/cars/${vehicle.slug}`}
          className="hover:text-brand-600"
        >
          ← {vehicle.brand} {vehicle.name}
        </Link>
      </div>

      {/* Stepper */}
      <ol className="flex items-center justify-between mb-8 overflow-x-auto">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = stepIndex[step] > i || step === "confirmed";
          const active = step === s.key;
          return (
            <li key={s.key} className="flex-1 flex items-center min-w-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="ml-2 min-w-0 hidden sm:block">
                <p
                  className={cn(
                    "text-xs truncate",
                    active ? "text-brand-600 font-semibold" : "text-slate-500"
                  )}
                >
                  {s.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3",
                    done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Vehicle summary card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6 flex items-center gap-4">
        {vehicle.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.coverImage}
            alt={vehicle.name}
            className="h-16 w-24 rounded-xl object-cover"
          />
        ) : (
          <div className="h-16 w-24 rounded-xl bg-slate-200" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-tight truncate">
            {vehicle.brand} {vehicle.name}
          </p>
          <p className="text-xs text-slate-500">
            {vehicle.modelYear} • {vehicle.color} •{" "}
            {availabilityLabel(vehicle.availability)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">From</p>
          <p className="text-lg font-extrabold text-brand-600">
            {vehicleRentalAmount > 0
              ? formatCurrency(vehicleRentalAmount)
              : "—"}
            <span className="text-xs font-normal text-slate-400"> /pkg</span>
          </p>
        </div>
      </div>

      {!isAvailable && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4 mb-4 text-sm text-orange-800 dark:text-orange-300">
          This vehicle is currently unavailable for booking.
        </div>
      )}

      {step === "details" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rental Duration</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sorted
                .filter((p) => [3, 6, 12, 24].includes(p.durationHours))
                .slice(0, 4)
                .map((p) => (
                  <button
                    key={p.durationHours}
                    type="button"
                    onClick={() => setDurationHours(p.durationHours)}
                    className={cn(
                      "rounded-xl border p-2.5 text-left",
                      durationHours === p.durationHours
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-sm font-bold">
                      {formatCurrency(p.price)}
                    </div>
                  </button>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pickup Date"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
            />
            <Input
              label="Pickup Time"
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />
            <Input
              label="Return Date"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
            <Input
              label="Return Time"
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-2">
              Driving Option <span className="text-red-500">*</span>
            </legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={rentalMode === "self_drive"}
                onClick={() => setRentalMode("self_drive")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  rentalMode === "self_drive"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-brand-300"
                )}
              >
                <p className="font-semibold">🚗 Self Drive</p>
                <p className="text-sm text-slate-500 mt-1">
                  Drive the vehicle yourself
                </p>
                <p className="text-xs font-medium text-emerald-600 mt-2">
                  No additional driver charge
                </p>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={rentalMode === "with_driver"}
                onClick={() => setRentalMode("with_driver")}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  rentalMode === "with_driver"
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-brand-300"
                )}
              >
                <p className="font-semibold">👨‍✈️ With Driver</p>
                <p className="text-sm text-slate-500 mt-1">
                  Professional driver included
                </p>
                <p className="text-xs font-medium text-brand-600 mt-2">
                  + {formatCurrency(DRIVER_DAILY_RATE)} / day
                </p>
              </button>
            </div>
          </fieldset>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-slate-500">Vehicle Rental</span>
              <span className="font-medium">
                {formatCurrency(vehicleRentalAmount)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">
                Driver{rentalMode === "with_driver" ? ` (${rentalDays} day${rentalDays === 1 ? "" : "s"})` : ""}
              </span>
              <span className="font-medium">
                {formatCurrency(driverCharge)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-extrabold text-brand-600">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Pickup Location"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Gulberg III, Lahore"
            />
            <Input
              label="Drop-off Location (optional)"
              value={dropOffLocation}
              onChange={(e) => setDropOffLocation(e.target.value)}
              placeholder="Same as pickup"
            />
          </div>
          <Textarea
            label="Additional Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything we should know"
          />
          {availability && !availability.available && (
            <p className="text-sm text-red-600">{availability.reason}</p>
          )}
          {submitError && (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={goNext} size="lg" disabled={!isAvailable}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "contact" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            placeholder="03001234567"
            hint="Pakistani mobile number"
          />
          <Input
            label="Email Address (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="CNIC"
            type="text"
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            required
            placeholder="35202-1234567-1"
            hint="Required"
          />
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">UPLOAD LISENCE</p>
              <p className="text-xs text-slate-500 mt-1">Upload your driving license image in JPG or JPEG format.</p>
            </div>
            <input
              type="file"
              accept=".jpg,.jpeg,image/jpeg,image/jpg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadLicense(file);
              }}
              className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
            />
            {licenseUploading && (
              <p className="text-xs text-brand-600">Uploading license...</p>
            )}
            {licenseUploadMessage && (
              <p className={cn("text-xs", licenseUrl ? "text-emerald-600" : "text-red-600")} role="status">
                {licenseUploadMessage}
              </p>
            )}
            {licenseFile && licenseUrl && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={licenseUrl} alt="Uploaded driving license" className="h-16 w-24 rounded-lg object-cover" />
                <span className="text-xs text-emerald-600 font-medium">Uploaded</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            We never share your details. We will only use them to confirm your
            booking and contact you about your rental.
          </p>

          {submitError && (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("details")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext} size="lg" loading={submitting}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "confirmed" && confirmed && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Booking confirmed</h1>
          <p className="text-slate-500">
            Thank you, {name.split(" ")[0]}! Your booking has been confirmed.
            Save these two codes — you'll need them to manage this rental.
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-left">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Booking ID</p>
                <p className="font-bold font-mono">{confirmed.bookingId}</p>
              </div>
              <CopyButton text={confirmed.bookingId} />
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Verification Code</p>
                <p className="font-bold font-mono">{confirmed.verificationCode}</p>
              </div>
              <CopyButton text={confirmed.verificationCode} />
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Pickup</p>
              <p className="text-sm font-medium">
                {pickupDateTime ? formatDateTime(pickupDateTime) : "—"}
              </p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Vehicle</p>
              <p className="text-sm font-medium">
                {vehicle.brand} {vehicle.name}
              </p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Driving Option</p>
              <p className="text-sm font-medium">
                {rentalMode === "with_driver" ? "With Driver" : "Self Drive"}
              </p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Driver Charge</p>
              <p className="text-sm font-medium">
                {formatCurrency(driverCharge)}
              </p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-lg font-extrabold text-brand-600">
                {formatCurrency(confirmed.totalAmount)}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => router.push(`/manage-booking?ref=${confirmed.bookingId}&code=${confirmed.verificationCode}`)}>
              Manage Booking
            </Button>
            <Button variant="outline" onClick={() => router.push(`/bookings/${confirmed.bookingId}/payment`)}>
              Pay Now
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            We also emailed your booking confirmation{email ? ` to ${email}` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text)}
      className="text-xs text-brand-600 hover:underline"
    >
      Copy
    </button>
  );
}

import { formatDateTime } from "@/lib/utils";

