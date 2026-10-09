"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Wifi, WifiOff } from "lucide-react";

type Loc = {
  vehicleId: number;
  vehicleName: string | null;
  vehicleType: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  updatedAt: string;
  ageSeconds: number;
  status: string;
  stale: boolean;
};

export default function AdminTrackingPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Loc | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    fetch("/api/tracking")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLocations(json.data.locations);
          setLastPoll(new Date());
          setSelected((prev) =>
            prev
              ? json.data.locations.find(
                  (l: Loc) => l.vehicleId === prev.vehicleId
                ) || prev
              : json.data.locations[0] || null
          );
        }
      })
      .finally(() => setLoading(false));
  };

  // Real-time via short polling (no fake "live" state — status is derived
  // honestly from the last update timestamp on the server).
  useEffect(() => {
    load();
    timer.current = setInterval(load, 10000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const mapSrc = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        selected.longitude - 0.01
      },${selected.latitude - 0.01},${selected.longitude + 0.01},${
        selected.latitude + 0.01
      }&layer=mapnik&marker=${selected.latitude},${selected.longitude}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GPS Tracking</h1>
          <p className="text-sm text-slate-500">
            Authorized real-time vehicle tracking.{" "}
            {lastPoll && `Last polled ${lastPoll.toLocaleTimeString()}`}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200">
        Only vehicles with an authorized, consented GPS device appear here.
        Status reflects the real last-update time — a vehicle is never shown as
        “online” when its device is stale.
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">No tracked vehicles</h3>
          <p className="text-slate-500 text-sm">
            Register an authorized GPS device and enable tracking to see live
            locations here.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-2">
            {locations.map((l) => (
              <button
                key={l.vehicleId}
                onClick={() => setSelected(l)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  selected?.vehicleId === l.vehicleId
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{l.vehicleName}</span>
                  {l.status === "online" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Wifi className="h-3.5 w-3.5" /> Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <WifiOff className="h-3.5 w-3.5" /> Offline
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {l.stale
                    ? `⚠ Last location ${Math.round(l.ageSeconds / 60)} min ago`
                    : `Updated ${l.ageSeconds}s ago`}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {mapSrc ? (
              <iframe
                title="Vehicle location"
                src={mapSrc}
                className="w-full h-[420px] border-0"
              />
            ) : (
              <div className="h-[420px] flex items-center justify-center text-slate-400">
                Select a vehicle
              </div>
            )}
            {selected && (
              <div className="p-4 text-sm border-t border-slate-100 dark:border-slate-800">
                <p className="font-semibold">{selected.vehicleName}</p>
                <p className="text-slate-500">
                  {selected.latitude.toFixed(5)},{" "}
                  {selected.longitude.toFixed(5)}
                  {selected.speed != null && ` · ${selected.speed} km/h`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
