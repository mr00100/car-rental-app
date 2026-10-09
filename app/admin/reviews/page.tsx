"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Check, EyeOff, Trash2 } from "lucide-react";

type Review = {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  isApproved: boolean;
  isHidden: boolean;
  createdAt: string;
  vehicleName: string | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/reviews?admin=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReviews(json.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: number, body: Record<string, boolean>) => {
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-slate-500">Moderate customer reviews</p>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold">
                    {r.customerName} on {r.vehicleName}
                  </p>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  {r.isApproved ? (
                    <Badge className="bg-emerald-100 text-emerald-800">
                      Approved
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Pending
                    </Badge>
                  )}
                  {r.isHidden && (
                    <Badge className="bg-slate-100 text-slate-600">Hidden</Badge>
                  )}
                </div>
              </div>
              {r.title && <p className="font-medium text-sm">{r.title}</p>}
              {r.comment && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {r.comment}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {!r.isApproved && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => act(r.id, { isApproved: true })}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(r.id, { isHidden: !r.isHidden })}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {r.isHidden ? "Unhide" : "Hide"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {!reviews.length && (
            <p className="text-center text-slate-400 py-12">No reviews yet</p>
          )}
        </div>
      )}
    </div>
  );
}
