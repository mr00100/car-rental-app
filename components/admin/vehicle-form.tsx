"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type PriceRow = { label: string; durationHours: number; price: number };

const DEFAULT_PRICES: PriceRow[] = [
  { label: "3 Hours", durationHours: 3, price: 2000 },
  { label: "6 Hours", durationHours: 6, price: 4000 },
  { label: "12 Hours", durationHours: 12, price: 5000 },
  { label: "1 Day", durationHours: 24, price: 8000 },
  { label: "2 Days", durationHours: 48, price: 15000 },
  { label: "3 Days", durationHours: 72, price: 21000 },
  { label: "7 Days", durationHours: 168, price: 45000 },
];

type Props = {
  vehicleId?: number;
  initial?: {
    name: string;
    brand: string;
    model: string;
    modelYear: number;
    color: string;
    vehicleType: "car" | "bike";
    registrationNumber?: string | null;
    description?: string | null;
    shortDescription?: string | null;
    transmission?: string | null;
    fuelType?: string | null;
    seatingCapacity?: number | null;
    availability?: string;
    coverImage?: string | null;
    isFeatured?: boolean;
    isPopular?: boolean;
    ownerId?: number | null;
    features?: { name: string }[];
    prices?: PriceRow[];
    images?: { url: string; category?: string }[];
  };
};

