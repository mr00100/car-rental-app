"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

type Owner = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  publicDisplayName: string | null;
  showContactToCustomers: boolean;
  vehicleCount: number;
};

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Lahore",
    address: "",
    publicDisplayName: "",
    notes: "",
    showContactToCustomers: false,
  });

  const load = () => {
    setLoading(true);
    fetch("/api/owners")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOwners(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.success) {
      setShowForm(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        city: "Lahore",
        address: "",
        publicDisplayName: "",
        notes: "",
        showContactToCustomers: false,
      });
      load();
    } else {
      alert(json.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Owners</h1>
          <p className="text-sm text-slate-500">Vehicle owner management</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Owner
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 max-w-xl"
        >
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Public Display Name"
            value={form.publicDisplayName}
            onChange={(e) =>
              setForm({ ...form, publicDisplayName: e.target.value })
            }
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.showContactToCustomers}
              onChange={(e) =>
                setForm({ ...form, showContactToCustomers: e.target.checked })
              }
            />
            Show contact to customers
          </label>
          <Button type="submit">Create Owner</Button>
        </form>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Vehicles</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3">{o.phone}</td>
                  <td className="px-4 py-3">{o.city}</td>
                  <td className="px-4 py-3">{o.vehicleCount}</td>
                  <td className="px-4 py-3 capitalize">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
