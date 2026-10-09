import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManageSettings } from "@/lib/auth";
import { getSettings, setSettings, type AppSettings } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getSettings();
    return jsonOk(settings);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManageSettings(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const allowed: (keyof AppSettings)[] = [
      "businessName",
      "businessPhone",
      "businessWhatsapp",
      "businessEmail",
      "businessCity",
      "businessAddress",
      "easypaisaNumber",
      "easypaisaAccountName",
      "currency",
      "cancellationDeadlineHours",
      "cancellationFeePercent",
      "refundPercent",
      "noRefundHours",
      "termsOfService",
      "privacyPolicy",
      "disclaimer",
      "cancellationPolicy",
      "openingHours",
      "bookingRules",
      "enableLateCancellation",
      "allowCancellationAfterDeadline",
      "driverDailyFee",
      "requireLicenseVerification",
      "jazzcashNumber",
      "paymentProvider",
      "smsEnabled",
      "emailEnabled",
      "trackingEnabled",
      "pickupLat",
      "pickupLng",
      "chatbotEnabled",
      "chatbotName",
      "chatbotWelcome",
      "chatbotSupportHours",
      "chatbotMaxLength",
      "chatbotRatePerMinute",
      "supportContact",
    ];

    const updates: Partial<AppSettings> = {};
    for (const key of allowed) {
      if (body[key] !== undefined && typeof body[key] === "string") {
        updates[key] = body[key];
      }
    }

    await setSettings(updates);

    await logAudit({
      admin,
      action: "Updated settings",
      targetType: "settings",
      newValue: updates,
    });

    const settings = await getSettings();
    return jsonOk(settings);
  } catch (err) {
    return handleApiError(err);
  }
}
