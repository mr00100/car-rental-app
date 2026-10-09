import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  vehicles,
  vehicleImages,
  vehicleFeatures,
  rentalPrices,
} from "@/db/schema";
import { and, eq, ilike, or, gte, lte, sql, desc, asc, ne } from "drizzle-orm";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireAdmin, canManageVehicles } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type"); // car | bike
    const brand = searchParams.get("brand");
    const color = searchParams.get("color");
    const availability = searchParams.get("availability");
    const yearMin = searchParams.get("yearMin");
    const yearMax = searchParams.get("yearMax");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const featured = searchParams.get("featured");
    const popular = searchParams.get("popular");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const offset = (page - 1) * limit;

    const conditions = [eq(vehicles.isArchived, false)];

    if (q) {
      conditions.push(
        or(
          ilike(vehicles.name, `%${q}%`),
          ilike(vehicles.brand, `%${q}%`),
          ilike(vehicles.model, `%${q}%`),
          ilike(vehicles.color, `%${q}%`),
          ilike(vehicles.vehicleType, `%${q}%`)
        )!
      );
    }

    if (type === "car" || type === "bike") {
      conditions.push(eq(vehicles.vehicleType, type));
    }

    if (brand) {
      conditions.push(ilike(vehicles.brand, brand));
    }

    if (color) {
      conditions.push(ilike(vehicles.color, `%${color}%`));
    }

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
    if (featured === "true") conditions.push(eq(vehicles.isFeatured, true));
    if (popular === "true") conditions.push(eq(vehicles.isPopular, true));

    let orderBy;
    switch (sort) {
      case "price_asc":
        orderBy = asc(vehicles.id);
        break;
      case "price_desc":
        orderBy = desc(vehicles.id);
        break;
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

    // Attach prices and primary image
    const vehicleIds = rows.map((v) => v.id);
    let prices: (typeof rentalPrices.$inferSelect)[] = [];
    let images: (typeof vehicleImages.$inferSelect)[] = [];
    let features: (typeof vehicleFeatures.$inferSelect)[] = [];

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

      images = await db
        .select()
        .from(vehicleImages)
        .where(
          sql`${vehicleImages.vehicleId} IN (${sql.join(
            vehicleIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        )
        .orderBy(asc(vehicleImages.sortOrder));

      features = await db
        .select()
        .from(vehicleFeatures)
        .where(
          sql`${vehicleFeatures.vehicleId} IN (${sql.join(
            vehicleIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );
    }

    let result = rows.map((v) => {
      const vPrices = prices.filter((p) => p.vehicleId === v.id);
      const vImages = images.filter((i) => i.vehicleId === v.id);
      const vFeatures = features.filter((f) => f.vehicleId === v.id);
      const dayPrice = vPrices.find((p) => p.durationHours === 24)?.price ?? null;
      const minPrice =
        vPrices.length > 0 ? Math.min(...vPrices.map((p) => p.price)) : null;

      return {
        ...v,
        prices: vPrices,
        images: vImages,
        features: vFeatures,
        dayPrice,
        minPrice,
        averageRating: Number(v.averageRating) || 0,
      };
    });

    // Price filter post-process
    if (priceMin) {
      const min = parseInt(priceMin, 10);
      result = result.filter((v) => v.minPrice != null && v.minPrice >= min);
    }
    if (priceMax) {
      const max = parseInt(priceMax, 10);
      result = result.filter((v) => v.minPrice != null && v.minPrice <= max);
    }

    if (sort === "price_asc") {
      result.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
    } else if (sort === "price_desc") {
      result.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    }

    return jsonOk({
      vehicles: result,
      pagination: {
        page,
        limit,
        total: countResult?.count ?? 0,
        totalPages: Math.ceil((countResult?.count ?? 0) / limit),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonOk({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const data = vehicleSchema.parse(body);

    let slug = slugify(`${data.brand}-${data.model}-${data.modelYear}`);
    const existing = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.slug, slug))
      .limit(1);
    if (existing.length) {
      slug = `${slug}-${Date.now()}`;
    }

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        name: data.name,
        slug,
        brand: data.brand,
        model: data.model,
        modelYear: data.modelYear,
        color: data.color,
        vehicleType: data.vehicleType,
        registrationNumber: data.registrationNumber || null,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        transmission: data.transmission || null,
        fuelType: data.fuelType || null,
        seatingCapacity: data.seatingCapacity || null,
        availability: data.availability || "available",
        ownerId: data.ownerId || null,
        isFeatured: data.isFeatured || false,
        isPopular: data.isPopular || false,
        coverImage: data.coverImage || null,
        seoTitle: data.seoTitle || `Rent ${data.name} | Rent A Car`,
        seoDescription: data.seoDescription || data.shortDescription || null,
      })
      .returning();

    if (data.features?.length) {
      await db.insert(vehicleFeatures).values(
        data.features.map((name) => ({
          vehicleId: vehicle.id,
          name,
          icon: name.toLowerCase().replace(/\s+/g, "-"),
        }))
      );
    }

    if (data.prices?.length) {
      await db.insert(rentalPrices).values(
        data.prices.map((p, i) => ({
          vehicleId: vehicle.id,
          label: p.label,
          durationHours: p.durationHours,
          price: p.price,
          sortOrder: p.sortOrder ?? i,
        }))
      );
    }

    if (data.images?.length) {
      await db.insert(vehicleImages).values(
        data.images.map((img, i) => ({
          vehicleId: vehicle.id,
          url: img.url,
          alt: img.alt || data.name,
          category: img.category || "exterior",
          isPrimary: img.isPrimary || i === 0,
          sortOrder: i,
        }))
      );
    }

    await logAudit({
      admin,
      action: "Created vehicle",
      targetType: "vehicle",
      targetId: vehicle.id,
      newValue: { name: vehicle.name, slug: vehicle.slug },
    });

    return jsonOk(vehicle, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
