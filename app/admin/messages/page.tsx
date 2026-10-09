"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

type Message = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contact")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMessages(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <p className="text-sm text-slate-500">Messages from the contact form</p>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-slate-500">
                    {m.email}
                    {m.phone && ` · ${m.phone}`}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
              {m.subject && (
                <p className="text-sm font-medium mb-1">{m.subject}</p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {m.message}
              </p>
            </div>
          ))}
          {!messages.length && (
            <p className="text-center text-slate-400 py-12">No messages</p>
          )}
        </div>
      )}
    </div>
  );
}
