"use client";

import { VehicleForm } from "@/components/admin/vehicle-form";

export default function NewVehiclePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Vehicle</h1>
        <p className="text-sm text-slate-500">
          Create a new car or bike listing
        </p>
      </div>
      <VehicleForm />
    </div>
  );
}
