import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">آفلاین هستید</h1>
      <p className="mt-3 text-soft">
        آریو به شبکه وصل نیست. پوسته برنامه در دسترس است؛ پیام‌ها پس از اتصال همگام می‌شوند.
      </p>
      <Link className="ario-btn ario-btn-primary mt-6" href="/">
        تلاش دوباره
      </Link>
    </main>
  );
}
