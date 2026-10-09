import { notFound, redirect } from "next/navigation";
import { PublicShell } from "@/components/layout/public-shell";
import { BulkPaymentForm } from "@/components/bulk-booking/bulk-payment-form";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils";

type Props={searchParams:Promise<{ids?:string}>};
export default async function BulkPaymentPage({searchParams}:Props){
 const session=await getSession(); if(!session) redirect("/login?next=/bulk-booking");
 const sp=await searchParams; const ids=(sp.ids||"").split(",").map(Number).filter(n=>Number.isInteger(n)&&n>0); if(ids.length<1) notFound();
 const rows=await db.select().from(bookings).where(and(inArray(bookings.id,ids),eq(bookings.userId,session.id))); if(rows.length!==ids.length) notFound();
 const total=rows.reduce((s,r)=>s+r.totalAmount,0); const settings=await getSettings();
 return <PublicShell><main className="mx-auto max-w-lg px-4 sm:px-6 py-10"><div className="mb-6"><h1 className="text-2xl font-bold">Complete Bulk Payment</h1><p className="text-slate-500 text-sm mt-1">{rows.reduce((s,r)=>s + (Number((r.notes||"").match(/Quantity: (\d+)/)?.[1] || 1)),0)} vehicles • Combined total <strong>{formatCurrency(total)}</strong></p></div><BulkPaymentForm bookingDbIds={rows.map(r=>r.id)} bookingRefs={rows.map(r=>r.bookingId)} totalAmount={total} easypaisaNumber={settings.easypaisaNumber} easypaisaAccountName={settings.easypaisaAccountName}/></main></PublicShell>;
}
