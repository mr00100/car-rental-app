import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyPassword,
  signSessionToken,
  attachSessionCookie,
  isHttpsRequest,
  isAdmin,
} from "@/lib/auth";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Dedicated authentication endpoint for staff/admins only. The public
// customer website has no login or registration.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (!user || !user.isActive) {
      return jsonError("Invalid credentials", 401);
    }
    if (!isAdmin(user.role)) {
      // Customer accounts cannot use the admin console.
      return jsonError("Invalid credentials", 401);
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) return jsonError("Invalid credentials", 401);

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
    });

    const res = jsonOk({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      token,
    });

    attachSessionCookie(res, token, isHttpsRequest(req));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
