import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyPassword,
  signSessionToken,
  attachSessionCookie,
  isHttpsRequest,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.trim().toLowerCase()))
      .limit(1);

    if (!user || !user.isActive || user.role !== "CUSTOMER") {
      return jsonError("Invalid email or password.", 401);
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid email or password.", 401);
    }

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
      phone: user.phone,
      role: user.role,
    });

    attachSessionCookie(res, token, isHttpsRequest(req));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
