import { NextRequest } from "next/server";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  isVehicleAvailableForDates,
  getVehicleBookedRanges,
} from "@/lib/availability";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = parseInt(searchParams.get("vehicleId") || "", 10);
    const pickup = searchParams.get("pickup");
    const returnDate = searchParams.get("return");

    if (!vehicleId) return jsonError("vehicleId is required", 400);

    if (pickup && returnDate) {
      const result = await isVehicleAvailableForDates(
        vehicleId,
        new Date(pickup),
        new Date(returnDate)
      );
      return jsonOk(result);
    }

    const ranges = await getVehicleBookedRanges(vehicleId);
    return jsonOk({ bookedRanges: ranges });
  } catch (err) {
    return handleApiError(err);
  }
}
