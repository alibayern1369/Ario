'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLanding() {
  const [payload, setPayload] = useState({
    title: '',
    description: '',
    heroTitle: '',
    heroSubtitle: '',
    ctaLabel: '',
    contactEmail: '',
    contactText: '',
  });

  useEffect(() => {
    void createClient()
      .from('landing_content')
      .select('payload')
      .eq('id', 'default')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.payload) setPayload(data.payload as typeof payload);
      });
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 py-8">
      <h1 className="text-2xl font-bold">محتوای وب‌سایت</h1>
      {Object.entries(payload).map(([k, v]) => (
        <label key={k} className="block">
          <span className="text-sm">{k}</span>
          <textarea
            className="ario-field mt-1"
            value={v}
            onChange={(e) => setPayload((p) => ({ ...p, [k]: e.target.value }))}
          />
        </label>
      ))}
      <button
        className="ario-btn ario-btn-primary w-full"
        onClick={() => void createClient().from('landing_content').upsert({ id: 'default', locale: 'fa', payload })}
      >
        ذخیره
      </button>
    </div>
  );
}
