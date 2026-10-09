import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.role)) {
      return jsonError("Not authorized", 401);
    }
    return jsonOk({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
