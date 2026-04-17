---
phase: 26-design-tokens
verified: 2026-04-17T12:00:00Z
status: passed
score: 30/30 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 28/30
  gaps_closed:
    - "Header freshness dot migrated from bg-amber-500/bg-emerald-500 to bg-warning-fg/bg-success-fg (commit eec44ca)"
    - "Header stale text migrated from text-amber-600 dark:text-amber-400 to text-warning-fg (commit eec44ca)"
    - "Truth 15 (header title/label uses type scale) now VERIFIED — freshness dot and stale text both use state tokens"
    - "Human item 4 (token migration decision) resolved — migration was done"
    - "Human item 1 (dark-mode KPI card inversion) — VERIFIED by user visual approval"
    - "Human item 2 (/tokens page all tabs + dark mode) — VERIFIED by user visual approval"
    - "Human item 3 (copy-to-clipboard + sonner toast) — VERIFIED by user visual approval"
    - "Brand palette swap to Bounce green + purple (commit d2f0a16) — VERIFIED by user visual approval"
  gaps_remaining: []
  regressions: []
human_verification: []
gaps: []
---

# Phase 26: Design Tokens Verification Report

**Phase Goal:** Establish a complete design token system (spacing, typography, shadow, motion, radius, surface, neutral, state-color, interaction, chart-palette) and prove it works end-to-end by migrating four pilot components (KPI card, header, table body w/ density, /tokens reference page) and swapping fonts Geist → Inter + JetBrains Mono.

**Verified:** 2026-04-17 (re-verification after commit eec44ca)
**Status:** PASSED
**Re-verification:** Yes — after gap closure (commit eec44ca: header freshness indicator migrated to state tokens; user visually approved remaining human items)

---

## Re-verification Summary

**What changed:** Commit eec44ca migrated `src/components/layout/header.tsx` — the freshness status dot and stale timestamp text were converted from hardcoded Tailwind palette classes (`bg-amber-500`, `bg-emerald-500`, `text-amber-600 dark:text-amber-400`) to state tokens (`bg-warning-fg`, `bg-success-fg`, `text-warning-fg`).

**What the user approved visually:**
- Dark-mode KPI card surface-raised/surface-base inversion (cards visibly lighter than page background)
- /tokens page in both light and dark mode — all 5 tabs, motion demos, copy-to-clipboard
- Brand palette swap (commit d2f0a16) to Bounce green + purple

All 30 truths are now verified. No human items remain open.

---

## Goal Achievement

### Observable Truths

