import { db } from "@/db";
import { vehicles, rentalPrices } from "@/db/schema";
import { and, eq, ilike, or, gte, lte, sql, desc, asc } from "drizzle-orm";

export type VehicleSearchParams = {
  q?: string;
  type?: string;
  brand?: string;
  color?: string;
  availability?: string;
  yearMin?: string;
  yearMax?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
  page?: string;
  limit?: string;
  featured?: string;
  popular?: string;
};

export async function searchVehicles(params: VehicleSearchParams) {
  const q = params.q?.trim() || "";
  const type = params.type;
  const brand = params.brand;
  const color = params.color;
  const availability = params.availability;
  const yearMin = params.yearMin;
  const yearMax = params.yearMax;
  const sort = params.sort || "newest";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.limit || "12", 10)));
  const offset = (page - 1) * limit;

  const conditions = [eq(vehicles.isArchived, false)];

  if (q) {
    conditions.push(
      or(
        ilike(vehicles.name, `%${q}%`),
        ilike(vehicles.brand, `%${q}%`),
        ilike(vehicles.model, `%${q}%`),
        ilike(vehicles.color, `%${q}%`)
      )!
    );
  }

  if (type === "car" || type === "bike") {
    conditions.push(eq(vehicles.vehicleType, type));
  }
  if (brand) conditions.push(ilike(vehicles.brand, brand));
  if (color) conditions.push(ilike(vehicles.color, `%${color}%`));
  if (
    availability &&
    ["available", "reserved", "rented", "maintenance", "disabled"].includes(
      availability
    )
  ) {
    conditions.push(
      eq(
        vehicles.availability,
        availability as
          | "available"
          | "reserved"
          | "rented"
          | "maintenance"
          | "disabled"
      )
    );
  }
  if (yearMin) conditions.push(gte(vehicles.modelYear, parseInt(yearMin, 10)));
  if (yearMax) conditions.push(lte(vehicles.modelYear, parseInt(yearMax, 10)));
  if (params.featured === "true")
    conditions.push(eq(vehicles.isFeatured, true));
  if (params.popular === "true") conditions.push(eq(vehicles.isPopular, true));

  let orderBy;
  switch (sort) {
    case "popular":
      orderBy = desc(vehicles.bookingCount);
      break;
    case "available":
      orderBy = asc(vehicles.availability);
      break;
    case "newest":
    default:
      orderBy = desc(vehicles.createdAt);
  }

  const where = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehicles)
    .where(where);

  const rows = await db
    .select()
    .from(vehicles)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const vehicleIds = rows.map((v) => v.id);
  let prices: (typeof rentalPrices.$inferSelect)[] = [];

  if (vehicleIds.length > 0) {
    prices = await db
      .select()
      .from(rentalPrices)
      .where(
        and(
          eq(rentalPrices.isActive, true),
          sql`${rentalPrices.vehicleId} IN (${sql.join(
            vehicleIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
      )
      .orderBy(asc(rentalPrices.sortOrder));
  }

  let result = rows.map((v) => {
    const vPrices = prices.filter((p) => p.vehicleId === v.id);
    const minPrice =
      vPrices.length > 0 ? Math.min(...vPrices.map((p) => p.price)) : null;
    return {
      ...v,
      prices: vPrices,
      minPrice,
      dayPrice: vPrices.find((p) => p.durationHours === 24)?.price ?? null,
      averageRating: Number(v.averageRating) || 0,
    };
  });

  if (params.priceMin) {
    const min = parseInt(params.priceMin, 10);
    result = result.filter((v) => v.minPrice != null && v.minPrice >= min);
  }
  if (params.priceMax) {
    const max = parseInt(params.priceMax, 10);
    result = result.filter((v) => v.minPrice != null && v.minPrice <= max);
  }

  if (sort === "price_asc") {
    result.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
  } else if (sort === "price_desc") {
    result.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  }

  return {
    vehicles: result,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  };
}
