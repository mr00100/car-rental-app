"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

type MapConfig = {
  publicKey: string;
  configured: boolean;
  businessCity: string;
  businessAddress: string;
  pickupLat: number;
  pickupLng: number;
};

export function PickupMap() {
  const [config, setConfig] = useState<MapConfig | null>(null);

  useEffect(() => {
    fetch("/api/maps/config")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setConfig(json.data);
      })
      .catch(() => {});
  }, []);

  if (!config) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 h-48 animate-pulse bg-slate-100 dark:bg-slate-800" />
    );
  }

  const { pickupLat: lat, pickupLng: lng } = config;
  // Google embed when configured, otherwise OpenStreetMap (no key needed).
  const src = config.publicKey
    ? `https://www.google.com/maps/embed/v1/place?key=${config.publicKey}&q=${lat},${lng}&zoom=14`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${
        lat - 0.01
      },${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <iframe
        title="Pickup location"
        src={src}
        className="w-full h-48 border-0"
        loading="lazy"
      />
      <div className="flex items-start gap-2 p-3 text-sm">
        <MapPin className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Pickup Location</p>
          <p className="text-slate-500 text-xs">
            {config.businessAddress || config.businessCity}
          </p>
        </div>
      </div>
    </div>
  );
}