| # | Truth (Plan Source) | Status | Evidence |
|---|---|---|---|
| 1 | Tailwind v4 build emits utilities for all new token namespaces without errors | VERIFIED (user approved) | Build confirmed working during visual review of /tokens page and all pilot components |
| 2 | Inter + JetBrains Mono load via next/font/google and drive --font-sans / --font-mono | VERIFIED | `layout.tsx:2` imports `Inter, JetBrains_Mono`; vars `--font-inter`, `--font-jetbrains-mono`; `globals.css:170-171` maps `--font-sans: var(--font-inter)`, `--font-mono: var(--font-jetbrains-mono)` |
| 3 | Light and dark modes both render with warm-paper surfaces; dark-mode surface-raised LIGHTER than surface-base | VERIFIED | Math: `globals.css` dark `--surface-raised: oklch(0.22 0.012 60)` > `--surface-base: oklch(0.16 0.012 60)`. Visual: user confirmed KPI card inversion in dark mode |
| 4 | Every shadcn-dependent component still renders correctly after shadcn var re-map | VERIFIED (user approved) | Re-map present: `--background: var(--surface-base)`, `--card: var(--surface-raised)`, etc. in both `:root`/`.dark`; user confirmed no visual regressions during /tokens and app review |
| 5 | Spacing, typography, shadow, motion, radius, surface, neutral, state-color, interaction, chart-palette tokens all defined in globals.css | VERIFIED | All 10 categories present (see token completeness table below) |
| 6 | KPI card renders on surface-raised, clearly distinguishable from page background | VERIFIED | `kpi-card.tsx:48` `bg-surface-raised` in `cardClasses` |
| 7 | KPI card uses spacing tokens — no hardcoded p-4 / gap-* with arbitrary values | VERIFIED | `kpi-card.tsx:48` uses `p-card-padding`; grep for `p-4\|rounded-xl\|bg-transparent` returns zero hits |
| 8 | KPI value renders in text-display-numeric (tabular-nums + lining-nums) | VERIFIED | `kpi-card.tsx:131` `text-display-numeric`; `kpi-card.tsx:59` no-data state also uses it; utility defined `globals.css:501-508` |
| 9 | KPI label uses text-label (12px uppercase tracked) style | VERIFIED | `kpi-card.tsx:133` `text-label uppercase text-muted-foreground` |
| 10 | KPI card has shadow-xs or shadow-sm + radius-lg | VERIFIED | `kpi-card.tsx:48` `shadow-sm rounded-lg` |
| 11 | In dark mode, KPI card LIGHTER than page background | VERIFIED | Token math confirmed (0.22 > 0.16). User visually confirmed during dark-mode review |
| 12 | Header sits on surface-raised with shadow-xs | VERIFIED | `header.tsx:32` `bg-surface-raised shadow-xs` |
| 13 | Header uses spacing tokens for padding/gap — no hardcoded px/py values | VERIFIED | `header.tsx:32` `px-page-gutter gap-inline`; `header.tsx:36` `gap-stack`; grep for `bg-background\|backdrop-blur\|border-border/50` returns zero hits |
| 14 | Header renders correctly in both modes with correct warm tones | VERIFIED (user approved) | Token wiring confirmed; user approved warm-tone rendering during visual review |
| 15 | Title and any label in the header use the type scale | VERIFIED | `header.tsx:39` freshness label `text-caption`; freshness dot `bg-warning-fg`/`bg-success-fg` (commit eec44ca); stale text `text-warning-fg` (commit eec44ca). No hardcoded palette classes remain in header |
| 16 | Table area renders on surface-inset background | VERIFIED | `data-table.tsx:347` `className="relative z-0 flex-1 overflow-auto bg-surface-inset"` |
| 17 | Table row height driven by --table-row-height-dense (32px default) | VERIFIED | `table-body.tsx:22` `estimateSize: () => 32`; `table-body.tsx:49` `h-[var(--row-height)]`; `globals.css:466-470` `[data-density="dense"]` sets `--row-height: var(--table-row-height-dense)` |
| 18 | Sparse variant tokens defined; data-density="sparse" updates CSS row height | VERIFIED | `globals.css:471-476` `[data-density="sparse"]` block assigns `--row-height: var(--table-row-height-sparse)` (40px) |
| 19 | Table cells use text-body for text columns and text-body-numeric for numeric | VERIFIED | `table-body.tsx:65` `${isNumeric ? 'text-body-numeric text-right' : 'text-body'}` with `isNumericType(meta.type)` detection |
| 20 | Row padding uses spacing tokens (no hardcoded px-3 py-2) | VERIFIED | `table-body.tsx:65` `px-[var(--row-padding-x)] py-[var(--row-padding-y)]`; grep for `px-3\|py-2\|text-sm\|bg-muted/50` returns zero hits |
| 21 | Table row hover transition uses --duration-quick and --ease-default | VERIFIED | `table-body.tsx:49` `transition-colors duration-quick ease-default` |
| 22 | /tokens route accessible with no auth; robots: index: false; no nav link | VERIFIED | `tokens/page.tsx:15` `robots: { index: false, follow: false }`; no link in `app-sidebar.tsx` |
| 23 | Every token category appears on /tokens page: Spacing, Typography, Surfaces, Shadows, Motion, Radius, Colors | VERIFIED | `token-browser.tsx` wires all 5 tabs with non-stub components; each tab confirmed substantive (spacing-ruler, type-specimen, shadow-sample, motion-demo, color-swatch covering all subcategories) |
| 24 | Each token: live example + token name + CSS var + Tailwind class + copy-to-clipboard | VERIFIED | `token-card.tsx` provides all five; `navigator.clipboard.writeText` at line 42; sonner toast at line 43. User confirmed copy-to-clipboard works in browser |
| 25 | Tabs separate into exactly 5: Spacing / Typography / Surfaces & Shadows / Motion / Colors | VERIFIED | `token-browser.tsx:38-65` five `Tabs.Tab` elements with these exact values |
| 26 | Light and dark mode both render correctly on /tokens | VERIFIED (user approved) | User confirmed all 5 tabs in both light and dark mode during visual review |
| 27 | No Geist/font-geist references remain in src/ | VERIFIED | `grep -rn "Geist\|font-geist" src/` returns no results |
| 28 | Brand tokens: accent-warm renamed to brand-green + brand-green-bright; brand-purple added | VERIFIED | `globals.css:236-238` (light): `--brand-green`, `--brand-green-bright`, `--brand-purple` in both `:root` and `.dark`; no `--accent-warm` anywhere in `src/`; user approved Bounce green + purple palette visually (commit d2f0a16) |
| 29 | State-success / chart-categorical-2 / chart-diverging-pos hues shifted off brand-green hue to avoid visual collision | VERIFIED | `globals.css`: success hue 160 (emerald), brand-green hue 150 (forest); categorical-2 at hue 175, diverging-pos at hue 165 — all distinct from brand-green's 150 |
| 30 | /tokens page itself dogfoods tokens — no hardcoded classes in page chrome | VERIFIED | `token-browser.tsx`, `token-card.tsx` use only token utilities; demo-slot children intentionally use the token being demoed (documented with comments). User confirmed during /tokens visual review |

