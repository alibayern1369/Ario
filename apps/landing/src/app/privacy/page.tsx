import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'حریم خصوصی · آریو' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12 leading-8">
      <h1 className="text-3xl font-bold">سیاست حریم خصوصی</h1>
      <p className="mt-4 text-soft">
        آریو یک پیام‌رسان خصوصی برای جمع محدود است. پیام‌ها، پرونده‌ها و پروفایل‌ها روی سروری که شما پیکربندی می‌کنید ذخیره می‌شوند و در مسیر با TLS محافظت می‌گردند.
      </p>
      <p className="mt-4 text-soft">
        این محصول رمزنگاری سرتاسری ندارد. مدیر سامانه به متن گفتگوهای خصوصی از طریق پنل مدیریت دسترسی ندارد؛ اما دارندهٔ پایگاه‌داده از نظر فنی به داده‌های ذخیره‌شده دسترسی دارد.
      </p>
      <p className="mt-4 text-soft">
        اعلان‌ها و آمار عملیاتی فقط به‌صورت تجمیعی استفاده می‌شوند. متن گفتگو به سرویس تحلیل ثالث فرستاده نمی‌شود.
      </p>
    </article>
  );
}
