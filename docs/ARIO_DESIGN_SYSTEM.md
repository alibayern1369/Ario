# ARIO Design System

Premium Persian-first messenger visual language. Implementation source of truth: `packages/shared/src/tokens.css` + `apps/web/src/app/globals.css`.

**Do not copy Telegram / iMessage / Signal.** Tokens and components define ARIO’s own cool, restrained identity.

---

## 1. Color tokens

| Token | CSS variable | Role |
| --- | --- | --- |
| Background | `--ario-bg` | App canvas |
| Background elevated | `--ario-bg-elevated` | Slightly lifted panels |
| Surface | `--ario-surface` | Translucent panel fill |
| Surface solid | `--ario-surface-solid` | Opaque surface |
| Surface elevated | `--ario-surface-elevated` | Cards / incoming bubbles |
| Primary | `--ario-accent` | Brand actions, active nav |
| Primary hover | `--ario-accent-hover` | Pressed / hover primary |
| Primary subtle | `--ario-accent-soft` | Soft fills, selection |
| Accent (secondary) | `--ario-cyan` | Online / highlight accents |
| Accent soft | `--ario-cyan-soft` | Soft cyan fills |
| Border | `--ario-line` | Hairlines |
| Border strong | `--ario-line-strong` | Inputs, emphasis |
| Divider | `--ario-line` | List separators |
| Text primary | `--ario-ink` / `--ario-text-primary` |
| Text secondary | `--ario-ink-soft` / `--ario-text-secondary` |
| Text tertiary | `--ario-muted` / `--ario-text-tertiary` |
| Outgoing bubble | `--ario-mine` + `--ario-mine-text` |
| Incoming bubble | `--ario-theirs` + `--ario-theirs-text` |

Light and dark are independently designed (not inverted).

---

## 2. Semantic colors

| Semantic | Variable | Use |
| --- | --- | --- |
| Success | `--ario-success` | Delivered, success toasts |
| Warning | `--ario-warning` | Caution, muted warnings |
| Error / Danger | `--ario-danger`, `--ario-danger-soft` | Failed send, destructive |
| Online | `--ario-online` | Presence dot |
| Unread | `--ario-unread` | Unread badges |
| Call active | `--ario-call-active` | In-call / connecting |
| Call missed | `--ario-call-missed` | Missed call rows |
| Overlay | `--ario-overlay` | Dim behind sheets |

---

## 3. Background layers

1. **Canvas** — `--ario-bg` (chat list, conversation wash)
2. **Elevated** — `--ario-bg-elevated` (forms, composer field)
3. **Surface solid** — sheets, menus, incoming bubbles
4. **Chat canvas** — calm wash; optional subtle tint via `--ario-chat-wash` (no busy patterns)

---

## 4. Glass surfaces

Use glass **only** on: navigation, bottom bars, floating controls, context menus, sheets, selected overlays, call UI, story controls.

| Level | Class | Blur | Opacity intent |
| --- | --- | --- | --- |
| Subtle | `.glass-subtle` | `--ario-blur-sm` | Headers over content |
| Medium | `.glass-medium` / `.glass` | `--ario-blur` | Bottom nav, composer |
| Strong | `.glass-strong` | `--ario-blur-lg` | Sheets, call chrome |

Each level defines: transparency (`--ario-glass-*`), blur, border (`--ario-glass-border-*`), shadow, fallback solid.

`prefers-reduced-transparency`: fall back to solid `--ario-surface-solid`.

Never stack multiple strong blur layers.

---

## 5. Typography scale

Font: **Vazirmatn Variable** (`--ario-font`).

| Role | Token | Typical size / weight |
| --- | --- | --- |
| Display | `--ario-text-display` | 1.75rem / 700 |
| Heading | `--ario-text-heading` | 1.25rem / 700 |
| Body | `--ario-text-body` | 0.9375rem / 400 |
| Caption | `--ario-text-caption` | 0.8125rem / 500 |
| Metadata | `--ario-text-meta` | 0.6875rem / 500 |
| Message | `--ario-text-message` | 0.9375rem / 400 |
| Button | `--ario-text-button` | 0.875rem / 600 |
| Input | `--ario-text-input` | 0.9375rem / 400 |

Utilities: `.ario-type-display`, `.ario-type-heading`, `.ario-type-body`, `.ario-type-caption`, `.ario-type-meta`, `.ario-type-message`, `.ario-type-button`.

Do not use arbitrary font sizes in redesigned screens.

---

## 6. Spacing scale

`--ario-space-1` … `--ario-space-8`: 4, 8, 12, 16, 20, 24, 32, 40 px.

Chat row vertical padding ≈ `--ario-space-3`; bubble padding ≈ `--ario-space-2` × `--ario-space-3`.

---

## 7. Radius scale

| Token | Value | Use |
| --- | --- | --- |
| `--ario-radius-xs` | 8px | Small chips |
| `--ario-radius-sm` | 12px | Inputs compact |
| `--ario-radius` | 16px | Default controls |
| `--ario-radius-lg` | 20px | Bubbles, sheets top |
| `--ario-radius-xl` | 24px | Large panels |
| `--ario-radius-pill` | 999px | Buttons, badges |

Avoid random radii; stick to scale.

---

## 8. Shadow scale

| Token | Use |
| --- | --- | --- |
| `--ario-shadow-sm` | Bubbles, subtle lift |
| `--ario-shadow` | Floating nav, menus |
| `--ario-shadow-lg` | Sheets, modals |

Elegant, soft — never huge multi-layer neon shadows.

---

## 9. Border tokens

