"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { calculateDriverCharge, calculateRentalDays } from "@/lib/booking-pricing";
import { Car, CalendarDays, UserRound, ChevronDown } from "lucide-react";

type Vehicle = {
  id: number; name: string; brand: string; modelYear: number; coverImage: string | null;
  availability: string; dayPrice: number | null;
};

type Props = { initialName: string; initialPhone: string; initialEmail: string };

export function BulkBookingForm({ initialName, initialPhone, initialEmail }: Props) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickup, setPickup] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [mode, setMode] = useState<"self_drive" | "with_driver">("self_drive");
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [city, setCity] = useState("Lahore");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vehicles?type=car&limit=50", { cache: "no-store" })
      .then(r => r.json())
      .then(json => {
        if (json.success) setVehicles((json.data.vehicles || []).map((v: any) => ({
          id: v.id, name: v.name, brand: v.brand, modelYear: v.modelYear,
          coverImage: v.coverImage, availability: v.availability, dayPrice: v.dayPrice,
        })));
        else setError(json.error || "Unable to load vehicles");
      })
      .catch(() => setError("Unable to load vehicles"))
      .finally(() => setLoading(false));
  }, []);

  const rentalDays = useMemo(() => {
    if (!pickup || !returnAt) return 0;
    return calculateRentalDays(new Date(pickup), new Date(returnAt));
  }, [pickup, returnAt]);

  const groups = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    for (const vehicle of vehicles) {
      const key = `${vehicle.brand}__${vehicle.name}__${vehicle.modelYear}`;
      const list = map.get(key) || [];
      list.push(vehicle);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, list]) => ({ key, vehicles: list }));
  }, [vehicles]);

  const selectedGroups = groups.filter(group => (quantities[group.key] || 0) > 0);
  const totalSelected = selectedGroups.reduce((sum, group) => sum + (quantities[group.key] || 0), 0);
  const total = selectedGroups.reduce((sum, group) => {
    const quantity = quantities[group.key] || 0;
    const unitPrice = group.vehicles[0]?.dayPrice || 0;
    return sum + (unitPrice * rentalDays * quantity) + (calculateDriverCharge(mode, rentalDays) * quantity);
  }, 0);

  const setQuantity = (groupKey: string, quantity: number) => {
    setQuantities(current => ({ ...current, [groupKey]: Math.max(0, Math.min(20, quantity)) }));
  };

  const submit = async () => {
    setError("");
    if (totalSelected < 2) return setError("Please select at least 2 cars.");
    if (totalSelected > 50) return setError("You can select up to 50 cars in one bulk booking.");
    if (!pickup || !returnAt || new Date(returnAt) <= new Date(pickup)) return setError("Please select valid pickup and return date/time.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (selectedGroups.some(group => !group.vehicles[0]?.dayPrice)) return setError("Pricing is not configured for one or more selected cars.");

    setSubmitting(true);
    try {
      const items = selectedGroups.map(group => ({
        vehicleId: group.vehicles[0].id,
        quantity: quantities[group.key] || 0,
      }));
      const res = await fetch("/api/bulk-bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, pickupDate: new Date(pickup).toISOString(), returnDate: new Date(returnAt).toISOString(), rentalMode: mode, customerName: name, customerPhone: phone, customerEmail: email, city }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setError(json.error || "Bulk booking failed"); return; }
      router.push(`/bulk-booking/payment?ids=${json.data.bookingDbIds.join(",")}`);
    } catch { setError("Unable to connect. Please try again."); }
    finally { setSubmitting(false); }
  };

  return <div className="space-y-8">
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold">Bulk Booking</h1>
      <p className="text-slate-500 mt-2">Select cars, choose the quantity you need, set your dates and driving option, then pay once for the complete request.</p>
    </div>

    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="text-xl font-bold">Select Cars & Quantity</h2><p className="text-sm text-slate-500 mt-1">Choose any quantity from 1 to 20 for each car model. Availability is finalized by the admin.</p></div><span className="text-sm font-semibold text-slate-500">{totalSelected} cars selected</span></div>
      {loading ? <p className="text-slate-500">Loading cars...</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const sample = group.vehicles[0];
          const quantity = quantities[group.key] || 0;
          const availableCount = group.vehicles.filter(v => v.availability === "available").length;
          return <div key={group.key} className={`rounded-2xl border overflow-hidden transition-all ${quantity > 0 ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200 dark:border-slate-800"}`}>
            <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
              {sample.coverImage ? <img src={sample.coverImage} alt={`${sample.brand} ${sample.name}`} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><Car className="h-12 w-12 text-slate-400" /></div>}
              {quantity > 0 && <span className="absolute top-3 right-3 h-8 min-w-8 px-2 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">{quantity}</span>}
            </div>
            <div className="p-4">
              <p className="font-bold">{sample.brand} {sample.name}</p>
              <p className="text-xs text-slate-500">{sample.modelYear} • {availableCount} currently available</p>
              <p className="text-sm font-semibold text-brand-600 mt-2">{sample.dayPrice ? `${formatCurrency(sample.dayPrice)}/day` : "Price unavailable"}</p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 p-2.5">
                <span className="text-sm font-semibold">Quantity</span>
                <div className="relative">
                  <select value={quantity} onChange={e => setQuantity(group.key, Number(e.target.value))} className="h-10 min-w-[105px] appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-4 pr-9 text-sm font-bold shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 cursor-pointer">
                    <option value={0}>0 — None</option>
                    {Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? "car" : "cars"}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Admin will confirm the actual vehicle allocation.</p>
            </div>
          </div>;
        })}
      </div>}
    </section>

    <section className="grid md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Rental Dates</h2>
        <Input label="Pickup Date & Time" type="datetime-local" value={pickup} onChange={e => setPickup(e.target.value)} required />
        <Input label="Return Date & Time" type="datetime-local" value={returnAt} onChange={e => setReturnAt(e.target.value)} required />
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="text-xl font-bold">Driving Option</h2>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMode("self_drive")} className={`rounded-xl border p-4 text-left ${mode === "self_drive" ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-slate-200 dark:border-slate-800"}`}><p className="font-semibold">Self Drive</p><p className="text-xs text-slate-500 mt-1">No driver charge</p></button>
          <button type="button" onClick={() => setMode("with_driver")} className={`rounded-xl border p-4 text-left ${mode === "with_driver" ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-slate-200 dark:border-slate-800"}`}><p className="font-semibold">With Driver</p><p className="text-xs text-slate-500 mt-1">+ Rs. 2,000/day per car</p></button>
        </div>
        <Input label="City" value={city} onChange={e => setCity(e.target.value)} required />
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><UserRound className="h-5 w-5" /> Booking Details</h2>
      <div className="grid sm:grid-cols-3 gap-4"><Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required /><Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} required /><Input label="Email" value={email} onChange={e => setEmail(e.target.value)} /></div>
    </section>

    <section className="rounded-2xl bg-slate-900 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div><p className="text-sm text-slate-300">{totalSelected} cars requested • {rentalDays || 0} rental day(s) • {mode === "with_driver" ? "With Driver" : "Self Drive"}</p><p className="text-3xl font-extrabold mt-1">{formatCurrency(total)}</p><p className="text-xs text-slate-400 mt-1">Combined amount — admin will finalize the physical vehicle allocation.</p></div>
      <Button size="lg" onClick={submit} loading={submitting}>Continue to Payment</Button>
    </section>
    {error && <div className="rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-4 text-sm">{error}</div>}
  </div>;
}
