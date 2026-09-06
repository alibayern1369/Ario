# ARIO project status

Honest checklist after the 2026-09-05 functional-core remediation.  
When this file conflicts with `ARIA_AUDIT.md` or running code, **trust the audit + code**.  
`[COMPLETE]` means verified wired path (UI + DB + authz + realtime where applicable).  
`[PARTIAL]` means real code exists but ops/device/edge cases remain.  
`[BROKEN]` / removed claims: do not mark complete.

## Security (Priority 0)

- [COMPLETE] Membership inserts locked; authorized RPCs for DM/room/join/add/remove/role
- [COMPLETE] Message update ownership + moderator pin/delete guard (RLS + trigger)
- [COMPLETE] Middleware strips banned/disabled active sessions
- [COMPLETE] Blocks enforced on DM create, DM message insert, calls
- [COMPLETE] Invite accept creates user before burning token
- [COMPLETE] Invite-only registration UI + app `signUp` gate; local Auth signup disabled in `config.toml`
- [COMPLETE] Push dispatch authorization + mute awareness
- [PARTIAL] Hosted Supabase Auth Dashboard must also disable open signup (ops)
- [PARTIAL] Device “revoke” still deletes `user_devices` row only (not full JWT revoke)

## Realtime

- [COMPLETE] Shared realtime hub (subscribe-before-send, cleanup, auth reset)
- [COMPLETE] Presence after hydrate; last_seen writes; visibility handler
- [COMPLETE] Typing / recording / uploading on subscribed conversation channel
- [COMPLETE] Call ring / decline / hangup / WebRTC signal via hub

## Messaging

- [COMPLETE] DM text send/receive/persist/edit/delete/react/draft/pin/archive/mute/Saved Messages
- [COMPLETE] Delivered/read ticks from peer membership timestamps (respect `read_receipts`)
- [COMPLETE] Unread excludes own messages
- [PARTIAL] Reply quote preview still minimal; forward attachments not fully copied
- [PARTIAL] Mentions not implemented

## Voice / media

- [COMPLETE] Canonical voice type (`voice`); legacy `audio` still plays
- [COMPLETE] Upload-then-insert; XHR upload progress callback
- [COMPLETE] Private media signed URL after membership ACL; stories not path-guessable
- [PARTIAL] Orphan blob janitor not scheduled in hosted cron yet

## Groups / channels

- [COMPLETE] Create via RPC; owner/admin member add/remove/promote/demote UI
- [COMPLETE] Invite link copy + `/join/[token]`
- [COMPLETE] Public channels + search join; channel view recording RPC
- [PARTIAL] Scheduled posts: edge + `/api/cron/publish-scheduled` ready; composer UI still limited
- [PARTIAL] Join-approval queue UI not built
- [PARTIAL] Cron heartbeats require `00005` + `CRON_SECRET` + scheduler (ops)

## Calls

- [COMPLETE] WebRTC audio/video with subscribed signaling + ICE restart attempt
- [COMPLETE] Block/privacy gates before call start
- [PARTIAL] Production reliability requires configured + **verified** TURN (`TURN_*`) — not claimed from env alone
- [PARTIAL] Call history outcomes approximate

## Stories / notifications / PWA / admin

- [COMPLETE] Stories create/view/react/reply; expire function deletes storage objects
- [PARTIAL] Story audience still “all non-blocked actives” (no followers graph)
- [COMPLETE] Message → notify fan-out path (VAPID required); mute/block respected
- [PARTIAL] Push **not** claimed on iOS PWA until device-tested
- [COMPLETE] Admin panel staff gate; maintenance mode enforced in middleware
- [PARTIAL] Admin storage byte stats still incomplete
- [COMPLETE] PWA manifest/SW/install shell (offline queue still absent)

## Verification

- Matrix: `ARIO_VERIFICATION.md` (چک‌لیست دوکاربره کامل)
- Ops: `docs/fa/OPS.md` + `/admin/ops`
- Migrations guide: `docs/fa/MIGRATIONS.md`
- Unit: shared security + storage ACL tests
- E2E: login smoke + push unauthorized + optional two-user with `ARIO_E2E_*`

## Required ops before production claim

1. Run migrations `00003_security_harden.sql`, `00004_channel_views.sql`, `00005_cron_heartbeats.sql`
2. Disable open signup in hosted Auth
3. Provision VAPID + optional `PUSH_DISPATCH_SECRET`; verify with `POST /api/debug/push`
4. Provision TURN (`TURN_*`); verify with two-user call — do **not** claim calls ready from env alone
5. Set `CRON_SECRET`; schedule `expire-stories` + `publish-scheduled`; confirm via `/api/debug/cron`
6. Fill verification matrix with two real sessions (including banned active session)
7. iOS PWA push: only PASS after device checklist
