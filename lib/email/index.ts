import nodemailer from "nodemailer";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";

// ============================================================
// REAL email delivery.
//
// Two genuine providers are supported, selected by env vars:
//   1. SMTP   — SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_FROM
//               (works with Gmail App Passwords, SendGrid, AWS SES, Mailgun…)
//   2. Resend — RESEND_API_KEY / EMAIL_FROM
//               (modern transactional HTTP API)
//
// There is NO mock provider here. If nothing is configured we return a
// clear configuration error — we never claim an email was sent when it
// wasn't.
// ============================================================

export type EmailTemplate =
  | "booking_confirmed"
  | "booking_cancelled";

export type SendResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
  provider: string;
};

export interface EmailProvider {
  readonly name: string;
  send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<SendResult>;
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    "Rent A Car <no-reply@rentacar.pk>"
  );
}

function replyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || process.env.SMTP_REPLY_TO || undefined;
}

/* ---------------------------- SMTP provider ---------------------------- */
class SmtpEmailProvider implements EmailProvider {
  name = "smtp";
  private transport: ReturnType<typeof nodemailer.createTransport> | null = null;

  private ensureTransport() {
    if (this.transport) return this.transport;
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASSWORD as string,
      },
    });
    return this.transport;
  }

  async send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<SendResult> {
    try {
      const info = await this.ensureTransport().sendMail({
        from: fromAddress(),
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: replyTo(),
      });
      // nodemailer: a rejected message throws, so reaching here means the
      // SMTP server accepted the envelope.
      return {
        ok: true,
        provider: this.name,
        messageId: info.messageId,
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : "SMTP send failed",
      };
    }
  }
}

/* --------------------------- Resend provider --------------------------- */
class ResendEmailProvider implements EmailProvider {
  name = "resend";

  async send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress(),
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
          ...(replyTo() ? { reply_to: replyTo() } : {}),
        }),
      });

      // Inspect the provider response without assuming its shape.
      const providerType = res.headers.get("content-type") || "";
      const rawBody = await res.text();
      let json: Record<string, unknown> = {};
      let parsed = true;
      try {
        json = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsed = false;
      }

      if (!res.ok) {
        return {
          ok: false,
          provider: this.name,
          error:
            (json.message as string) ||
            `Resend API returned HTTP ${res.status}`,
        };
      }

      const messageId = json.id as string | undefined;
      if (!parsed || !messageId) {
        // Provider replied 200 but not in the documented format. Log safe
        // metadata only — never credentials or the OTP itself.
        console.error("[email] provider returned HTTP 200 with an unexpected body", {
          provider: this.name,
          status: res.status,
          contentType: providerType,
          parsedAsJson: parsed,
          responseKeys: Object.keys(json),
        });
        return {
          ok: false,
          provider: this.name,
          error: `Provider returned HTTP ${res.status} but the response format was invalid (no message id)`,
        };
      }
      return { ok: true, provider: this.name, messageId };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : "Resend request failed",
      };
    }
  }
}

/* ---------------------------- Configuration ---------------------------- */
export type EmailConfigStatus = {
  configured: boolean;
  provider: string | null;
  missing: string[];
};

export function emailConfig(): EmailConfigStatus {
  if (process.env.RESEND_API_KEY) {
    const missing = process.env.EMAIL_FROM ? [] : ["EMAIL_FROM"];
    return {
      configured: missing.length === 0,
      provider: "resend",
      missing,
    };
  }
  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"];
  const missing = required.filter((k) => !process.env[k]);
  return {
    configured: missing.length === 0,
    provider: missing.length === 0 ? "smtp" : null,
    missing,
  };
}

function getProvider(): EmailProvider | null {
  const cfg = emailConfig();
  if (!cfg.configured || !cfg.provider) return null;
  return cfg.provider === "resend"
    ? new ResendEmailProvider()
    : new SmtpEmailProvider();
}

/* ------------------------------ Templates ------------------------------ */
const SUBJECTS: Record<EmailTemplate, string> = {
  booking_confirmed: "Your Rental Booking is Confirmed",
  booking_cancelled: "Your Rental Booking was Cancelled",
};

