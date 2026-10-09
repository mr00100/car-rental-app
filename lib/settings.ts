import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AppSettings = {
  businessName: string;
  businessPhone: string;
  businessWhatsapp: string;
  businessEmail: string;
  businessCity: string;
  businessAddress: string;
  easypaisaNumber: string;
  easypaisaAccountName: string;
  currency: string;
  cancellationDeadlineHours: string;
  cancellationFeePercent: string;
  refundPercent: string;
  noRefundHours: string;
  termsOfService: string;
  privacyPolicy: string;
  disclaimer: string;
  cancellationPolicy: string;
  openingHours: string;
  bookingRules: string;
  // Advanced platform toggles
  // Cancellation policy
  enableLateCancellation: string; // "true" | "false"
  allowCancellationAfterDeadline: string; // "true" | "false"
  driverDailyFee: string;
  requireLicenseVerification: string; // "true" | "false"
  jazzcashNumber: string;
  paymentProvider: string; // easypaisa | jazzcash | stripe | mock
  smsEnabled: string; // "true" | "false"
  emailEnabled: string; // "true" | "false"
  trackingEnabled: string; // "true" | "false"
  pickupLat: string;
  pickupLng: string;
  // Chatbot
  chatbotEnabled: string;
  chatbotName: string;
  chatbotWelcome: string;
  chatbotSupportHours: string;
  chatbotMaxLength: string;
  chatbotRatePerMinute: string;
  supportContact: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: "Rent A Car",
  businessPhone: "+92 300 1234567",
  businessWhatsapp: "+92 300 1234567",
  businessEmail: "support@rentacar.pk",
  businessCity: "Lahore",
  businessAddress: "Main Boulevard, Gulberg III, Lahore, Pakistan",
  easypaisaNumber: "03001234567",
  easypaisaAccountName: "Rent A Car Services",
  currency: "PKR",
  cancellationDeadlineHours: "5",
  cancellationFeePercent: "10",
  refundPercent: "90",
  noRefundHours: "0",
  termsOfService:
    "By booking a vehicle, you agree to our rental terms. Vehicles must be returned in the same condition. Fuel policy is full-to-full. Valid CNIC and driving license required at pickup. This service is available inside the city only.",
  privacyPolicy:
    "We collect personal information solely for booking and communication purposes. Your data is never sold to third parties. Payment information is handled securely.",
  disclaimer:
    "This service is available inside the city only. Out-of-city travel requires prior written approval and additional charges.",
  cancellationPolicy:
    "Cancel more than 5 hours before your pickup time for a full 100% refund. If you cancel within 5 hours of pickup, your 10% of payment will be conserved and you receive a 90% refund.",
  openingHours: "Mon–Sun: 8:00 AM – 10:00 PM",
  bookingRules:
    "Minimum rental is 3 hours. Valid CNIC required. Driver must hold a valid license. Security deposit may apply for premium vehicles.",
  enableLateCancellation: "true",
  allowCancellationAfterDeadline: "true",
  driverDailyFee: "2000",
  requireLicenseVerification: "false",
  jazzcashNumber: "03001234567",
  paymentProvider: "easypaisa",
  smsEnabled: "false",
  emailEnabled: "true",
  trackingEnabled: "false",
  pickupLat: "31.5204",
  pickupLng: "74.3587",
  chatbotEnabled: "true",
  chatbotName: "Rental Assistant",
  chatbotWelcome:
    "Hi! 👋 Welcome to our Rental Assistant. I can help you find a vehicle, book, pay, cancel, verify your license, and more. How can I help you?",
  chatbotSupportHours: "Mon–Sun, 8:00 AM – 10:00 PM",
  chatbotMaxLength: "600",
  chatbotRatePerMinute: "20",
  supportContact: "support@rentacar.pk",
};

let settingsCache: AppSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getSettings(): Promise<AppSettings> {
  if (settingsCache && Date.now() - cacheTime < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const rows = await db.select().from(settings);
    const map = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      if (row.key in map) {
        (map as Record<string, string>)[row.key] = row.value || "";
      }
    }

    settingsCache = map;
    cacheTime = Date.now();
    return map;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getSetting(key: keyof AppSettings): Promise<string> {
  const all = await getSettings();
  return all[key];
}

export async function setSetting(
  key: string,
  value: string
): Promise<void> {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }

  settingsCache = null;
}

export async function setSettings(
  data: Partial<AppSettings>
): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      await setSetting(key, value);
    }
  }
  settingsCache = null;
}

export function clearSettingsCache() {
  settingsCache = null;
}
