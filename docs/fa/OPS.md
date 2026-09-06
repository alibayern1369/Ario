# عملیات production: TURN، Push، iOS، Cron

این سند فقط آماده‌سازی و تأیید عملیاتی است.  
**تماس و Push را تا وقتی تست واقعی پاس نشده «آمادهٔ production» اعلام نکنید.**

## متغیرهای محیطی (بدون hardcode)

از `.env.example` کپی کنید. در Vercel / میزبان وب فقط برای `apps/web`:

| کلید | عمومی؟ | الزام production |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_*` | بله | بله |
| `SUPABASE_SERVICE_ROLE_KEY` | **خیر** | بله |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | public/private | برای Push |
| `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` | **خیر** | برای تماس پشت NAT سخت |
| `NEXT_PUBLIC_STUN_URLS` | بله | اختیاری (پیش‌فرض Google STUN) |
| `CRON_SECRET` | **خیر** | برای کرون‌ها |
| `PUSH_DISPATCH_SECRET` | **خیر** | اختیاری (webhook داخلی) |
| `R2_*` | **خیر** | توصیه‌شده برای فایل |

هیچ‌کدام از `TURN_*`، `VAPID_PRIVATE_KEY`، `CRON_SECRET`، `SUPABASE_SERVICE_ROLE_KEY` را در `NEXT_PUBLIC_*` نگذارید.

---

## 1) TURN (تماس WebRTC)

1. از Metered / Twilio / coturn خودتان URL بگیرید، مثلاً:
   - `turn:turn.example.com:3478`
   - `turns:turn.example.com:443`
2. در env وب مقدار دهید (چند URL با ویرگول مجاز است).
3. Redeploy کنید.
4. تأیید پیکربندی:
   - `GET /api/health` → `"turn":"configured"`
   - با لاگین: `GET /api/debug/turn` → `turn_configured: true` + hostها (بدون رمز)
   - با لاگین: `GET /api/turn` → آرایهٔ `iceServers` شامل TURN
5. **تأیید واقعی:** دو کاربر روی دو شبکهٔ متفاوت تماس صوتی/تصویری برقرار کنند. فقط بعد از اتصال رسانه در `ARIO_VERIFICATION.md` تیک PASS بزنید.

---

## 2) VAPID Web Push

```bash
npx web-push generate-vapid-keys
```

- کلید عمومی → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- کلید خصوصی → `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:you@your-domain`

تأیید:

1. در اپ: تنظیمات → اعلان‌ها → فعال‌سازی
2. `GET /api/debug/push` → `subscription_count ≥ 1`
3. `POST /api/debug/push` → `sent ≥ 1` و اعلان روی دستگاه دیده شود
4. پنل ادمین: `/admin/ops`

تا این مرحله کامل نشود، Push را production-ready ننامید.

---

## 3) تأیید Push روی iOS PWA

محدودیت‌ها (صادقانه):

- فقط پس از **Add to Home Screen**
- نسخهٔ iOS باید Web Push برای Home Screen Web Apps را پشتیبانی کند
- Badge/پس‌زمینه ممکن است ناقص باشد

چک‌لیست دستگاه واقعی:

1. Safari → باز کردن `NEXT_PUBLIC_APP_URL` → Share → Add to Home Screen
2. اپ را از آیکون Home Screen باز کنید (نه تب Safari)
3. اجازهٔ Notification بدهید و اشتراک Push بسازید
4. `POST /api/debug/push` از همان نشست
5. اگر اعلان نیامد: **FAIL** — ادعا نکنید که iOS Push کار می‌کند

---

## 4) Cron انقضای استوری

دو مسیر معادل (یکی کافی است؛ هر دو باید با `CRON_SECRET` محافظت شوند):

### الف) مسیر Next.js (Vercel Cron یا هر scheduler)

- URL: `POST https://YOUR_APP/api/cron/expire-stories`
- هدر: `x-cron-secret: $CRON_SECRET`  
  یا `Authorization: Bearer $CRON_SECRET`
- پیشنهاد زمان: هر ۱۵ دقیقه

**محدودیت Hobby:** روی پلن رایگان Vercel فقط cron روزانه مجاز است؛
عبارت‌هایی مثل `*/15 * * * *` یا `*/1 * * * *` باعث **شکست خودِ دیپلوی** می‌شوند.
برای اجرای مکرر روی Hobby از یکی از این‌ها استفاده کنید:

1. Edge Function سوپابیس + Schedule (روش پیشنهادی زیرین)
2. scheduler خارجی (cron-job.org / GitHub Actions) که همان URL را با هدر secret صدا بزند
3. ارتقا به Pro اگر حتماً Vercel Cron می‌خواهید

فایل `apps/web/vercel.json` عمداً `crons` خالی دارد تا دیپلوی Hobby نشکند.
مسیرهای `/api/cron/*` همچنان با `CRON_SECRET` کار می‌کنند.

### ب) Edge Function سوپابیس

```bash
supabase functions deploy expire-stories
```

Secrets در پروژهٔ Supabase:

- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (معمولاً از قبل هست)
- `SUPABASE_URL`

سپس در Dashboard → Edge Functions → Schedules (یا pg_cron / GitHub Action) هر ۱۵ دقیقه با هدر `Authorization: Bearer $CRON_SECRET` صدا بزنید.

---

## 5) Cron انتشار پست زمان‌بندی‌شدهٔ کانال

- Next: `POST /api/cron/publish-scheduled` (هر ۱ دقیقه پیشنهاد می‌شود)
- Edge: `publish-scheduled` (همین هدرها)

هر اجرای موفق/ناموفق در جدول `cron_heartbeats` ثبت می‌شود.

تأیید:

- Staff: `GET /api/debug/cron`
- یا `/admin/ops`
- انتظار: هر دو job با `fresh: true` پس از چند اجرای زمان‌بندی‌شده

دستی یک‌بار:

```bash
curl -X POST "$APP_URL/api/cron/expire-stories" -H "x-cron-secret: $CRON_SECRET"
curl -X POST "$APP_URL/api/cron/publish-scheduled" -H "x-cron-secret: $CRON_SECRET"
```

---

## 6) Endpointهای سلامت / دیباگ

| مسیر | دسترسی | کاربرد |
| --- | --- | --- |
| `GET /api/health` | عمومی | supabase / storage / turn|vapid|cron_secret configured |
| `GET /api/health?verbose=1` | staff | + probe TURN + heartbeats |
| `GET /api/debug/turn` | لاگین | وضعیت TURN بدون credential |
| `GET/POST /api/debug/push` | لاگین | اشتراک + تست تحویل به خود کاربر |
| `GET /api/debug/cron` | staff | تازگی jobها |
| `/admin/ops` | staff UI | همهٔ موارد بالا یکجا |

---

## ترتیب پیشنهادی استقرار

1. Migrationها (`docs/fa/MIGRATIONS.md`)
2. Env روی میزبان وب + Redeploy
3. `CRON_SECRET` + زمان‌بندی دو job
4. VAPID + تست push
5. TURN + تست تماس دوکاربره
6. پر کردن `ARIO_VERIFICATION.md`
