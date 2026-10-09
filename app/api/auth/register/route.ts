import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  signSessionToken,
  attachSessionCookie,
  isHttpsRequest,
} from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const firstName = data.firstName?.trim() || "";
    const lastName = data.lastName?.trim() || "";
    const fullName =
      data.fullName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!fullName) {
      return jsonError("Full name is required.", 400);
    }

    if (firstName && !lastName && !data.fullName) {
      return jsonError("Last name is required.", 400);
    }

    const email = data.email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return jsonError("An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName,
        phone: data.phone || null,
        city: data.city?.trim() || null,
        role: "CUSTOMER",
        isActive: true,
        emailVerified: false,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
      });

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
    });

    const res = jsonOk(user, 201);
    attachSessionCookie(res, token, isHttpsRequest(req));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
