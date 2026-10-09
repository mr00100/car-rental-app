"use client";

import { useState } from "react";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to send");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      <div className="bg-gradient-to-br from-slate-900 to-brand-950 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
          <p className="text-slate-300 mt-2">
            We&apos;re here to help with your rental needs
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            {[
              { icon: Phone, label: "Phone", value: "+92 300 1234567" },
              {
                icon: MessageCircle,
                label: "WhatsApp",
                value: "+92 300 1234567",
              },
              { icon: Mail, label: "Email", value: "support@rentacar.pk" },
              {
                icon: MapPin,
                label: "Location",
                value: "Gulberg III, Lahore, Pakistan",
              },
              {
                icon: Clock,
                label: "Hours",
                value: "Mon–Sun: 8:00 AM – 10:00 PM",
              },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 flex items-center justify-center shrink-0">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className="font-medium">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 text-sm text-amber-800 dark:text-amber-200">
            This service is available inside the city only.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          {done ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">✓</p>
              <h3 className="font-bold text-lg">Message Sent!</h3>
              <p className="text-slate-500 text-sm mt-1">
                We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <h2 className="font-bold text-lg mb-2">Send a Message</h2>
              <Input
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              <Textarea
                label="Message"
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              {error && (
                <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}
              <Button type="submit" loading={loading} className="w-full">
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
