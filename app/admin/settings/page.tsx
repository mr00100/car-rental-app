"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type Settings = Record<string, string>;

const FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "businessName", label: "Business Name" },
  { key: "businessPhone", label: "Phone" },
  { key: "businessWhatsapp", label: "WhatsApp" },
  { key: "businessEmail", label: "Email" },
  { key: "businessCity", label: "City" },
  { key: "businessAddress", label: "Address", multiline: true },
  { key: "easypaisaNumber", label: "EasyPaisa Number" },
  { key: "easypaisaAccountName", label: "EasyPaisa Account Name" },
  { key: "currency", label: "Currency" },
  { key: "openingHours", label: "Opening Hours" },
  { key: "cancellationDeadlineHours", label: "Cancellation Deadline (hours)" },
  { key: "cancellationFeePercent", label: "Cancellation Fee %" },
  { key: "refundPercent", label: "Refund %" },
  { key: "noRefundHours", label: "No-Refund Period (hours)" },
  { key: "disclaimer", label: "Disclaimer", multiline: true },
  { key: "cancellationPolicy", label: "Cancellation Policy", multiline: true },
  { key: "bookingRules", label: "Booking Rules", multiline: true },
  { key: "enableLateCancellation", label: "Enable Late Cancellation Deduction (true/false)" },
  { key: "allowCancellationAfterDeadline", label: "Allow Cancellation After Deadline (true/false)" },
  { key: "driverDailyFee", label: "Driver Daily Fee (Rs.)" },
  { key: "requireLicenseVerification", label: "Require License Verification (true/false)" },
  { key: "paymentProvider", label: "Default Payment Provider (easypaisa/jazzcash/stripe/mock)" },
  { key: "jazzcashNumber", label: "JazzCash Number" },
  { key: "emailEnabled", label: "Email Notifications Enabled (true/false)" },
  { key: "smsEnabled", label: "SMS Notifications Enabled (true/false)" },
  { key: "trackingEnabled", label: "GPS Tracking Enabled (true/false)" },
  { key: "pickupLat", label: "Pickup Latitude" },
  { key: "pickupLng", label: "Pickup Longitude" },
  { key: "chatbotEnabled", label: "Chatbot Enabled (true/false)" },
  { key: "chatbotName", label: "Chatbot Name" },
  { key: "chatbotWelcome", label: "Chatbot Welcome Message", multiline: true },
  { key: "chatbotSupportHours", label: "Support Availability Hours" },
  { key: "chatbotMaxLength", label: "Chatbot Max Message Length" },
  { key: "chatbotRatePerMinute", label: "Chatbot Rate Limit (messages/minute)" },
  { key: "supportContact", label: "Human Support Contact" },
  { key: "termsOfService", label: "Terms of Service", multiline: true },
  { key: "privacyPolicy", label: "Privacy Policy", multiline: true },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSettings(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        setMsg("Settings saved successfully");
      } else {
        setMsg(json.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">
          Business configuration — no hard-coded values
        </p>
      </div>

      {msg && (
        <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm p-3">
          {msg}
        </div>
      )}

      <form
        onSubmit={save}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        {FIELDS.map((f) =>
          f.multiline ? (
            <Textarea
              key={f.key}
              label={f.label}
              value={settings[f.key] || ""}
              onChange={(e) =>
                setSettings({ ...settings, [f.key]: e.target.value })
              }
            />
          ) : (
            <Input
              key={f.key}
              label={f.label}
              value={settings[f.key] || ""}
              onChange={(e) =>
                setSettings({ ...settings, [f.key]: e.target.value })
              }
            />
          )
        )}
        <Button type="submit" loading={saving}>
          Save Settings
        </Button>
      </form>
    </div>
  );
}
