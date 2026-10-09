import type { ChatResult } from "./tools";

// Optional AI provider (OpenAI-compatible). When AI_API_KEY is set it can be
// used to craft natural language, but ALL factual data still comes from the
// controlled tools. Without a key, the deterministic support provider runs.

export type AIContext = {
  systemSummary: string;
  userText: string;
  // Strict, tool-derived facts only — no sensitive document data.
  facts: string;
};

export interface AIProvider {
  readonly name: string;
  readonly enabled: boolean;
  respond(ctx: AIContext): Promise<{ text: string } | null>;
}

class OpenAICompatibleProvider implements AIProvider {
  name = "openai-compatible";
  get enabled() {
    return Boolean(process.env.AI_API_KEY);
  }
  async respond(ctx: AIContext) {
    const base = process.env.AI_API_BASE || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 400,
          messages: [
            { role: "system", content: ctx.systemSummary + "\n" + ctx.facts },
            { role: "user", content: ctx.userText },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      return typeof text === "string" && text.trim()
        ? { text: text.trim() }
        : null;
    } catch {
      return null; // always fall back; never hard-fail the chat
    }
  }
}

export const aiProvider: AIProvider = new OpenAICompatibleProvider();

export type { ChatResult };
