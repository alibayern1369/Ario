'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

const OPTIONS = [
  ['everyone', 'همه'],
  ['contacts', 'اعضای آریو'],
  ['nobody', 'هیچ‌کس'],
] as const;

export default function PrivacyPage() {
  const privacy = useAuthStore((s) => s.privacy);
  const refresh = useAuthStore((s) => s.refreshProfile);
  const me = useAuthStore((s) => s.userId);
  const [form, setForm] = useState({
    last_seen: privacy?.last_seen ?? 'everyone',
    online: privacy?.online ?? 'everyone',
    profile_photo: privacy?.profile_photo ?? 'everyone',
    calls: privacy?.calls ?? 'everyone',
    group_invites: privacy?.group_invites ?? 'everyone',
    read_receipts: privacy?.read_receipts ?? true,
  });

  async function save() {
    if (!me) return;
    await createClient().from('privacy_settings').update(form).eq('user_id', me);
    await refresh();
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">حریم خصوصی</h1>
        {(
          [
            ['last_seen', 'آخرین بازدید'],
            ['online', 'وضعیت آنلاین'],
            ['profile_photo', 'عکس پروفایل'],
            ['calls', 'تماس'],
            ['group_invites', 'دعوت به گروه'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm">{label}</span>
            <select
              className="ario-field"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value as typeof form.last_seen }))}
            >
              {OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.read_receipts}
            onChange={(e) => setForm((f) => ({ ...f, read_receipts: e.target.checked }))}
          />
          رسید خوانده‌شدن
        </label>
        <button className="ario-btn ario-btn-primary w-full" onClick={() => void save()}>
          ذخیره
        </button>
      </div>
    </AppShell>
  );
}
