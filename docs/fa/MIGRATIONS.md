# راهنمای اجرای Migrationهای ARIO در Supabase

این راهنما برای اجرای امن migrationهای production است.  
ترتیب فایل‌ها را تغییر ندهید.

## فهرست و وابستگی

| فایل | نقش | مخرب؟ |
| --- | --- | --- |
| `00001_init.sql` | اسکیما پایه | فقط روی دیتابیس خالی |
| `00002_storage.sql` | باکت‌ها و RLS استوریج | نه (DDL) |
| `00003_security_harden.sql` | قفل عضویت/پیام + RPCهای مجاز | نه — فقط `CREATE OR REPLACE` تابع/تریگر و `DROP POLICY`/`CREATE POLICY` |
| `00004_channel_views.sql` | RPC ثبت بازدید کانال | نه — فقط تابع |
| `00005_cron_heartbeats.sql` | جدول heartbeat کرون | نه — `CREATE TABLE IF NOT EXISTS` + RLS |

### نتیجهٔ بازبینی `00003` و `00004` (قبل از اجرا)

**`00003_security_harden.sql` — آمادهٔ production است، با این نکات:**

- هیچ `DROP TABLE` / `TRUNCATE` / `DELETE` روی دادهٔ کاربر ندارد.
- سیاست‌های ضعیف RLS را عوض می‌کند (عضویت، پیام، تماس، استوری، تنظیمات عمومی).
- تریگر `messages_update_guard` طوری اصلاح شده که:
  - کرون/service-role بتواند فقط `scheduled_at` / `published_at` / `view_count` را عوض کند؛
  - RPC بازدید کانال بتواند `view_count` را زیاد کند.
- بعد از اجرا، insert مستقیم کلاینت به `conversation_members` فقط برای staff مجاز است؛ بقیه باید از RPCها استفاده کنند.

**`00004_channel_views.sql` — آمادهٔ production است:**

- فقط `record_channel_view` را تعریف/جایگزین می‌کند.
- وابسته به `00003` است (وگرنه افزایش `view_count` توسط تریگر رد می‌شود).
- جدول `channel_views` از قبل در `00001` وجود دارد؛ این فایل داده را پاک نمی‌کند.

**`00005_cron_heartbeats.sql` را هم همراه این دو اجرا کنید** تا دیباگ کرون کار کند.

## پیش از اجرا (چک‌لیست)

1. از پروژهٔ hosted پشتیبان بگیرید (Dashboard → Database → Backups، یا `supabase db dump`).
2. مطمئن شوید `00001` و `00002` قبلاً روی همان پروژه اعمال شده‌اند.
3. کلیدها را در SQL کپی/پیست نکنید؛ migrationها credential ندارند.
4. پنجرهٔ نگهداری کوتاه اعلام کنید (چند دقیقه قطع عضویت خودسر کلاینت‌های قدیمی).

## روش A — CLI (پیشنهادی)

از ریشهٔ ریپو:

```bash
# لینک به پروژهٔ hosted (یک‌بار)
supabase link --project-ref YOUR_PROJECT_REF

# اعمال migrationهای pending
supabase db push
```

اگر فقط SQL دستی می‌خواهید:

```bash
supabase db execute --file supabase/migrations/00003_security_harden.sql
supabase db execute --file supabase/migrations/00004_channel_views.sql
supabase db execute --file supabase/migrations/00005_cron_heartbeats.sql
```

(بسته به نسخهٔ CLI ممکن است دستور `db execute` متفاوت باشد؛ در این صورت از روش B استفاده کنید.)

## روش B — SQL Editor در Dashboard

1. Supabase Dashboard → **SQL Editor**
2. محتوای `00003_security_harden.sql` را کامل بچسبانید → **Run**
3. سپس `00004_channel_views.sql` → **Run**
4. سپس `00005_cron_heartbeats.sql` → **Run**
5. هر فایل را جدا و به‌ترتیب اجرا کنید؛ هر سه را در یک batch قاطی نکنید اگر خطایی دیدید (دیباگ سخت‌تر می‌شود).

## تأیید بعد از اجرا

در SQL Editor:

```sql
-- توابع امنیتی
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'create_direct_conversation',
    'create_room_conversation',
    'record_channel_view',
    'messages_update_guard',
    'members_update_guard'
  )
order by 1;

-- جدول heartbeat
select * from public.cron_heartbeats;

-- سیاست عضویت باید staff-only برای insert باشد
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.conversation_members'::regclass;
```

تست سریع از کلاینت authenticated (باید fail شود):

```sql
-- باید توسط RLS رد شود (به‌جز staff)
insert into public.conversation_members (conversation_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', auth.uid(), 'member');
```

## برگشت (Rollback)

Migrationهای سخت‌سازی عمداً «پایین آوردن امنیت» را آسان نمی‌کنند.  
اگر مجبور به برگشت شدید:

1. از backup قبل از اجرا restore کنید (روش امن).
2. بازنویسی دستی policyهای قدیمی را فقط با دانستن `00001_init.sql` انجام دهید — توصیه نمی‌شود.

## بعد از migration

1. در Auth Dashboard، `Enable sign ups` را خاموش نگه دارید (هم‌تراز `config.toml`).
2. Edge Functionها را deploy و کرون را طبق `docs/fa/OPS.md` زمان‌بندی کنید.
3. ماتریس `ARIO_VERIFICATION.md` را با دو کاربر واقعی پر کنید.
