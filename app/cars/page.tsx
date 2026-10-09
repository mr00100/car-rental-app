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
import { Car } from "lucide-react";

export const metadata: Metadata = {
  title: "Rent a Car",
  description:
    "Browse our premium fleet of cars available for rent inside the city. Suzuki, Honda, Toyota and more.",
};

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const CAR_CHIPS = [
  { label: "All", value: "" },
  { label: "Suzuki", value: "Suzuki" },
  { label: "Honda", value: "Honda" },
  { label: "Toyota", value: "Toyota" },
];

export default async function CarsPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <PublicShell>
      {/* Showroom hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 40%, rgba(59,130,246,0.3), transparent 45%), radial-gradient(circle at 80% 60%, rgba(37,99,235,0.25), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] uppercase tracking-[0.2em] font-bold mb-5">
            <Car className="h-3.5 w-3.5" /> Premium Fleet
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            The Car Showroom
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mt-4">
            Find your perfect city ride. Well-maintained, fully inspected, and
            ready to book — flexible hourly and daily rates.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        <Suspense fallback={<GridFallback />}>
          <CarsShowcase params={params} />
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

async function CarsShowcase({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const { vehicles: list, pagination } = await searchVehicles({
    ...params,
    type: "car",
  });

  const hasActiveFilters = Object.keys(params).some(
    (k) => k !== "page" && params[k]
  );

  // Featured hero = first featured (only when not filtering by page > 1)
  const featured = !hasActiveFilters
    ? list.find((v) => v.isFeatured)
    : undefined;

  return (
    <>
      {/* Category header with animated chips */}
      <CategoryHeader
        title="Cars"
        subtitle="Find your perfect city ride."
        chips={CAR_CHIPS}
        paramKey="brand"
      />

      {/* Featured hero */}
      {featured && (
        <div className="mb-4">
          <FeaturedHero vehicle={featured} />
        </div>
      )}

      {/* Filters + grid */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <VehicleFilters type="car" />

        <div>
          <div className="flex items-center justify-between mb-6">
            <CountPill count={pagination.total} noun="Cars Available" />
          </div>

          {list.length === 0 ? (
            <EmptyState clearHref="/cars" label="No cars found." />
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
                    <Link
                      key={p}
                      href={`/cars?${new URLSearchParams({
                        ...Object.fromEntries(
                          Object.entries(params).filter(
                            (e): e is [string, string] => !!e[1]
                          )
                        ),
                        page: String(p),
                      }).toString()}`}
                    >
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
