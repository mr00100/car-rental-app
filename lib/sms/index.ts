import { db } from "@/db";
import { smsLogs } from "@/db/schema";

// ============================================================
// REAL SMS delivery (no mock, no console-only fallback).
//
// Supported providers, chosen by env vars:
//   1. Twilio — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
//   2. Vonage — VONAGE_API_KEY / VONAGE_API_SECRET / VONAGE_FROM
//
// If neither is configured we return an explicit configuration error and
// never claim an SMS was sent.
// ============================================================

export type SendResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
  provider: string;
};

export interface SmsProvider {
  readonly name: string;
  send(input: { to: string; message: string }): Promise<SendResult>;
}

/* --------------------------- Phone normalization --------------------------- */
// Converts local Pakistani numbers to E.164.
//   03001234567        -> +923001234567
//   3001234567         -> +923001234567
//   +923001234567      -> +923001234567  (unchanged)
//   923001234567       -> +923001234567
//   00923001234567     -> +923001234567
export function toE164(input: string, defaultCountry = "PK"): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, "");

  // Strip a leading "00" international prefix.
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  const CC: Record<string, string> = { PK: "92", US: "1", IN: "91", AE: "971" };
  const cc = CC[defaultCountry] ?? "92";

  if (digits.startsWith("+")) {
    const rest = digits.slice(1);
    return /^\d{7,15}$/.test(rest) ? `+${rest}` : null;
  }
  if (digits.startsWith(cc)) {
    const rest = digits.slice(cc.length);
    return /^\d{7,15}$/.test(rest) ? `+${cc}${rest}` : null;
  }
  // Local trunk prefix (e.g. leading 0 in Pakistan).
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    return /^\d{7,15}$/.test(rest) ? `+${cc}${rest}` : null;
  }
  // Bare subscriber number.
  return /^\d{9,15}$/.test(digits) ? `+${cc}${digits}` : null;
}

export function isValidE164(value: string): boolean {
  return /^\+\d{7,15}$/.test(value);
}

/* ------------------------------ Twilio ------------------------------ */
class TwilioSmsProvider implements SmsProvider {
  name = "twilio";

  async send(input: { to: string; message: string }): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM!;
    const to = toE164(input.to);

    if (!to) {
      return { ok: false, provider: this.name, error: "Invalid destination number" };
    }

    try {
      const body = new URLSearchParams({
        To: to,
        From: from,
        Body: input.message,
      });
      const base = process.env.TWILIO_API_BASE || "https://api.twilio.com";
      const res = await fetch(
        `${base}/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );

      const json = (await res.json().catch(() => ({}))) as {
        sid?: string;
        message?: string;
        code?: number;
      };

      if (!res.ok) {
        return {
          ok: false,
          provider: this.name,
          error: json.message || `Twilio API returned ${res.status}`,
        };
      }
      if (!json.sid) {
        return {
          ok: false,
          provider: this.name,
          error: "Twilio did not return a message sid",
        };
      }
      return { ok: true, provider: this.name, messageId: json.sid };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : "Twilio request failed",
      };
    }
  }
}

/* ------------------------------ Vonage ------------------------------ */
class VonageSmsProvider implements SmsProvider {
  name = "vonage";

  async send(input: { to: string; message: string }): Promise<SendResult> {
    const to = toE164(input.to);
    if (!to) {
      return { ok: false, provider: this.name, error: "Invalid destination number" };
    }

    try {
      const params = new URLSearchParams({
        api_key: process.env.VONAGE_API_KEY!,
        api_secret: process.env.VONAGE_API_SECRET!,
        to: to.replace("+", ""),
        from: process.env.VONAGE_FROM || "RentACar",
        text: input.message,
      });
      const res = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{
          status?: string;
          "message-id"?: string;
          "error-text"?: string;
        }>;
      };

      const msg = json.messages?.[0];
      // Vonage returns 200 with a non-zero status when delivery is rejected.
      if (!msg || msg.status !== "0") {
        return {
          ok: false,
          provider: this.name,
          error: msg?.["error-text"] || "Vonage rejected the message",
        };
      }
      return {
        ok: true,
        provider: this.name,
        messageId: msg["message-id"],
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : "Vonage request failed",
      };
    }
  }
}

/* ---------------------------- Configuration ---------------------------- */
export type SmsConfigStatus = {
  configured: boolean;
  provider: string | null;
  missing: string[];
};

export function smsConfig(): SmsConfigStatus {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM
  ) {
    return { configured: true, provider: "twilio", missing: [] };
  }
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
    const missing = process.env.VONAGE_FROM ? [] : ["VONAGE_FROM"];
    return {
      configured: missing.length === 0,
      provider: missing.length === 0 ? "vonage" : null,
      missing,
    };
  }
  return {
    configured: false,
    provider: null,
    missing: [
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM",
      "or VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM",
    ],
  };
}

function getProvider(): SmsProvider | null {
  const cfg = smsConfig();
  if (!cfg.configured || !cfg.provider) return null;
  return cfg.provider === "twilio"
    ? new TwilioSmsProvider()
    : new VonageSmsProvider();
}

/* -------------------------------- Send --------------------------------- */
export async function sendSMS(input: {
  to: string;
  message: string;
}): Promise<SendResult> {
  const provider = getProvider();

  if (!provider) {
    const cfg = smsConfig();
    const result: SendResult = {
      ok: false,
      provider: "none",
      error: `SMS delivery is not configured. Missing: ${cfg.missing.join("; ")}`,
    };
    await logAttempt(input.to, "none", "not_configured", result.error ?? "not configured");
    return result;
  }

  const result = await provider.send(input);
  await logAttempt(
    input.to,
    result.provider,
    result.ok ? "sent" : "failed",
    result.ok ? null : result.error ?? "unknown error",
    result.messageId
  );

  if (result.ok) {
    console.log(
      `[sms] delivered via ${result.provider} to ${input.to} messageId=${result.messageId ?? "n/a"}`
    );
  } else {
    console.error(
      `[sms] FAILED via ${result.provider} to ${input.to}: ${result.error}`
    );
  }

  return result;
}

async function logAttempt(
  to: string,
  provider: string,
  status: string,
  error: string | null,
  messageId?: string
) {
  try {
    await db.insert(smsLogs).values({
      toNumber: to,
      message: "[redacted]",
      provider,
      status,
      error: messageId ? `${error ?? ""} [${messageId}]`.trim() : error,
    });
  } catch {
    /* best-effort */
  }
}

export async function verifySmsConfig(): Promise<{ ok: boolean; detail: string }> {
  const cfg = smsConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      detail: `SMS provider not configured. Set ${cfg.missing.join(" ")}.`,
    };
  }
  return {
    ok: true,
    detail: `${cfg.provider === "twilio" ? "Twilio" : "Vonage"} configured.`,
  };
}
