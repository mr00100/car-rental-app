"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { VehicleCardSkeleton } from "@/components/ui/skeleton";

type Rec = {
  vehicleId: number;
  name: string;
  slug: string;
  brand: string;
  vehicleType: string;
  coverImage: string | null;
  averageRating: number;
  seatingCapacity: number | null;
  transmission: string | null;
  dayPrice: number | null;
  minPrice: number | null;
  reasons: string[];
};

export function AIRecommend() {
  const [prefs, setPrefs] = useState({
    budget: "",
    type: "",
    passengers: "",
    transmission: "",
    pickup: "",
    ret: "",
  });
  const [results, setResults] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const qs = new URLSearchParams();
    if (prefs.budget) qs.set("budget", prefs.budget);
    if (prefs.type) qs.set("type", prefs.type);
    if (prefs.passengers) qs.set("passengers", prefs.passengers);
    if (prefs.transmission) qs.set("transmission", prefs.transmission);
    if (prefs.pickup) qs.set("pickup", prefs.pickup);
    if (prefs.ret) qs.set("return", prefs.ret);
    try {
      const res = await fetch(`/api/recommendations?${qs}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data.results);
        setDemo(json.data.demo);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-6 w-6 text-brand-600" />
          <h2 className="text-2xl sm:text-3xl font-bold">Recommended For You</h2>
        </div>
        <p className="text-slate-500 mb-6">
          Tell us what you need and we&apos;ll match you with real, available
          vehicles.
          {demo && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Rule-based engine
            </span>
          )}
        </p>

        <form
          onSubmit={run}
          className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6"
        >
          <Input
            label="Budget (Rs.)"
            type="number"
            placeholder="10000"
            value={prefs.budget}
            onChange={(e) => setPrefs({ ...prefs, budget: e.target.value })}
          />
          <Select
            label="Type"
            value={prefs.type}
            onChange={(e) => setPrefs({ ...prefs, type: e.target.value })}
            options={[
              { value: "car", label: "Car" },
              { value: "bike", label: "Bike" },
            ]}
            placeholder="Any"
          />
          <Input
            label="Passengers"
            type="number"
            placeholder="5"
            value={prefs.passengers}
            onChange={(e) =>
              setPrefs({ ...prefs, passengers: e.target.value })
            }
          />
          <Select
            label="Transmission"
            value={prefs.transmission}
            onChange={(e) =>
              setPrefs({ ...prefs, transmission: e.target.value })
            }
            options={[
              { value: "Automatic", label: "Automatic" },
              { value: "Manual", label: "Manual" },
            ]}
            placeholder="Any"
          />
          <Input
            label="Pickup"
            type="date"
            value={prefs.pickup}
            onChange={(e) => setPrefs({ ...prefs, pickup: e.target.value })}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full" loading={loading}>
              <Sparkles className="h-4 w-4" /> Match
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No matching vehicles available for your criteria. Try adjusting your
            preferences.
          </div>
        ) : results.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((r) => (
              <div
                key={r.vehicleId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                  {r.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.coverImage}
                      alt={r.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{r.name}</h3>
                    {r.dayPrice != null && (
                      <span className="text-brand-600 font-bold text-sm">
                        {formatCurrency(r.dayPrice)}/day
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    ★ {r.averageRating.toFixed(1)} · {r.brand}
                  </p>
                  <ul className="space-y-1 mb-3">
                    {r.reasons.slice(0, 4).map((reason) => (
                      <li
                        key={reason}
                        className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Link
                      href={`/${r.vehicleType === "bike" ? "bikes" : "cars"}/${r.slug}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link
                      href={`/${r.vehicleType === "bike" ? "bikes" : "cars"}/${r.slug}?book=1`}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
