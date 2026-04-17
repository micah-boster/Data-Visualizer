---
phase: 26-design-tokens
plan: 02
subsystem: ui
tags: [tailwind-v4, design-tokens, kpi-card, tabular-nums, surface-raised, semantic-colors]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: Token foundation — @theme primitives + @theme inline aliases, shadcn re-map, Inter + JetBrains Mono, surface/type/shadow/radius scales (from 26-01)
provides:
  - Pilot proof that the Phase 26 token pipeline works end-to-end in a real, visible component (the 6-card KPI grid at the top of every partner drill-down)
  - Three new utility classes (.text-body-numeric, .text-label-numeric, .text-display-numeric) in @layer utilities that bake in font-variant-numeric: tabular-nums lining-nums — reusable across any numeric surface (tables, charts, tooltips)
  - Worked example of the surface-raised > surface-base dark-mode inversion rendering correctly on a real component
  - Worked example of migrating Tailwind palette colors (emerald/red) to semantic state tokens (text-success-fg / text-error-fg) for automatic light/dark adaptation
affects: [26-03 header pilot, 26-04 table row pilot, 27-typography, 28-surfaces, 29-component-patterns, 30-motion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Numeric utility classes in @layer utilities — bake font-variant-numeric alongside size/line-height/family so components get tabular-nums automatically without manually adding the utility everywhere"
    - "Component migration pattern: replace hardcoded Tailwind palette (emerald-*, red-*) with semantic state tokens (text-success-fg, text-error-fg) that resolve per theme"
    - "Component migration pattern: replace arbitrary spacing (p-4) with semantic alias tokens (p-card-padding) so container padding tracks the spacing scale"

key-files:
  created: []
  modified:
    - src/app/globals.css — appended @layer utilities block with .text-body-numeric / .text-label-numeric / .text-display-numeric (additive; non-overlapping with existing blocks)
    - src/components/kpi/kpi-card.tsx — full migration to Phase 26 tokens: bg-surface-raised, p-card-padding, rounded-lg, shadow-sm, text-display-numeric, text-label, text-label-numeric, text-caption, semantic state colors

key-decisions:
  - "Added text-display-numeric (sans family) alongside text-body-numeric / text-label-numeric (mono family) — KPI values need large display-tier type but still benefit from tabular-nums + lining-nums for vertical digit alignment across stacked cards. The display variant intentionally keeps the Inter sans family for visual hierarchy."
  - "Migrated trend delta colors from Tailwind emerald/red palette to semantic text-success-fg / text-error-fg tokens — aligns with state-color token system shipped in 26-01, and gives automatic light/dark mode adaptation without duplicate class lists."
  - "Preview screenshots not captured — Snowflake auth timeouts blocked headless browser verification (same constraint as 26-01). User verified light + dark visually in own browser and explicitly approved the checkpoint. Matches standing preference to verify CSS visually before pushing."
  - "Post-plan brand palette swap in commit d2f0a16 (accent-warm replaced with --brand-green / --brand-green-bright / --brand-purple) is transparent to this plan — kpi-card.tsx consumes only semantic tokens (surface-raised, shadow-sm, text-success-fg, text-error-fg) and never references the raw accent var."

patterns-established:
  - "Pattern: numeric utility variants in @layer utilities — any text tier that needs tabular-nums gets a -numeric sibling (body-numeric, label-numeric, display-numeric). Reusable for future tiers (heading-numeric, title-numeric) if charts/tables need them."
  - "Pattern: component migration checklist — (1) replace container surface with named surface token, (2) replace arbitrary spacing with semantic alias, (3) replace hardcoded radius/shadow with token, (4) replace text sizing with type-scale tokens, (5) replace palette colors with semantic state tokens."

requirements-completed: [DS-01, DS-02, DS-03, DS-05, DS-06]

# Metrics
duration: ~20min
completed: 2026-04-17
---

# Phase 26 Plan 02: KPI Card Pilot Summary

**KPI card migrated to Phase 26 tokens — surface-raised + p-card-padding + rounded-lg + shadow-sm + text-display-numeric (value) + text-label (label) + text-label-numeric with semantic state colors (trend delta) — proving the token pipeline end-to-end in the 6-card grid above every performance table.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-04-17
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Added three numeric utility classes to globals.css `@layer utilities` — `.text-body-numeric`, `.text-label-numeric` (both mono family with tabular-nums + lining-nums), and `.text-display-numeric` (sans family with tabular-nums + lining-nums). Reusable across any numeric surface in the app.
- Migrated `src/components/kpi/kpi-card.tsx` in full: container now uses `bg-surface-raised` + `p-card-padding` + `rounded-lg` + `shadow-sm` + `border border-border` + `transition-colors duration-quick ease-default`; KPI value uses `text-display-numeric`; label uses `text-label uppercase` + `text-muted-foreground`; trend delta uses `text-label-numeric font-medium` with semantic `text-success-fg` / `text-error-fg` (no more emerald/red palette).
- Pilot proves the Phase 26 token pipeline works end-to-end in a real, high-visibility component — dark-mode surface-raised renders lighter than body background as intended (inversion from shadcn default), digits align vertically across stacked KPI cards, shadow visible but quiet.
- User visually verified the checkpoint in light and dark mode in their own browser and approved.

## Task Commits

1. **Task 1: Add numeric utility classes + migrate KPI card to Phase 26 tokens** — `9ce842c` (feat)
2. **Task 2: Human verify — surface/type/shadow correct in light + dark** — APPROVED (checkpoint, no commit)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `src/app/globals.css` — additive `@layer utilities` block (+32 lines) with `.text-body-numeric`, `.text-label-numeric`, `.text-display-numeric`. Non-overlapping with Plan 26-04's future `@layer base [data-density=...]` additions.
- `src/components/kpi/kpi-card.tsx` — full token migration (+34 / -11). Container shell, KPI value, label, trend delta, and insufficient-data em-dash all now consume Phase 26 tokens exclusively.

## Decisions Made

- **Added `text-display-numeric` (sans) alongside `text-body-numeric` / `text-label-numeric` (mono):** KPI values are display-tier (large, primary focal point) but still need tabular-nums + lining-nums so digits align across stacked cards. The sans family (Inter) is preserved for visual hierarchy; only the numeric font-variant features are baked in. This justifies adding a third numeric utility rather than just two.
- **Migrated trend delta colors from Tailwind palette to semantic state tokens:** Original code used `text-emerald-600 dark:text-emerald-400` / `text-red-600 dark:text-red-400`. Replaced with `text-success-fg` / `text-error-fg` which 26-01 defined as theme-aware semantic tokens. This removes duplicate class lists and aligns with the state-color system.
- **No structural changes to kpi-card.tsx:** Plan constrained changes to classNames + minor className groupings. Props, JSX tree, and component API unchanged. Zero downstream consumer impact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Migrated trend delta colors to semantic state tokens**
- **Found during:** Task 1 (kpi-card.tsx migration)
- **Issue:** Plan specified migrating the delta's *font* to `text-label-numeric` but the existing color classes used raw Tailwind palette (`text-emerald-600 dark:text-emerald-400` / `text-red-600 dark:text-red-400`). Leaving them would have been inconsistent with 26-01's state-color token system and would have required a second migration pass later.
- **Fix:** Replaced palette classes with semantic tokens `text-success-fg` / `text-error-fg` (theme-aware by design, defined in 26-01).
- **Files modified:** `src/components/kpi/kpi-card.tsx`
- **Verification:** Build passed; user visually confirmed trend delta colors render correctly in both light and dark mode in own browser.
- **Committed in:** `9ce842c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Strengthens the pilot — kpi-card now proves semantic state colors work in addition to the surface/spacing/shadow/type tokens the plan scoped. No scope creep; this is consistent with the plan's overall goal of proving the token system end-to-end.

## Issues Encountered

- **Preview screenshots not captured** — Snowflake auth timeouts blocked the headless browser from rendering the app for `preview_screenshot` / `preview_inspect` verification. Same constraint as 26-01. User verified visually in own browser and explicitly approved the checkpoint. No code impact; documented as a recurring environment limitation for Phase 26 Wave 2 pilots.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 26-03** (Header pilot — surface-raised + shadow-xs + type tokens). Numeric utility classes now available for any component needing tabular-nums. Component migration checklist pattern is established.
- **Ready for 26-04** (Table row pilot — surface-inset + density tokens). Non-overlapping with this plan's globals.css additions.
- **Note:** Post-plan brand palette swap (accent-warm → brand-green family, commit `d2f0a16`) did not affect this plan's output because kpi-card.tsx consumes semantic tokens only, not the raw accent var. Future pilots should verify the same — consume semantic tokens, never raw brand/accent vars.

## Self-Check: PASSED

- `src/components/kpi/kpi-card.tsx` exists and contains Phase 26 token utilities (verified via git show 9ce842c).
- `src/app/globals.css` contains the `@layer utilities` block with three numeric utility classes (verified via git show 9ce842c).
- Task 1 commit `9ce842c` present in `git log`.
- Task 2 checkpoint approved by user with explicit "approved" response in both light and dark mode.

---
*Phase: 26-design-tokens*
*Completed: 2026-04-17*
