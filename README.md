# آریو · ARIO

Private Persian super-messenger for organizations of about **50 users**.

This is a real application: Supabase Auth, Postgres + RLS, Realtime, Cloudflare R2 (or Supabase Storage fallback), WebRTC calls, PWA, admin, and a separate marketing site.

**Privacy model (honest):** messages are stored on your server and protected in transit with TLS. This is **not** end-to-end encryption. The admin panel cannot open private conversation bodies.

## Apps

| Path | Purpose |
| --- | --- |
| `apps/web` | Messenger PWA + `/admin` |
| `apps/landing` | Public marketing + legal + SEO |
| `packages/shared` | Types, permissions, design tokens |
| `supabase/` | Migrations, RLS, Edge Functions |

## Local development

```bash
pnpm install
cp .env.example apps/web/.env.local
cp .env.example apps/landing/.env.local
supabase start
# copy API URL + anon/service keys into the .env.local files
pnpm dev
```

- App: http://localhost:3000
- Landing: http://localhost:3001
- Supabase Studio: http://localhost:54323

Create the first owner in Studio or with `auth.admin.createUser` and set `profiles.role = owner`.

Dev accounts (create manually in local Auth — never used in production):

- `owner@ario.local` / `ArioOwner!123`
- `ali@ario.local` / `ArioDemo!123`

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Production

See [docs/fa/SETUP.md](docs/fa/SETUP.md) for Persian deployment, domains, TURN, backups, and restore.  
Migrations: [docs/fa/MIGRATIONS.md](docs/fa/MIGRATIONS.md). Ops (TURN/Push/Cron): [docs/fa/OPS.md](docs/fa/OPS.md).

1. Create a Supabase project.
2. Run migrations in `supabase/migrations` (including `00003`–`00005`).
3. Deploy `apps/web` and `apps/landing` as two Vercel (or Cloudflare) projects.
4. Set environment variables from `.env.example`. Never put `SUPABASE_SERVICE_ROLE_KEY`, R2 secrets, TURN passwords, or `CRON_SECRET` in `NEXT_PUBLIC_*`.
5. For files, set Cloudflare R2 keys (10 GB free). If R2 is unset, the app falls back to Supabase Storage.
6. Point custom domains via those env vars — nothing is hardcoded.
7. Confirm health at `/api/health` and staff ops at `/admin/ops`. Do not claim calls/push ready until `ARIO_VERIFICATION.md` passes.

## Architecture

- **Auth:** email + password. SMS is optional and abstracted; the app works without it.
- **Authorization:** Postgres RLS. Guessing a conversation/message ID cannot leak another chat.
- **Realtime:** Supabase postgres changes + Broadcast + Presence.
- **Files:** Cloudflare R2 via short-lived signed URLs (preferred). Supabase Storage if R2 env is empty. Metadata stays in Postgres; access is checked before signing.
- **Search:** `pg_trgm` / `ILIKE` (appropriate for ~50 users).
- **Calls:** 1:1 WebRTC. STUN is public; TURN credentials are issued only from `/api/turn` to signed-in users.
- **Push:** Web Push + VAPID.
- **Services:** modular registry only. Messenger stays the core.

## License

Private / proprietary unless you add a license file.
