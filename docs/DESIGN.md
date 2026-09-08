---
version: alpha
name: Droppr-design-system
description: Droppr presents itself as a mission-control workspace for airdrop hunters — a dark, control-panel-like interface built for daily, repeated use, not a decorative marketing surface. The visual language borrows from operational logistics (manifests, status stamps, coordinates) rather than SaaS-generic pastel cards. A deep navy-charcoal base ({colors.bg-base}) is paired with a single deliberate accent — {colors.accent}, a marigold/amber that stands for "the drop" (reward) — used only for the primary CTA and for the "Ready to Claim" status, so the color itself carries meaning. IBM Plex Sans carries UI and headline text; IBM Plex Mono is reserved for on-chain data (addresses, hashes, dates) where monospace legibility is functional, not decorative. Covers two surfaces — the public Landing Page (for future public launch) and the App/Product UI (the actual workspace).
---

## Design Plan (read this before the tokens)

- **Color:** Base `#14181F` (navy-charcoal, not pure black) · Elevated panel `#1B212B` · Hairline border `#222A35` · Text `#F4F6F8` · Accent `#F0A93B` (marigold — reserved for primary CTA + "Ready to Claim" status only) · Secondary link `#4FC3B0` (teal, distinct role from accent, never used for CTAs).
- **Type:** IBM Plex Sans for all UI/headline text (humanist-grotesque, has personality without being a display font). IBM Plex Mono strictly for on-chain/data values (wallet addresses, tx hashes, ISO dates, token amounts) — functional choice, not a "tech aesthetic" label.
- **Layout:** App is left-aligned, dense, sidebar + content (like a work tool, not a brochure). Landing page hero is split (copy left / real product manifest preview right) — not a centered hero with a decorative mockup card, because the actual task list IS the product's most characteristic image.
- **Principles:** Every color must mean something (status, not decoration). Radius stays tight (4–8px) — this is a money-tracking tool, not a playful notes app. No shadow-under-every-card; depth comes from panel layering (`bg-base` vs `bg-elevated`), which also happens to be how real terminal/dashboard tools already read as "serious."

