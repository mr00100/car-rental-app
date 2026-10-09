import { jsonOk, handleApiError } from "@/lib/api";
import { getPublicMapsKey, mapsConfigured } from "@/services/maps";
import { getSettings } from "@/lib/settings";

// Public, safe map config. Only the NEXT_PUBLIC key is exposed (never a
// server-only secret).
export async function GET() {
  try {
    const settings = await getSettings();
    return jsonOk({
      publicKey: getPublicMapsKey(),
      configured: mapsConfigured(),
      businessCity: settings.businessCity,
      businessAddress: settings.businessAddress,
      // Default pickup coordinates (Lahore city center) unless configured.
      pickupLat: Number(process.env.PICKUP_LAT || 31.5204),
      pickupLng: Number(process.env.PICKUP_LNG || 74.3587),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
