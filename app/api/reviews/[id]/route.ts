import { NextRequest } from "next/server";
import { db } from "@/db";
import { reviews, vehicles } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function recalculateRating(vehicleId: number) {
  const [stats] = await db
    .select({
      avg: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.vehicleId, vehicleId),
        eq(reviews.isApproved, true),
        eq(reviews.isHidden, false)
      )
    );

  await db
    .update(vehicles)
    .set({
      averageRating: String(Number(stats?.avg || 0).toFixed(2)),
      reviewCount: stats?.count || 0,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, vehicleId));
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const reviewId = parseInt(id, 10);

    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!existing) return jsonError("Review not found", 404);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.isApproved !== undefined) updates.isApproved = body.isApproved;
    if (body.isHidden !== undefined) updates.isHidden = body.isHidden;

    const [updated] = await db
      .update(reviews)
      .set(updates)
      .where(eq(reviews.id, reviewId))
      .returning();

    await recalculateRating(existing.vehicleId);

    await logAudit({
      admin,
      action: "Updated review moderation",
      targetType: "review",
      targetId: reviewId,
      newValue: updates,
    });

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const reviewId = parseInt(id, 10);

    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!existing) return jsonError("Review not found", 404);

    await db.delete(reviews).where(eq(reviews.id, reviewId));
    await recalculateRating(existing.vehicleId);

    await logAudit({
      admin,
      action: "Deleted review",
      targetType: "review",
      targetId: reviewId,
    });

    return jsonOk({ message: "Review deleted" });
  } catch (err) {
    return handleApiError(err);
  }
}
