"use client";

import { useEffect, useState, use } from "react";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vehicles/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setVehicle(json.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!vehicle) return <p>Vehicle not found</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Vehicle</h1>
        <p className="text-sm text-slate-500">
          {String(vehicle.name)} · ID {id}
        </p>
      </div>
      <VehicleForm
        vehicleId={parseInt(id, 10)}
        initial={vehicle as never}
      />
    </div>
  );
}
