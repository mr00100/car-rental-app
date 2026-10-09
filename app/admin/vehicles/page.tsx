"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  availabilityLabel,
  getAvailabilityColor,
} from "@/lib/utils";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

type Vehicle = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  modelYear: number;
  color: string;
  vehicleType: string;
  availability: string;
  coverImage: string | null;
  isFeatured: boolean;
  minPrice: number | null;
  dayPrice: number | null;
};

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    fetch(`/api/vehicles?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setVehicles(json.data.vehicles);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const archive = async (id: number) => {
    if (!confirm("Archive this vehicle?")) return;
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    load();
  };

  const setAvailability = async (id: number, availability: string) => {
    await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-sm text-slate-500">Manage your fleet</p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button>
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search vehicles..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: "car", label: "Cars" },
            { value: "bike", label: "Bikes" },
          ]}
          placeholder="All types"
          className="w-40"
        />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Day Rate</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          {v.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.coverImage}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{v.name}</p>
                          <p className="text-xs text-slate-500">
                            {v.brand} · {v.color}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{v.vehicleType}</td>
                    <td className="px-4 py-3">{v.modelYear}</td>
                    <td className="px-4 py-3">
                      <select
                        value={v.availability}
                        onChange={(e) =>
                          setAvailability(v.id, e.target.value)
                        }
                        className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 bg-transparent"
                      >
                        {[
                          "available",
                          "reserved",
                          "rented",
                          "maintenance",
                          "disabled",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {availabilityLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {v.dayPrice != null
                        ? formatCurrency(v.dayPrice)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/admin/vehicles/${v.id}`}>
                          <Button size="sm" variant="ghost">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => archive(v.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!vehicles.length && (
            <p className="text-center text-slate-400 py-12">No vehicles found</p>
          )}
        </div>
      )}
    </div>
  );
}
