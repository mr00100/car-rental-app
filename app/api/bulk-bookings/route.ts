import { NextRequest } from "next/server";
import { db } from "@/db";
import { bookings, payments, rentalPrices, vehicles } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { calculateDriverCharge, calculateRentalDays } from "@/lib/booking-pricing";
import { generatePublicBookingId, generateVerificationCode, hashToken } from "@/lib/utils";
import { notifyAdmins, createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const itemMap = new Map<number, number>();
    for (const item of rawItems) {
      const vehicleId = Number(item?.vehicleId);
      const quantity = Math.max(0, Math.min(20, Math.floor(Number(item?.quantity) || 0)));
      if (Number.isInteger(vehicleId) && vehicleId > 0 && quantity > 0) itemMap.set(vehicleId, quantity);
    }
    const items = Array.from(itemMap.entries()).map(([vehicleId, quantity]) => ({ vehicleId, quantity }));
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const pickupDate = new Date(String(body.pickupDate || ""));
    const returnDate = new Date(String(body.returnDate || ""));
    const rentalMode = body.rentalMode === "with_driver" ? "with_driver" : "self_drive";

    if (totalQuantity < 2) return jsonError("Select at least 2 cars for a bulk booking", 400);
    if (totalQuantity > 50) return jsonError("You can select up to 50 cars at once", 400);
    if (!Number.isFinite(pickupDate.getTime()) || !Number.isFinite(returnDate.getTime()) || returnDate <= pickupDate) return jsonError("Please select a valid pickup and return date/time", 400);
    if (pickupDate < new Date(Date.now() - 60 * 60 * 1000)) return jsonError("Pickup date cannot be in the past", 400);

    const customerName = String(body.customerName || session.fullName).trim();
    const customerPhone = String(body.customerPhone || session.phone || "").trim();
    const customerEmail = String(body.customerEmail || session.email || "").trim();
    const city = String(body.city || "Lahore").trim();
    if (customerName.length < 2) return jsonError("Name is required", 400);
    if (!/^((\+92|0)?3[0-9]{9})$/.test(customerPhone.replace(/[\s-]/g, ""))) return jsonError("A valid Pakistani phone number is required", 400);
    if (city.length < 2) return jsonError("City is required", 400);

    const vehicleIds = items.map(item => item.vehicleId);
    const selectedVehicles = await db.select().from(vehicles).where(and(eq(vehicles.isArchived, false), inArray(vehicles.id, vehicleIds)));
    if (selectedVehicles.length !== vehicleIds.length) return jsonError("One or more selected vehicle models could not be found", 404);

    const rentalDays = calculateRentalDays(pickupDate, returnDate);
    const durationHours = Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / 3600000));
    const durationLabel = `${rentalDays} Day${rentalDays > 1 ? "s" : ""}`;
    const prepared: Array<{ vehicleId: number; quantity: number; unitPrice: number; totalAmount: number; driverFee: number; label: string }> = [];

    for (const item of items) {
      const vehicle = selectedVehicles.find(v => v.id === item.vehicleId)!;
      const [dayPrice] = await db.select().from(rentalPrices).where(and(eq(rentalPrices.vehicleId, vehicle.id), eq(rentalPrices.durationHours, 24), eq(rentalPrices.isActive, true))).limit(1);
      if (!dayPrice) return jsonError(`Pricing is not configured for ${vehicle.name}`, 400);
      const perVehicleDriverFee = calculateDriverCharge(rentalMode, rentalDays);
      const driverFee = perVehicleDriverFee * item.quantity;
      const totalAmount = (dayPrice.price * rentalDays * item.quantity) + driverFee;
      prepared.push({ vehicleId: vehicle.id, quantity: item.quantity, unitPrice: dayPrice.price, totalAmount, driverFee, label: `${vehicle.brand} ${vehicle.name} (${vehicle.modelYear})` });
    }

    const created = await db.transaction(async (tx) => {
      const rows = [] as Array<typeof bookings.$inferSelect>;
      for (const item of prepared) {
        const [booking] = await tx.insert(bookings).values({
          bookingId: generatePublicBookingId(), userId: session.id, vehicleId: item.vehicleId,
          customerName, customerPhone, customerEmail: customerEmail || null, customerCnic: null, city,
          pickupDate, returnDate, durationHours, durationLabel, unitPrice: item.unitPrice, totalAmount: item.totalAmount,
          status: "payment_pending", notes: `Bulk booking • Quantity: ${item.quantity} • ${item.label} • Allocation pending — admin will finalize vehicle availability.`, rentalMode, driverId: null, driverFee: item.driverFee,
          verificationCodeHash: hashToken(generateVerificationCode(6)),
        }).returning();
        await tx.insert(payments).values({ bookingId: booking.id, amount: item.totalAmount, method: "easypaisa", status: "pending" });
        rows.push(booking);
      }
      return rows;
    });

    const totalAmount = created.reduce((sum, b) => sum + b.totalAmount, 0);
    await createNotification({ userId: session.id, type: "booking_submitted", title: "Bulk Booking Submitted", message: `${totalQuantity} vehicle(s) requested. Please complete the combined payment.`, link: "/dashboard" });
    await notifyAdmins({ type: "new_booking", title: "New Bulk Booking", message: `${totalQuantity} vehicle(s) requested by ${customerName}. Combined total: Rs. ${totalAmount}.`, link: "/admin/bookings" });

    return jsonOk({ bookingRefs: created.map(b => b.bookingId), bookingDbIds: created.map(b => b.id), totalAmount, vehicleCount: totalQuantity, bookingCount: created.length, rentalMode, rentalDays }, 201);
  } catch (err) { return handleApiError(err); }
}
