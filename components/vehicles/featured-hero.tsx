import Link from "next/link";
import { ArrowRight, Gauge, Users, Fuel, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VehicleCardData } from "@/components/vehicles/vehicle-card";

// Visually dominant hero for the single top featured vehicle.
export function FeaturedHero({ vehicle }: { vehicle: VehicleCardData }) {
  const href =
    vehicle.vehicleType === "bike"
      ? `/bikes/${vehicle.slug}`
      : `/cars/${vehicle.slug}`;
  const dayPrice =
    vehicle.dayPrice ??
    vehicle.prices?.find((p) => p.durationHours === 24)?.price ??
    vehicle.minPrice ??
    null;
  const isAvailable = vehicle.availability === "available";

  return (
    <section className="rac-fade-up relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 30%, rgba(59,130,246,0.35), transparent 45%), radial-gradient(circle at 85% 70%, rgba(37,99,235,0.25), transparent 40%)",
        }}
      />
      <div className="relative grid lg:grid-cols-2 gap-8 items-center p-7 sm:p-10 lg:p-12">
        <div className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
            ✦ Featured Fleet
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.05] mb-3">
            {vehicle.name}
          </h2>
          <p className="text-slate-300 text-lg mb-6">
            {vehicle.shortDescription || "Built for the journey."}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-slate-200 mb-7">
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              {vehicle.modelYear}
            </span>
            {vehicle.transmission && (
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-brand-300" />
                {vehicle.transmission}
              </span>
            )}
            {vehicle.seatingCapacity ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-300" />
                {vehicle.seatingCapacity} Seats
              </span>
            ) : null}
            {vehicle.fuelType && (
              <span className="inline-flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-brand-300" />
                {vehicle.fuelType}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-brand-200/80">
                From
              </p>
              <p className="text-4xl font-extrabold">
                {dayPrice != null ? formatCurrency(dayPrice) : "—"}
                <span className="text-base font-medium text-slate-300"> /day</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={href}>
                <span className="inline-flex items-center gap-1 h-12 px-6 rounded-xl bg-white/10 border border-white/20 backdrop-blur font-semibold hover:bg-white/20 transition-colors">
                  View Details
                </span>
              </Link>
              <Link href={isAvailable ? `${href}?book=1` : href}>
                <span className="inline-flex items-center gap-1.5 h-12 px-6 rounded-xl bg-white text-brand-700 font-bold hover:bg-slate-100 transition-colors group">
                  Book Now
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative aspect-[16/11] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {vehicle.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vehicle.coverImage}
                alt={vehicle.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-7xl bg-slate-800">
                {vehicle.vehicleType === "bike" ? "🏍️" : "🚗"}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Editorial alternating showcase row.
export function ShowcaseRow({
  vehicle,
  reverse,
}: {
  vehicle: VehicleCardData;
  reverse?: boolean;
}) {
  const href =
    vehicle.vehicleType === "bike"
      ? `/bikes/${vehicle.slug}`
      : `/cars/${vehicle.slug}`;
  const dayPrice =
    vehicle.dayPrice ??
    vehicle.prices?.find((p) => p.durationHours === 24)?.price ??
    vehicle.minPrice ??
    null;
  const isAvailable = vehicle.availability === "available";

  return (
    <div className="rac-fade-up grid lg:grid-cols-2 gap-6 lg:gap-10 items-center rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-8 shadow-sm hover:shadow-xl transition-shadow duration-500">
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 group">
          {vehicle.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.coverImage}
              alt={vehicle.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-5xl">
              {vehicle.vehicleType === "bike" ? "🏍️" : "🚗"}
            </div>
          )}
        </div>
      </div>

      <div className={reverse ? "lg:order-1" : ""}>
        <p className="text-brand-600 font-semibold text-sm mb-1">
          {vehicle.brand}
        </p>
        <h3 className="text-2xl sm:text-3xl font-bold mb-1">{vehicle.name}</h3>
        <p className="text-slate-500 mb-5">
          {vehicle.modelYear}
          {vehicle.transmission && ` • ${vehicle.transmission}`}
          {vehicle.seatingCapacity ? ` • ${vehicle.seatingCapacity} Seats` : ""}
        </p>
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            From
          </p>
          <p className="text-3xl font-extrabold">
            {dayPrice != null ? formatCurrency(dayPrice) : "—"}
            <span className="text-base font-medium text-slate-400"> /day</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={href}>
            <span className="inline-flex items-center gap-1 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:border-brand-400 hover:text-brand-600 transition-colors group">
              Explore
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
          <Link href={isAvailable ? `${href}?book=1` : href}>
            <span className="inline-flex items-center h-11 px-5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors">
              Book Now
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
