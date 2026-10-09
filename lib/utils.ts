import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Human-readable labels for booking API field names, so a zod field error can
// be shown to a customer instead of the generic "Validation failed".
const FIELD_LABELS: Record<string, string> = {
  vehicleId: "Vehicle",
  customerName: "Full name",
  customerPhone: "Phone number",
  customerEmail: "Email address",
  customerCnic: "CNIC",
  city: "City",
  pickupDate: "Pickup date",
  returnDate: "Return date",
  durationHours: "Rental duration",
  durationLabel: "Rental duration",
  rentalMode: "Rental mode",
  driverId: "Driver",
  notes: "Notes",
};

/**
 * Extract a customer-safe, field-specific message from the API's zod error
 * payload: { success:false, error:"Validation failed", details:{ field:[msg] } }
 * Returns null when no field-level detail is available.
 */
export function extractFieldError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const details = (json as { details?: unknown }).details;
  if (!details || typeof details !== "object") return null;

  const entries = Object.entries(details as Record<string, unknown>);
  if (!entries.length) return null;

  const [field, messages] = entries[0];
  const label = FIELD_LABELS[field] || field;
  const first = Array.isArray(messages) ? messages[0] : messages;
  const text = typeof first === "string" ? first : null;
  return text ? `${label}: ${text}` : `${label} is invalid.`;
}

export function formatCurrency(amount: number, currency = "PKR"): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function generateBookingId(seq: number): string {
  const year = new Date().getFullYear();
  return `RAC-${year}-${String(seq).padStart(6, "0")}`;
}

export function generatePublicBookingId(): string {
  const crypto = require("crypto");
  const randomStr = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `RAC-${randomStr}`;
}

export function generateVerificationCode(length: number = 6): string {
  const crypto = require("crypto");
  return crypto.randomInt(0, Math.pow(10, length))
    .toString()
    .padStart(length, "0");
}

export function normalizeEmail(email: string | null): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // If it doesn't start with country code, assume +92 (Pakistan)
  if (!digits.startsWith("92") && digits.length === 11) {
    return "92" + digits.slice(1);
  }
  return digits;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hoursToLabel(hours: number): string {
  if (hours < 24) return `${hours} Hour${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} Day${days > 1 ? "s" : ""}`;
}

export function availabilityLabel(status: string): string {
  const map: Record<string, string> = {
    available: "Available",
    reserved: "Reserved",
    rented: "Currently Rented",
    maintenance: "Under Maintenance",
    disabled: "Unavailable",
  };
  return map[status] || status;
}

export function bookingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    payment_pending: "Payment Pending",
    payment_submitted: "Payment Submitted",
    confirmed: "Confirmed",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };
  return map[status] || status;
}

export function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    submitted: "Submitted",
    verified: "Verified",
    rejected: "Rejected",
    refunded: "Refunded",
  };
  return map[status] || status;
}

export function getAvailabilityColor(status: string): string {
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    rented: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    disabled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] || map.disabled;
}

export function getBookingStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    payment_pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    payment_submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    active: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };
  return map[status] || map.pending;
}

export function hashToken(token: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const crypto = require("crypto");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
