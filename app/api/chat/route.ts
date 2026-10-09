import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { chatConversations, chatMessages } from "@/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { handleMessage, detectIntent } from "@/services/chat/engine";
import { aiProvider } from "@/services/chat/provider";

const chatSchema = z.object({
  message: z.string().trim().min(1, "Please enter a message").max(600),
  conversationId: z.number().int().optional(),
  // Browser-generated id to group guest messages.
  clientId: z.string().max(80).optional(),
});

// Lightweight per-IP rate limiting.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, perMinute: number) {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || e.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (e.count >= perMinute) return false;
  e.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const settings = await getSettings();
    if (settings.chatbotEnabled === "false") {
      return jsonError("Support chat is currently unavailable.", 503);
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const perMinute = Number(settings.chatbotRatePerMinute) || 20;
    if (!rateLimit(ip, perMinute)) {
      return jsonError("Too many messages. Please wait a moment.", 429);
    }

    const session = await getSession();
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid message", 400);
    }
    const { message, conversationId, clientId } = parsed.data;

    // ---- Find or create conversation (history only for signed-in users) ----
    let convoId: number | null = conversationId ?? null;
    if (session?.id) {
      if (convoId) {
        const [existing] = await db
          .select({ id: chatConversations.id })
          .from(chatConversations)
          .where(
            and(
              eq(chatConversations.id, convoId),
              eq(chatConversations.userId, session.id)
            )
          )
          .limit(1);
        if (!existing) convoId = null;
      }
      if (!convoId) {
        const [convo] = await db
          .insert(chatConversations)
          .values({
            userId: session.id,
            clientId: clientId || null,
          })
          .returning();
        convoId = convo.id;
      }

      await db.insert(chatMessages).values({
        conversationId: convoId,
        sender: "user",
        content: message,
        intent: detectIntent(message),
      });
      await db
        .update(chatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversations.id, convoId));
    }

    // ---- Deterministic, tool-driven answer (no hallucinated data) ----
    const result = await handleMessage(message, session);

    // Optional AI polish — the factual payload from tools stays intact.
    // We never pass sensitive documents; fallback engine result is the source.
    let finalText = result.text;
    if (aiProvider.enabled && !result.vehicles?.length) {
      try {
        const ai = await aiProvider.respond({
          systemSummary:
            "You are a concise car/bike rental support assistant. Only answer from the provided facts. Never invent availability, prices, booking status, or contact details. Keep it short.",
          facts: `Facts:\n${result.text}\nBusiness: ${settings.businessName}, city ${settings.businessCity}, support hours ${settings.chatbotSupportHours}. Cancellation: ${settings.cancellationDeadlineHours}h deadline, ${settings.cancellationFeePercent}% late deduction.`,
          userText: message,
        });
        if (ai?.text) finalText = ai.text;
      } catch {
        /* deterministic answer already prepared */
      }
    }

    if (convoId) {
      await db.insert(chatMessages).values({
        conversationId: convoId,
        sender: "assistant",
        content: finalText,
        intent: detectIntent(message),
      });
    }

    return jsonOk({
      ...result,
      text: finalText,
      conversationId: convoId,
      config: {
        name: settings.chatbotName,
        supportHours: settings.chatbotSupportHours,
        authenticated: Boolean(session),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// Chat history (signed-in users only; only their own conversation).
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return jsonOk({ conversation: null, messages: [] });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("conversationId");

    let convoId = Number(id);
    if (!convoId) {
      const [convo] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.userId, session.id))
        .orderBy(desc(chatConversations.updatedAt))
        .limit(1);
      if (!convo) return jsonOk({ conversation: null, messages: [] });
      convoId = convo.id;
    } else {
      const [owned] = await db
        .select({ id: chatConversations.id })
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.id, convoId),
            eq(chatConversations.userId, session.id)
          )
        )
        .limit(1);
      if (!owned) return jsonError("Not found", 404);
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        sender: chatMessages.sender,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, convoId))
      .orderBy(asc(chatMessages.id))
      .limit(100);

    return jsonOk({ conversationId: convoId, messages });
  } catch (err) {
    return handleApiError(err);
  }
}

// Clear conversation.
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return jsonOk({ cleared: true });
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("conversationId"));
    if (id) {
      await db
        .delete(chatConversations)
        .where(
          and(
            eq(chatConversations.id, id),
            eq(chatConversations.userId, session.id)
          )
        );
    }
    return jsonOk({ cleared: true });
  } catch (err) {
    return handleApiError(err);
  }
}
