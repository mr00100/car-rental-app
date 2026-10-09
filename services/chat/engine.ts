import type { SessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import {
  searchVehiclesTool,
  getUserBookingsTool,
  cancellationQuoteTool,
  pickupLocationTool,
  paymentMethodsTool,
  formatCurrency,
  formatDateTime,
  availabilityLabel,
  type ChatResult,
} from "./tools";

export type Intent =
  | "greeting"
  | "find_vehicle"
  | "budget"
  | "booking_help"
  | "booking_status"
  | "cancellation_policy"
  | "cancel_booking"
  | "rental_mode"
  | "verification"
  | "verification_status"
  | "payment"
  | "pickup"
  | "contact"
  | "how_it_works"
  | "unknown";

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));

  if (has("cancel my booking", "i want to cancel", "cancel booking r", "proceed with cancel", "continue cancellation"))
    return "cancel_booking";
  if (has("cancel", "refund", "late cancellation", "5 hour", "five hour", "deduction", "10%"))
    return "cancellation_policy";
  if (has("my booking", "booking status", "is my booking", "where is my", "is my rental", "my payment status", "is my payment", "payment successful", "refund status"))
    return "booking_status";
  if (has("self drive", "self-drive", "with driver", "do you provide driver", "driver cost", "without a driver", "driver fee", "hire a driver"))
    return "rental_mode";
  if (has("verify", "verification", "license", "licence", "selfie", "id card", "identity", "government id", "driving licence"))
    return has("status") ? "verification_status" : "verification";
  const hasBudgetNumber =
    /(?:rs\.?|pkr)\s*[\d,]{3,}/i.test(t) ||
    (/\b\d[\d,]{2,}\b/.test(t) && has("under", "below", "max", "less than"));
  if (
    has("under rs", "under r", "cheapest", "budget") ||
    (hasBudgetNumber && has("car", "bike"))
  )
    return "budget";
  if (has("available", "find", "show me", "look for", "search", "which car", "which bike", "suv", "sedan", "car available", "bike available", "available tomorrow", "this weekend"))
    return "find_vehicle";
  if (has("how do i book", "help me book", "book a", "rent a", "how to book", "book now", "rental duration"))
    return "booking_help";
  if (has("pay", "easypaisa", "jazzcash", "stripe", "card", "receipt", "payment method", "how to pay"))
    return "payment";
  if (has("where do i pick", "pickup", "pick up", "location", "map", "address", "how do i get", "where are you"))
    return "pickup";
  if (has("contact", "human", "agent", "call", "talk to", "support team", "phone number", "email you"))
    return "contact";
  if (has("how does", "how it works", "steps", "process", "guide"))
    return "how_it_works";
  if (has("hi", "hello", "hey", "salam", "as-salam", "assalam", "good morning", "good evening"))
    return "greeting";
  return "unknown";
}

function typeFromText(text: string): "car" | "bike" | undefined {
  const t = text.toLowerCase();
  if (/\bbike|motorcycle|70cc|125|cd 70|ybr\b/.test(t)) return "bike";
  if (/\bcar|suv|sedan|4x4|vehicle\b/.test(t)) return "car";
  return undefined;
}

function categoryFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  const brands = ["toyota", "honda", "suzuki", "yamaha", "kawasaki"];
  const found = brands.find((b) => t.includes(b));
  if (found) return found.charAt(0).toUpperCase() + found.slice(1);
  if (t.includes("corolla")) return "Toyota";
  if (t.includes("civic") || t.includes("city")) return "Honda";
  if (t.includes("mehran") || t.includes("alto") || t.includes("wagon") || t.includes("apv")) return "Suzuki";
  if (t.includes("ybr")) return "Yamaha";
  return undefined;
}

function budgetFromText(text: string): number | undefined {
  const t = text.toLowerCase();
  const m = t.match(/(?:rs\.?|pkr)\s*([\d,]+)/i) || t.match(/([\d,]{4,})/);
  if (m) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n >= 500) return n;
  }
  return undefined;
}

function passengersFromText(text: string): number | undefined {
  const t = text.toLowerCase();
  const m = t.match(/(\d+)\s*(?:people|person|passenger|seats?)/);
  if (m) return parseInt(m[1], 10);
  if (t.includes("five") || t.includes("family of 5") || t.includes("5 people") || t.includes("5 person")) return 5;
  if (t.includes("seven") || t.includes("7 people") || t.includes("7 seater") || t.includes("seven")) return 7;
  return undefined;
}

