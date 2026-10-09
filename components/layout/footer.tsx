import Link from "next/link";
import { Car, Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">RENT A CAR</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Reliable cars and bikes available for rent inside the city. Easy
              booking, flexible durations, secure EasyPaisa payments.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              📍 City-only service
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/cars", label: "Rent a Car" },
                { href: "/bikes", label: "Rent a Bike" },
                { href: "/how-it-works", label: "How it Works" },
                { href: "/contact", label: "Contact Us" },
                { href: "/dashboard", label: "My Bookings" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:text-brand-400 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Policies</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="hover:text-brand-400">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-400">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="hover:text-brand-400">
                  Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageCircle className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                <span>WhatsApp: +92 300 1234567</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                <span>support@rentacar.pk</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                <span>Gulberg III, Lahore, Pakistan</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 mt-0.5 text-brand-400 shrink-0" />
                <span>Mon–Sun: 8:00 AM – 10:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Rent A Car. All rights reserved.</p>
          <p className="text-center">
            This service is available inside the city only.
          </p>
        </div>
      </div>
    </footer>
  );
}
