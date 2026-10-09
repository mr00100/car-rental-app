"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Car,
  Calendar,
  CreditCard,
  Users,
  Settings,
  Star,
  Bell,
  FileText,
  LogOut,
  Menu,
  X,
  MessageSquare,
  UserCog,
  ScrollText,
  IdCard,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { isAdmin } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/cancellations", label: "Cancellations", icon: RotateCcw },
  { href: "/admin/owners", label: "Owners", icon: UserCog },
  { href: "/admin/license", label: "License Verification", icon: IdCard },
  { href: "/admin/tracking", label: "GPS Tracking", icon: MapPin },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/chat", label: "Chatbot", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // The admin login page renders without the protected console chrome.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.role))) {
      router.replace("/admin/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.role)) return;
    fetch("/api/notifications?admin=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUnread(json.data.unread || 0);
      })
      .catch(() => {});
  }, [user]);

  if (loading || !user || !isAdmin(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Car className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">RENT A CAR</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.href === "/admin/notifications" && unread > 0 && (
                <span className="ml-auto h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-1">
        <div className="px-3 py-2 text-xs text-slate-500">
          <p className="text-slate-300 font-medium truncate">{user.fullName}</p>
          <p className="truncate">{user.role}</p>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <FileText className="h-4 w-4" /> View Site
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 shrink-0 fixed inset-y-0 left-0 z-30">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900">
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-20 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3">
          <button
            className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-sm text-slate-600 dark:text-slate-300 truncate">
            {nav.find(
              (n) =>
                n.href === pathname ||
                (n.href !== "/admin" && pathname.startsWith(n.href))
            )?.label || "Admin"}
          </h1>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
