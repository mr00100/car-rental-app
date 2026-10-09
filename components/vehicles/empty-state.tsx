import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  clearHref,
  label = "No vehicles found.",
}: {
  clearHref: string;
  label?: string;
}) {
  return (
    <div className="rac-fade-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 py-20 px-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <SearchX className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold mb-1">{label}</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-sm">
        Try changing your filters or search to discover more vehicles from our
        premium fleet.
      </p>
      <Link href={clearHref}>
        <Button variant="outline">Clear Filters</Button>
      </Link>
    </div>
  );
}

// Animated vehicle count pill.
export function CountPill({
  count,
  noun,
}: {
  count: number;
  noun: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-sm">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-bold text-slate-900 dark:text-white">{count}</span>
      <span className="text-slate-500">{noun}</span>
    </span>
  );
}
