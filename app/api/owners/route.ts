import { NextRequest } from "next/server";
import { db } from "@/db";
import { owners, vehicles } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManageVehicles } from "@/lib/auth";
import { ownerSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        owner: owners,
        vehicleCount: sql<number>`(
          select count(*)::int from vehicles where vehicles.owner_id = ${owners.id} and vehicles.is_archived = false
        )`,
      })
      .from(owners)
      .orderBy(desc(owners.createdAt));

    return jsonOk(
      rows.map((r) => ({ ...r.owner, vehicleCount: r.vehicleCount }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const body = await req.json();
    const data = ownerSchema.parse(body);

    const [owner] = await db
      .insert(owners)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        city: data.city || null,
        address: data.address || null,
        status: data.status || "active",
        notes: data.notes || null,
        publicDisplayName: data.publicDisplayName || data.name,
        showContactToCustomers: data.showContactToCustomers || false,
      })
      .returning();

    await logAudit({
      admin,
      action: "Created owner",
      targetType: "owner",
      targetId: owner.id,
      newValue: { name: owner.name },
    });

    return jsonOk(owner, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
