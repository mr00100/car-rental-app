import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { ImageGallery } from "@/components/vehicles/image-gallery";
import { BookingForm } from "@/components/booking/booking-form";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import {
  vehicles,
  vehicleImages,
  vehicleFeatures,
  rentalPrices,
  owners,
  reviews,
} from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  formatCurrency,
  availabilityLabel,
  getAvailabilityColor,
} from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { Star, Fuel, Gauge, Palette, Calendar, Hash, Check } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getVehicle(slug: string) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.slug, slug), eq(vehicles.isArchived, false)))
    .limit(1);
  if (!vehicle) return null;

  const [images, features, prices, reviewRows] = await Promise.all([
    db
      .select()
      .from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicle.id))
      .orderBy(asc(vehicleImages.sortOrder)),
    db
      .select()
      .from(vehicleFeatures)
      .where(eq(vehicleFeatures.vehicleId, vehicle.id)),
    db
      .select()
      .from(rentalPrices)
      .where(
        and(
          eq(rentalPrices.vehicleId, vehicle.id),
          eq(rentalPrices.isActive, true)
        )
      )
      .orderBy(asc(rentalPrices.sortOrder)),
    db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.vehicleId, vehicle.id),
          eq(reviews.isApproved, true),
          eq(reviews.isHidden, false)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(10),
  ]);

  let owner = null;
  if (vehicle.ownerId) {
    const [o] = await db
      .select()
      .from(owners)
      .where(eq(owners.id, vehicle.ownerId))
      .limit(1);
    if (o) {
      owner = {
        displayName: o.publicDisplayName || o.name,
        city: o.city,
        phone: o.showContactToCustomers ? o.phone : null,
      };
    }
  }

  return {
    ...vehicle,
    averageRating: Number(vehicle.averageRating) || 0,
    images,
    features,
    prices,
    reviews: reviewRows,
    owner,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) return { title: "Bike Not Found" };
  return {
    title: vehicle.seoTitle || `Rent ${vehicle.name}`,
    description: vehicle.seoDescription || vehicle.shortDescription || undefined,
  };
}

export default async function BikeDetailPage({ params }: Props) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle || vehicle.vehicleType !== "bike") notFound();
  const settings = await getSettings();

  return (
    <PublicShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        <nav className="text-sm text-slate-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-brand-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/bikes" className="hover:text-brand-600">
            Bikes
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200">
            {vehicle.name}
          </span>
        </nav>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <ImageGallery images={vehicle.images} name={vehicle.name} />

            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h1 className="text-3xl font-bold">{vehicle.name}</h1>
                  <p className="text-slate-500 mt-1">
                    {vehicle.brand} {vehicle.model} • {vehicle.modelYear}
                  </p>
                </div>
                <Badge className={getAvailabilityColor(vehicle.availability)}>
                  {availabilityLabel(vehicle.availability)}
                </Badge>
              </div>

              {vehicle.averageRating > 0 && (
                <div className="flex items-center gap-1.5 mb-4">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-bold">
                    {vehicle.averageRating.toFixed(1)}
                  </span>
                  <span className="text-slate-400 text-sm">
                    ({vehicle.reviewCount} reviews)
                  </span>
                </div>
              )}

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {vehicle.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Calendar, label: "Year", value: String(vehicle.modelYear) },
                { icon: Palette, label: "Color", value: vehicle.color },
                { icon: Gauge, label: "Transmission", value: vehicle.transmission || "—" },
                { icon: Fuel, label: "Fuel", value: vehicle.fuelType || "—" },
                { icon: Hash, label: "Ref", value: vehicle.registrationNumber || "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                >
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                  <p className="font-semibold text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            {vehicle.features.length > 0 && (
              <div>
                <h2 className="font-bold text-xl mb-4">Features</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vehicle.features.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-sm"
                    >
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-bold text-xl mb-4">Rental Pricing</h2>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-right px-4 py-3 font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicle.prices.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3">{p.label}</td>
                        <td className="px-4 py-3 text-right font-semibold text-brand-600">
                          {formatCurrency(p.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {vehicle.reviews.length > 0 && (
              <div>
                <h2 className="font-bold text-xl mb-4">Reviews</h2>
                <div className="space-y-4">
                  {vehicle.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">
                          {r.customerName || "Customer"}
                        </p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-lg">
              <BookingForm
                vehicleId={vehicle.id}
                vehicleName={vehicle.name}
                prices={vehicle.prices}
                availability={vehicle.availability}
                cancellationPolicy={settings.cancellationPolicy}
              />
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
