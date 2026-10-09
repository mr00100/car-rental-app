"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Car, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    router.push(`/cars${params}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={onSearch}
        className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/20 border border-white/20"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cars, bikes, brands, models..."
            className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-base"
          />
        </div>
        <Button type="submit" size="lg" className="sm:px-8 h-12 sm:h-14">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-sm">
          <MapPin className="h-3.5 w-3.5" />
          Lahore City
        </div>
        <Link href="/cars">
          <Button
            size="lg"
            className="bg-white text-brand-700 hover:bg-slate-100 shadow-lg"
          >
            <Car className="h-5 w-5" />
            Rent A Car
          </Button>
        </Link>
        <Link href="/bikes">
          <Button
            size="lg"
            variant="outline"
            className="border-white/40 text-white hover:bg-white/10 backdrop-blur"
          >
            <Bike className="h-5 w-5" />
            Rent A Bike
          </Button>
        </Link>
      </div>
    </div>
  );
}
