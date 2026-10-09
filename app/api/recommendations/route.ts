import { NextRequest } from "next/server";
import { jsonOk, handleApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { recommendVehicles } from "@/services/recommendations";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);

    const prefs = {
      budget: searchParams.get("budget")
        ? Number(searchParams.get("budget"))
        : undefined,
      vehicleType:
        (searchParams.get("type") as "car" | "bike" | null) || undefined,
      passengers: searchParams.get("passengers")
        ? Number(searchParams.get("passengers"))
        : undefined,
      transmission: searchParams.get("transmission") || undefined,
      fuelType: searchParams.get("fuelType") || undefined,
      pickupDate: searchParams.get("pickup") || undefined,
      returnDate: searchParams.get("return") || undefined,
      userId: session?.id,
    };

    const data = await recommendVehicles(prefs, 6);
    return jsonOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const data = await recommendVehicles(
      { ...body, userId: session?.id },
      body.limit || 6
    );
    return jsonOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
