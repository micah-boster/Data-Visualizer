---
phase: 29-component-patterns
plan: 01
subsystem: component-patterns
tags: [stat-card, pattern, migration, ds-18, kpi-card-retired]
requires:
  - phase-26-design-tokens (surface/elevation/type tokens)
  - phase-27-typography (type-scale + overline recipe)
  - phase-28-surfaces (shadow-elevation-raised, bg-surface-raised, p-card-padding)
  - src/lib/computation/metric-polarity.ts (getPolarity)
  - src/components/ui/skeleton.tsx
  - src/components/ui/tooltip.tsx
provides:
  - "StatCard component (seven first-class states) at src/components/patterns/stat-card.tsx"
  - "StatCardTrend, StatCardProps type exports for downstream consumers"
  - "StatCardSpecimen /tokens demo (consumed by Plan 05 aggregator)"
  - "Canonical chassis + polarity recipe + em-dash recipe preserved 1:1 from KpiCard"
affects:
  - src/components/kpi/kpi-summary-cards.tsx (migrated — 4 usages + skeleton grid)
  - src/components/kpi/kpi-card.tsx (DELETED — 141 LOC)
tech-stack:
  added: []
  patterns:
    - "Composed pattern: single default-export function component + helper sub-components (LabelRow, TrendLine, InsufficientTrendLine)"
    - "Branch-resolution order (first-match wins): loading → error → noData → comparison → default"
    - "Prop-surface-only states: stale and comparison ship without live data plumbing (documented inline via JSDoc)"
key-files:
  created:
    - src/components/patterns/stat-card.tsx
    - src/components/tokens/patterns-specimen-stat-card.tsx
  modified:
    - src/components/kpi/kpi-summary-cards.tsx
  deleted:
    - src/components/kpi/kpi-card.tsx
decisions:
  - "Trend arrow uses `.text-label-numeric` alone (no paired font-medium) — keeps check:tokens green while preserving mono + tabular-nums for digit alignment"
  - "Stale/Cached badge uses `.text-caption text-muted-foreground` inline-flex with h-3 w-3 Database icon — subtle overline-adjacent treatment, not a standalone pill"
  - "Comparison mode renders two-column grid-cols-2 divide-x divide-border with shared label overline above; comparison value carries its own caption label underneath (e.g. 'Portfolio avg')"
  - "Em-dash unicode escapes (`'\\u2014'`, `'\\u2191'`, `'\\u2193'`) preserved verbatim — matches KpiCard convention, avoids codepoint linter flags"
  - "Trend explanatory phrase 'vs rolling avg of prior batches' promoted from tooltip-only to visible second-line chrome per CONTEXT layout lock"
  - "Helper components (LabelRow, TrendLine) kept file-local rather than exported — shared recipe inside the pattern, not a public surface"
metrics:
  duration: "~15 min"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  files_deleted: 1
  completed_date: "2026-04-18"
---

# Phase 29 Plan 01: StatCard Summary

**One-liner:** StatCard canonical pattern shipped with all 7 first-class states (value / loading / error / no-data / insufficient-data / stale / comparison), KpiCard call sites migrated, legacy file deleted.

## What Shipped

**New component** — `src/components/patterns/stat-card.tsx` (300 LOC):

- `StatCardTrend` interface: `{ direction: 'up' | 'down' | 'flat'; deltaPercent: number; metric: string }`
- `StatCardProps` interface covering 12 props: `label`, `value`, `trend`, `icon`, `loading`, `error`, `noData`, `noDataReason`, `insufficientData`, `batchCount`, `stale`, `comparison`, `className`
- `StatCard` default function component with branch-resolution order `loading → error → noData → comparison → default`
- Helper sub-components kept file-local: `LabelRow`, `TrendLine`, `InsufficientTrendLine`
- Canonical chassis constant: `rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default` (Phase 28 recipe preserved verbatim)
- Polarity-aware trend colors via `getPolarity()` — `text-success-fg` / `text-error-fg` / `text-muted-foreground`
- Trend on its own line below the value: `↑ +2.1% vs rolling avg of prior batches` — explanatory phrase promoted from KpiCard's tooltip-only treatment

**New /tokens specimen** — `src/components/tokens/patterns-specimen-stat-card.tsx` (90 LOC):

- Exports `StatCardSpecimen` for consumption by Plan 05's Component Patterns tab aggregator
- Section wrapped in `<TooltipProvider>` so no-data + insufficient-data tooltips render cleanly at `/tokens` (Pitfall 7 avoidance)
- Renders 7 live StatCard instances — one per state — with fully-formatted props; no provider-dependent data
- Not yet wired into `token-browser.tsx` (Plan 05 owns the tab wiring)

