import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireAuth, isAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const adminOnly = searchParams.get("admin") === "true";

    let rows;
    if (adminOnly && isAdmin(session.role)) {
      rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.isAdmin, true))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    } else {
      rows = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, session.id),
            eq(notifications.isAdmin, false)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }

    const unread = rows.filter((n) => !n.isRead).length;

    return jsonOk({ notifications: rows, unread });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    if (body.markAllRead) {
      if (body.admin && isAdmin(session.role)) {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.isAdmin, true));
      } else {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, session.id));
      }
      return jsonOk({ message: "All marked as read" });
    }

    if (body.id) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, body.id));
      return jsonOk({ message: "Marked as read" });
    }

    return jsonOk({ message: "No action" });
  } catch (err) {
    return handleApiError(err);
  }
}
