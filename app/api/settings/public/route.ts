import { jsonOk, handleApiError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const s = await getSettings();
    // Only expose public settings
    return jsonOk({
      businessName: s.businessName,
      businessPhone: s.businessPhone,
      businessWhatsapp: s.businessWhatsapp,
      businessEmail: s.businessEmail,
      businessCity: s.businessCity,
      businessAddress: s.businessAddress,
      easypaisaNumber: s.easypaisaNumber,
      easypaisaAccountName: s.easypaisaAccountName,
      currency: s.currency,
      openingHours: s.openingHours,
      disclaimer: s.disclaimer,
      cancellationPolicy: s.cancellationPolicy,
      cancellationDeadlineHours: s.cancellationDeadlineHours,
      cancellationFeePercent: s.cancellationFeePercent,
      driverDailyFee: s.driverDailyFee,
      bookingRules: s.bookingRules,
      termsOfService: s.termsOfService,
      privacyPolicy: s.privacyPolicy,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