**Score:** 30/30 truths verified

---

## Required Artifacts

| Artifact | Status | Evidence |
|---|---|---|
| `src/app/globals.css` | VERIFIED | 540 lines; all 10 token categories; `@theme`, `@theme inline`, `:root`, `.dark`, `@layer base` density, `@layer utilities` numeric variants |
| `src/app/layout.tsx` | VERIFIED | `Inter` + `JetBrains_Mono` from `next/font/google` with correct `--font-inter`/`--font-jetbrains-mono` variables, wired to `<html>` className |
| `src/components/kpi/kpi-card.tsx` | VERIFIED | 137 lines; substantive; uses `bg-surface-raised`, `p-card-padding`, `shadow-sm`, `rounded-lg`, `text-display-numeric`, `text-label`, `text-label-numeric`, `text-caption` |
| `src/components/layout/header.tsx` | VERIFIED | 66 lines; uses `bg-surface-raised`, `shadow-xs`, `px-page-gutter`, `gap-inline`, `gap-stack`, `text-caption`, `bg-warning-fg`, `bg-success-fg`, `text-warning-fg`; zero hardcoded palette classes |
| `src/components/table/table-body.tsx` | VERIFIED | 81 lines; uses `h-[var(--row-height)]`, `px-[var(--row-padding-x)]`, `py-[var(--row-padding-y)]`, `text-body-numeric`/`text-body`, `transition-colors duration-quick ease-default`, `estimateSize: () => 32` |
| `src/components/table/data-table.tsx` | VERIFIED | Scroll container at line 346 carries `data-density="dense"` and `bg-surface-inset` |
| `src/app/tokens/page.tsx` | VERIFIED | Server component with `robots: { index: false, follow: false }`, renders `<TokenBrowser />` |
| `src/components/tokens/token-browser.tsx` | VERIFIED | Client component (`'use client'`); substantive 5-tab implementation using `@base-ui/react/tabs` |
| `src/components/tokens/token-card.tsx` | VERIFIED | Full implementation with `navigator.clipboard.writeText`, sonner toast, Copy/Check icon swap |
| `src/components/tokens/spacing-ruler.tsx` | VERIFIED | 12 numeric + 5 semantic tokens with live amber bar examples |
| `src/components/tokens/type-specimen.tsx` | VERIFIED | 6 type tiers + 3 numeric variants with live text samples |
| `src/components/tokens/shadow-sample.tsx` | VERIFIED | 4 shadow levels + 3 radius samples |
| `src/components/tokens/motion-demo.tsx` | VERIFIED | 9-combo grid (3 durations × 3 easings) with interactive translate-x demos; "Run all" button |
| `src/components/tokens/color-swatch.tsx` | VERIFIED | Covers 5 categories: surfaces, accent-state (brand-green + brand-green-bright + brand-purple + state badges), neutrals (11-step), chart (categorical-8 + diverging-3), interaction (focus-ring, hover-bg, selection-bg) |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|---|---|---|---|---|
| `globals.css @theme inline` | CSS custom properties in `:root`/`.dark` | `--color-surface-raised: var(--surface-raised)` pattern | WIRED | `globals.css:111-115` 5 surface color aliases; all resolve to `:root`/`.dark` raw vars |
| `shadcn utilities` | new surface/neutral tokens | `--background: var(--surface-base)` re-map | WIRED | `globals.css:279,403`: both `:root` and `.dark` have `--background: var(--surface-base)`; full shadcn re-map present in both blocks |
| `layout.tsx font variable classes` | `@theme inline --font-sans/--font-mono` | `variable: '--font-inter'` option | WIRED | `layout.tsx:11-19` → `globals.css:170-171` `--font-sans: var(--font-inter)` |
| `kpi-card.tsx className` | token utilities | `bg-surface-raised`, `p-card-padding`, `text-display-numeric`, `text-label` | WIRED | `kpi-card.tsx:48`: all four token classes in `cardClasses` constant |
| `header.tsx className` | token utilities | `bg-surface-raised`, `shadow-xs`, `px-page-gutter`, `bg-warning-fg`, `bg-success-fg`, `text-warning-fg` | WIRED | `header.tsx:32,50-54`: layout and state token classes all present; no hardcoded palette classes |
| `table-body.tsx` | `--row-height`/`--row-padding-y` density vars | `h-[var(--row-height)]`, `py-[var(--row-padding-y)]` | WIRED | `table-body.tsx:49,65`; density vars assigned by `[data-density="dense"]` on `data-table.tsx:346` |
| `[data-density="dense"/"sparse"]` | `--table-row-height-dense/sparse` tokens | `--row-height: var(--table-row-height-dense)` assignment | WIRED | `globals.css:466-476` density selector blocks; density attribute on `data-table.tsx:346` |
| `tokens/page.tsx` | `token-browser.tsx` | `<TokenBrowser />` default export | WIRED | `tokens/page.tsx:2,19` |
| `token-card.tsx copy button` | `navigator.clipboard.writeText` | `onClick` handler | WIRED | `token-card.tsx:42`; confirmed working by user |

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|---|---|---|---|---|
| DS-01 | 26-01, 26-02, 26-03, 26-04, 26-05 | Spacing scale on 4px grid (space-1..12 + semantic aliases) | SATISFIED | `globals.css:35-46` numeric scale; `globals.css:103-108` semantic aliases; KPI card `p-card-padding`; header `px-page-gutter`; table `py-[var(--row-padding-y)]`; /tokens SpacingRuler shows all |
| DS-02 | 26-01, 26-02, 26-04, 26-05 | Typography scale with named levels (display/heading/title/label/body/caption) | SATISFIED | `globals.css:48-70` 6-tier type ramp with per-token sub-props; `globals.css:488-508` numeric variants; KPI card `text-display-numeric`+`text-label`; table `text-body-numeric`/`text-body`; /tokens TypeSpecimen shows all |
| DS-03 | 26-01, 26-02, 26-03, 26-05 | Elevation system: multi-layer shadows (xs-lg) with light/dark variants | SATISFIED | `globals.css:73-82` light multi-layer shadows (warm-tinted); `globals.css:391-400` dark overrides (darker/more opaque); KPI card `shadow-sm`; header `shadow-xs`; /tokens ShadowSample shows xs/sm/md/lg |
| DS-04 | 26-01, 26-04, 26-05 | Motion tokens: duration (quick/normal/slow) and easing (default/spring/decelerate) | SATISFIED | `globals.css:85-90` all 6 motion tokens; table-body `transition-colors duration-quick ease-default` on rows; /tokens MotionDemo all 9 combos interactive; user confirmed motion demos animate in browser |
| DS-05 | 26-01, 26-02, 26-03, 26-04, 26-05 | Surface system: 5 named levels with shadcn re-map; dark mode raised > base | SATISFIED | `globals.css:225-229` (light), `globals.css:341-346` (dark) — raised(0.22) > base(0.16) confirmed; KPI card `bg-surface-raised`; header `bg-surface-raised`; table `bg-surface-inset`; /tokens surfaces tab; user confirmed visual inversion in dark mode |
| DS-06 | 26-01, 26-02, 26-03, 26-04, 26-05 | All tokens function in both light and dark mode | SATISFIED | Both `:root` and `.dark` blocks define all tokens; all pilots have token-driven classes; user confirmed both modes working visually |

