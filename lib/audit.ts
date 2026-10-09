import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "./auth";

export async function logAudit(params: {
  admin: SessionUser | null;
  action: string;
  targetType?: string;
  targetId?: string | number;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      adminId: params.admin?.id ?? null,
      adminName: params.admin?.fullName ?? "System",
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId != null ? String(params.targetId) : null,
      previousValue:
        params.previousValue != null
          ? JSON.stringify(params.previousValue)
          : null,
      newValue:
        params.newValue != null ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
