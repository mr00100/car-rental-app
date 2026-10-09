"use client";

import Link from "next/link";
import { useState } from "react";
import { Car, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Invalid email or password.");
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/25">
            <Car className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-xl text-slate-900 dark:text-white">
            RENT A CAR
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <LogIn className="h-5 w-5 text-brand-600" />
              <h1 className="text-2xl font-bold">Welcome back</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to manage your rentals and bookings.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={busy}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Your account is separate from staff/admin access.
        </p>
      </div>
    </main>
  );
}
