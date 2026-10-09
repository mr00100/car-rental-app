import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  vehicles,
  vehicleImages,
  vehicleFeatures,
  rentalPrices,
  owners,
  reviews,
} from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManageVehicles } from "@/lib/auth";
import { vehicleSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(
        isNumeric
          ? eq(vehicles.id, parseInt(id, 10))
          : eq(vehicles.slug, id)
      )
      .limit(1);

    if (!vehicle || vehicle.isArchived) {
      return jsonError("Vehicle not found", 404);
    }

    // Increment view count
    await db
      .update(vehicles)
      .set({ viewCount: sql`${vehicles.viewCount} + 1` })
      .where(eq(vehicles.id, vehicle.id));

    const images = await db
      .select()
      .from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicle.id))
      .orderBy(asc(vehicleImages.sortOrder));

    const features = await db
      .select()
      .from(vehicleFeatures)
      .where(eq(vehicleFeatures.vehicleId, vehicle.id));

    const prices = await db
      .select()
      .from(rentalPrices)
      .where(
        and(
          eq(rentalPrices.vehicleId, vehicle.id),
          eq(rentalPrices.isActive, true)
        )
      )
      .orderBy(asc(rentalPrices.sortOrder));

    let owner = null;
    if (vehicle.ownerId) {
      const [o] = await db
        .select({
          id: owners.id,
          publicDisplayName: owners.publicDisplayName,
          name: owners.name,
          showContactToCustomers: owners.showContactToCustomers,
          phone: owners.phone,
          city: owners.city,
        })
        .from(owners)
        .where(eq(owners.id, vehicle.ownerId))
        .limit(1);

      if (o) {
        owner = {
          displayName: o.publicDisplayName || o.name,
          city: o.city,
          phone: o.showContactToCustomers ? o.phone : null,
        };
      }
    }

    const approvedReviews = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.vehicleId, vehicle.id),
          eq(reviews.isApproved, true),
          eq(reviews.isHidden, false)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(20);

    return jsonOk({
      ...vehicle,
      averageRating: Number(vehicle.averageRating) || 0,
      images,
      features,
      prices,
      owner,
      reviews: approvedReviews,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const vehicleId = parseInt(id, 10);
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (!existing) return jsonError("Vehicle not found", 404);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const allowed = [
      "name",
      "brand",
      "model",
      "modelYear",
      "color",
      "vehicleType",
      "registrationNumber",
      "description",
      "shortDescription",
      "transmission",
      "fuelType",
      "seatingCapacity",
      "availability",
      "ownerId",
      "isFeatured",
      "isPopular",
      "coverImage",
      "seoTitle",
      "seoDescription",
      "isArchived",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const [updated] = await db
      .update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (body.features && Array.isArray(body.features)) {
      await db
        .delete(vehicleFeatures)
        .where(eq(vehicleFeatures.vehicleId, vehicleId));
      if (body.features.length) {
        await db.insert(vehicleFeatures).values(
          body.features.map((name: string) => ({
            vehicleId,
            name,
            icon: name.toLowerCase().replace(/\s+/g, "-"),
          }))
        );
      }
    }

    if (body.prices && Array.isArray(body.prices)) {
      await db
        .delete(rentalPrices)
        .where(eq(rentalPrices.vehicleId, vehicleId));
      if (body.prices.length) {
        await db.insert(rentalPrices).values(
          body.prices.map(
            (
              p: {
                label: string;
                durationHours: number;
                price: number;
                sortOrder?: number;
              },
              i: number
            ) => ({
              vehicleId,
              label: p.label,
              durationHours: p.durationHours,
              price: p.price,
              sortOrder: p.sortOrder ?? i,
            })
          )
        );
      }
    }

    if (body.images && Array.isArray(body.images)) {
      await db
        .delete(vehicleImages)
        .where(eq(vehicleImages.vehicleId, vehicleId));
      if (body.images.length) {
        await db.insert(vehicleImages).values(
          body.images.map(
            (
              img: {
                url: string;
                alt?: string;
                category?: string;
                isPrimary?: boolean;
              },
              i: number
            ) => ({
              vehicleId,
              url: img.url,
              alt: img.alt || existing.name,
              category: img.category || "exterior",
              isPrimary: img.isPrimary || i === 0,
              sortOrder: i,
            })
          )
        );
      }
    }

    await logAudit({
      admin,
      action: "Updated vehicle",
      targetType: "vehicle",
      targetId: vehicleId,
      previousValue: { availability: existing.availability, name: existing.name },
      newValue: updates,
    });

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const vehicleId = parseInt(id, 10);

    const [updated] = await db
      .update(vehicles)
      .set({ isArchived: true, availability: "disabled", updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!updated) return jsonError("Vehicle not found", 404);

    await logAudit({
      admin,
      action: "Archived vehicle",
      targetType: "vehicle",
      targetId: vehicleId,
      previousValue: { name: updated.name },
    });

    return jsonOk({ message: "Vehicle archived" });
  } catch (err) {
    return handleApiError(err);
  }
}