**Self-check against generic defaults:** Rejected near-black+neon-green (the default "crypto app" cliché), rejected pastel-illustration-cards (that's literally Notion's identity, and tonally wrong for a money tool), rejected centered-hero-with-mockup-card (Notion's own landing pattern — copying it would make Droppr look like a knockoff). Kept monospace only where the subject matter (hashes, addresses) actually requires it, not as a universal label font.

---

colors:
  bg-base: "#14181F"
  bg-elevated: "#1B212B"
  bg-elevated-2: "#232A36"
  bg-sidebar: "#10141A"
  border-hairline: "#222A35"
  border-hairline-strong: "#2F3844"
  text-primary: "#F4F6F8"
  text-secondary: "#A9B3C1"
  text-tertiary: "#6B7684"
  text-disabled: "#4A5361"
  accent: "#F0A93B"
  accent-pressed: "#D4901F"
  accent-deep: "#A66C12"
  on-accent: "#14181F"
  link-teal: "#4FC3B0"
  link-teal-pressed: "#35A892"
  status-not-started: "#6B7684"
  status-in-progress: "#4FA8E0"
  status-waiting: "#8B7FE8"
  status-ready-claim: "#F0A93B"
  status-completed: "#3FBF7F"
  status-overdue: "#E5484D"
  light-canvas: "#FFFFFF"
  light-surface: "#F5F3EF"
  light-hairline: "#E2DED6"
  light-ink: "#14181F"
  light-ink-secondary: "#5B6472"

typography:
  landing-hero:
    fontFamily: IBM Plex Sans
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -1px
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 44px
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: -0.5px
  heading-1:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  heading-2:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  heading-3:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  app-section-title:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  subtitle:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  button-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  data-mono:
    fontFamily: IBM Plex Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  data-mono-sm:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4

rounded:
  xs: 3px
  sm: 5px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section: 64px
  section-lg: 88px

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-pressed:
    backgroundColor: "{colors.accent-pressed}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-hairline-strong}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.status-overdue}"
    border: "1px solid {colors.status-overdue}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card-base:
    backgroundColor: "{colors.bg-elevated}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.border-hairline}"
  card-dashboard-stat:
    backgroundColor: "{colors.bg-elevated}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    border: "1px solid {colors.border-hairline}"
  text-input:
    backgroundColor: "{colors.bg-elevated-2}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-hairline-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    height: 40px
  text-input-focused:
    border: "2px solid {colors.accent}"
  dropdown-select:
    backgroundColor: "{colors.bg-elevated-2}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-hairline-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    height: 40px
  status-badge-not-started:
    backgroundColor: "{colors.bg-elevated-2}"
    textColor: "{colors.status-not-started}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  status-badge-in-progress:
    backgroundColor: "rgba(79,168,224,0.14)"
    textColor: "{colors.status-in-progress}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  status-badge-waiting:
    backgroundColor: "rgba(139,127,232,0.14)"
    textColor: "{colors.status-waiting}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  status-badge-ready-claim:
    backgroundColor: "rgba(240,169,59,0.16)"
    textColor: "{colors.status-ready-claim}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  status-badge-completed:
    backgroundColor: "rgba(63,191,127,0.14)"
    textColor: "{colors.status-completed}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  status-badge-overdue:
    backgroundColor: "rgba(229,72,77,0.14)"
    textColor: "{colors.status-overdue}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  task-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border-bottom: "1px solid {colors.border-hairline}"
    padding: "{spacing.sm} {spacing.xs}"
  task-item-overdue:
    border-left: "2px solid {colors.status-overdue}"
  kanban-column:
    backgroundColor: "{colors.bg-sidebar}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm}"
  kanban-card:
    backgroundColor: "{colors.bg-elevated}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.border-hairline}"
  data-table:
    backgroundColor: "{colors.bg-elevated}"
    border: "1px solid {colors.border-hairline}"
    rounded: "{rounded.lg}"
  data-table-row-hover:
    backgroundColor: "{colors.bg-elevated-2}"
  wallet-connect-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-hairline-strong}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  wallet-connected-chip:
    backgroundColor: "{colors.bg-elevated-2}"
    textColor: "{colors.text-primary}"
    typography: "{typography.data-mono-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    border: "1px solid {colors.border-hairline}"
  modal:
    backgroundColor: "{colors.bg-elevated}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.border-hairline}"
  modal-overlay:
    backgroundColor: "rgba(10,13,18,0.6)"
  toast-success:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.status-completed}"
    border: "1px solid {colors.status-completed}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  toast-error:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.status-overdue}"
    border: "1px solid {colors.status-overdue}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  sidebar-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs} {spacing.sm}"
  sidebar-nav-item-active:
    backgroundColor: "{colors.bg-elevated-2}"
    textColor: "{colors.text-primary}"
  editor-toolbar:
    backgroundColor: "{colors.bg-elevated-2}"
    border-bottom: "1px solid {colors.border-hairline}"
    padding: "{spacing.xs} {spacing.sm}"

---

## Overview

Droppr has two distinct surfaces that must NOT share the same visual weight:

1. **Landing Page** (public, future-facing) — sells the idea in one scroll, honest and specific, no fabricated stats or testimonials before real users exist.
2. **App/Product** (the actual daily-use workspace) — dense, fast to scan, built for someone who opens it 5–10 times a day to check task status.

Both share the same token system (color, type, radius) so the transition from landing → sign-up → app feels like one product, not two.

## Colors

### Base surfaces (dark, default)
- `{colors.bg-base}` — page/app background, deep navy-charcoal (deliberately not pure black — pure black plus a bright accent is the generic "crypto app" cliché this system avoids).
- `{colors.bg-elevated}` — cards, panels, the sidebar's content area.
- `{colors.bg-elevated-2}` — nested surfaces: inputs, hover rows, active nav item.
- `{colors.bg-sidebar}` — sidebar background, one step darker than `bg-elevated` to read as a distinct navigation layer.
- `{colors.border-hairline}` / `{colors.border-hairline-strong}` — dividers and input borders. No drop shadows on default cards; depth comes from these layered tones instead.

### Accent — used with intent, not decoration
- `{colors.accent}` (marigold) — **reserved exclusively** for the primary CTA button and the "Ready to Claim" status badge. If you're tempted to use it anywhere else (a random icon, a decorative underline), don't — its meaning ("the drop is ready / take action now") is the whole point.
- `{colors.link-teal}` — inline links and secondary informational highlights. Never used for buttons — keeps a clear separation from the accent's "act now" meaning, same logic as Notion separating link-blue from primary-purple.

