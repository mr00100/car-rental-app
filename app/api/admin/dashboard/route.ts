import { db } from "@/db";
import {
  vehicles,
  bookings,
  payments,
  users,
  reviews,
  licenseVerifications,
} from "@/db/schema";
import { eq, sql, and, gte, count, inArray } from "drizzle-orm";
import { jsonOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [vehicleStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        cars: sql<number>`count(*) filter (where ${vehicles.vehicleType} = 'car')::int`,
        bikes: sql<number>`count(*) filter (where ${vehicles.vehicleType} = 'bike')::int`,
        available: sql<number>`count(*) filter (where ${vehicles.availability} = 'available')::int`,
        rented: sql<number>`count(*) filter (where ${vehicles.availability} = 'rented')::int`,
        reserved: sql<number>`count(*) filter (where ${vehicles.availability} = 'reserved')::int`,
        maintenance: sql<number>`count(*) filter (where ${vehicles.availability} = 'maintenance')::int`,
      })
      .from(vehicles)
      .where(eq(vehicles.isArchived, false));

    const [bookingStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${bookings.status} in ('pending','payment_pending'))::int`,
        paymentSubmitted: sql<number>`count(*) filter (where ${bookings.status} = 'payment_submitted')::int`,
        confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
        active: sql<number>`count(*) filter (where ${bookings.status} = 'active')::int`,
        completed: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')::int`,
        today: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${today})::int`,
        thisWeek: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${weekAgo})::int`,
        thisMonth: sql<number>`count(*) filter (where ${bookings.createdAt} >= ${monthAgo})::int`,
      })
      .from(bookings);

    const [paymentStats] = await db
      .select({
        pendingVerification: sql<number>`count(*) filter (where ${payments.status} = 'submitted')::int`,
        totalRevenue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified'), 0)::int`,
        monthRevenue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified' and ${payments.verifiedAt} >= ${monthAgo}), 0)::int`,
        todayRevenue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'verified' and ${payments.verifiedAt} >= ${today}), 0)::int`,
      })
      .from(payments);

    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, "CUSTOMER"));

    const [pendingLicense] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(licenseVerifications)
      .where(
        inArray(licenseVerifications.status, ["submitted", "under_review"])
      );

    // Recent bookings
    const recentBookings = await db
      .select({
        id: bookings.id,
        bookingId: bookings.bookingId,
        customerName: bookings.customerName,
        status: bookings.status,
        totalAmount: bookings.totalAmount,
        createdAt: bookings.createdAt,
        vehicleName: vehicles.name,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .orderBy(sql`${bookings.createdAt} desc`)
      .limit(8);

    // Revenue by day (last 14 days)
    const revenueByDay = await db
      .select({
        day: sql<string>`to_char(${payments.verifiedAt}, 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "verified"),
          gte(payments.verifiedAt, weekAgo)
        )
      )
      .groupBy(sql`to_char(${payments.verifiedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${payments.verifiedAt}, 'YYYY-MM-DD')`);

    // Bookings by status for chart
    const bookingsByStatus = [
      { name: "Pending", value: bookingStats.pending },
      { name: "Payment Submitted", value: bookingStats.paymentSubmitted },
      { name: "Confirmed", value: bookingStats.confirmed },
      { name: "Active", value: bookingStats.active },
      { name: "Completed", value: bookingStats.completed },
      { name: "Cancelled", value: bookingStats.cancelled },
    ];

    // Top vehicles
    const topVehicles = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        type: vehicles.vehicleType,
        bookingCount: vehicles.bookingCount,
        coverImage: vehicles.coverImage,
      })
      .from(vehicles)
      .where(eq(vehicles.isArchived, false))
      .orderBy(sql`${vehicles.bookingCount} desc`)
      .limit(5);

    // Upcoming rentals
    const upcoming = await db
      .select({
        id: bookings.id,
        bookingId: bookings.bookingId,
        customerName: bookings.customerName,
        pickupDate: bookings.pickupDate,
        vehicleName: vehicles.name,
        status: bookings.status,
      })
      .from(bookings)
      .leftJoin(vehicles, eq(bookings.vehicleId, vehicles.id))
      .where(
        and(
          sql`${bookings.status} in ('confirmed', 'active')`,
          gte(bookings.pickupDate, today)
        )
      )
      .orderBy(bookings.pickupDate)
      .limit(5);

    const cancellationRate =
      bookingStats.total > 0
        ? Math.round((bookingStats.cancelled / bookingStats.total) * 100)
        : 0;

    return jsonOk({
      vehicles: vehicleStats,
      bookings: bookingStats,
      payments: paymentStats,
      customers: userCount?.count ?? 0,
      pendingLicenseVerifications: pendingLicense?.count ?? 0,
      cancellationRate,
      recentBookings,
      revenueByDay,
      bookingsByStatus,
      topVehicles,
      upcoming,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
