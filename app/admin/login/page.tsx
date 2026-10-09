"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { saveAuthToken } from "@/lib/client-session";

// Staff/admin-only sign-in. The public customer website has no login.
export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/admin");
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Login failed");
        setBusy(false);
        return;
      }
      if (json.data?.token) saveAuthToken(json.data.token);
      setUser(json.data);
      router.replace("/admin");
    } catch {
      setError("Unable to connect. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Car className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">RENT A CAR</span>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-slate-900 mb-1">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold">Admin Sign In</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Restricted to authorized staff and administrators.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Staff Email"
              type="email"
              required
              autoComplete="username"
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
              <div className="rounded-xl bg-red-50 text-red-700 text-sm p-3">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" loading={busy}>
              Sign In to Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
