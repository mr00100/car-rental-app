"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

type Chip = { label: string; value: string };

// Premium category header with an animated active indicator.
export function CategoryHeader({
  title,
  subtitle,
  chips,
  paramKey = "brand",
}: {
  title: string;
  subtitle: string;
  chips: Chip[];
  paramKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const active = searchParams.get(paramKey) || "";

  const select = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(paramKey);
    else params.set(paramKey, value);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className={cn("mb-8", isPending && "opacity-70")}>
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        {title}
      </h2>
      <p className="text-slate-500 mt-1 mb-5">{subtitle}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const isActive = active === c.value;
          return (
            <button
              key={c.value}
              onClick={() => select(c.value)}
              className={cn(
                "relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