### Status colors (map directly to the project lifecycle from the PRD)
| Status | Color | Meaning |
|---|---|---|
| Belum Mulai | `{colors.status-not-started}` | Neutral, no urgency |
| Sedang Dikerjakan | `{colors.status-in-progress}` | Active work, blue |
| Menunggu TGE/Snapshot | `{colors.status-waiting}` | Pending, violet — distinct from "active" and "urgent" |
| Siap Klaim | `{colors.status-ready-claim}` | Same hue as the primary accent — this is the payoff moment |
| Selesai | `{colors.status-completed}` | Green |
| Overdue (task, bukan project) | `{colors.status-overdue}` | Red, only for missed deadlines |

### Light mode
Defined (`light-canvas`, `light-surface`, `light-hairline`, `light-ink*`) but **not required for MVP**. Dark is the default because the app is used like a terminal/wallet tool throughout the day. Build light mode only if user feedback actually asks for it — don't build it speculatively.

## Typography

- **IBM Plex Sans** — every UI label, heading, body text, button. Humanist-grotesque with real personality, distinct from the Inter-everywhere default.
- **IBM Plex Mono** — strictly for: wallet addresses, transaction hashes, ISO dates/timestamps, token amounts, chain IDs. This is a legibility requirement (ambiguous characters in hashes), not a "tech" aesthetic flourish — don't use mono for section labels or anything that isn't actual data.
- App type scale (`body-md` 15px, `body-sm` 13px) is intentionally smaller than the landing page scale (`landing-hero` 64px, `display-lg` 44px) — the app needs density, the landing page needs a moment of impact.

## Layout

### Landing Page
- **Hero:** split layout — headline + one-sentence explanation + single CTA on the left, a real preview of the task manifest (actual task-item components with status badges, not a decorative illustration) on the right. Left-aligned, not centered — centered-hero-with-floating-mockup is Notion's own signature and should not be reused here.
- **"How it works" section:** a genuine 3-step sequence (Catat Project → Kerjakan & Dipantau → Klaim), so numbered steps are justified here (the content really is sequential).
- **Feature section:** flat cards on `{colors.bg-elevated}`, icon + short label, no pastel tint backgrounds.
- **Footer:** simple, 3 columns max (Produk / Sumber Daya / Legal) — Droppr doesn't need Notion-scale 6-column footers.
- No pricing section for launch unless a monetization decision is made later — don't build tiers speculatively.

### App
- **App shell:** fixed sidebar (`bg-sidebar`) with folder tree + quick project list, top bar with search + add button + notification bell, main content area on `{colors.bg-base}`.
- **Dashboard:** stat cards (`card-dashboard-stat`) row, then "Task Hari Ini" list, then "Overdue" list, then mini calendar — matches the PRD's dashboard section order exactly.
- **Project Detail:** left-aligned single column with clear section breaks (header → social links → guide → tasks → wallets → accounts → log → claim history), not a tabbed interface — a hunter needs to scan the whole project at once, not click between tabs.

## Elevation

Flat by default. Only true overlays get shadow:
| Level | Treatment | Use |
|---|---|---|
| 0 | No shadow, hairline border only | Cards, table rows, kanban cards |
| 1 | `rgba(0,0,0,0.24) 0px 8px 24px -4px` | Dropdown menus, tooltips |
| 2 | `rgba(0,0,0,0.4) 0px 16px 40px -8px` | Modal, command palette |

## Component Notes

**`task-item`** — checkbox, title, due date in `data-mono-sm`, recurring icon if applicable. `task-item-overdue` adds a left red border — don't recolor the whole row, that's too loud for a list you scan dozens of times a day.

**`wallet-connected-chip`** — shows truncated address (`0x4a2f...9e21`) in `data-mono-sm` + chain icon. `wallet-connect-button` in idle state uses `button-secondary` styling, not `button-primary` — connecting a wallet isn't the primary action on any given screen, so it shouldn't compete visually with the actual CTA on that page.

**`status-badge-*`** — always pill-shaped (`rounded.full`) specifically for status, this is the one place `full` radius is used in the app; everything else stays tight (`rounded.md`/`rounded.lg`).

