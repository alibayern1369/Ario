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
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
      <div className="mb-2 h-16 w-16 rounded-full bg-accent-soft" />
      <h2 className="text-lg font-bold">{title}</h2>
      {body ? <p className="max-w-sm text-sm text-soft">{body}</p> : null}
      {action}
    </div>
  );
}
