import { NextRequest } from "next/server";
import { db } from "@/db";
import { reviews, vehicles, bookings } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getSession, requireAdmin } from "@/lib/auth";
import { reviewSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicleId");
    const adminView = searchParams.get("admin") === "true";

    if (adminView) {
      await requireAdmin();
      const rows = await db
        .select({
          review: reviews,
          vehicleName: vehicles.name,
        })
        .from(reviews)
        .leftJoin(vehicles, eq(reviews.vehicleId, vehicles.id))
        .orderBy(desc(reviews.createdAt))
        .limit(100);

      return jsonOk(
        rows.map((r) => ({ ...r.review, vehicleName: r.vehicleName }))
      );
    }

    const conditions = [
      eq(reviews.isApproved, true),
      eq(reviews.isHidden, false),
    ];
    if (vehicleId) {
      conditions.push(eq(reviews.vehicleId, parseInt(vehicleId, 10)));
    }

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(50);

    return jsonOk(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const data = reviewSchema.parse(body);

    if (data.rating < 1 || data.rating > 5) {
      return jsonError("Rating must be between 1 and 5", 400);
    }

    // If booking provided, verify it's completed
    if (data.bookingId) {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, data.bookingId))
        .limit(1);

      if (!booking || booking.status !== "completed") {
        return jsonError("Can only review completed rentals", 400);
      }

      if (session && booking.userId && booking.userId !== session.id) {
        return jsonError("Unauthorized", 403);
      }
    }

    const [review] = await db
      .insert(reviews)
      .values({
        vehicleId: data.vehicleId,
        userId: session?.id ?? null,
        bookingId: data.bookingId || null,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
        photoUrl: data.photoUrl || null,
        customerName:
          data.customerName || session?.fullName || "Anonymous",
        isApproved: false,
      })
      .returning();

    return jsonOk(review, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
