'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/format';

type Row = { id: string; action: string; target: string | null; created_at: string };

export default function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void createClient()
      .from('admin_audit_log')
      .select('id,action,target,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);
  return (
    <div className="px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">گزارش فعالیت مدیران</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-ario bg-[var(--ario-surface-solid)] p-3 text-sm">
            <div className="font-semibold">{r.action}</div>
            <div className="text-muted">
              {r.target} · {formatDateTime(r.created_at)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
