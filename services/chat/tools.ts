import { db } from "@/db";
import {
  vehicles,
  rentalPrices,
  bookings,
  payments,
  licenseVerifications,
} from "@/db/schema";
import { and, eq, asc, sql, ilike, desc, or, gte } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth";
import { quoteCancellation } from "@/services/cancellation";
import { getSettings } from "@/lib/settings";
import { formatCurrency, formatDateTime, availabilityLabel } from "@/lib/utils";

export type ChatVehicleCard = {
  name: string;
  brand: string;
  modelYear: number;
  transmission: string | null;
  seatingCapacity: number | null;
  color: string;
  availability: string;
  dayPrice: number | null;
  minPrice: number | null;
  href: string;
  coverImage: string | null;
};

export type ChatResult = {
  text: string;
  vehicles?: ChatVehicleCard[];
  links?: { label: string; href: string }[];
  requiresAuth?: boolean;
};

async function loadVehiclesWithPrices(
  where?: ReturnType<typeof and>
): Promise<(ChatVehicleCard)[]> {
  const rows = await db
    .select()
    .from(vehicles)
    .where(
      where
        ? and(eq(vehicles.isArchived, false), where)
        : eq(vehicles.isArchived, false)
    )
    .limit(40);

  const ids = rows.map((r) => r.id);
  const priceRows = ids.length
    ? await db
        .select()
        .from(rentalPrices)
        .where(
          and(
            eq(rentalPrices.isActive, true),
            sql`${rentalPrices.vehicleId} IN (${sql.join(
              ids.map((i) => sql`${i}`),
              sql`, `
            )})`
          )
        )
    : [];

  return rows.map((v) => {
    const vp = priceRows.filter((p) => p.vehicleId === v.id);
    const dayPrice = vp.find((p) => p.durationHours === 24)?.price ?? null;
    const minPrice = vp.length ? Math.min(...vp.map((p) => p.price)) : null;
    return {
      name: v.name,
      brand: v.brand,
      modelYear: v.modelYear,
      transmission: v.transmission,
      seatingCapacity: v.seatingCapacity,
      color: v.color,
      availability: v.availability,
      dayPrice,
      minPrice,
      href: v.vehicleType === "bike" ? `/bikes/${v.slug}` : `/cars/${v.slug}`,
      coverImage: v.coverImage,
    };
  });
}

/** Real catalog search: type, brand/category keyword, budget, seats. */
export async function searchVehiclesTool(opts: {
  type?: "car" | "bike";
  query?: string;
  maxDayPrice?: number;
  passengers?: number;
  onlyAvailable?: boolean;
}): Promise<ChatVehicleCard[]> {
  const conds = [];
  if (opts.type) conds.push(eq(vehicles.vehicleType, opts.type));
  if (opts.onlyAvailable !== false)
    conds.push(eq(vehicles.availability, "available"));
  if (opts.query) {
    const q = `%${opts.query}%`;
    conds.push(or(ilike(vehicles.name, q), ilike(vehicles.brand, q)));
  }

  let cards = await loadVehiclesWithPrices(
    conds.length ? and(...conds) : undefined
  );

  if (opts.passengers) {
    cards = cards.filter(
      (c) => (c.seatingCapacity ?? 0) >= (opts.passengers as number)
    );
  }
  if (opts.maxDayPrice) {
    cards = cards.filter(
      (c) => (c.dayPrice ?? c.minPrice ?? Infinity) <= (opts.maxDayPrice as number)
    );
  }

  cards.sort(
    (a, b) =>
      (a.dayPrice ?? a.minPrice ?? Infinity) -
      (b.dayPrice ?? b.minPrice ?? Infinity)
  );
  return cards.slice(0, 6);
}

/** Authenticated: the customer's own bookings. */
export async function getUserBookingsTool(session: SessionUser) {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, session.id))
    .orderBy(desc(bookings.createdAt))
    .limit(10);
}

/** Authenticated: cancellation quote for a booking ref (server time). */
export async function cancellationQuoteTool(
  session: SessionUser,
  bookingRef: string
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.bookingId, bookingRef))
    .limit(1);

  if (!booking) return { notFound: true as const };
  if (booking.userId !== session.id) return { forbidden: true as const };

  const [vehicle] = await db
    .select({ name: vehicles.name, brand: vehicles.brand })
    .from(vehicles)
    .where(eq(vehicles.id, booking.vehicleId))
    .limit(1);

  const quote = await quoteCancellation({
    pickupDate: booking.pickupDate,
    originalAmount: booking.totalAmount,
    bookingStatus: booking.status,
  });
  return { notFound: false as const, booking, vehicle, quote };
}

/** Authenticated: verification status (never returns documents/raw data). */
export async function verificationStatusTool(session: SessionUser) {
  const [row] = await db
    .select({ status: licenseVerifications.status })
    .from(licenseVerifications)
    .where(eq(licenseVerifications.userId, session.id))
    .limit(1);
  return { status: row?.status ?? "not_submitted" };
}

/** Configured pickup location (no secrets). */
export async function pickupLocationTool() {
  const settings = await getSettings();
  const lat = settings.pickupLat || "31.5204";
  const lng = settings.pickupLng || "74.3587";
  return {
    city: settings.businessCity,
    address: settings.businessAddress,
    lat,
    lng,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}

export async function paymentMethodsTool() {
  const settings = await getSettings();
  return {
    methods: ["EasyPaisa", "JazzCash", "Stripe (where available)"],
    easypaisaNumber: settings.easypaisaNumber,
    currency: settings.currency,
  };
}

export { formatCurrency, formatDateTime, availabilityLabel };
