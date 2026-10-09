"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

type Log = {
  id: number;
  adminName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLogs(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-slate-500">
          Record of important admin actions
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Admin</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="px-4 py-3">{l.adminName}</td>
                    <td className="px-4 py-3">{l.action}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.targetType}
                      {l.targetId && ` #${l.targetId}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!logs.length && (
            <p className="text-center text-slate-400 py-12">No audit logs yet</p>
          )}
        </div>
      )}
    </div>
  );
}
