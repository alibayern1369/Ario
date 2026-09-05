'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { signedUrl } from '@/lib/storage/client';
import type { MessageRow } from '@/stores/chat-store';

export function AttachmentView({
  attachment,
}: {
  attachment: NonNullable<MessageRow['attachments']>[number];
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void signedUrl(attachment.bucket, attachment.path).then(setUrl);
  }, [attachment.bucket, attachment.path]);

  if (!url) return <div className="skeleton h-32 w-48 rounded-xl" />;

  if (attachment.mime.startsWith('image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={attachment.original_name ?? ''} className="max-h-72 rounded-xl object-cover" />
    );
  }
  if (attachment.mime.startsWith('video/')) {
    return (
      <video src={url} controls playsInline className="max-h-72 rounded-xl" />
    );
  }
  return (
    <a
      href={url}
      download={attachment.original_name ?? true}
      className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2"
    >
      <FileText size={18} />
      <span className="ltr-isolate text-sm">{attachment.original_name ?? 'file'}</span>
      <span className="text-xs opacity-70">{formatBytes(attachment.bytes)}</span>
      <Download size={16} />
    </a>
  );
}
