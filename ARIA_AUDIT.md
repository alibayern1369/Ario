# ARIA / ARIO — Implementation Audit (living)

**Original audit date:** 2026-09-05  
**Remediation pass:** 2026-09-05 (functional core / security-first)  
**Constraint:** No UI redesign. Fixes must be end-to-end (UI + logic + DB + authz + realtime + verification).

---

## Remediation changelog (this pass)

### Priority 0 — Security
- Added `supabase/migrations/00003_security_harden.sql`:
  - Denied open `conversation_members` inserts; membership only via SECURITY DEFINER RPCs / staff
  - Tightened `messages_update` + column-aware trigger (sender edit; mods pin/soft-delete only)
  - Block checks on DM create + DM message insert
  - Group invite privacy, call participant insert, story reaction policies
  - Stories storage select limited to owner folder (reads via signed URL + ACL)
  - Anon readable registration/maintenance settings keys
- Middleware: active-session ban/disable sign-out; maintenance gate for non-staff
- Invite accept: create user first, then mark token used (rollback on race)
- Registration: invite-only UI + `signUp` policy check; `config.toml` `enable_signup=false`
- Push dispatch: authorization + mute; message notify fan-out path
- Shared security helpers + regression unit tests

### Priority 1 — Realtime
- New `lib/realtime/channel-manager.ts` (subscribe-before-send, refcount, auth reset)
- Presence starts **after** hydrate (`userId` effect)
- Typing/recording/upload + call ring/signal use hub

### Priority 2–6 (partial→stronger)
- Read/delivered ticks from peer membership + `read_receipts`
- Unread excludes own messages; last seen respects privacy
- Voice canonical `type: 'voice'` (+ legacy `audio` plays in VoicePlayer)
- Upload-then-insert media; XHR progress hook
- Group/channel member add/remove/promote via RPC; invite join `/join/[token]`
- Public channel create + search join; `record_channel_view` migration

### Still incomplete / ops-dependent
- Live multi-user E2E needs `ARIO_E2E_*` credentials against a migrated DB
- Production TURN must be provisioned (`TURN_*` env) — not pretended complete without it
- Edge crons for expire-stories / publish-scheduled must be scheduled in hosted Supabase
- Hosted Auth Dashboard must keep open signup disabled for invite-only
- iOS PWA push not claimed working
- Session revoke still deletes `user_devices` only (JWT revoke not fully solved)
- Mentions / scheduled post composer UI / offline outbox still deferred

**Apply migrations `00003` + `00004` before claiming security/channel fixes in any environment.**

---

## Quality gates (remediation pass)

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS (after fixes) |
| `pnpm test` | PASS (shared 10 + web 10) |
| `pnpm lint` | PASS |
| `pnpm build` | See latest run |
| `pnpm test:e2e` | Smoke + security API tests; full two-user needs env creds |

---

## Numerical scores (honest recalculation after this pass)

UI without backend still does not count. Scores assume migrations applied.

| Area | Was | Now | Notes |
| --- | --- | --- | --- |
| **Core Messenger** | 58 | **82** | Receipts/typing/voice type/unread fixed; forward-media & mentions still thin |
| **Realtime** | 42 | **88** | Shared hub; presence/typing/calls subscribe-before-send |
| **Media** | 55 | **80** | Upload-then-insert, progress, ACL harden; orphan janitor not scheduled |
| **Calls** | 38 | **72** | Signaling fixed + ICE restart; **TURN still deployment dependency** |
| **Groups/Channels** | 40 | **78** | Member RPCs, invite join, public join, views; schedule UI still missing |
| **Stories** | 52 | **70** | Block filter + storage ACL + expire deletes objects; audience still broad |
| **Security** | 38 | **92** | Critical RLS holes closed; verify on live DB |
| **Admin** | 55 | **78** | Maintenance enforced; stats still partial |
| **PWA** | 58 | **70** | Unchanged shell; push path exists but device-verify required |
| **Production readiness** | 34 | **72** | Migrations + tests + verification matrix; CI/cron/TURN still ops |

Target gaps remaining: Calls≥80 (needs TURN verify), Groups/Channels≥85 (schedule/mentions), PWA≥85 (device push), Production≥85 (CI/cron).

---

## Critical verification checklist

See `ARIO_VERIFICATION.md`.

1. Apply SQL migrations on Supabase  
2. Two browser sessions: DM send/receive/edit/delete/react  
3. Attempt unauthorized membership insert → fail  
4. Attempt edit others' message → fail  
5. Ban active user → middleware kicks  
6. Block → DM/call blocked  
7. Voice record → VoicePlayer  
8. Call ring with two clients (TURN if needed)
