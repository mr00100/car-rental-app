import crypto from "crypto";

// AES-256-GCM encryption for sensitive fields (e.g. license numbers).
// Uses ENCRYPTION_KEY (32-byte hex/base64) or derives a dev key from AUTH_SECRET.
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  }
  // Deterministic dev fallback (NOT for production secrets).
  const secret =
    process.env.AUTH_SECRET || "rent-a-car-dev-secret-change-in-production-32";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString(
    "base64"
  )}`;
}

export function decryptString(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function maskLicense(num: string): string {
  const clean = num.replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return `${"•".repeat(Math.max(2, clean.length - 4))}${clean.slice(-4)}`;
}

export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
