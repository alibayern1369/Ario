import { Suspense } from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="skeleton min-h-[100dvh]" />}>{children}</Suspense>;
}