## What Was Migrated

`src/components/kpi/kpi-summary-cards.tsx`:

- Line 3: `import { KpiCard } from '@/components/kpi/kpi-card';` → `import { StatCard } from '@/components/patterns/stat-card';`
- Dropped now-unused `Skeleton` import (replaced by `<StatCard loading />`)
- Loading skeleton grid (lines 56-65): ad-hoc `<Skeleton>` blocks → `Array.from({ length: 6 }).map(...).<StatCard loading />`
- All 4 call sites swapped 1:1 (plain, noData, insufficientData, trend); props unchanged
- Zero-batch partner branch kept as-is (inline message, not a StatCard — this is a single centered line, not a card)

## What Was Deleted

- `src/components/kpi/kpi-card.tsx` (141 LOC) — removed entirely; no alias, no re-export, per CONTEXT scope guardrail "zero parallel support"

## Interface Exports

```ts
// From src/components/patterns/stat-card.tsx
export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  metric: string;
}

export interface StatCardProps {
  label: string;
  value: string;
  trend?: StatCardTrend | null;
  icon?: React.ReactNode;
  loading?: boolean;
  error?: { message?: string } | boolean;
  noData?: boolean;
  noDataReason?: string;
  insufficientData?: boolean;
  batchCount?: number;
  stale?: boolean;
  comparison?: { label: string; value: string; trend?: StatCardTrend };
  className?: string;
}

export function StatCard(props: StatCardProps): JSX.Element;
```

```ts
// From src/components/tokens/patterns-specimen-stat-card.tsx
export function StatCardSpecimen(): JSX.Element;
```

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 (clean) |
| `npm run build` | exit 0 (all 7 routes compile; /tokens generates statically) |
| `npm run check:tokens` | PASS — "Type tokens enforced — no ad-hoc classes outside allowlist" |
| `npm run check:surfaces` | PASS — "Surface tokens enforced — no ad-hoc shadow or card-frame combos outside allowlist" |
| Legacy import grep (`@/components/kpi/kpi-card`) | 0 hits |
| `test ! -f src/components/kpi/kpi-card.tsx` | true (file deleted) |
| KpiCard → StatCard 1:1 behavioral parity | preserved (em-dash recipe, polarity, tooltip copy all verbatim) |

## Deviations from Plan

None — plan executed exactly as written. No Rule 1-3 auto-fixes triggered; no architectural decisions (Rule 4) required.

**Minor judgment calls made within Claude's Discretion:**

- Helper sub-components (`LabelRow`, `TrendLine`, `InsufficientTrendLine`) kept file-local rather than exported — the recipe is shared across branches inside the pattern, not a public surface for downstream callers.
- Error branch uses a two-row layout (label row + message line below) rather than a single inline row — reads cleaner at card width and mirrors the default branch's label-above-value rhythm.
- Icon slot rendered inside a fixed-size `h-4 w-4` wrapper so arbitrary ReactNode callers don't shift the label baseline; documented inline.
- Comparison mode's comparison-side caption renders below the value (not above) to avoid a double-overline look when both columns share the top label.

## Authentication Gates

None — this plan is pure UI composition; no network, no auth surface.

## Follow-on / Pending

- **Stale live signal** (Pitfall 1 deferred): Extend `DataResponse.meta` with `source: 'cache' | 'snowflake'`, thread through `data-freshness` context, expose via `useDataSource()` hook, then wire `stale={isStale}` in `kpi-summary-cards.tsx`. Belongs to a future data-plumbing phase.
- **Comparison consumer** (Pitfall 2 deferred): Cross-partner drill-in surface that wires partner vs benchmark norms (`PartnerNormsProvider`) into StatCard's `comparison` prop. Belongs to a cross-partner feature phase.
- **Plan 05 tab wire-up**: `StatCardSpecimen` awaits consumption by Plan 05's Component Patterns aggregator (`component-patterns-specimen.tsx` + 6th tab in `token-browser.tsx`).

## Commits

| Task | Commit | Scope |
|------|--------|-------|
| 1 | `64f65ad` | feat(29-01): add StatCard pattern with 7 first-class states |
| 2 | `4615ab1` | refactor(29-01): migrate kpi-summary-cards to StatCard, delete legacy KpiCard |
| 3 | `409abf1` | feat(29-01): add StatCard /tokens specimen for Plan 05 aggregator |

## Self-Check: PASSED

- StatCard component present at expected path
- /tokens specimen present at expected path
- Legacy KpiCard file absent
- kpi-summary-cards.tsx still present, references StatCard only
- All 3 commit hashes resolvable via `git log`
- `npm run build`, `check:tokens`, `check:surfaces` all green