**Empty states** — per screen, write what the screen is for and give one action, not a generic "No data" message. E.g., empty Dashboard: "Belum ada task hari ini. Tambah project pertamamu untuk mulai melacak." with the add-project button inline — an empty screen is an invitation to act, not a dead end.

## Do's and Don'ts

### Do
- Use `{colors.accent}` only for primary CTA + "Ready to Claim" badge — nowhere else.
- Use `IBM Plex Mono` only for actual on-chain/data values.
- Keep radius tight (4–8px) everywhere except status pills and avatars (`full`).
- Let panel layering (`bg-base` → `bg-elevated` → `bg-elevated-2`) carry depth instead of shadows.
- Write empty states and errors as direct instructions, active voice, no apology.

### Don't
- Don't use pastel tint cards or illustrated dots — that's Notion's identity, and tonally wrong for a money-tracking tool.
- Don't default to near-black + neon-green — the generic "crypto app" cliché.
- Don't add a shadow under every card "for polish" — flat + hairline is the system.
- Don't fabricate landing-page stats/testimonials before there are real users.
- Don't build light mode, pricing tiers, or multi-tenant/team UI speculatively — none of these are confirmed requirements yet.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Landing: single column, hero stacks (copy then preview). App: sidebar collapses to bottom nav or drawer; tables become stacked cards. |
| Tablet | 640–1023px | Landing: 2-column feature grid. App: sidebar collapsible, table columns reduced to essentials (name, status, due date). |
| Desktop | ≥ 1024px | Full sidebar + content layout for app. Landing hero at full split layout. |

## Known Gaps / Next Steps

- Icon set not chosen yet — recommend Lucide or Phosphor (both open-source, pair well with a grotesque sans).
- Landing page hero preview needs a **real** screenshot of the app once built — don't ship a fake mockup illustration at public launch.
- Decide light mode necessity after MVP usage feedback, not before.
- Rich text editor component (guide-content) needs its own detailed spec once an editor library is chosen (e.g., Tiptap) — toolbar token above is a placeholder only.

---

## Usulan Perubahan

Sama seperti aturan di `AGENTS.md §7`, dokumen ini tidak ditimpa langsung ketika ada perubahan desain/spesifikasi visual baru yang belum dikonsolidasikan. Tulis usulan di bagian ini dengan format tanggal, bagian yang diusulkan, alasan, dan usulan pengganti / token baru.

### Entri Usulan

- **Tanggal:** 2026-09-08
- **Bagian yang diusulkan:** § Layout Landing Page (Hero) & Section Elevation
- **Alasan:** Keputusan desain dari user untuk menghadirkan atmosfer visual yang lebih modern dan hidup di hero landing page (terinspirasi dari Stitch / single-screen centered layout). Efek ini **hanya berlaku untuk landing page** (`app/(marketing)/`), sedangkan app shell / dashboard tetap flat sesuai prinsip no-shadow panel layering di DESIGN.md.
- **Usulan pengganti / Token Baru yang Digunakan:**
  1. **Layout Hero:** Menggunakan centered composition (Headline terpusat di atas, Centerpiece card search & preview terpusat di bawahnya, diiringi chip filter horizontal netral).
  2. **Layering Background Hero:**
     - Base: Radial gradient lembut `{colors.bg-base}` (`#14181F`) ke arah amber marigold sangat redup di sudut kanan bawah (`rgba(240, 169, 59, 0.04)`).
     - Glass Card: `bg-bg-elevated/75` (`rgba(27, 33, 43, 0.75)`), `backdrop-filter: blur(16px)`, border hairline `1px solid var(--color-border-hairline)`.
     - Interactive Dot Grid (CSS): Grid dot 24px x 24px statis `rgba(244, 246, 248, 0.14)`, dipadukan dengan spotlight dot grid amber (`rgba(240, 169, 59, 0.85)` ukuran 1.5px) yang di-masking secara radial (radius 180px) mengikuti koordinat kursor mouse `--mouse-x`, `--mouse-y` via `requestAnimationFrame`. Menghormati preferensi aksesibilitas `prefers-reduced-motion` (menjadi statis murni).
  3. **Disiplin Data:** Menegaskan larangan fabrikasi statistik nominal reward/dolar palsu; seluruh chip hanya menampilkan nama project contoh dan status operasional netral.

