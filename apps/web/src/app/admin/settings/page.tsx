'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminSettings() {
  const [reg, setReg] = useState('open');
  const [maint, setMaint] = useState(false);
  const [message, setMessage] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void createClient()
      .from('system_settings')
      .select('key,value')
      .then(({ data, error }) => {
        if (error) {
          setLoadError('خواندن تنظیمات ممکن نشد.');
          return;
        }
        for (const row of data ?? []) {
          if (row.key === 'registration_policy') {
            const mode = (row.value as { mode?: string }).mode ?? 'open';
            setReg(mode === 'closed' ? 'closed' : 'open');
          }
          if (row.key === 'maintenance_mode') {
            setMaint(Boolean((row.value as { enabled?: boolean }).enabled));
            setMessage(String((row.value as { message?: string }).message ?? ''));
          }
          if (row.key === 'feature_flags') setFlags((row.value as Record<string, boolean>) ?? {});
        }
      });
  }, []);

  async function save() {
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from('system_settings').upsert([
      { key: 'registration_policy', value: { mode: reg } },
      { key: 'maintenance_mode', value: { enabled: maint, message } },
      { key: 'feature_flags', value: flags },
    ]);
    if (error) {
      setStatus(`ذخیره نشد: ${error.message}`);
      setBusy(false);
      return;
    }
    await supabase.from('admin_audit_log').insert({ action: 'update_settings', metadata: { reg, maint } });
    setStatus('ذخیره شد.');
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">تنظیمات سیستم</h1>
      {loadError ? <p className="text-sm text-[var(--ario-danger)]">{loadError}</p> : null}
      <label className="block">
        سیاست ثبت‌نام
        <select className="ario-field mt-1" value={reg} onChange={(e) => setReg(e.target.value)}>
          <option value="open">باز — همه می‌توانند ثبت‌نام کنند</option>
          <option value="closed">بسته — فقط مدیر کاربر می‌سازد</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={maint} onChange={(e) => setMaint(e.target.checked)} />
        حالت نگهداری
      </label>
      <input className="ario-field" placeholder="پیام نگهداری" value={message} onChange={(e) => setMessage(e.target.value)} />
      <h2 className="font-bold">پرچم ویژگی‌ها و خدمات</h2>
      {['stories', 'calls', 'channels', 'groups', 'attendance', 'tasks', 'files'].map((k) => (
        <label key={k} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(flags[k])}
            onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))}
          />
          {k}
        </label>
      ))}
      <button className="ario-btn ario-btn-primary w-full" disabled={busy} onClick={() => void save()}>
        {busy ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
      {status ? <p className="text-sm text-soft">{status}</p> : null}
    </div>
  );
}