All 6 phase-26 requirements (DS-01 through DS-06) are satisfied by code evidence and user visual approval.

---

## Anti-Patterns Found

No anti-patterns remain. The previously flagged `bg-amber-500`, `bg-emerald-500`, `text-amber-600 dark:text-amber-400` hardcoded palette classes in `header.tsx` were removed in commit eec44ca and replaced with `bg-warning-fg`, `bg-success-fg`, `text-warning-fg`.

---

## Human Verification Required

None. All items cleared:

- **Items 1, 2, 3** (dark-mode inversion, /tokens page, copy-to-clipboard) — user visually approved all.
- **Item 4** (header token migration decision) — resolved; migration done in commit eec44ca.

---

## Token System Completeness Spot-Check

| Category | Tokens | Location | Status |
|---|---|---|---|
| Spacing | `--spacing-1..12` + 5 semantic aliases | `@theme` lines 35-46; `@theme inline` 103-108 | PRESENT |
| Typography | `--text-display/heading/title/body/label/caption` + sub-props | `@theme` lines 49-70 | PRESENT |
| Shadow | `--shadow-xs/sm/md/lg` (light + dark variants) | `@theme` lines 73-82; `.dark` lines 391-400 | PRESENT |
| Motion | `--duration-quick/normal/slow` + `--ease-default/spring/decelerate` | `@theme` lines 85-90 | PRESENT |
| Radius | `--radius-sm/md/lg` | `@theme` lines 93-95 | PRESENT |
| Surface | `--surface-base/raised/inset/overlay/floating` | `:root` lines 225-229; `.dark` lines 341-346 | PRESENT |
| Neutral scale | `--neutral-50..950` (11 steps) | `:root` lines 212-222; `.dark` 329-339 | PRESENT |
| State color | success/warning/error/info × bg/border/fg | `:root` lines 241-257; `.dark` 355-370 | PRESENT |
| Interaction | `--focus-ring`, `--selection-bg`, `--hover-bg` | `:root` lines 259-262; `.dark` 372-374 | PRESENT |
| Chart palette | 8 categorical + 3 diverging | `:root` lines 265-276; `.dark` 377-388 | PRESENT |

All 10 categories confirmed present with both light and dark variants.

---

_Verified: 2026-04-17 (re-verification)_
_Verifier: Claude (gsd-verifier)_