export function VehicleForm({ vehicleId, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    name: initial?.name || "",
    brand: initial?.brand || "",
    model: initial?.model || "",
    modelYear: initial?.modelYear || new Date().getFullYear(),
    color: initial?.color || "White",
    vehicleType: (initial?.vehicleType || "car") as "car" | "bike",
    registrationNumber: initial?.registrationNumber || "",
    description: initial?.description || "",
    shortDescription: initial?.shortDescription || "",
    transmission: initial?.transmission || "Automatic",
    fuelType: initial?.fuelType || "Petrol",
    seatingCapacity: initial?.seatingCapacity || 5,
    availability: initial?.availability || "available",
    coverImage: initial?.coverImage || "",
    isFeatured: initial?.isFeatured || false,
    isPopular: initial?.isPopular || false,
    ownerId: initial?.ownerId || null as number | null,
    featuresText: initial?.features?.map((f) => f.name).join(", ") || "AC, Power steering, Bluetooth, USB, Airbags",
    imageUrls: initial?.images?.map((i) => i.url).join("\n") || initial?.coverImage || "",
  });

  const [prices, setPrices] = useState<PriceRow[]>(
    initial?.prices?.length
      ? initial.prices.map((p) => ({
          label: p.label,
          durationHours: p.durationHours,
          price: p.price,
        }))
      : DEFAULT_PRICES
  );

  useEffect(() => {
    fetch("/api/owners")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOwners(json.data);
      })
      .catch(() => {});
  }, []);

  const set = (key: string, value: string | number | boolean | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;

    setError("");
    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/jpg"].includes(file.type.toLowerCase())) {
          throw new Error(`${file.name}: only JPG/JPEG images are allowed.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name}: image must be 10 MB or smaller.`);
        }

        const data = new FormData();
        data.append("file", file);

        const res = await fetch("/api/vehicle-images/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || `Failed to upload ${file.name}`);
        }

        uploadedUrls.push(json.data.url);
      }

      if (uploadedUrls.length) {
        setForm((current) => {
          const currentUrls = current.imageUrls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean);
          const nextUrls = [...currentUrls, ...uploadedUrls];

          return {
            ...current,
            imageUrls: nextUrls.join("\n"),
            coverImage: current.coverImage || uploadedUrls[0],
          };
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const features = form.featuresText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const imageList = form.imageUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url, i) => ({
        url,
        category: i === 0 ? "exterior" : "exterior",
        isPrimary: i === 0,
      }));

    const payload = {
      name: form.name,
      brand: form.brand,
      model: form.model,
      modelYear: Number(form.modelYear),
      color: form.color,
      vehicleType: form.vehicleType,
      registrationNumber: form.registrationNumber || undefined,
      description: form.description,
      shortDescription: form.shortDescription,
      transmission: form.transmission,
      fuelType: form.fuelType,
      seatingCapacity: Number(form.seatingCapacity),
      availability: form.availability,
      coverImage: form.coverImage || imageList[0]?.url,
      isFeatured: form.isFeatured,
      isPopular: form.isPopular,
      ownerId: form.ownerId,
      features,
      prices,
      images: imageList,
    };

    try {
      const res = await fetch(
        vehicleId ? `/api/vehicles/${vehicleId}` : "/api/vehicles",
        {
          method: vehicleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save");
        return;
      }
      router.push("/admin/vehicles");
      router.refresh();
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Name"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Input
          label="Brand"
          required
          value={form.brand}
          onChange={(e) => set("brand", e.target.value)}
        />
        <Input
          label="Model"
          required
          value={form.model}
          onChange={(e) => set("model", e.target.value)}
        />
        <Input
          label="Model Year"
          type="number"
          required
          value={form.modelYear}
          onChange={(e) => set("modelYear", parseInt(e.target.value, 10))}
        />
        <Input
          label="Color"
          required
          value={form.color}
          onChange={(e) => set("color", e.target.value)}
        />
        <Select
          label="Type"
          value={form.vehicleType}
          onChange={(e) => set("vehicleType", e.target.value)}
          options={[
            { value: "car", label: "Car" },
            { value: "bike", label: "Bike" },
          ]}
        />
        <Input
          label="Registration #"
          value={form.registrationNumber}
          onChange={(e) => set("registrationNumber", e.target.value)}
        />
        <Select
          label="Availability"
          value={form.availability}
          onChange={(e) => set("availability", e.target.value)}
          options={[
            { value: "available", label: "Available" },
            { value: "reserved", label: "Reserved" },
            { value: "rented", label: "Rented" },
            { value: "maintenance", label: "Maintenance" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
        <Input
          label="Transmission"
          value={form.transmission}
          onChange={(e) => set("transmission", e.target.value)}
        />
        <Input
          label="Fuel Type"
          value={form.fuelType}
          onChange={(e) => set("fuelType", e.target.value)}
        />
        <Input
          label="Seating Capacity"
          type="number"
          value={form.seatingCapacity}
          onChange={(e) =>
            set("seatingCapacity", parseInt(e.target.value, 10))
          }
        />
        <Select
          label="Owner"
          value={form.ownerId ? String(form.ownerId) : ""}
          onChange={(e) =>
            set("ownerId", e.target.value ? parseInt(e.target.value, 10) : null)
          }
          options={owners.map((o) => ({
            value: String(o.id),
            label: o.name,
          }))}
          placeholder="No owner"
        />
      </div>

      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Vehicle Images</h3>
          <p className="text-xs text-slate-500 mt-1">
            Select JPG/JPEG images directly from your computer. Uploaded images
            will be used by the website for this vehicle.
          </p>
        </div>

        <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 text-center hover:border-slate-400 transition-colors">
          <div>
            <span className="font-medium">
              {uploadingImage ? "Uploading image..." : "Choose vehicle images"}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              JPG / JPEG · up to 10 MB each · multiple images supported
            </p>
          </div>
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg,image/jpg"
            multiple
            className="sr-only"
            disabled={uploadingImage}
            onChange={(e) => {
              void uploadImages(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>

        {form.imageUrls && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {form.imageUrls
              .split("\n")
              .map((url) => url.trim())
              .filter(Boolean)
              .map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Vehicle image ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}

        <Input
          label="Cover Image URL (optional)"
          value={form.coverImage}
          onChange={(e) => set("coverImage", e.target.value)}
          placeholder="Uploaded image URL or existing external URL"
        />
        <Textarea
          label="Image URLs (one per line)"
          value={form.imageUrls}
          onChange={(e) => set("imageUrls", e.target.value)}
          placeholder="Uploaded images appear here automatically"
        />
      </div>
      <Input
        label="Features (comma-separated)"
        value={form.featuresText}
        onChange={(e) => set("featuresText", e.target.value)}
      />

      <div>
        <h3 className="font-semibold mb-3">Rental Prices (Rs.)</h3>
        <div className="space-y-2">
          {prices.map((p, i) => (
            <div key={p.durationHours} className="flex gap-2 items-center">
              <span className="w-24 text-sm text-slate-500">{p.label}</span>
              <Input
                type="number"
                value={p.price}
                onChange={(e) => {
                  const next = [...prices];
                  next[i] = { ...p, price: parseInt(e.target.value, 10) || 0 };
                  setPrices(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPopular}
            onChange={(e) => set("isPopular", e.target.checked)}
          />
          Popular
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {vehicleId ? "Save Changes" : "Create Vehicle"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/vehicles")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
