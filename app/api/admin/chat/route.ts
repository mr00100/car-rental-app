import { db } from "@/db";
import {
  chatConversations,
  chatMessages,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

// Aggregated, privacy-conscious chat analytics (no raw customer PII dump).
export async function GET() {
  try {
    await requireAdmin();

    const [totalConvos] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatConversations);

    const [totalMsgs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(eq(chatMessages.sender, "user"));

    const [activeToday] = await db
      .select({ count: sql<number>`count(distinct ${chatMessages.conversationId})::int` })
      .from(chatMessages)
      .where(
        sql`${chatMessages.createdAt} >= now() - interval '24 hours'`
      );

    // Most common intents (customer messages only).
    const intents = await db
      .select({
        intent: chatMessages.intent,
        count: sql<number>`count(*)::int`,
      })
      .from(chatMessages)
      .where(
        sql`${chatMessages.sender} = 'user' AND ${chatMessages.intent} IS NOT NULL`
      )
      .groupBy(chatMessages.intent)
      .orderBy(desc(sql`count`))
      .limit(10);

    return jsonOk({
      totalConversations: totalConvos.count,
      totalUserMessages: totalMsgs.count,
      activeLast24h: activeToday.count,
      commonIntents: intents,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
