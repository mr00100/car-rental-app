import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/db/schema";

export const COOKIE_NAME = "rac_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return new TextEncoder().encode(
      "rent-a-car-dev-secret-change-in-production-32chars"
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
  phone: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isHttpsRequest(req?: NextRequest): boolean {
  // Explicit override wins in BOTH directions.
  //   SECURE_COOKIE=true  -> always Secure + SameSite=None (HTTPS deployments)
  //   SECURE_COOKIE=false -> never Secure  + SameSite=Lax  (plain-HTTP local dev)
  // Previously the "false" branch was an empty no-op that fell through to the
  // proto sniff, so a proxy sending x-forwarded-proto=https would still emit a
  // `Secure` cookie that a plain-HTTP browser silently discards.
  if (process.env.SECURE_COOKIE === "true") return true;
  if (process.env.SECURE_COOKIE === "false") return false;

  // Otherwise auto-detect. x-forwarded-proto may be a comma-separated chain
  // ("https,http") behind multiple proxies — the client-facing value is first.
  const proto =
    req?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req?.nextUrl.protocol.replace(":", "") ||
    "";
  return proto === "https";
}

export function sessionCookieOptions(isHttps: boolean) {
  // Preview iframes are third-party context. SameSite=Lax cookies are dropped
  // there, so authenticated users bounce back to Sign In. On HTTPS use
  // SameSite=None; Secure so the session actually sticks.
  return {
    httpOnly: true as const,
    secure: isHttps,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  };
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
}

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  isHttps: boolean
) {
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions(isHttps));
  return res;
}

export function clearSessionCookie(res: NextResponse, isHttps: boolean) {
  res.cookies.set(COOKIE_NAME, "", {
    ...sessionCookieOptions(isHttps),
    maxAge: 0,
  });
  return res;
}

export async function createSession(
  user: SessionUser,
  req?: NextRequest
): Promise<string> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    token,
    sessionCookieOptions(isHttpsRequest(req))
  );
  return token;
}

export async function destroySession(req?: NextRequest): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    ...sessionCookieOptions(isHttpsRequest(req)),
    maxAge: 0,
  });
}

async function readTokenFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();

  // 1. Primary HttpOnly session cookie.
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  // 2. Non-HttpOnly companion cookie set by the client (works in iframes
  //    where the SameSite=Lax HttpOnly cookie is dropped).
  const fromClientCookie = cookieStore.get("rac_token")?.value;
  if (fromClientCookie) return fromClientCookie;

  // 3. Authorization: Bearer <token> header.
  const headerStore = await headers();
  const auth =
    headerStore.get("authorization") || headerStore.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = await readTokenFromRequest();
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    const sessionId = Number(payload.id);
    const sessionEmail = String(payload.email || "").trim().toLowerCase();
    if (!Number.isInteger(sessionId) || sessionId <= 0) return null;

    // Resolve the session against the current users table. This also repairs
    // stale JWT user IDs after a database re-seed while keeping the same
    // account when its email still exists.
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionId))
      .limit(1);

    if (!user && sessionEmail) {
      [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, sessionEmail))
        .limit(1);
    }

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone || null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  if (!user || !user.isActive) return null;
  return user;
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "STAFF";
}

export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageVehicles(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageBookings(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "STAFF";
}

export function canManagePayments(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageSettings(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canManageUsers(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Authentication required", 401);
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (!isAdmin(session.role)) {
    throw new AuthError("Admin access required", 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}
