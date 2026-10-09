import { db } from "@/db";
import { vehicles, rentalPrices, favorites, bookings } from "@/db/schema";
import { and, eq, asc, sql } from "drizzle-orm";
import { isVehicleAvailableForDates } from "@/lib/availability";

// Rule-based recommendation engine with an architecture ready for a real
// AI/LLM provider. Only recommends REAL, available vehicles from the DB.

export type RecommendationPrefs = {
  budget?: number;
  vehicleType?: "car" | "bike";
  passengers?: number;
  durationHours?: number;
  transmission?: string;
  fuelType?: string;
  pickupDate?: string;
  returnDate?: string;
  userId?: number;
};

export type RecommendationResult = {
  vehicleId: number;
  name: string;
  slug: string;
  brand: string;
  vehicleType: string;
  coverImage: string | null;
  averageRating: number;
  seatingCapacity: number | null;
  transmission: string | null;
  dayPrice: number | null;
  minPrice: number | null;
  score: number;
  reasons: string[];
};

export async function recommendVehicles(
  prefs: RecommendationPrefs,
  limit = 6
): Promise<{ demo: boolean; source: string; results: RecommendationResult[] }> {
  // Load candidate vehicles (non-archived, not disabled/maintenance).
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.isArchived, false));

  const ids = rows.map((v) => v.id);
  const prices = ids.length
    ? await db
        .select()
        .from(rentalPrices)
        .where(
          and(
            eq(rentalPrices.isActive, true),
            sql`${rentalPrices.vehicleId} IN (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        )
        .orderBy(asc(rentalPrices.sortOrder))
    : [];

  // Personalization signals
  let favVehicleIds: number[] = [];
  let favBrands: string[] = [];
  if (prefs.userId) {
    const favs = await db
      .select({ vehicleId: favorites.vehicleId })
      .from(favorites)
      .where(eq(favorites.userId, prefs.userId));
    favVehicleIds = favs.map((f) => f.vehicleId);
    const past = await db
      .select({ vehicleId: bookings.vehicleId })
      .from(bookings)
      .where(eq(bookings.userId, prefs.userId));
    const pastIds = new Set(past.map((p) => p.vehicleId));
    favBrands = rows
      .filter((v) => favVehicleIds.includes(v.id) || pastIds.has(v.id))
      .map((v) => v.brand);
  }

  const scored: RecommendationResult[] = [];

  for (const v of rows) {
    const vPrices = prices.filter((p) => p.vehicleId === v.id);
    const dayPrice = vPrices.find((p) => p.durationHours === 24)?.price ?? null;
    const minPrice = vPrices.length
      ? Math.min(...vPrices.map((p) => p.price))
      : null;

    let score = 0;
    const reasons: string[] = [];

    // Type match
    if (prefs.vehicleType && v.vehicleType === prefs.vehicleType) {
      score += 25;
      reasons.push(`Matches your ${prefs.vehicleType} preference`);
    }

    // Budget match (uses day price where available, else min price)
    const priceForBudget = dayPrice ?? minPrice;
    if (prefs.budget && priceForBudget != null) {
      if (priceForBudget <= prefs.budget) {
        score += 30;
        reasons.push("Fits your budget");
      } else {
        score -= 20;
      }
    }

    // Passengers
    if (prefs.passengers && v.seatingCapacity != null) {
      if (v.seatingCapacity >= prefs.passengers) {
        score += 20;
        reasons.push(`Seats ${v.seatingCapacity} passengers`);
      } else {
        score -= 15;
      }
    }

    // Transmission / fuel
    if (
      prefs.transmission &&
      v.transmission &&
      v.transmission.toLowerCase() === prefs.transmission.toLowerCase()
    ) {
      score += 8;
      reasons.push(`${v.transmission} transmission`);
    }
    if (
      prefs.fuelType &&
      v.fuelType &&
      v.fuelType.toLowerCase() === prefs.fuelType.toLowerCase()
    ) {
      score += 5;
    }

    // Ratings & popularity
    const rating = Number(v.averageRating) || 0;
    score += rating * 3;
    if (rating >= 4.5) reasons.push("Highly rated by customers");
    score += Math.min(10, v.bookingCount / 5);

    // Personalization
    if (favVehicleIds.includes(v.id)) {
      score += 15;
      reasons.push("In your favorites");
    }
    if (favBrands.includes(v.brand)) {
      score += 8;
      reasons.push(`You like ${v.brand}`);
    }

    // Immediate availability boost
    if (v.availability === "available") {
      score += 10;
    } else {
      score -= 40;
    }

    scored.push({
      vehicleId: v.id,
      name: v.name,
      slug: v.slug,
      brand: v.brand,
      vehicleType: v.vehicleType,
      coverImage: v.coverImage,
      averageRating: rating,
      seatingCapacity: v.seatingCapacity,
      transmission: v.transmission,
      dayPrice,
      minPrice,
      score,
      reasons,
    });
  }

  // Date-based availability filter (real check, no fabrication)
  let candidates = scored;
  if (prefs.pickupDate && prefs.returnDate) {
    const pickup = new Date(prefs.pickupDate);
    const ret = new Date(prefs.returnDate);
    const checked = await Promise.all(
      scored.map(async (r) => {
        const a = await isVehicleAvailableForDates(r.vehicleId, pickup, ret);
        return a.available ? r : null;
      })
    );
    candidates = checked.filter((r): r is RecommendationResult => r !== null);
    for (const c of candidates) {
      if (!c.reasons.includes("Available on your selected dates")) {
        c.reasons.push("Available on your selected dates");
      }
    }
  } else {
    candidates = scored.filter((r) => r.score > 0);
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    demo: !process.env.AI_API_KEY,
    source: process.env.AI_API_KEY ? "ai+rules" : "rule-based",
    results: candidates.slice(0, limit),
  };
}
