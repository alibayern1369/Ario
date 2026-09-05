'use client';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-[var(--ario-overlay)]" onClick={onClose} aria-label="بستن" />
      <div className="sheet absolute inset-x-0 bottom-0 max-h-[86vh] overflow-auto p-4 rise">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--ario-line-strong)]" />
        {title ? <h2 className="mb-3 text-base font-bold">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
