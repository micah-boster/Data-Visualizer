---
phase: 28-surfaces-and-elevation
plan: 05
status: complete
completed_at: 2026-04-17
commits:
  - 519b1dc feat(28-05): wrap charts + query + anomaly panel in raised shell
requirements_landed: [DS-14]
---

## What shipped

Six card-tier surfaces (charts, query cards, anomaly panel) unified on the Phase 28 semantic raised recipe.

### Chart shells

| Component | How shell landed | Notes |
|---|---|---|
| `collection-curve-chart.tsx` | Both returns (empty state + main chart) wrapped in outer `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` | Existing `w-full space-y-2` layout div preserved inside the shell |
| `trajectory-chart.tsx` | `shadow-elevation-raised` added to existing `<Card>` className prop | Card primitive itself migrates in 28-06; this avoids double-wrap |
| `comparison-matrix.tsx` | `shadow-elevation-raised` added to existing `<Card>` className prop | Same rationale as trajectory |
| `root-sparkline.tsx` | **Unwrapped** (pilot deviation) | Component renders `<ChartSparkline>` directly for inline sidebar use; a full raised shell would over-frame against sidebar-row context |
| `partner-sparkline.tsx` | **Unwrapped** (pilot deviation) | Same rationale as root-sparkline |

### Query cards (query-response.tsx)

All three card-tier variants migrated:
- Default response: `mt-2 rounded-lg border bg-card p-4` → `mt-2 rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding`
- Error variant: `mt-2 rounded-lg border border-destructive/20 bg-card p-4` → `mt-2 rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding border border-destructive/20` (destructive border retained as semantic error cue)
- Pre/code block: `mt-2 max-h-[200px] overflow-y-auto rounded-lg border bg-card p-4` → `mt-2 max-h-[200px] overflow-y-auto rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding`

### Query search bar (query-search-bar.tsx)

`rounded-lg border bg-card p-3 shadow-sm` → `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding`. Note: padding bumped from `p-3` (12px) to `p-card-padding` (16px via `--spacing-card-padding` = `--spacing-4`). If pilot visual check finds the search bar now reads too generously padded for its 40px-height aesthetic, swap to `p-3` and flag as Deviation.

### Anomaly summary panel (anomaly-summary-panel.tsx)

**Option A landed** — `--color-warning-bg` / `--color-warning-border` tokens were verified present in globals.css (pre-existing from Phase 26 state-color system). Migration:

`shrink-0 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30` → `shrink-0 rounded-lg border border-warning-border bg-warning-bg shadow-elevation-raised`

Both-mode coverage inherited from `--state-warning-bg/border` per-mode definitions (light oklch(0.96 0.06 85) / dark oklch(0.26 0.05 80)) — no `dark:` prefixes needed since the tokens self-invert.

## Deviations from 28-05-PLAN

1. **Sparklines NOT wrapped.** Both root and partner sparklines are thin components (~40 lines) that return `<ChartSparkline>` directly for inline sidebar-row use in the collapsed state. Wrapping them in a full raised shell would create a nested card-in-row visual inside the sidebar rail. Documented in plan Interfaces as a pilot-drive decision; chose "leave unwrapped."
2. **Anomaly panel inner amber classes retained.** Plan scope explicitly limited this sweep to the OUTER container. Inner `text-amber-800 dark:text-amber-200` on the collapsed-bar button and `hover:bg-amber-100 dark:hover:bg-amber-900/30` on list items remain as hand-rolled amber. These WILL continue to render against the new `warning-bg` surface correctly because `warning-bg` is close to `amber-50` in light mode and close to `amber-950/30` in dark mode. Future "state-color inner sweep" phase to migrate `text-amber-800` → `text-warning-fg` and the hover bgs to `warning-bg/80`-style tints.
3. **Padding token change on search bar** noted above (p-3 → p-card-padding). Needs manual visual check; if off, 28-08 gap-closure or a one-line revert here.

## Pitfall 1 (shadow clipping) observations

- collection-curve-chart's parent is `data-display.tsx:497` which 28-RESEARCH flagged as `<div className="shrink-0 px-2 pt-2 space-y-2">` — no overflow-hidden detected; shell shadow should render cleanly.
- trajectory-chart + comparison-matrix render inside the chart section of data-display.tsx; same parent chain.
- query-response's pre/code block has `overflow-y-auto` on the same element as shadow — this clips the shadow at the code block's bounds, which is the correct visual (a raised scrollable code window). Not a bug.
- anomaly-summary-panel has `overflow-hidden` on its inner expandable-list wrapper (not the root), which doesn't affect the root shell's shadow.

## Verification

- grep counts: collection-curve (2), trajectory (1), matrix (1), query-response (3), query-search-bar (1), anomaly (1) — all meet ≥1 threshold
- `bg-card` eliminated from both query files (0 occurrences each)
- `npm run build` passes

## Handoff

- 28-06 (overlay primitives) will migrate shadcn `Card` to include `shadow-elevation-raised` by default. Once landed, the explicit `shadow-elevation-raised` on `<Card>` in trajectory-chart + comparison-matrix becomes redundant — 28-06 can simplify those call sites or leave as-is (double-raised is idempotent with Tailwind).
- 28-07 will promote `<main>` to `bg-surface-raised`. Charts-on-raised-content surface may read flatter than charts-on-base; flag in 28-07 pilot testing if so.
- 28-08 grep guard should whitelist `src/components/tokens/**` (intentional demo uses) but otherwise catch any remaining `bg-card` / `rounded-lg border bg-card` ad-hocs across the codebase.
