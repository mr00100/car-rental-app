"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Activity, Send, BarChart3 } from "lucide-react";

type Analytics = {
  totalConversations: number;
  totalUserMessages: number;
  activeLast24h: number;
  commonIntents: { intent: string | null; count: number }[];
};

const INTENT_LABELS: Record<string, string> = {
  find_vehicle: "Find a vehicle",
  budget: "Budget search",
  booking_help: "Booking help",
  booking_status: "Booking status",
  cancellation_policy: "Cancellation policy",
  cancel_booking: "Cancel booking",
  rental_mode: "Driver / self-drive",
  verification: "Verification help",
  verification_status: "Verification status",
  payment: "Payment help",
  pickup: "Pickup location",
  contact: "Contact support",
  greeting: "Greetings",
  how_it_works: "How it works",
  unknown: "Other",
};

export default function AdminChatPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/chat", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => json.success && setData(json.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-72 w-full" />;

  const stats = [
    {
      icon: MessageSquare,
      label: "Total conversations",
      value: data?.totalConversations ?? 0,
    },
    { icon: Send, label: "Customer messages", value: data?.totalUserMessages ?? 0 },
    { icon: Activity, label: "Active in 24h", value: data?.activeLast24h ?? 0 },
  ];

  const maxIntent = Math.max(1, ...(data?.commonIntents || []).map((i) => i.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-brand-600" /> Chatbot Analytics
        </h1>
        <p className="text-sm text-slate-500">
          Aggregate usage of the support assistant. Individual sensitive
          messages are not exposed here.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <s.icon className="h-5 w-5 text-brand-600 mb-2" />
            <p className="text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-semibold mb-4">Most common questions</h2>
        {!data?.commonIntents?.length ? (
          <p className="text-slate-400 text-sm">No questions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {data.commonIntents.map((i) => (
              <div key={i.intent || "unknown"}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{INTENT_LABELS[i.intent || "unknown"] || i.intent}</span>
                  <span className="font-semibold">{i.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${(i.count / maxIntent) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
