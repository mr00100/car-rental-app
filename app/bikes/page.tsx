import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehicleCardSkeleton } from "@/components/ui/skeleton";
import { CategoryHeader } from "@/components/vehicles/category-header";
import { FeaturedHero } from "@/components/vehicles/featured-hero";
import { EmptyState, CountPill } from "@/components/vehicles/empty-state";
import { searchVehicles } from "@/lib/vehicles-query";
import { Button } from "@/components/ui/button";
import { Bike } from "lucide-react";

export const metadata: Metadata = {
  title: "Rent a Bike",
  description:
    "Browse motorcycles and bikes for rent inside the city. Honda CD 70, 125, Yamaha YBR and more.",
};

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const BIKE_CHIPS = [
  { label: "All", value: "" },
  { label: "Honda", value: "Honda" },
  { label: "Yamaha", value: "Yamaha" },
  { label: "Kawasaki", value: "Kawasaki" },
];

export default async function BikesPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <PublicShell>
      {/* Energetic showroom hero for bikes */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, rgba(16,185,129,0.3), transparent 45%), radial-gradient(circle at 78% 70%, rgba(5,150,105,0.25), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] uppercase tracking-[0.2em] font-bold mb-5">
            <Bike className="h-3.5 w-3.5" /> Two-Wheel Fleet
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            The Bike Garage
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mt-4">
            Ride your way. Affordable, agile two-wheelers for quick city
            trips — from the trusty CD 70 to high-performance machines.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        <Suspense fallback={<GridFallback />}>
          <BikesShowcase params={params} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

function GridFallback() {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function BikesShowcase({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const { vehicles: list, pagination } = await searchVehicles({
    ...params,
    type: "bike",
  });

  const hasActiveFilters = Object.keys(params).some(
    (k) => k !== "page" && params[k]
  );
  const featured = !hasActiveFilters
    ? list.find((v) => v.isFeatured)
    : undefined;

  return (
    <>
      <CategoryHeader
        title="Bikes"
        subtitle="Ride your way."
        chips={BIKE_CHIPS}
        paramKey="brand"
      />

      {featured && (
        <div className="mb-4">
          <FeaturedHero vehicle={featured} />
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <VehicleFilters type="bike" />

        <div>
          <div className="flex items-center justify-between mb-6">
            <CountPill count={pagination.total} noun="Bikes Available" />
          </div>

          {list.length === 0 ? (
            <EmptyState clearHref="/bikes" label="No bikes found." />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {list.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} index={i} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  ).map((p) => (
                    <Link key={p} href={`/bikes?page=${p}`}>
                      <Button
                        variant={p === pagination.page ? "primary" : "outline"}
                        size="sm"
                      >
                        {p}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
