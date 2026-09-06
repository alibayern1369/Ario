export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-ario-2 px-ario-8 py-16 text-center">
      <div
        className="mb-ario-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft"
        aria-hidden
      >
        <div className="h-8 w-8 rounded-full border-2 border-dashed border-accent/40" />
      </div>
      <h2 className="ario-type-heading text-ink">{title}</h2>
      {body ? <p className="ario-type-caption max-w-sm text-soft">{body}</p> : null}
      {action}
    </div>
  );
}
