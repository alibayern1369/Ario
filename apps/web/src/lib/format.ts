const faDate = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const faTime = new Intl.DateTimeFormat('fa-IR', {
  hour: '2-digit',
  minute: '2-digit',
});

const faDateTime = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTime(iso: string) {
  return faTime.format(new Date(iso));
}

export function formatDate(iso: string) {
  return faDate.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return faDateTime.format(new Date(iso));
}

export function formatDaySeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (start(now) - start(d)) / 86400000;
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  return faDate.format(d);
}

export function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatLastSeen(iso: string | null | undefined) {
  if (!iso) return 'آخرین بازدید نامشخص';
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'آخرین بازدید همین الان';
  if (diff < 3600_000) return `آخرین بازدید ${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86400_000) return `آخرین بازدید ${faTime.format(d)}`;
  return `آخرین بازدید ${faDateTime.format(d)}`;
}

export function isolateLtr(value: string) {
  return `\u2066${value}\u2069`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}
