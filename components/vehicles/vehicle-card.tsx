"use client";

import Link from "next/link";
import { Star, Gauge, Fuel, Users, ArrowRight, Expand } from "lucide-react";
import {
  formatCurrency,
  availabilityLabel,
  cn,
} from "@/lib/utils";
import { useState } from "react";
import { QuickViewDrawer } from "@/components/vehicles/quick-view-drawer";

export type VehicleCardData = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  model: string;
  modelYear: number;
  color: string;
  vehicleType: "car" | "bike";
  transmission?: string | null;
  fuelType?: string | null;
  seatingCapacity?: number | null;
  availability: string;
  coverImage?: string | null;
  shortDescription?: string | null;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isPopular?: boolean;
  prices?: { label: string; durationHours: number; price: number }[];
  minPrice?: number | null;
  dayPrice?: number | null;
};

const AVAIL_DOT: Record<string, { dot: string; text: string; ring: string }> = {
  available: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  reserved: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
  },
  rented: {
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/20",
  },
  maintenance: {
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/20",
  },
  disabled: {
    dot: "bg-slate-400",
    text: "text-slate-500",
    ring: "ring-slate-400/20",
  },
};

const COLOR_SWATCH: Record<string, string> = {
  white: "#f8fafc",
  black: "#0f172a",
  silver: "#cbd5e1",
  grey: "#94a3b8",
  gray: "#94a3b8",
  blue: "#3b82f6",
  red: "#ef4444",
  maroon: "#7f1d1d",
  green: "#22c55e",
  "pearl white": "#f1f5f9",
};

export function VehicleCard({
  vehicle,
  index = 0,
}: {
  vehicle: VehicleCardData;
  index?: number;
}) {
  const [quickOpen, setQuickOpen] = useState(false);

  const href =
    vehicle.vehicleType === "bike"
      ? `/bikes/${vehicle.slug}`
      : `/cars/${vehicle.slug}`;

  const isAvailable = vehicle.availability === "available";
  const avail = AVAIL_DOT[vehicle.availability] || AVAIL_DOT.disabled;
  const dayPrice =
    vehicle.dayPrice ??
    vehicle.prices?.find((p) => p.durationHours === 24)?.price ??
    vehicle.minPrice ??
    null;

  const swatch =
    COLOR_SWATCH[vehicle.color?.toLowerCase()] || "#94a3b8";

  return (
    <>
      <article
        className="rac-card-enter group relative flex flex-col rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-[0_2px_16px_-6px_rgba(15,23,42,0.15)] hover:shadow-[0_24px_50px_-16px_rgba(15,23,42,0.35)] dark:hover:shadow-black/40 hover:-translate-y-1.5 transition-all duration-500 ease-out"
        style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
      >
        {/* Image stage */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          {vehicle.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.coverImage}
              alt={`${vehicle.brand} ${vehicle.name} ${vehicle.modelYear}`}
              className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-300 text-6xl">
              {vehicle.vehicleType === "bike" ? "🏍️" : "🚗"}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/85 dark:bg-slate-900/80 backdrop-blur-md ring-1",
                avail.text,
                avail.ring
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", avail.dot, isAvailable && "animate-pulse")} />
              {availabilityLabel(vehicle.availability)}
            </span>
            {vehicle.isFeatured && (
              <span className="w-fit px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-brand-600 text-white shadow-sm">
                Featured
              </span>
            )}
            {vehicle.isPopular && !vehicle.isFeatured && (
              <span className="w-fit px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-900/85 text-white backdrop-blur">
                Popular
              </span>
            )}
          </div>

          {/* Quick View (fades in on hover) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setQuickOpen(true);
            }}
            className="absolute left-1/2 bottom-3 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 dark:bg-slate-900/90 backdrop-blur text-sm font-medium text-slate-800 dark:text-slate-100 shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
          >
            <Expand className="h-3.5 w-3.5" /> Quick View
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight truncate">
                {vehicle.name}
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{vehicle.modelYear}</span>
                {vehicle.transmission && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{vehicle.transmission}</span>
                  </>
                )}
                {vehicle.seatingCapacity ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{vehicle.seatingCapacity} Seats</span>
                  </>
                ) : null}
              </p>
            </div>
            {(vehicle.averageRating ?? 0) > 0 && (
              <div className="flex items-center gap-1 shrink-0 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2 py-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {Number(vehicle.averageRating).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Spec chips */}
          <div className="flex items-center gap-3 mt-3 text-[12px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600"
                style={{ backgroundColor: swatch }}
              />
              {vehicle.color}
            </span>
            {vehicle.transmission && (
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" /> {vehicle.transmission}
              </span>
            )}
            {vehicle.fuelType && (
              <span className="inline-flex items-center gap-1">
                <Fuel className="h-3.5 w-3.5" /> {vehicle.fuelType}
              </span>
            )}
            {!vehicle.fuelType && vehicle.seatingCapacity ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {vehicle.seatingCapacity}
              </span>
            ) : null}
          </div>

          {/* Price */}
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                From
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {dayPrice != null ? formatCurrency(dayPrice) : "—"}
                <span className="text-sm font-medium text-slate-400"> /day</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-2.5">
            <Link href={href} className="flex-1">
              <span className="flex items-center justify-center gap-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors group/btn">
                View Details
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href={
                isAvailable
                  ? `/book/${vehicle.slug}`
                  : href
              }
              className="flex-1"
              aria-disabled={!isAvailable}
            >
              <span
                className={cn(
                  "flex items-center justify-center gap-1 w-full h-11 rounded-xl text-sm font-semibold text-white transition-all group/book",
                  isAvailable
                    ? "bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30"
                    : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                )}
              >
                Book Now
                {isAvailable && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/book:translate-x-0.5" />
                )}
              </span>
            </Link>
          </div>
        </div>
      </article>

      <QuickViewDrawer
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        vehicle={vehicle}
        href={href}
        isAvailable={isAvailable}
        dayPrice={dayPrice}
      />
    </>
  );
}
