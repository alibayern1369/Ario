export function ArioMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="arioG" x1="12" y1="8" x2="54" y2="56">
          <stop offset="0" stopColor="#1f4e46" />
          <stop offset="1" stopColor="#b8893a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#arioG)" />
      <path
        d="M18 44 L32 16 L46 44 M24.5 34h15"
        fill="none"
        stroke="#fffaf2"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArioWordmark() {
  return (
    <div className="flex items-center gap-2">
      <ArioMark />
      <div className="leading-tight">
        <div className="text-lg font-bold">آریو</div>
        <div className="text-[11px] tracking-[0.18em] text-muted ltr-isolate">ARIO</div>
      </div>
    </div>
  );
}
