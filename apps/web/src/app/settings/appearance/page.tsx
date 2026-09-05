'use client';

import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';

function applyTheme(theme: 'system' | 'light' | 'dark') {
  localStorage.setItem('ario-theme', theme);
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function applyLocale(locale: 'fa' | 'en') {
  document.cookie = `ario-locale=${locale};path=/;max-age=31536000`;
  window.location.reload();
}

export default function AppearancePage() {
  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">ظاهر و زبان</h1>
        <div className="flex gap-2">
          <button className="ario-btn ario-btn-ghost" onClick={() => applyTheme('system')}>
            سیستم
          </button>
          <button className="ario-btn ario-btn-ghost" onClick={() => applyTheme('light')}>
            روشن
          </button>
          <button className="ario-btn ario-btn-ghost" onClick={() => applyTheme('dark')}>
            تیره
          </button>
        </div>
        <div className="flex gap-2">
          <button className="ario-btn ario-btn-primary" onClick={() => applyLocale('fa')}>
            فارسی
          </button>
          <button className="ario-btn ario-btn-ghost" onClick={() => applyLocale('en')}>
            English
          </button>
        </div>
      </div>
    </AppShell>
  );
}
