import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import {
  Search,
  Clock,
  CreditCard,
  Key,
  Shield,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how to rent a car or bike with Rent A Car in 4 easy steps.",
};

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <div className="bg-gradient-to-br from-slate-900 to-brand-950 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold">How It Works</h1>
          <p className="text-slate-300 mt-2 max-w-xl">
            Renting a car or bike has never been easier. Four simple steps from
            search to driving.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-12">
        {[
          {
            icon: Search,
            step: "1",
            title: "Search & Choose",
            desc: "Browse our fleet of cars and bikes. Filter by brand, price, color, year, and availability. View detailed photos, features, and pricing.",
          },
          {
            icon: Clock,
            step: "2",
            title: "Select Duration & Dates",
            desc: "Choose from flexible packages: 3 hours, 6 hours, 12 hours, 1 day, or multi-day. Our system checks real-time availability to prevent double booking.",
          },
          {
            icon: CreditCard,
            step: "3",
            title: "Pay via EasyPaisa",
            desc: "Transfer the exact amount to our EasyPaisa account. Submit your transaction ID and sender phone. Our team verifies the payment manually — no fake auto-confirmations.",
          },
          {
            icon: Key,
            step: "4",
            title: "Pick Up & Enjoy",
            desc: "Once payment is verified and booking confirmed, pick up your vehicle. Bring your CNIC and valid driving license. Enjoy your ride inside the city!",
          },
        ].map((s) => (
          <div key={s.step} className="flex gap-5">
            <div className="h-14 w-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shrink-0 text-xl font-bold">
              {s.step}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="h-5 w-5 text-brand-600" />
                <h2 className="text-xl font-bold">{s.title}</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" /> Important Rules
          </h3>
          {[
            "This service is available inside the city only",
            "Valid CNIC and driving license required at pickup",
            "Vehicles under maintenance cannot be booked",
            "Overlapping bookings are automatically prevented",
            "Payment must be verified before confirmation",
            "Cancellation policy applies — see details before booking",
          ].map((r) => (
            <p key={r} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              {r}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/cars">
            <Button size="lg">Rent a Car</Button>
          </Link>
          <Link href="/bikes">
            <Button size="lg" variant="outline">
              Rent a Bike
            </Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
