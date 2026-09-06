'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Report = { id: string; reason: string; status: string; details: string | null };

export default function AdminReports() {
  const [rows, setRows] = useState<Report[]>([]);
  useEffect(() => {
    void createClient()
      .from('reports')
      .select('id,reason,status,details')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Report[]));
  }, []);
  return (
    <div className="px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">گزارش‌ها</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-ario bg-[var(--ario-surface-solid)] p-3">
            <div className="font-semibold">{r.reason}</div>
            <div className="text-sm text-soft">{r.details}</div>
            <div className="mt-2 flex gap-2">
              {(['reviewing', 'resolved', 'dismissed'] as const).map((s) => (
                <button
                  key={s}
                  className="ario-btn ario-btn-ghost"
                  onClick={async () => {
                    await createClient()
                      .from('reports')
                      .update({ status: s, resolved_at: new Date().toISOString() })
                      .eq('id', r.id);
                    setRows((x) => x.map((i) => (i.id === r.id ? { ...i, status: s } : i)));
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
