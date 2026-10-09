import { PublicShell } from "@/components/layout/public-shell";
import { getSettings } from "@/lib/settings";

export default async function TermsPage() {
  const settings = await getSettings();
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {settings.termsOfService}
        </div>
      </div>
    </PublicShell>
  );
}
