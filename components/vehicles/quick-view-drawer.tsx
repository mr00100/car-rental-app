"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Star, Gauge, Users, Fuel, Palette, ArrowRight } from "lucide-react";
import { formatCurrency, availabilityLabel, cn } from "@/lib/utils";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";

export function QuickViewDrawer({
  open,
  onClose,
  vehicle,
  href,
  isAvailable,
  dayPrice,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: VehicleCardData;
  href: string;
  isAvailable: boolean;
  dayPrice: number | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const specs = [
    { icon: Palette, label: "Color", value: vehicle.color },
    {
      icon: Gauge,
      label: "Transmission",
      value: vehicle.transmission || "—",
    },
    { icon: Fuel, label: "Fuel", value: vehicle.fuelType || "—" },
    {
      icon: Users,
      label: "Seats",
      value: vehicle.seatingCapacity ? String(vehicle.seatingCapacity) : "—",
    },
  ];

  const plans = (vehicle.prices || [])
    .filter((p) => [3, 6, 12, 24].includes(p.durationHours))
    .sort((a, b) => a.durationHours - b.durationHours);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label={`${vehicle.name} quick view`}
      >
        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          {vehicle.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.coverImage}
              alt={vehicle.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-6xl">
              {vehicle.vehicleType === "bike" ? "🏍️" : "🚗"}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-md hover:scale-105 transition-transform"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/85 dark:bg-slate-900/80 backdrop-blur">
            {availabilityLabel(vehicle.availability)}
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{vehicle.name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {vehicle.brand} · {vehicle.modelYear}
              </p>
            </div>
            {(vehicle.averageRating ?? 0) > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2 py-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {Number(vehicle.averageRating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            {specs.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"
              >
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <s.icon className="h-3.5 w-3.5" /> {s.label}
                </div>
                <p className="font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {plans.length > 0 && (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Rental Plans
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {plans.map((p) => (
                  <div
                    key={p.durationHours}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-500">{p.label}</span>
                    <span className="font-semibold">
                      {formatCurrency(p.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                From
              </p>
              <p className="text-3xl font-extrabold">
                {dayPrice != null ? formatCurrency(dayPrice) : "—"}
                <span className="text-sm font-medium text-slate-400"> /day</span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link href={href} className="flex-1" onClick={onClose}>
              <span className="flex items-center justify-center w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:border-brand-400 hover:text-brand-600 transition-colors">
                Full Details
              </span>
            </Link>
            <Link
              href={isAvailable ? `/book/${vehicle.vehicleType === "bike" ? vehicle.slug : vehicle.slug}` : href}
              className="flex-1"
              onClick={onClose}
            >
              <span
                className={cn(
                  "flex items-center justify-center gap-1 w-full h-12 rounded-xl font-semibold text-white transition-all group",
                  isAvailable
                    ? "bg-brand-600 hover:bg-brand-700"
                    : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                )}
              >
                Book Now
                {isAvailable && (
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