function textBody(template: EmailTemplate, d: Record<string, string>): string {
  switch (template) {
    case "booking_confirmed":
      return [
        "Your booking is confirmed.",
        "",
        `Booking ID: ${d.bookingRef}`,
        `Verification Code: ${d.verificationCode}`,
        "",
        "Save both — you'll need them to manage your rental at any time.",
      ].join("\n");
    case "booking_cancelled":
      return `Your booking ${d.bookingRef} has been cancelled. ${d.details || ""}`;
  }
}

function htmlBody(template: EmailTemplate, d: Record<string, string>): string {
  const wrap = (inner: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
    <div style="font-weight:800;font-size:18px;letter-spacing:.5px;margin-bottom:20px;">
      RENT A CAR
      <div style="font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;color:#64748b;margin-top:2px;">
        Cars &bull; Bikes &bull; Easy Booking
      </div>
    </div>
    ${inner}
    <p style="font-size:11px;color:#94a3b8;margin-top:28px;">
      This is an automated message from Rent A Car. This service is available inside the city only.
    </p>
  </div>`;



  if (template === "booking_confirmed") {
    return wrap(`
      <h2 style="font-size:20px;margin:0 0 8px;">Booking confirmed</h2>
      <p style="color:#475569;margin:0 0 16px;">Thank you! Your rental booking is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:8px 0;color:#64748b;">Booking ID</td><td style="padding:8px 0;font-weight:700;text-align:right;">${d.bookingRef}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Verification Code</td><td style="padding:8px 0;font-weight:700;text-align:right;letter-spacing:2px;">${d.verificationCode}</td></tr>
      </table>
      <p style="color:#475569;margin:0 0 6px;">Save both codes — you'll need them to <strong>manage your booking</strong> at any time.</p>
      <p style="color:#94a3b8;margin:0;font-size:13px;">No account or password is required.</p>
    `);
  }

  return wrap(`
    <h2 style="font-size:20px;margin:0 0 8px;">Booking cancelled</h2>
    <p style="color:#475569;margin:0;">Your booking <strong>${d.bookingRef}</strong> has been cancelled. ${d.details || ""}</p>
  `);
}

/* -------------------------------- Send --------------------------------- */
export async function sendEmail(input: {
  to: string;
  template: EmailTemplate;
  data?: Record<string, string>;
}): Promise<SendResult> {
  const provider = getProvider();

  // No provider configured → explicit failure. Never pretend it was sent.
  if (!provider) {
    const cfg = emailConfig();
    const result: SendResult = {
      ok: false,
      provider: "none",
      error: `Email delivery is not configured. Missing: ${cfg.missing.join(", ") || "provider credentials"}`,
    };
    await logAttempt(
      input.to,
      input.template,
      "none",
      "not_configured",
      result.error ?? "not configured"
    );
    return result;
  }

  const subject = SUBJECTS[input.template];
  const data = input.data || {};

  const result = await provider.send({
    to: input.to,
    subject,
    text: textBody(input.template, data),
    html: htmlBody(input.template, data),
  });

  await logAttempt(
    input.to,
    input.template,
    result.provider,
    result.ok ? "sent" : "failed",
    result.ok ? null : result.error ?? "unknown error",
    result.messageId
  );

  // Safe diagnostics — never includes the OTP or credentials.
  if (result.ok) {
    console.log(
      `[email] delivered via ${result.provider} to ${input.to} (${input.template}) messageId=${result.messageId ?? "n/a"}`
    );
  } else {
    console.error(
      `[email] FAILED via ${result.provider} to ${input.to} (${input.template}): ${result.error}`
    );
  }

  return result;
}

async function logAttempt(
  to: string,
  template: string,
  provider: string,
  status: string,
  error: string | null,
  messageId?: string
) {
  try {
    await db.insert(emailLogs).values({
      toAddress: to,
      subject: template,
      template,
      provider,
      status,
      error: messageId
        ? `${error ?? ""} [${messageId}]`.trim()
        : error ?? null,
    });
  } catch {
    /* logging is best-effort and must never break delivery */
  }
}

export async function verifyEmailConfig(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const cfg = emailConfig();
  if (!cfg.configured) {
    return {
      ok: false,
      detail: `Email provider not configured (missing: ${cfg.missing.join(", ")}).`,
    };
  }
  if (cfg.provider === "smtp") {
    return {
      ok: true,
      detail: `SMTP configured for ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}.`,
    };
  }
  return { ok: true, detail: "Resend API key present." };
}
