import { db } from "@/db";
import {
  vehicleLocations,
  trackingEvents,
  gpsDevices,
  vehicles,
} from "@/db/schema";
import { eq, sql, desc, lt } from "drizzle-orm";
import { hashSecret } from "@/lib/crypto";

const RETENTION_DAYS = Number(process.env.TRACKING_RETENTION_DAYS || 7);
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export type LocationUpdate = {
  deviceId: string;
  secret: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
};

// Authenticated ingest of a location update from an authorized device.
export async function ingestLocation(update: LocationUpdate) {
  const [device] = await db
    .select()
    .from(gpsDevices)
    .where(eq(gpsDevices.deviceId, update.deviceId))
    .limit(1);

  if (!device) return { ok: false, error: "Unknown device" };
  if (!device.trackingEnabled)
    return { ok: false, error: "Tracking disabled for this device" };
  if (!device.authorizedConsent)
    return { ok: false, error: "Device is not authorized/consented" };
  if (!device.vehicleId) return { ok: false, error: "Device not bound to a vehicle" };

  // Verify shared secret
  if (device.secretHash && device.secretHash !== hashSecret(update.secret)) {
    return { ok: false, error: "Invalid device secret" };
  }

  const lat = String(update.latitude);
  const lng = String(update.longitude);

  // Upsert latest location (1 row per vehicle)
  const existing = await db
    .select({ id: vehicleLocations.id })
    .from(vehicleLocations)
    .where(eq(vehicleLocations.vehicleId, device.vehicleId))
    .limit(1);

  if (existing.length) {
    await db
      .update(vehicleLocations)
      .set({
        latitude: lat,
        longitude: lng,
        speed: update.speed != null ? String(update.speed) : null,
        heading: update.heading != null ? String(update.heading) : null,
        status: "online",
        updatedAt: new Date(),
      })
      .where(eq(vehicleLocations.vehicleId, device.vehicleId));
  } else {
    await db.insert(vehicleLocations).values({
      vehicleId: device.vehicleId,
      latitude: lat,
      longitude: lng,
      speed: update.speed != null ? String(update.speed) : null,
      heading: update.heading != null ? String(update.heading) : null,
      status: "online",
    });
  }

  // Append to history
  await db.insert(trackingEvents).values({
    vehicleId: device.vehicleId,
    latitude: lat,
    longitude: lng,
  });

  // Apply retention policy
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(trackingEvents).where(lt(trackingEvents.recordedAt, cutoff));

  return { ok: true, vehicleId: device.vehicleId };
}

// Compute live status honestly based on last update time.
export async function getFleetLocations() {
  const rows = await db
    .select({
      vehicleId: vehicleLocations.vehicleId,
      latitude: vehicleLocations.latitude,
      longitude: vehicleLocations.longitude,
      speed: vehicleLocations.speed,
      updatedAt: vehicleLocations.updatedAt,
      status: vehicleLocations.status,
      vehicleName: vehicles.name,
      vehicleType: vehicles.vehicleType,
    })
    .from(vehicleLocations)
    .leftJoin(vehicles, eq(vehicleLocations.vehicleId, vehicles.id))
    .orderBy(desc(vehicleLocations.updatedAt));

  const now = Date.now();
  return rows.map((r) => {
    const ageMs = now - new Date(r.updatedAt).getTime();
    // Never claim "online" if data is stale.
    const status = ageMs > OFFLINE_THRESHOLD_MS ? "offline" : "online";
    return {
      vehicleId: r.vehicleId,
      vehicleName: r.vehicleName,
      vehicleType: r.vehicleType,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      speed: r.speed != null ? Number(r.speed) : null,
      updatedAt: r.updatedAt,
      ageSeconds: Math.round(ageMs / 1000),
      status,
      stale: ageMs > OFFLINE_THRESHOLD_MS,
    };
  });
}
