import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "CUSTOMER") {
      return jsonError("Not authenticated", 401);
    }

    return jsonOk({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
