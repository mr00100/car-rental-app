import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PublicShell } from "@/components/layout/public-shell";
import { BulkBookingForm } from "@/components/bulk-booking/bulk-booking-form";

export default async function BulkBookingPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/bulk-booking");
  return <PublicShell><main className="mx-auto max-w-7xl px-4 sm:px-6 py-10"><BulkBookingForm initialName={session.fullName} initialPhone={session.phone || ""} initialEmail={session.email} /></main></PublicShell>;
}
