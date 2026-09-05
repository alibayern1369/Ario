'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationsPage() {
  const me = useAuthStore((s) => s.userId);
  const [preview, setPreview] = useState(true);

  async function enable() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      useToastStore.getState().push('اعلان در این مرورگر پشتیبانی نمی‌شود.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const key = publicEnv().vapidPublicKey;
    if (!key) {
      useToastStore.getState().push('کلید VAPID تنظیم نشده. اعلان محلی فعال است.');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    const json = sub.toJSON();
    if (!me || !json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
    await createClient().from('push_subscriptions').upsert({
      user_id: me,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">اعلان‌ها</h1>
        <p className="text-sm text-soft">اعلان پیام، منشن، پاسخ و تماس. بی‌صدا کردن هر گفتگو از داخل همان گفتگو انجام می‌شود.</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
          نمایش پیش‌نمایش متن در اعلان
        </label>
        <button className="ario-btn ario-btn-primary w-full" onClick={() => void enable()}>
          فعال‌سازی اعلان مرورگر
        </button>
      </div>
    </AppShell>
  );
}
