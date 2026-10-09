"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BRANDS = [
  "Suzuki",
  "Honda",
  "Toyota",
  "Yamaha",
  "Kawasaki",
];

const COLORS = [
  "White",
  "Black",
  "Silver",
  "Grey",
  "Blue",
  "Red",
  "Maroon",
  "Green",
  "Pearl White",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "popular", label: "Popular" },
  { value: "available", label: "Available now" },
];

export function VehicleFilters({
  type,
  showTypeFilter = false,
}: {
  type?: "car" | "bike";
  showTypeFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showMobile, setShowMobile] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") || "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: q || null });
  };

  const clearAll = () => {
    setQ("");
    startTransition(() => router.push(pathname));
  };

  const hasFilters = Array.from(searchParams.keys()).some(
    (k) => k !== "page"
  );

  const filterControls = (
    <div className="space-y-4">
      {showTypeFilter && (
        <Select
          label="Vehicle Type"
          value={searchParams.get("type") || ""}
          onChange={(e) => updateParams({ type: e.target.value || null })}
          options={[
            { value: "car", label: "Cars" },
            { value: "bike", label: "Bikes" },
          ]}
          placeholder="All types"
        />
      )}

      <Select
        label="Brand"
        value={searchParams.get("brand") || ""}
        onChange={(e) => updateParams({ brand: e.target.value || null })}
        options={BRANDS.map((b) => ({ value: b, label: b }))}
        placeholder="All brands"
      />

      <Select
        label="Color"
        value={searchParams.get("color") || ""}
        onChange={(e) => updateParams({ color: e.target.value || null })}
        options={COLORS.map((c) => ({ value: c, label: c }))}
        placeholder="All colors"
      />

      <Select
        label="Availability"
        value={searchParams.get("availability") || ""}
        onChange={(e) =>
          updateParams({ availability: e.target.value || null })
        }
        options={[
          { value: "available", label: "Available" },
          { value: "reserved", label: "Reserved" },
          { value: "rented", label: "Rented" },
        ]}
        placeholder="Any status"
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Year from"
          type="number"
          min={2010}
          max={2026}
          defaultValue={searchParams.get("yearMin") || ""}
          onBlur={(e) =>
            updateParams({ yearMin: e.target.value || null })
          }
          placeholder="2010"
        />
        <Input
          label="Year to"
          type="number"
          min={2010}
          max={2026}
          defaultValue={searchParams.get("yearMax") || ""}
          onBlur={(e) =>
            updateParams({ yearMax: e.target.value || null })
          }
          placeholder="2026"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Min price"
          type="number"
          defaultValue={searchParams.get("priceMin") || ""}
          onBlur={(e) =>
            updateParams({ priceMin: e.target.value || null })
          }
          placeholder="0"
        />
        <Input
          label="Max price"
          type="number"
          defaultValue={searchParams.get("priceMax") || ""}
          onBlur={(e) =>
            updateParams({ priceMax: e.target.value || null })
          }
          placeholder="50000"
        />
      </div>

      <Select
        label="Sort by"
        value={searchParams.get("sort") || "newest"}
        onChange={(e) => updateParams({ sort: e.target.value })}
        options={SORT_OPTIONS}
      />

      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearAll}>
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn(isPending && "opacity-70 pointer-events-none")}>
      <form onSubmit={onSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Toyota, Honda, CD 70, Civic..."
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
        </div>
      </form>

      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowMobile(!showMobile)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters & Sort
        </Button>
        {showMobile && (
          <div className="mt-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {filterControls}
          </div>
        )}
      </div>

      <div className="hidden lg:block sticky top-24">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-brand-600" />
            Filters
          </h3>
          {filterControls}
        </div>
      </div>
    </div>
  );
}
