"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Bike,
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDateTime,
  bookingStatusLabel,
  getBookingStatusColor,
} from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = [
  "#f59e0b",
  "#a855f7",
  "#10b981",
  "#3b82f6",
  "#64748b",
  "#ef4444",
];

type DashboardData = {
  vehicles: {
    total: number;
    cars: number;
    bikes: number;
    available: number;
    rented: number;
    reserved: number;
    maintenance: number;
  };
  bookings: {
    total: number;
    pending: number;
    paymentSubmitted: number;
    confirmed: number;
    active: number;
    completed: number;
    cancelled: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  payments: {
    pendingVerification: number;
    totalRevenue: number;
    monthRevenue: number;
    todayRevenue: number;
  };
  customers: number;
  cancellationRate: number;
  recentBookings: {
    id: number;
    bookingId: string;
    customerName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    vehicleName: string | null;
  }[];
  revenueByDay: { day: string; revenue: number; count: number }[];
  bookingsByStatus: { name: string; value: number }[];
  topVehicles: {
    id: number;
    name: string;
    type: string;
    bookingCount: number;
    coverImage: string | null;
  }[];
  upcoming: {
    id: number;
    bookingId: string;
    customerName: string;
    pickupDate: string;
    vehicleName: string | null;
    status: string;
  }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  const stats = [
    {
      label: "Total Vehicles",
      value: data.vehicles.total,
      sub: `${data.vehicles.cars} cars · ${data.vehicles.bikes} bikes`,
      icon: Car,
      color: "bg-blue-500",
    },
    {
      label: "Available",
      value: data.vehicles.available,
      sub: `${data.vehicles.rented} rented · ${data.vehicles.reserved} reserved`,
      icon: CheckCircle,
      color: "bg-emerald-500",
    },
    {
      label: "Pending Bookings",
      value: data.bookings.pending + data.bookings.paymentSubmitted,
      sub: `${data.bookings.today} today`,
      icon: Calendar,
      color: "bg-amber-500",
    },
    {
      label: "Pending Payments",
      value: data.payments.pendingVerification,
      sub: "Awaiting verification",
      icon: CreditCard,
      color: "bg-purple-500",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(data.payments.totalRevenue),
      sub: `${formatCurrency(data.payments.monthRevenue)} this month`,
      icon: TrendingUp,
      color: "bg-brand-600",
    },
    {
      label: "Customers",
      value: data.customers,
      sub: `${data.bookings.thisMonth} bookings this month`,
      icon: Users,
      color: "bg-slate-600",
    },
    {
      label: "Active Rentals",
      value: data.bookings.active,
      sub: `${data.bookings.confirmed} confirmed upcoming`,
      icon: Bike,
      color: "bg-cyan-600",
    },
    {
      label: "Cancel Rate",
      value: `${data.cancellationRate}%`,
      sub: `${data.bookings.cancelled} cancelled total`,
      icon: AlertCircle,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of your rental business
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`h-10 w-10 rounded-xl ${s.color} text-white flex items-center justify-center`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {s.label}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Revenue (7 days)</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              {data.revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No verified payments yet
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Bookings by Status</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bookingsByStatus.filter((b) => b.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.bookingsByStatus.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-semibold">Recent Bookings</h3>
            <Link
              href="/admin/bookings"
              className="text-sm text-brand-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings?id=${b.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {b.bookingId} · {b.customerName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {b.vehicleName} · {formatDateTime(b.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className={getBookingStatusColor(b.status)}>
                    {bookingStatusLabel(b.status)}
                  </Badge>
                  <p className="text-xs font-semibold mt-1">
                    {formatCurrency(b.totalAmount)}
                  </p>
                </div>
              </Link>
            ))}
            {!data.recentBookings.length && (
              <p className="text-sm text-slate-400 text-center py-6">
                No bookings yet
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold">Top Vehicles</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {data.topVehicles.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-2"
              >
                <span className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{v.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{v.type}</p>
                </div>
                <span className="text-sm font-semibold">
                  {v.bookingCount} bookings
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {data.upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Upcoming Rentals</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-2 font-medium">Booking</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Vehicle</th>
                    <th className="pb-2 font-medium">Pickup</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-50 dark:border-slate-800/50"
                    >
                      <td className="py-3 font-medium">{u.bookingId}</td>
                      <td className="py-3">{u.customerName}</td>
                      <td className="py-3">{u.vehicleName}</td>
                      <td className="py-3">{formatDateTime(u.pickupDate)}</td>
                      <td className="py-3">
                        <Badge className={getBookingStatusColor(u.status)}>
                          {bookingStatusLabel(u.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
