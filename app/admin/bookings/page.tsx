"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDateTime,
  bookingStatusLabel,
  getBookingStatusColor,
  paymentStatusLabel,
} from "@/lib/utils";

type Booking = {
  id: number;
  bookingId: string;
  status: string;
  totalAmount: number;
  driverFee: number;
  rentalMode: "self_drive" | "with_driver";
  pickupDate: string;
  returnDate: string;
  durationLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  city: string;
  notes: string | null;
  vehicle: {
    name: string | null;
    type: string | null;
    brand: string | null;
  };
  payment: {
    id: number;
    status: string;
    transactionId: string | null;
    senderPhone: string | null;
  } | null;
};

const getRequestedQuantity = (notes: string | null) => {
  const match = notes?.match(/Quantity:\s*(\d+)/i);
  return match ? Number(match[1]) : 1;
};

const STATUSES = [
  "pending",
  "payment_pending",
  "payment_submitted",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "rejected",
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [customer, setCustomer] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    if (customer) params.set("customer", customer);
    fetch(`/api/bookings?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBookings(json.data.bookings);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const updateStatus = async (id: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        load();
        setSelected(null);
      } else {
        alert(json.error || "Failed");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-sm text-slate-500">Manage all customer bookings</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUSES.map((s) => ({
            value: s,
            label: bookingStatusLabel(s),
          }))}
          placeholder="All statuses"
          className="w-48"
        />
        <Input
          placeholder="Search customer / booking ID"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Vehicle / Quantity</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold">{b.bookingId}</p>
                      <p className="text-xs text-slate-500">{b.durationLabel}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.customerName}</p>
                      <p className="text-xs text-slate-500">{b.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{b.vehicle.brand} {b.vehicle.name}</p>
                      {getRequestedQuantity(b.notes) > 1 && <p className="text-xs font-semibold text-brand-600 mt-1">{getRequestedQuantity(b.notes)} cars requested · Allocation pending</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{formatDateTime(b.pickupDate)}</p>
                      <p className="text-slate-500">
                        → {formatDateTime(b.returnDate)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(b.totalAmount)}
                      <p className="text-xs text-slate-500 font-normal">
                        {b.rentalMode === "with_driver" ? "With Driver" : "Self Drive"}
                        {b.driverFee > 0 && ` • Driver ${formatCurrency(b.driverFee)}`}
                      </p>
                      {b.payment && (
                        <p className="text-xs text-slate-500 font-normal">
                          Pay: {paymentStatusLabel(b.payment.status)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getBookingStatusColor(b.status)}>
                        {bookingStatusLabel(b.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(b)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!bookings.length && (
            <p className="text-center text-slate-400 py-12">No bookings found</p>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelected(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-1">{selected.bookingId}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selected.customerName} · {selected.customerPhone}
            </p>

            <div className="space-y-2 text-sm mb-6">
              <p>
                <span className="text-slate-500">Vehicle Model:</span>{" "}
                {selected.vehicle.brand} {selected.vehicle.name}
              </p>
              <p>
                <span className="text-slate-500">Requested Quantity:</span>{" "}
                <strong>{getRequestedQuantity(selected.notes)} car(s)</strong>
              </p>
              {getRequestedQuantity(selected.notes) > 1 && (
                <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 p-3 text-xs">
                  This is a bulk request. Physical vehicle allocation is pending; manage individual vehicle availability from the Vehicles section.
                </p>
              )}
              <p>
                <span className="text-slate-500">Pickup:</span>{" "}
                {formatDateTime(selected.pickupDate)}
              </p>
              <p>
                <span className="text-slate-500">Return:</span>{" "}
                {formatDateTime(selected.returnDate)}
              </p>
              <p>
                <span className="text-slate-500">Driving Option:</span>{" "}
                {selected.rentalMode === "with_driver" ? "With Driver" : "Self Drive"}
              </p>
              <p>
                <span className="text-slate-500">Vehicle Rental:</span>{" "}
                {formatCurrency(selected.totalAmount - selected.driverFee)}
              </p>
              <p>
                <span className="text-slate-500">Driver Charge:</span>{" "}
                {formatCurrency(selected.driverFee)}
              </p>
              <p>
                <span className="text-slate-500">Final Total:</span>{" "}
                <strong>{formatCurrency(selected.totalAmount)}</strong>
              </p>
              <p>
                <span className="text-slate-500">Status:</span>{" "}
                {bookingStatusLabel(selected.status)}
              </p>
              {selected.payment && (
                <p>
                  <span className="text-slate-500">Payment:</span>{" "}
                  {paymentStatusLabel(selected.payment.status)}
                  {selected.payment.transactionId &&
                    ` · ${selected.payment.transactionId}`}
                </p>
              )}
              {selected.notes && (
                <p>
                  <span className="text-slate-500">Notes:</span> {selected.notes}
                </p>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Change Status
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={selected.status === s ? "primary" : "outline"}
                  loading={actionLoading}
                  disabled={selected.status === s}
                  onClick={() => updateStatus(selected.id, s)}
                >
                  {bookingStatusLabel(s)}
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
