import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'شرایط استفاده · آریو' };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12 leading-8">
      <h1 className="text-3xl font-bold">شرایط استفاده</h1>
      <p className="mt-4 text-soft">
        آریو برای استفادهٔ داخلی یک مجموعهٔ محدود طراحی شده است. ایجاد حساب معمولاً با دعوت مدیر انجام می‌شود.
      </p>
      <p className="mt-4 text-soft">
        ارسال بدافزار، آزار دیگران، یا تلاش برای دسترسی به گفتگوهایی که عضو آن نیستید ممنوع است و می‌تواند به مسدود شدن حساب منجر شود.
      </p>
      <p className="mt-4 text-soft">
        سرویس «همان‌طور که هست» برای استقرار خصوصی ارائه می‌شود. دامنه، برند و محدودیت بارگذاری از پیکربندی محیط و پنل مدیریت قابل تغییر است.
      </p>
    </article>
  );
}
