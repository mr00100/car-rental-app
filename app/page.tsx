import Link from "next/link";
import {
  Car,
  Bike,
  Shield,
  Clock,
  CreditCard,
  MapPin,
  CheckCircle2,
  Star,
  Phone,
  Search,
  Key,
  ThumbsUp,
} from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { HeroSearch } from "@/components/home/hero-search";
import { AIRecommend } from "@/components/home/ai-recommend";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import {
  vehicles,
  rentalPrices,
  vehicleFeatures,
} from "@/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

async function getFeaturedVehicles() {
  try {
    const rows = await db
      .select()
      .from(vehicles)
      .where(
        and(eq(vehicles.isArchived, false), eq(vehicles.isFeatured, true))
      )
      .orderBy(desc(vehicles.bookingCount))
      .limit(6);

    return attachPrices(rows);
  } catch {
    return [];
  }
}

async function getPopularVehicles() {
  try {
    const rows = await db
      .select()
      .from(vehicles)
      .where(
        and(eq(vehicles.isArchived, false), eq(vehicles.isPopular, true))
      )
      .orderBy(desc(vehicles.bookingCount))
      .limit(6);

    return attachPrices(rows);
  } catch {
    return [];
  }
}

async function attachPrices(
  rows: (typeof vehicles.$inferSelect)[]
) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const prices = await db
    .select()
    .from(rentalPrices)
    .where(
      and(
        eq(rentalPrices.isActive, true),
        sql`${rentalPrices.vehicleId} IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    )
    .orderBy(asc(rentalPrices.sortOrder));

  return rows.map((v) => {
    const vPrices = prices.filter((p) => p.vehicleId === v.id);
    return {
      ...v,
      prices: vPrices,
      minPrice: vPrices.length
        ? Math.min(...vPrices.map((p) => p.price))
        : null,
      dayPrice:
        vPrices.find((p) => p.durationHours === 24)?.price ?? null,
      averageRating: Number(v.averageRating) || 0,
    };
  });
}

export default async function HomePage() {
  const [featured, popular, settings] = await Promise.all([
    getFeaturedVehicles(),
    getPopularVehicles(),
    getSettings(),
  ]);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(37,99,235,0.4), transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.3), transparent 40%)",
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-sm font-medium mb-6">
            <MapPin className="h-3.5 w-3.5" />
            This service is available inside the city only
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-5">
            Rent Your Ride,{" "}
            <span className="bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
              Your Way
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Reliable cars and bikes available for rent inside the city. Flexible
            hours, transparent pricing, EasyPaisa payments.
          </p>

          <HeroSearch />
        </div>
      </section>

      {/* City disclaimer banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-y border-amber-200 dark:border-amber-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200 font-medium text-center">
          <Shield className="h-4 w-4 shrink-0" />
          This service is available inside the city only. Out-of-city travel
          requires prior approval.
        </div>
      </div>

      {/* Quick stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 -mt-2 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Car, label: "Premium Cars", value: "10+" },
            { icon: Bike, label: "City Bikes", value: "5+" },
            { icon: Clock, label: "Flexible Hours", value: "3h–7d" },
            { icon: CreditCard, label: "EasyPaisa", value: "Secure" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center shrink-0">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {s.value}
                </p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brand-600 font-semibold text-sm mb-1">
              Hand-picked
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Featured Vehicles
            </h2>
          </div>
          <Link href="/cars">
            <Button variant="outline">View all</Button>
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <EmptyFleet />
        )}
      </section>

      {/* How it works */}
      <section className="bg-slate-100 dark:bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-brand-600 font-semibold text-sm mb-1">
              Simple process
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Search,
                step: "01",
                title: "Search & Choose",
                desc: "Browse cars or bikes, filter by brand, price, and availability.",
              },
              {
                icon: Clock,
                step: "02",
                title: "Pick Duration",
                desc: "Select 3 hours to 7 days. See live pricing from our database.",
              },
              {
                icon: CreditCard,
                step: "03",
                title: "Pay via EasyPaisa",
                desc: "Transfer to our EasyPaisa account and submit your transaction ID.",
              },
              {
                icon: Key,
                step: "04",
                title: "Drive & Enjoy",
                desc: "Once verified, pick up your ride and enjoy your city trip.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6"
              >
                <span className="absolute top-4 right-4 text-4xl font-black text-slate-100 dark:text-slate-800">
                  {s.step}
                </span>
                <div className="h-12 w-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-4">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Recommendations */}
      <AIRecommend />

      {/* Popular */}
      {popular.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-brand-600 font-semibold text-sm mb-1">
                Most booked
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Popular Vehicles
              </h2>
            </div>
            <Link href="/cars?sort=popular">
              <Button variant="outline">View all</Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {popular.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      )}

      {/* Pricing explanation */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-8 sm:p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Flexible Rental Pricing
              </h2>
              <p className="text-brand-100 mb-6 leading-relaxed">
                Every vehicle has its own database-driven price list. No hidden
                fees. Choose the duration that fits your plans.
              </p>
              <ul className="space-y-3">
                {[
                  "Hourly packages from 3 hours",
                  "Daily & multi-day discounts",
                  "Custom durations available",
                  "Admin-configurable rates per vehicle",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-200 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "3 Hours", price: "Rs. 2,000+" },
                { label: "6 Hours", price: "Rs. 4,000+" },
                { label: "12 Hours", price: "Rs. 5,000+" },
                { label: "1 Day", price: "Rs. 8,000+" },
              ].map((p) => (
                <div
                  key={p.label}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-5 text-center"
                >
                  <p className="text-brand-200 text-sm mb-1">{p.label}</p>
                  <p className="text-xl font-bold">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Safety & Verification
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            We take your safety and our fleet seriously.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: Shield,
              title: "Verified Vehicles",
              desc: "Every vehicle is inspected and maintained regularly before each rental.",
            },
            {
              icon: ThumbsUp,
              title: "ID Verification",
              desc: "Valid CNIC and driving license required at pickup for your security.",
            },
            {
              icon: CreditCard,
              title: "Secure Payments",
              desc: "EasyPaisa payments verified manually. No automatic fake confirmations.",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                <s.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Need help choosing?
            </h2>
            <p className="text-slate-500 max-w-md">
              Our team is available {settings.openingHours}. Call or WhatsApp us
              anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`tel:${settings.businessPhone}`}>
              <Button size="lg">
                <Phone className="h-5 w-5" />
                {settings.businessPhone}
              </Button>
            </a>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Contact Form
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function EmptyFleet() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
      <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 mb-4">
        Fleet data is being prepared. Run the seed script to load demo vehicles.
      </p>
      <Link href="/cars">
        <Button variant="outline">Browse catalog</Button>
      </Link>
    </div>
  );
}
