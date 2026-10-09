import { db } from "@/db";
import { emailLogs, smsLogs } from "@/db/schema";

// Reusable notification service with Email + SMS providers.
// Falls back to safe mock providers (logged to DB) when credentials are absent.

export type EmailTemplate =
  | "registration"
  | "email_verification"
  | "booking_created"
  | "payment_received"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "rental_reminder"
  | "rental_ending"
  | "payment_failed"
  | "license_result";

interface EmailProvider {
  readonly name: string;
  readonly demo: boolean;
  send(input: {
    to: string;
    subject: string;
    body: string;
    template?: EmailTemplate;
  }): Promise<{ ok: boolean; error?: string }>;
}

interface SMSProvider {
  readonly name: string;
  readonly demo: boolean;
  send(input: { to: string; message: string }): Promise<{
    ok: boolean;
    error?: string;
  }>;
}

class SmtpEmailProvider implements EmailProvider {
  name = "smtp";
  get demo() {
    return !(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD
    );
  }
  async send() {
    // Real SMTP send would go here with nodemailer using EMAIL_* env vars.
    // Without a runtime SMTP dependency configured, treat as not sent.
    return { ok: false, error: "SMTP not configured" };
  }
}

class MockEmailProvider implements EmailProvider {
  name = "mock";
  demo = true;
  async send(input: { to: string; subject: string }) {
    console.log(`[MOCK EMAIL] → ${input.to}: ${input.subject}`);
    return { ok: true };
  }
}

class MockSMSProvider implements SMSProvider {
  name = "mock";
  demo = true;
  async send(input: { to: string; message: string }) {
    console.log(`[MOCK SMS] → ${input.to}: ${input.message}`);
    return { ok: true };
  }
}

function getEmailProvider(): EmailProvider {
  const smtp = new SmtpEmailProvider();
  return smtp.demo ? new MockEmailProvider() : smtp;
}

function getSMSProvider(): SMSProvider {
  // A real provider (e.g. Twilio) would be selected here when SMS_API_KEY set.
  return new MockSMSProvider();
}

const TEMPLATES: Record<EmailTemplate, (data: Record<string, string>) => string> =
  {
    registration: (d) =>
      `Welcome to Rent A Car, ${d.name || "there"}! Your account is ready.`,
    email_verification: (d) =>
      `Please verify your email. Code: ${d.code || "N/A"}`,
    booking_created: (d) =>
      `Your booking ${d.bookingRef} for ${d.vehicle} was created. Complete payment to confirm.`,
    payment_received: (d) =>
      `We received your payment for booking ${d.bookingRef}. It is under review.`,
    booking_confirmed: (d) =>
      `Your booking ${d.bookingRef} for ${d.vehicle} is confirmed. Enjoy your ride!`,
    booking_rejected: (d) => `Your booking ${d.bookingRef} was rejected.`,
    booking_cancelled: (d) => `Your booking ${d.bookingRef} was cancelled.`,
    rental_reminder: (d) =>
      `Reminder: your rental ${d.bookingRef} starts soon. Pickup: ${d.pickup}.`,
    rental_ending: (d) =>
      `Reminder: your rental ${d.bookingRef} ends soon. Return: ${d.ret}.`,
    payment_failed: (d) => `Payment failed for booking ${d.bookingRef}.`,
    license_result: (d) =>
      `Your driving license verification is now: ${d.status}.`,
  };

export async function sendEmail(input: {
  to: string;
  subject: string;
  template: EmailTemplate;
  data?: Record<string, string>;
}) {
  const provider = getEmailProvider();
  const body = TEMPLATES[input.template](input.data || {});
  const result = await provider.send({
    to: input.to,
    subject: input.subject,
    body,
    template: input.template,
  });
  try {
    await db.insert(emailLogs).values({
      toAddress: input.to,
      subject: input.subject,
      template: input.template,
      provider: provider.name,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
    });
  } catch {
    /* logging must never break the flow */
  }
  return result;
}

export async function sendSMS(input: { to: string; message: string }) {
  if (!input.to) return { ok: false, error: "no recipient" };
  const provider = getSMSProvider();
  const result = await provider.send(input);
  try {
    await db.insert(smsLogs).values({
      toNumber: input.to,
      message: input.message,
      provider: provider.name,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? null,
    });
  } catch {
    /* ignore */
  }
  return result;
}

export function notificationProvidersStatus() {
  return {
    email: getEmailProvider().name,
    emailDemo: getEmailProvider().demo,
    sms: getSMSProvider().name,
    smsDemo: getSMSProvider().demo,
  };
}
