# ماتریس تأیید آریو (ARIO Verification)

آخرین به‌روزرسانی: 2026-09-06  
منبع حقیقت pass/fail: همین فایل + تست‌های خودکار. `PROJECT_STATUS.md` فرعی است.

**قانون صداقت:** تماس (Calls) و Push را فقط وقتی PASS علامت بزنید که روی دستگاه/شبکهٔ واقعی تأیید شده باشند. صرف تنظیم بودن env کافی نیست.

---

## دستورهای خودکار

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

E2E دوکاربره (اختیاری):

```bash
ARIO_E2E_USER_A=... ARIO_E2E_PASS_A=... ARIO_E2E_USER_B=... ARIO_E2E_PASS_B=... pnpm test:e2e
```

---

## پیش‌نیاز ops قبل از تست دستی

- [ ] Migrationهای `00003` + `00004` + `00005` اجرا شده (`docs/fa/MIGRATIONS.md`)
- [ ] Signup باز در Auth Dashboard خاموش است
- [ ] `GET /api/health` → supabase=ok
- [ ] VAPID در env (اگر قرار است Push تست شود)
- [ ] TURN در env (اگر قرار است تماس پشت NAT سخت تست شود)
- [ ] `CRON_SECRET` + حداقل یک اجرای موفق هر job

دیباگ سریع: `/admin/ops` یا جدول زیرین.

| چک | فرمان / مسیر | انتظار | Actual | PASS/FAIL |
| --- | --- | --- | --- | --- |
| TURN پیکربندی | `GET /api/debug/turn` | `turn_configured: true` | | |
| TURN ICE واقعی | تماس دوکاربره | رسانه وصل می‌شود | | تا ICE واقعی: ادعا نکنید |
| Push اشتراک | `GET /api/debug/push` | `subscription_count ≥ 1` | | |
| Push تحویل | `POST /api/debug/push` | `sent ≥ 1` + اعلان دیده شود | | |
| Cron در حال اجرا | `GET /api/debug/cron` | هر دو job `fresh: true` | | |

---

## ماتریس ویژگی‌ها

| Feature | Automated? | Manual? | User A | User B | Expected | Actual | PASS/FAIL | Known limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | Yes (`e2e/auth.spec.ts`) | No | `/login` | — | ورود به اپ | | | |
| Banned session revoked | helpers + middleware | Yes | Staff بن A | A ناوبری کند | خروج / 403 | | | نیاز به بن زنده |
| Open registration gated | shared + UI | Yes | `/login` invite-only | — | بدون ثبت‌نام باز | | | Auth hosted هم باید قفل باشد |
| Invite accept atomic | API | Yes | قبول دعوت | — | کاربر ساخته سپس invite مصرف | | | |
| Membership insert denied | `security.test.ts` | Yes (SQL) | insert مستقیم اعضا | — | RLS رد | | | بعد از 00003 |
| Message edit ownership | shared + trigger | Yes | B محتوای A را عوض کند | — | رد | | | |
| Private media ACL | `storage/access.test.ts` | Yes | حدس path | — | 403 | | | |
| Story media ACL | همین | Yes | خواندن استوری دیگری | — | رد مگر مجاز | | | |
| Block DM / message / call | app + RLS | Yes | A بلاک B | — | DM/پیام/تماس قطع | | | |
| Presence | manual | Yes | A آنلاین | B ببیند | آنلاین | | | |
| Typing | manual | Yes | A تایپ | B ببیند | «در حال نوشتن» | | | |
| Text realtime + persist | E2E partial | Yes | A بفرستد | B ببیند | بدون رفرش + ماندگار | | | |
| Delivered/read | manual | Yes | A بفرستد | B باز کند | تیک خوانده | | | احترام به `read_receipts` |
| Voice | manual | Yes | ضبط/ارسال | پخش | type=voice | | | MediaRecorder |
| Group permissions | manual | Yes | مالک نقش/اخراج | هدف | RPC+RLS | | | |
| Channel post perms | manual | Yes | مشترک پست | — | رد | | | |
| Channel views | RPC | Yes | مشاهده پست | — | view_count | | | 00004 |
| Push on message | API authz | Yes device | A بفرستد | B دستگاه | فقط اگر unmute/subscribed | | | VAPID؛ iOS محدود |
| Incoming call | manual | Yes | A زنگ | B overlay | زنگ از کانال | | | TURN برای بعضی NAT |
| Admin ban | manual | Yes | بن | banned | session قطع | | | |
| PWA / SW | manual | Yes | نصب | — | standalone | | | iOS push جدا |

---

## چک‌لیست تست دوکاربره (اجباری قبل از ادعای آمادگی)

دو مرورگر / دو دستگاه. کاربر A و B هر دو `active`. ستون‌ها را بعد از اجرا پر کنید.

### 1) پیام خصوصی (DM)

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 1.1 | A با B گفتگوی مستقیم می‌سازد | یک DM، بدون خطای blocked | | |
| 1.2 | A متن می‌فرستد؛ B همان لحظه می‌بیند | realtime بدون رفرش | | |
| 1.3 | B رفرش می‌کند | پیام مانده | | |
| 1.4 | A پاسخ / ویرایش / حذف / ری‌اکشن | فقط روی پیام خودش (جز mod) | | |

