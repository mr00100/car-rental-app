"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { Bell } from "lucide-react";

type Notification = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  type: string;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/notifications?admin=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.data.notifications);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true, admin: true }),
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-slate-500">Admin alerts</p>
        </div>
        <Button variant="outline" onClick={markAll}>
          Mark all read
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
          No notifications
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.isRead
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  : "border-brand-200 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-900"
              }`}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {n.link && (
                  <Link href={n.link}>
                    <Button size="sm" variant="outline">
                      Open
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
