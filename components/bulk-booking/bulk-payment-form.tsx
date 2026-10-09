"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { Copy, Check, Smartphone } from "lucide-react";

export function BulkPaymentForm({ bookingDbIds, totalAmount, bookingRefs, easypaisaNumber, easypaisaAccountName }: { bookingDbIds: number[]; totalAmount: number; bookingRefs: string[]; easypaisaNumber: string; easypaisaAccountName: string }) {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [copied,setCopied]=useState(false);
  const [form,setForm]=useState({transactionId:"",senderPhone:"",screenshotUrl:"",notes:""});
  const copy=async()=>{await navigator.clipboard.writeText(easypaisaNumber);setCopied(true);setTimeout(()=>setCopied(false),1500)};
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setError("");setLoading(true);try{const r=await fetch("/api/bulk-payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:totalAmount,bookingDbIds,paymentDate:new Date().toISOString()})});const j=await r.json();if(!r.ok||!j.success){setError(j.error||"Payment submission failed");return}router.push("/dashboard?bulkPayment=submitted")}catch{setError("Unable to connect. Please try again.")}finally{setLoading(false)}};
  return <div className="space-y-6">
    <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 shadow-lg"><div className="flex items-center gap-2 mb-4"><Smartphone className="h-6 w-6"/><h2 className="font-bold text-lg">EasyPaisa Payment</h2></div><p className="text-green-100 text-sm mb-4">Send exactly <strong className="text-white">{formatCurrency(totalAmount)}</strong> for all selected vehicles.</p><div className="rounded-xl bg-white/15 p-4 space-y-3"><div><p className="text-xs text-green-200 uppercase">Account Name</p><p className="font-semibold text-lg">{easypaisaAccountName}</p></div><div><p className="text-xs text-green-200 uppercase">EasyPaisa Number</p><div className="flex items-center gap-2"><p className="font-bold text-2xl">{easypaisaNumber}</p><button type="button" onClick={copy} className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</button></div></div><div><p className="text-xs text-green-200 uppercase">Combined Amount</p><p className="font-bold text-2xl">{formatCurrency(totalAmount)}</p></div></div></div>
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm"><p className="font-semibold mb-2">Bookings included</p><div className="flex flex-wrap gap-2">{bookingRefs.map(ref=><span key={ref} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border text-xs font-mono">{ref}</span>)}</div></div>
    <form onSubmit={submit} className="space-y-4"><Input label="Transaction ID" required value={form.transactionId} onChange={e=>setForm(f=>({...f,transactionId:e.target.value}))}/><Input label="Sender Phone Number" required value={form.senderPhone} onChange={e=>setForm(f=>({...f,senderPhone:e.target.value}))}/><Input label="Payment Screenshot URL (optional)" value={form.screenshotUrl} onChange={e=>setForm(f=>({...f,screenshotUrl:e.target.value}))}/><Textarea label="Notes (optional)" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>{error&&<div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>}<Button type="submit" size="lg" className="w-full" loading={loading}>Submit Combined Payment</Button></form>
  </div>;
}
