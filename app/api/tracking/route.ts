import { NextRequest } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { ingestLocation, getFleetLocations } from "@/services/tracking";

// Admin/staff: live fleet locations (honest online/offline status).
export async function GET() {
  try {
    await requireAdmin();
    const locations = await getFleetLocations();
    return jsonOk({ locations, serverTime: new Date().toISOString() });
  } catch (err) {
    return handleApiError(err);
  }
}

// Authenticated device ingest endpoint (device secret verified in service).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.deviceId || !body.secret) {
      return jsonOk({ ok: false, error: "deviceId and secret required" }, 400);
    }
    const result = await ingestLocation({
      deviceId: body.deviceId,
      secret: body.secret,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      speed: body.speed != null ? Number(body.speed) : undefined,
      heading: body.heading != null ? Number(body.heading) : undefined,
    });
    return jsonOk(result, result.ok ? 200 : 400);
  } catch (err) {
    return handleApiError(err);
  }
}
