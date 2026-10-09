import { PublicShell } from "@/components/layout/public-shell";
import { getSettings } from "@/lib/settings";

export default async function CancellationPage() {
  const settings = await getSettings();
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Cancellation Policy</h1>
        <div className="prose dark:prose-invert text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {settings.cancellationPolicy}
        </div>
        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500">Cancellation deadline</p>
            <p className="font-bold text-lg">
              {settings.cancellationDeadlineHours} hours before pickup
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500">Refund percentage</p>
            <p className="font-bold text-lg">{settings.refundPercent}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500">Cancellation fee</p>
            <p className="font-bold text-lg">
              {settings.cancellationFeePercent}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500">No-refund period</p>
            <p className="font-bold text-lg">
              Within {settings.noRefundHours} hours of pickup
            </p>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
