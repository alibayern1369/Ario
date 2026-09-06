# ARIO UI Status

Visual redesign checklist. Do not mark complete without manual visual verification.

| Screen | Redesigned? | Mobile | Desktop | Dark mode | RTL | Interaction | Regression | Remaining issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Design system (tokens/docs) | yes | n/a | n/a | yes (tokens defined) | n/a | n/a | tsc + next build OK | — |
| App Shell + Navigation | yes | yes (floating glass bar) | yes (3-col rail) | yes (token-driven) | yes (RTL layout) | active states / safe-area | build OK; smoke via code review | Staff admin tab can crowd 6 items on narrow phones |
| Chat List | yes | yes | yes (list column) | yes | yes | search/archive/new preserved | build OK | Typing preview depends on store typing map; story rail lightly untouched |
| Conversation | yes | yes | yes | yes | yes (outgoing start) | header calls/info preserved | build OK | Message insert animation is light `.rise` only |
| Composer | yes | yes | yes | yes | yes | attach/send/mic/video-note preserved | build OK | Voice/video recorder internals still pre-redesign chrome |

## Verification notes (this pass)

- `pnpm exec tsc --noEmit` (apps/web): pass
- `next build` (apps/web): pass
- Token swap: warm cream/teal → cool graphite/indigo/cyan in `packages/shared/src/tokens.css`
- Docs: `docs/ARIO_DESIGN_SYSTEM.md`
- Landing: globals/tailwind mapped to shared CSS vars (pages not redesigned)

## Out of scope this pass

Login, Contacts, Calls, Profile, Groups, Channels, Stories (full), Settings, Services, Admin, Landing layout redesign, deep Voice/Media player redesign.