- Default: `1px solid var(--ario-line)`
- Strong: `1px solid var(--ario-line-strong)`
- Glass: `1px solid var(--ario-glass-border)` / `-subtle` / `-strong`
- Prefer separators/spacing over heavy boxed borders on list rows.

---

## 10. Blur tokens

| Token | Default |
| --- | --- |
| `--ario-blur-sm` | 12px |
| `--ario-blur` | 20px |
| `--ario-blur-lg` | 28px |

---

## 11. Icon system

- Library: `lucide-react`
- Nav icons: 22px; inline actions: 18px; metadata: 14px
- Stroke weight consistent; active state = `--ario-accent` fill/color
- RTL: directional icons (back = `ArrowRight` in RTL) stay semantically correct

---

## 12. Button variants

| Class | Use |
| --- | --- |
| `.ario-btn` | Base (touch min-height `--ario-touch`) |
| `.ario-btn-primary` | Primary actions |
| `.ario-btn-ghost` | Soft accent fill |
| `.ario-btn-icon` | Square/circular icon control |
| `.ario-btn-danger` | Destructive |

Active: `scale(0.97)` via spring duration; respect reduced motion.

---

## 13. Input variants

| Class | Use |
| --- | --- |
| `.ario-field` | Default text / textarea |
| `.ario-field-composer` | Composer multiline (softer border) |
| `.ario-field-search` | Search in list headers |

Focus: outline `--ario-accent` (2px), not gold.

---

## 14. Navigation system

**Mobile:** floating glass-medium bottom bar; 5 primary tabs; compact labels (`.ario-type-meta`); safe-area inset bottom.

**Desktop (`md+`):** 3 columns — nav rail (~72–88px) → list (~360px) → main. No bottom nav.

Active: accent color + subtle soft pill behind icon.

---

## 15. Sheet / modal system

- `.sheet` — bottom sheet solid surface, large top radius, shadow-lg
- Overlay: `--ario-overlay`
- Enter: fade + slide up (`--ario-duration`, `--ario-ease`)

---

## 16. Context menu system

- Glass-strong or solid elevated surface
- Radius `--ario-radius`
- Shadow `--ario-shadow`
- Compact rows; reaction strip on top for messages

---

## 17. Message bubble system

- Outgoing: `--ario-mine` / `--ario-mine-text` — refined cool primary, not saturated messenger-blue
- Incoming: `--ario-theirs` — elevated neutral
- Max width ~82%; radius `--ario-radius-lg` with slightly tighter trailing corner when grouped
- Reply strip: accent border + caption
- Metadata: `.ario-type-meta` inside bubble
- Grouped: reduced top margin

Chat content stays **opaque/readable** — no glass on bubbles.

---

## 18. Avatar system

- Sizes: sm 32 / md 40 / lg 56 / xl 88
- Online: 10px `--ario-online` dot, border matching canvas
- Story ring: gradient using accent + cyan (stories phase)

---

## 19. Badge system

- Unread: pill, `--ario-unread` bg, white/light text, min-width
- Mute / pin: metadata icon color `--ario-text-tertiary` or accent soft

---

## 20. Loading states

- `.skeleton` shimmer using accent-soft + line
- Prefer list/conversation skeletons over full-screen spinners
- Chat list: 6 row skeletons matching row height

---

## 21. Empty states

- Component: `EmptyState` — minimal abstract circle, heading, optional body/action
- Calm, not childish; no logo spam

---

## 22. Error states

- Soft danger surface (`--ario-danger-soft`), actionable copy
- Failed message: retry affordance in bubble menu
- Offline / reconnecting: non-alarming banner (future chrome)

---

## 23. Motion system

| Token | Value |
| --- | --- |
| `--ario-ease` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--ario-duration` | 200ms |
| `--ario-duration-fast` | 120ms |

Use: press scale, sheet slide, message rise, reaction pop, typing fade.

Avoid: slow animations, bouncy gimmicks, heavy parallax.

`prefers-reduced-motion`: `--ario-duration: 1ms` + utility kill-switch.

---

## 24. Responsive breakpoints

| Name | Tailwind | Intent |
| --- | --- | --- |
| Mobile | &lt; `md` (768px) | Single column + bottom nav |
| Tablet / Desktop | `md+` | 3-column shell |
| Wide | max-width 1400–1600px shell | Centered app frame |

Test: SE / modern iPhone / large iPhone / Android ~360 & ~412 / tablet / laptop / desktop.

---

## 25. Mobile safe area rules

- Body / shell: `env(safe-area-inset-*)`
- Bottom nav / composer: `padding-bottom: max(token, env(safe-area-inset-bottom))`
- Sticky headers: respect top inset when not already on body
- Touch targets ≥ `--ario-touch` (44px)

---

## RTL / mixed content

- App `dir=rtl` for `fa`; English LTR via locale
- Use `.ltr-isolate` for emails, `@username`, URLs, phone numbers, filenames
- Chat alignment: in RTL, outgoing uses `justify-start` (visual right)

---

## Glass usage checklist

| Surface | Glass? |
| --- | --- |
| Bottom nav / desktop rail chrome | Yes (medium / subtle) |
| Chat list / conversation headers | Yes (subtle) |
| Composer | Yes (medium) |
| Message bubbles | No |
| Conversation background | No (wash only) |
| Tables / admin | No glass |

---

## Implementation map

| Artifact | Path |
| --- | --- |
| Tokens | `packages/shared/src/tokens.css` |
| Utilities | `apps/web/src/app/globals.css` |
| Tailwind aliases | `apps/web/tailwind.config.ts` |
| UI status | `ARIO_UI_STATUS.md` |
