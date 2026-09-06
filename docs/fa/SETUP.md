# راه‌اندازی و استقرار آریو

آریو برای یک مجموعهٔ خصوصی تا حدود ۵۰ کاربر طراحی شده است.

## پیش‌نیاز

- Node.js 20 یا جدیدتر
- pnpm
- پروژهٔ Supabase (ابری یا `supabase start` محلی)
- دو دامنه یا زیردامنه (مثال مفهومی: سایت عمومی و برنامه). دامنه در کد ثابت نشده است.

## محیط

فایل `.env.example` را در `apps/web/.env.local` و `apps/landing/.env.local` کپی کنید.

- `NEXT_PUBLIC_APP_URL` و `NEXT_PUBLIC_LANDING_URL` را بدون اسلش پایانی بگذارید.
- کلید `anon` عمومی است؛ کلید `service_role` فقط روی سرور.
- برای تماس پایدار پشت NAT، `TURN_*` را تنظیم کنید. بدون TURN ممکن است تماس صوتی در بعضی شبکه‌ها کار کند و تصویری شکست بخورد — برنامه این را پنهان نمی‌کند.

## پایگاه‌داده

```bash
supabase db push
```

راهنمای فارسی و بازبینی امنیتی migrationها: [MIGRATIONS.md](./MIGRATIONS.md).

سیاست‌های RLS در مهاجرت‌ها فعال‌اند. کاربر مسدود یا غیرفعال نباید به پیام‌ها دسترسی داشته باشد.

## کاربر اول

در Auth یک کاربر بسازید، سپس در جدول `profiles` نقش `owner` بگذارید. ثبت‌نام پیش‌فرض «فقط دعوت» است و از پنل مدیریت عوض می‌شود.

## استقرار پیشنهادی (کم‌هزینه)

1. پروژهٔ Supabase Cloud (ورود، دیتابیس، Realtime)
2. باکت خصوصی Cloudflare R2 برای فایل‌ها (۱۰ گیگ رایگان). کلیدها فقط در `apps/web`
3. دو پروژهٔ Vercel از همین مونوریپو: یکی `apps/web` و یکی `apps/landing`
4. دامنه و SSL روی همان میزبان
5. `CRON_SECRET` را تنظیم و Edge Function / مسیرهای `/api/cron/*` را زمان‌بندی کنید — جزئیات: [OPS.md](./OPS.md)

## فضای فایل (Cloudflare R2)

بدون R2، فایل‌ها روی Storage سوپابیس می‌روند (پلن رایگان حدود ۱ گیگ).

1. در Cloudflare یک باکت **خصوصی** بسازید (مثلاً `ario`).
2. از R2 → Manage API tokens یک توکن با دسترسی Object Read & Write بسازید.
3. در محیط وب تنظیم کنید:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=ario
```

کلیدها را در فرانت نگذارید. برنامه قبل از امضای لینک، عضویت گفتگو را چک می‌کند. `GET /api/health` اگر R2 تنظیم باشد `"storage":"r2"` برمی‌گرداند.

اگر R2 پر شود (بیش از سهمیه)، آپلود جدید خطا می‌دهد؛ پیام متنی قطع نمی‌شود.

## پشتیبان

- پشتیبان روزانهٔ خودکار Supabase را روشن کنید.
- قبل از تغییر بزرگ: `supabase db dump` و خروجی JSON از `system_settings` و `landing_content`.
- بازیابی: پروژهٔ تازه، اعمال مهاجرت‌ها، بازگردانی dump، سپس تنظیم env.

متن پیام‌های خصوصی را در لاگ و ابزار تحلیل ننویسید.

## WebRTC

- STUN عمومی پیش‌فرض: `stun:stun.l.google.com:19302`
- TURN را از سرویس رایگان/ارزان (مثلاً Metered) یا coturn روی VPS بگیرید.
- نام کاربری و رمز TURN هرگز در باندل فرانت قرار نمی‌گیرد.
- تأیید: `/api/debug/turn` و تست دوکاربره — جزئیات در [OPS.md](./OPS.md).

## اعلان

```bash
npx web-push generate-vapid-keys
```

کلید عمومی در `NEXT_PUBLIC_VAPID_PUBLIC_KEY` و خصوصی در `VAPID_PRIVATE_KEY`.

روی iOS اعلان فقط پس از Add to Home Screen در نسخه‌های پشتیبانی‌شده کار می‌کند؛ تا تست دستگاه واقعی ادعا نکنید.

تست سریع: `POST /api/debug/push` یا صفحهٔ `/admin/ops`.

## Cron

`CRON_SECRET` را در env بگذارید و jobهای `expire-stories` / `publish-scheduled` را طبق [OPS.md](./OPS.md) زمان‌بندی کنید.

## نگهداری

- محدودیت حجم بارگذاری در `system_settings.upload_limits`
- داستان‌های منقضی با Function یا `/api/cron/expire-stories`
- سلامت برنامه: `GET /api/health` و `/admin/ops`