async function vehicleAnswer(
  type?: "car" | "bike",
  query?: string,
  budget?: number,
  passengers?: number
): Promise<ChatResult> {
  const cards = await searchVehiclesTool({
    type,
    query,
    maxDayPrice: budget,
    passengers,
  });
  if (!cards.length) {
    return {
      text: `I couldn't find any available ${type === "bike" ? "bikes" : "vehicles"} matching that right now. Try widening your budget or browse the full catalog.`,
      links: [
        {
          label: type === "bike" ? "Browse all bikes" : "Browse all cars",
          href: type === "bike" ? "/bikes" : "/cars",
        },
      ],
    };
  }
  const noun = type === "bike" ? "bikes" : "cars";
  const lines = cards
    .map((c) => {
      const price = c.dayPrice ?? c.minPrice;
      return `• ${c.brand} ${c.name} — ${price != null ? formatCurrency(price) + "/day" : "see pricing"} · ${availabilityLabel(c.availability)}`;
    })
    .join("\n");
  return {
    text: `Here are available ${noun} from the real catalog${budget ? ` under ${formatCurrency(budget)}` : ""}:\n\n${lines}\n\nTap a card to view or book.`,
    vehicles: cards,
  };
}

export async function handleMessage(
  text: string,
  session: SessionUser | null
): Promise<ChatResult> {
  const settings = await getSettings();
  const intent = detectIntent(text);

  switch (intent) {
    case "greeting":
      return {
        text: `Hi! 👋 I'm your ${settings.chatbotName}. I can help you find a vehicle, book, handle payments, explain cancellation, choose self-drive or a driver, and verify your license. What do you need?`,
      };

    case "find_vehicle":
    case "budget": {
      const type = typeFromText(text);
      const budget = budgetFromText(text);
      const passengers = passengersFromText(text);
      const category = categoryFromText(text);
      return vehicleAnswer(type, category, budget, passengers);
    }

    case "booking_help":
      return {
        text:
          "Sure! Booking takes a minute:\n\n1️⃣ Open a vehicle and choose your pickup/return dates & time\n2️⃣ Choose 🚗 Self-Drive or 👨‍✈️ With Driver\n3️⃣ Complete verification (self-drive) if required\n4️⃣ Pay via EasyPaisa/JazzCash/Stripe\n5️⃣ We confirm and release your receipt\n\nShall I show you available vehicles?",
        links: [
          { label: "🚗 Browse cars", href: "/cars" },
          { label: "🏍 Browse bikes", href: "/bikes" },
        ],
      };

    case "how_it_works":
      return {
        text: "It's simple: search a vehicle → check live availability → pick dates & self-drive/driver → pay → pick up. Our service is inside the city, and a valid license/CNIC is required for self-drive.",
        links: [
          { label: "How it works", href: "/how-it-works" },
          { label: "Contact support", href: "/contact" },
        ],
      };

    case "rental_mode":
      return {
        text:
          `🚗 Self-Drive — you drive yourself; driving-license verification is required.\n\n👨‍✈️ With Driver — a company-approved driver is assigned, so license verification isn't required. The driver fee is ${formatCurrency(
            Number(settings.driverDailyFee) || 2000
          )}/day and is added to your total at checkout.\n\nDriver availability is checked against real bookings and never double-assigned.`,
        links: [
          { label: "🚗 Browse cars", href: "/cars" },
        ],
      };

    case "verification":
      return {
        text:
          "For self-drive rentals our team may request a valid driving license and government ID before pickup. Just send your booking reference and our team will guide you — documents are kept private and never shown publicly.",
        links: [
          { label: "Contact support", href: "/contact" },
        ],
      };

    case "verification_status": {
      return {
        text: "Document verification is handled per-booking by our team. Use the Track My Rental page with your booking reference, or contact support with your reference and we'll confirm the status.",
        links: [
          { label: "Track my rental", href: "/dashboard" },
          { label: "Contact support", href: "/contact" },
        ],
      };
    }

    case "cancellation_policy": {
      return {
        text: `Our cancellation policy (calculated from the server at the moment you cancel):\n\n✓ More than ${settings.cancellationDeadlineHours} hours before pickup → 100% refund, 0% deduction\n\n⚠ At or inside ${settings.cancellationDeadlineHours} hours (late cancellation) → your ${settings.cancellationFeePercent}% of payment will be conserved, so you receive ${100 - Number(settings.cancellationFeePercent)}% back.\n\nThe exact amount is always calculated against your actual booking. Want me to check one?`,
        links: [{ label: "Track my rental", href: "/dashboard" }],
      };
    }

    case "cancel_booking":
    case "booking_status": {
      if (!session) {
        return {
          text: "You can check or cancel any rental without an account using the Track My Rental page — just enter your booking reference (e.g. RAC-2026-000125). Would you like to open it?",
          links: [
            { label: "Track my rental", href: "/dashboard" },
            { label: "Contact support", href: "/contact" },
          ],
        };
      }
      const myBookings = await getUserBookingsTool(session);
      if (!myBookings.length) {
        return {
          text: "I don't see any bookings on your account yet.",
          links: [
            { label: "🚗 Find a vehicle", href: "/cars" },
            { label: "My bookings", href: "/dashboard" },
          ],
        };
      }

      // If the user included a booking reference, check that one.
      const refMatch = text.match(/RAC-\d{4}-\d+/i);
      const target = refMatch
        ? myBookings.find((b) => b.bookingId.toLowerCase() === refMatch[0].toLowerCase())
        : myBookings[0];

      if (!target) {
        return {
          text: "I couldn't find that booking reference on your account. Here are your recent bookings — open one to continue.",
          links: [{ label: "My bookings", href: "/dashboard" }],
        };
      }

      if (intent === "cancel_booking") {
        const result = await cancellationQuoteTool(session, target.bookingId);
        if (result.notFound || result.forbidden) {
          return { text: "I couldn't access that booking. Please open My Bookings." };
        }
        const q = result.quote;
        return {
          text: `I found your booking ${target.bookingId} (${result.vehicle?.brand} ${result.vehicle?.name}).\n\nCancellation deadline: ${formatDateTime(q.cancellationDeadline)}\n\n${q.isLate ? "⚠ Late cancellation — your 10% of payment will be conserved." : "✓ You're within the free-cancellation window."}\n\nOriginal: ${formatCurrency(q.originalAmount)}\nDeduction: − ${formatCurrency(q.deductionAmount)} (${q.deductionPercentage}%)\nEstimated refund: ${formatCurrency(q.refundAmount)}\n\nI won't cancel anything without your confirmation.`,
          links: [
            { label: "Continue cancellation", href: `/bookings/${target.bookingId}/confirmation` },
            { label: "Keep booking (My bookings)", href: "/dashboard" },
          ],
        };
      }

      const [payment] = await dbPayments(target.id);
      return {
        text: `Your latest booking:\n\n${target.bookingId}\nPickup: ${formatDateTime(target.pickupDate)}\nReturn: ${formatDateTime(target.returnDate)}\nAmount: ${formatCurrency(target.totalAmount)}\nStatus: ${target.status.replace(/_/g, " ")}\nRental: ${target.rentalMode === "with_driver" ? "With Driver" : "Self-Drive"}\nPayment: ${payment ? payment.status.replace(/_/g, " ") : "not paid yet"}`,
        links: [
          { label: "View booking / receipt", href: `/bookings/${target.bookingId}/confirmation` },
          { label: "My bookings", href: "/dashboard" },
        ],
      };
    }

    case "payment": {
      const pm = await paymentMethodsTool();
      return {
        text: `We accept: ${pm.methods.join(", ")}. You pay after booking, then submit your transaction ID for verification. For your own safety, never share card numbers, CVV, OTP, or passwords in chat.\n\nRefunds after cancellation are processed once the gateway or our team confirms them.`,
        links: [{ label: "Contact support", href: "/contact" }],
      };
    }

    case "pickup": {
      const loc = await pickupLocationTool();
      return {
        text: `📍 Pickup location:\n${loc.address || loc.city}\n\nThis is inside ${loc.city} and is shown on the map on the vehicle booking page.`,
        links: [
          { label: "Open in Google Maps", href: loc.mapsUrl },
          { label: "Contact / directions", href: "/contact" },
        ],
      };
    }

    case "contact":
      return {
        text: `I'll connect you with our team. Support hours: ${settings.chatbotSupportHours}. You can send a message and we'll respond.`,
        links: [
          { label: "👤 Contact support", href: "/contact" },
        ],
      };

    default:
      return {
        text: "I don't have enough information to confirm that from the system, and I won't guess. I can help find real available vehicles, check your bookings/payments, explain cancellation, verification, drivers, or the pickup location. What would you like?",
        links: [
          { label: "🚗 Find a vehicle", href: "/cars" },
          { label: "👤 Contact support", href: "/contact" },
        ],
      };
  }
}

// Tiny local helper to avoid circular imports at module top.
async function dbPayments(bookingId: number) {
  const { payments } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  return db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, bookingId))
    .limit(1);
}
