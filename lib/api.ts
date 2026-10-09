import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status }
  );
}

export function handleApiError(err: unknown) {
  console.error("API Error:", err);

  if (err instanceof AuthError) {
    return jsonError(err.message, err.status);
  }

  if (err instanceof ZodError) {
    return jsonError("Validation failed", 400, err.flatten().fieldErrors);
  }

  if (err instanceof Error) {
    return jsonError(err.message || "Internal server error", 500);
  }

  return jsonError("Internal server error", 500);
}
