import Link from 'next/link';
import { appUrl, getLandingContent, siteUrl } from '@/lib/content';

const features = [
  { t: 'پیام خصوصی', d: 'گفتگوی یک‌به‌یک با وضعیت ارسال، تحویل و خوانده‌شدن.' },
  { t: 'گروه و کانال', d: 'نقش مالک، مدیر و عضو با مجوزهای قابل تنظیم — نه دکمه‌های قفل‌شده در رابط.' },
  { t: 'تماس واقعی', d: 'تماس صوتی و تصویری یک‌به‌یک با WebRTC. اگر مرورگر پشتیبانی نکند، صادقانه اعلام می‌شود.' },
  { t: 'داستان', d: 'تصویر و ویدیو با انقضا، بازدید و پاسخ. نمایش تزئینی نیست.' },
  { t: 'نصب روی گوشی', d: 'PWA واقعی: آفلاین پوسته، اعلان، و راهنمای افزودن به صفحهٔ خانگی آیفون.' },
  { t: 'حریم و امنیت', d: 'دسترسی پیام‌ها با سیاست پایگاه‌داده کنترل می‌شود. مدیران متن گفتگوی خصوصی را نمی‌خوانند.' },
];

const faqs = [
  {
    q: 'آریو برای چه کسانی است؟',
    a: 'برای سازمان‌ها، تیم‌ها و جمع‌های خصوصی تا حدود پنجاه نفر که می‌خواهند پیام‌رسان خودشان را داشته باشند.',
  },
  {
    q: 'آیا پیام‌ها رمزنگاری سرتاسری هستند؟',
    a: 'خیر. پیام‌ها روی سرور ذخیره می‌شوند و در مسیر با TLS محافظت می‌گردند. این را عمداً «رمزنگاری سرتاسری» نمی‌نامیم.',
  },
  {
    q: 'چطور نصب می‌شود؟',
    a: 'روی اندروید از مرورگر نصب می‌شود. روی آیفون از سافاری گزینهٔ Add to Home Screen را بزنید.',
  },
];

export default async function HomePage() {
  const c = await getLandingContent();
  const app = appUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'آریو',
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web',
    url: siteUrl(),
    description: c.description,
    inLanguage: 'fa',
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold">
          <span className="inline-block h-9 w-9 rounded-2xl bg-accent" />
          آریو
        </div>
        <Link href={app} className="rounded-full bg-accent px-4 py-2 text-sm text-[#fffaf2]">
          {c.ctaLabel}
        </Link>
      </header>
      <section className="hero-glow px-6 pb-20 pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm tracking-[0.2em] text-gold">ARIO</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">{c.heroTitle}</h1>
          <p className="mt-5 text-lg text-soft">{c.heroSubtitle}</p>
          <Link href={app} className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-[#fffaf2]">
            {c.ctaLabel}
          </Link>
        </div>
        <div className="mx-auto mt-16 grid max-w-4xl gap-4 md:grid-cols-2">
          <PhoneMock title="گفتگوها" lines={['علی · آنلاین', 'گزارش روزانه گروه', 'کانال اطلاع‌رسانی']} />
          <PhoneMock title="پیام" lines={['سلام، فایل صورتجلسه را فرستادم.', 'در حال نوشتن…', 'تماس تصویری']} />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">آنچه واقعاً کار می‌کند</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <article key={f.t} className="rounded-3xl bg-white/70 p-5 shadow-sm">
              <h3 className="text-xl font-bold">{f.t}</h3>
              <p className="mt-2 text-soft">{f.d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-3xl font-bold">پرسش‌های رایج</h2>
        {faqs.map((f) => (
          <details key={f.q} className="mt-4 rounded-2xl bg-white/70 p-4">
            <summary className="cursor-pointer font-bold">{f.q}</summary>
            <p className="mt-2 text-soft">{f.a}</p>
          </details>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h2 className="text-2xl font-bold">ارتباط</h2>
        <p className="mt-3 text-soft">{c.contactText}</p>
        <a className="mt-4 inline-block text-accent underline" href={`mailto:${c.contactEmail}`}>
          {c.contactEmail}
        </a>
      </section>
      <footer className="border-t border-black/10 px-6 py-8 text-sm text-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3">
          <span>آریو · ARIO</span>
          <div className="flex gap-4">
            <Link href="/privacy">حریم خصوصی</Link>
            <Link href="/terms">شرایط استفاده</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PhoneMock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-[2rem] border border-black/10 bg-[#fffaf2] p-4 shadow-lg">
      <div className="mb-3 text-center text-xs text-soft">{title}</div>
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l} className="rounded-2xl bg-[#1f4e46]/8 px-3 py-2 text-sm">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
