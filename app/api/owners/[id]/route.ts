import { NextRequest } from "next/server";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin, canManageVehicles } from "@/lib/auth";
import { ownerSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const data = ownerSchema.partial().parse(body);

    const [updated] = await db
      .update(owners)
      .set({ ...data, email: data.email || null, updatedAt: new Date() })
      .where(eq(owners.id, parseInt(id, 10)))
      .returning();

    if (!updated) return jsonError("Owner not found", 404);

    await logAudit({
      admin,
      action: "Updated owner",
      targetType: "owner",
      targetId: id,
      newValue: data,
    });

    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    await db
      .update(owners)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(owners.id, parseInt(id, 10)));

    await logAudit({
      admin,
      action: "Deactivated owner",
      targetType: "owner",
      targetId: id,
    });

    return jsonOk({ message: "Owner deactivated" });
  } catch (err) {
    return handleApiError(err);
  }
}
