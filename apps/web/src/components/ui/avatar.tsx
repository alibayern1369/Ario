'use client';

import { useEffect, useState } from 'react';
import { signedUrl } from '@/lib/storage/client';

export function Avatar({
  name,
  path,
  size = 44,
  ring,
}: {
  name: string;
  path?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    void signedUrl('avatars', path).then(setUrl);
  }, [path]);

  const initials = name.trim().slice(0, 1);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-accent-soft text-accent"
      style={{ width: size, height: size }}
    >
      {ring ? (
        <span className="absolute -inset-0.5 rounded-full bg-[conic-gradient(from_180deg,#1f4e46,#b8893a,#1f4e46)]" />
      ) : null}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="relative h-full w-full object-cover" />
      ) : (
        <span className="relative flex h-full w-full items-center justify-center text-sm font-bold">
          {initials}
        </span>
      )}
    </div>
  );
}
