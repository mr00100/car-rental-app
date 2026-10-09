"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, Bike, Menu, X, Moon, Sun, Monitor, LayoutDashboard, UserPlus, Layers3 } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/cars", label: "Rent a Car", icon: Car },
  { href: "/bikes", label: "Rent a Bike", icon: Bike },
  { href: "/how-it-works", label: "How it Works", icon: null },
  { href: "/contact", label: "Contact", icon: null },
];

export function Header() {
  const { theme, setTheme, resolved } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="block font-bold text-slate-900 dark:text-white text-lg tracking-tight">
                RENT A CAR
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Cars • Bikes • Easy Booking
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-brand-600 bg-brand-50 dark:bg-brand-950/40"
                    : "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/register" className="hidden sm:block">
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Sign Up
              </Button>
            </Link>

            <Link href="/bulk-booking" className="hidden sm:block">
              <Button size="sm" variant="outline">
                <Layers3 className="h-4 w-4 mr-1.5" />
                Bulk Booking
              </Button>
            </Link>

            <Link href="/dashboard" className="hidden md:block">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                My Rentals
              </Button>
            </Link>

            <button
              onClick={() =>
                setTheme(
                  theme === "light"
                    ? "dark"
                    : theme === "dark"
                      ? "system"
                      : "light"
                )
              }
              className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
              title={`Theme: ${theme}`}
            >
              {resolved === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "system" ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>

            <button
              className="lg:hidden h-9 w-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden transition-all duration-300",
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              {link.icon && (
                <link.icon className="h-4 w-4 text-brand-600" />
              )}
              {link.label}
            </Link>
          ))}
          <Link
            href="/register"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <UserPlus className="h-4 w-4 text-brand-600" />
            Sign Up
          </Link>
          <Link
            href="/bulk-booking"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <Layers3 className="h-4 w-4 text-brand-600" />
            Bulk Booking
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <LayoutDashboard className="h-4 w-4 text-brand-600" />
            My Rentals
          </Link>
        </nav>
      </div>
    </header>
  );
}
