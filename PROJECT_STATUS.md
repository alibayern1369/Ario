# ARIO project status

Honest checklist against the product specification.  
`[COMPLETE]` means the flow is implemented and wired to real Auth/DB/Realtime/Storage — not a static mock.  
Some items stay `[PARTIAL]` where a platform, paid provider, or ops credential is required.

## Product and design

- [COMPLETE] Product name آریو / ARIO, Persian-first copy
- [COMPLETE] Original design tokens (light + independent dark + system)
- [COMPLETE] RTL layouts, Vazirmatn, mixed LTR isolate for URLs/usernames
- [COMPLETE] Replaceable branding under `apps/web/public/branding/`
- [PARTIAL] Liquid-glass used on nav/composer only — not a full motion-design system with every iOS sheet gesture
- [COMPLETE] `prefers-reduced-motion` respected in CSS

## Mobile / PWA

- [COMPLETE] Mobile-first shell, desktop multi-column (list + conversation)
- [COMPLETE] Safe-area padding, 44px targets
- [COMPLETE] Web App Manifest, service worker, offline shell, update prompt
- [COMPLETE] Android install prompt + iOS A2HS guidance
- [PARTIAL] App badge: notification badge via Web Push where the browser supports it; no iOS badge API polyfill
- [COMPLETE] Architecture remains a web PWA (packagable later with Capacitor/TWA — not shipped)

## Authentication and profiles

- [COMPLETE] Email/password login, logout, persistent Supabase sessions
- [COMPLETE] Profile: username, display name, avatar, bio
- [COMPLETE] Password change, device list, revoke device row
- [COMPLETE] Account status active/disabled/banned enforced in middleware and RLS
- [COMPLETE] Invite accept flow (`/invite/[token]` + `/api/invite/accept`)
- [COMPLETE] OTP/SMS provider interface in `@ario/shared` — no paid SMS required
- [PARTIAL] Registration policy is stored and editable; open/closed modes are not fully gated in the login UI beyond invite-only default

## Presence and messaging

- [COMPLETE] Online presence (Supabase Presence) + last_seen writes
- [COMPLETE] Typing / recording / uploading broadcasts
- [COMPLETE] 1:1 DMs, Saved Messages auto-created
- [COMPLETE] Message states: sending, sent, failed, retry; delivered/read via member timestamps
- [COMPLETE] Reply, forward, copy, edit, delete-for-me, delete-for-everyone, pin, react
- [PARTIAL] Multi-select batch actions not implemented (single-message actions work)
- [PARTIAL] Swipe-to-reply is a long-press/context menu on touch (no custom swipe physics)
- [COMPLETE] Date separators, unread divider, jump to latest, drafts
- [COMPLETE] Groups and channels with roles + permission keys
- [PARTIAL] Join-approval queue UI is schema-ready (`join_approval`) but has no dedicated approval inbox
- [COMPLETE] Channel scheduled posts via `scheduled_at` + Edge Function `publish-scheduled`
- [PARTIAL] Channel comments/discussion: replies on posts exist; no separate comment thread product
- [COMPLETE] Reactions with counts (who-reacted list is in the reaction rows)

## Media, voice, search

- [COMPLETE] Images, video, GIF, files, voice uploads with MIME/size checks
- [COMPLETE] Signed URLs for private objects; Cloudflare R2 preferred (Supabase Storage fallback)
- [COMPLETE] Voice recorder (permission, timer, pause/resume, preview, send, delete)
- [COMPLETE] Voice playback with seek and 1x/1.5x/2x; one shared audio element
- [PARTIAL] Video notes: circular recorder when MediaRecorder+camera exist; otherwise explicit fallback to file attach
- [PARTIAL] Contact/location messages: schema types exist; no dedicated pickers
- [COMPLETE] Chat info tabs: media, files, links, voice, pinned, members
- [COMPLETE] Global search API (`pg` ILIKE) + in-list filter
- [PARTIAL] Thumbnail generation is client/browser native — no server image pipeline

## Stories, calls, people

- [COMPLETE] Image/video stories, caption, expiry, viewer, seen list, reply, reaction, delete, ring
- [COMPLETE] 1:1 WebRTC audio/video with ring, accept/decline, mute, camera, switch, reconnect, history
- [COMPLETE] TURN/STUN from env via `/api/turn` (no secrets in the client bundle)
- [COMPLETE] Call history with start-again
- [COMPLETE] Internal people directory (no phone-book dependency)
- [COMPLETE] Block + report

## Privacy, security, storage

- [COMPLETE] Privacy settings rows + UI
- [COMPLETE] RLS on all core tables; members-only message select
- [COMPLETE] Secure headers, env validation helpers, upload limits
- [COMPLETE] File bytes on Cloudflare R2 via server-signed PUT/GET; no R2 secrets in the client
- [COMPLETE] Admin cannot read private message bodies (no admin message viewer)
- [COMPLETE] Not labeled E2EE
- [PARTIAL] Rate limiting relies on Supabase/Auth defaults — no extra Redis limiter
- [PARTIAL] Orphan file cleanup is documented; no always-on janitor beyond story expiry function

## Admin, services, landing

- [COMPLETE] Role-gated `/admin` (middleware + RLS)
- [COMPLETE] Dashboard counts, user create/ban/role, groups/channels disable, reports workflow, settings, landing CMS, audit log
- [PARTIAL] Storage-usage bytes chart is not computed (counts only)
- [COMPLETE] Super-app `ServiceModule` registry + Services page (no fake mini-apps)
- [COMPLETE] Separate `apps/landing` with Persian SEO, legal pages, sitemap, robots, JSON-LD
- [COMPLETE] Landing content editable in admin (`landing_content`) with JSON fallback

## Notifications

- [COMPLETE] In-app notification rows + Web Push subscribe/dispatch
- [COMPLETE] Per-chat mute
- [PARTIAL] Fine-grained mention/reply/call push fan-out is not a background worker for every event (dispatch API exists; clients can call it)

## DevEx, tests, deploy

- [COMPLETE] `.env.example`, seed notes, lint/typecheck/test/build scripts
- [COMPLETE] Unit tests: permissions, access control, uploads, services
- [PARTIAL] Playwright covers login shell; full two-user realtime E2E needs a running local Supabase
- [COMPLETE] Health endpoint, structured refusal to log message bodies
- [COMPLETE] Backup/restore documented in `docs/fa/SETUP.md`
- [COMPLETE] README + Persian setup docs