### 2) تایپینگ

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 2.1 | A در composer تایپ می‌کند | B «در حال نوشتن» می‌بیند | | |
| 2.2 | A توقف می‌کند | اندیکاتور قطع می‌شود | | |

### 3) Delivered / Read

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 3.1 | A می‌فرستد؛ B چت را باز نکرده | وضعیت تحویل مطابق UI | | |
| 3.2 | B چت را باز می‌کند (با read_receipts روشن) | تیک خوانده برای A | | |
| 3.3 | B read_receipts را خاموش می‌کند و دوباره | رفتار محرمانگی رعایت شود | | |

### 4) پیام صوتی (Voice)

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 4.1 | A ضبط و ارسال می‌کند | `voice` ذخیره می‌شود | | |
| 4.2 | B پخش می‌کند | VoicePlayer بدون خطای ACL | | |

### 5) رسانه (Media)

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 5.1 | A تصویر/فایل در DM می‌فرستد | B می‌بیند/دانلود با URL امضاشده | | |
| 5.2 | کاربر غیرعضو path را حدس می‌زند | 403 از `/api/storage/url` | | |

### 6) بلاک (Block)

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 6.1 | A، B را بلاک می‌کند | ساخت DM جدید برای طرفین fail | | |
| 6.2 | اگر DM قبلی هست، ارسال پیام | insert رد می‌شود | | |
| 6.3 | B به A زنگ می‌زند | تماس شروع نمی‌شود / toast | | |
| 6.4 | آن‌بلاک و تکرار DM | دوباره کار می‌کند | | |

### 7) مجوزهای گروه

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 7.1 | A گروه می‌سازد و B را اضافه می‌کند | هر دو عضو | | |
| 7.2 | عضو بدون `send_messages` سعی در ارسال | UI/RLS رد | | |
| 7.3 | مالک B را ادمین می‌کند / عزل می‌کند | نقش عوض می‌شود | | |
| 7.4 | لینک دعوت `/join/{token}` | عضویت جدید | | |
| 7.5 | غیرعضو بدون دعوت self-join | رد | | |

### 8) کانال

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 8.1 | A کانال می‌سازد؛ B مشترک | B نمی‌تواند پست بگذارد | | |
| 8.2 | A (با `post_channel`) پست می‌گذارد | B می‌بیند | | |
| 8.3 | B پست را باز می‌کند | `record_channel_view` / افزایش بازدید | | |
| 8.4 | پست زمان‌بندی‌شده + کرون | پس از زمان، `published_at` ست می‌شود | | نیاز به UI/دادهٔ scheduled |

### 9) تماس (Calls) — بدون PASS تا ICE واقعی

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 9.1 | `GET /api/debug/turn` | پیکربندی مشخص است | | پیکربندی ≠ PASS تماس |
| 9.2 | A به B زنگ صوتی | B overlay زنگ | | |
| 9.3 | B قبول می‌کند | دو طرف صدا می‌شنوند | | |
| 9.4 | قطع تماس | streamها stop؛ ردیف تاریخچه | | |
| 9.5 | ترجیحاً شبکهٔ متفاوت / NAT سخت | در صورت نیاز relay TURN | | بدون این: Claims نکنید |

### 10) اعلان‌ها (Notifications)

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 10.1 | B اعلان مرورگر را فعال می‌کند | ردیف `push_subscriptions` | | |
| 10.2 | `POST /api/debug/push` از نشست B | اعلان تست دیده می‌شود | | |
| 10.3 | A پیام می‌فرستد؛ B در چت نیست | اعلان پیام (اگر unmute) | | |
| 10.4 | B چت را mute می‌کند؛ A دوباره می‌فرستد | اعلان نیاید | | |
| 10.5 | iOS PWA (در صورت هدف) | فقط از Home Screen طبق OPS | | تا تأیید دستگاه: FAIL/SKIP |

### 11) نشست فعال کاربر بن‌شده

| # | گام | انتظار | Actual | P/F |
| --- | --- | --- | --- | --- |
| 11.1 | A لاگین است | نشست فعال | | |
| 11.2 | Staff وضعیت A را `banned` می‌کند | — | | |
| 11.3 | A صفحه عوض می‌کند / API می‌زند | redirect لاگین یا 403؛ کوکی پاک | | |
| 11.4 | تلاش مجدد لاگین | ورود به اپ ممکن نباشد / مسدود | | |

---

## محدودیت‌های iOS PWA (صریح)

- Web Push کامل مثل Android Chrome تضمین نیست.
- بدون Add to Home Screen و نسخهٔ پشتیبانی‌شده، Push را PASS نکنید.
- Badge اپ را ARIO شبیه‌سازی نمی‌کند.

---

## Migration لازم

قبل از ادعای امنیتی:

1. `00003_security_harden.sql`
2. `00004_channel_views.sql`
3. `00005_cron_heartbeats.sql` (برای دیباگ کرون)

راهنما: `docs/fa/MIGRATIONS.md` — عملیات: `docs/fa/OPS.md`
