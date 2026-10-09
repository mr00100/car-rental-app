import { jsonOk, handleApiError } from "@/lib/api";
import { listPaymentMethods } from "@/services/payments";

export async function GET() {
  try {
    return jsonOk({ methods: listPaymentMethods() });
  } catch (err) {
    return handleApiError(err);
  }
}
