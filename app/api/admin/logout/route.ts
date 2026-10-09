import { NextRequest } from "next/server";
import { clearSessionCookie, isHttpsRequest } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const res = jsonOk({ message: "Logged out" });
    clearSessionCookie(res, isHttpsRequest(req));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
