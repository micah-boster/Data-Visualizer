---
phase: 29-component-patterns
plan: 03
subsystem: ui

tags: [empty-state, pattern, lucide, react, components, design-system]

requires:
  - phase: 26-design-tokens
    provides: text-heading / text-body tokens, surface/radius tokens, text-error-fg
  - phase: 27-typography
    provides: named type tokens + check:tokens guard
  - phase: 28-surfaces
    provides: surface/elevation token consumption discipline

provides:
  - EmptyState pattern at src/components/patterns/empty-state.tsx with 4 first-class variants (no-data, no-results, error, permissions)
  - Variant config table — canonical Lucide icon, default copy, and default CTA per variant
  - Action override semantics — undefined (default CTA), null (suppress), ReactNode (full override)
  - /tokens specimen demonstrating all 4 variants + CTA override + suppression cases
  - Exhaustive migration of legacy EmptyState (1 importer) + FilterEmptyState (1 importer)
  - Zero-parallel-support deletion of both legacy files

affects: [29-04, 29-05, 30-micro-interactions, 31-polish, 33-accessibility, future feature phases needing zero-states]

tech-stack:
  added: []
  patterns:
    - "Trigger-condition classification (Pitfall 3): empty-state variant chosen by the CODE CONDITION that fires, not by legacy copy. Codified by data-display.tsx:440 (dataset empty → no-data) vs data-table.tsx:342 (filters produced zero rows → no-results)."
    - "Action-prop three-state override: undefined = default CTA, null = suppress, ReactNode = caller-owned override. Reusable across other composed patterns (e.g., StatCard trend slot) that need 'default vs suppress vs override' semantics."
    - "Variant config table as single source of truth: Record<Variant, VariantConfig> at top of file; render path derives everything from one lookup. Keeps variant additions to a single object edit."
    - "Strict migrate-then-delete ordering (Pitfall 8): all imports migrated first, grep confirms zero remaining, THEN legacy files deleted. No intermediate broken state."

key-files:
  created:
    - "src/components/patterns/empty-state.tsx"
    - "src/components/tokens/patterns-specimen-empty-state.tsx"
  modified:
    - "src/components/data-display.tsx"
    - "src/components/table/data-table.tsx"
  deleted:
    - "src/components/empty-state.tsx"
    - "src/components/filters/filter-empty-state.tsx"

key-decisions:
  - "no-data copy shift accepted: legacy file rendered SearchX + 'No data matches your filters' for a dataset-empty trigger — cosmetic/semantic mismatch. Migrated to variant='no-data' which ships Database + 'No data yet'. Trigger-condition classification wins over cosmetic continuity."
  - "CTA label normalization: legacy 'Clear filter' (singular) → 'Clear filters' (plural, from EmptyState default). data-table trigger fires on multi-filter combinations; plural is accurate."
  - "Error icon uses text-error-fg/70 (accent color) — only variant that breaks the muted/40 icon recipe. Signals failure vs neutrality without a full red card chrome."
  - "EmptyState is a client component ('use client') because the default CTA button carries an onClick handler. Pattern consumers embed freely in server components via prop-drilling onAction."
  - "action === null uses strict equality check; undefined falls through to default CTA. Enables the documented three-state override surface without requiring a separate `hideAction` boolean."

patterns-established:
  - "Pattern-directory strategy: src/components/patterns/ — token-clean composed components that layer on Phase 26/27/28 primitives. EmptyState is the first pattern landed."
  - "/tokens specimen naming: src/components/tokens/patterns-specimen-{name}.tsx. Plan 29-05 aggregator owns wiring; each pattern ships its own specimen file."

requirements-completed: [DS-22]

duration: 3min
completed: 2026-04-18
---

# Phase 29 Plan 03: EmptyState Pattern Summary

**EmptyState with 4 first-class variants (no-data / no-results / error / permissions), Lucide icons, default CTAs, and three-state action override; both legacy empty-state files deleted.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T04:18:04Z
- **Completed:** 2026-04-18T04:20:38Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2
- **Files deleted:** 2

## Accomplishments

- Shipped `EmptyState` at `src/components/patterns/empty-state.tsx` with 4 first-class variants, a single variant-config source of truth, and three-state action override semantics (undefined → default CTA, null → suppress, ReactNode → override).
- Migrated both legacy consumers with **trigger-condition classification** (Pitfall 3): `data-display.tsx:440` → `variant="no-data"`, `data-table.tsx:342` → `variant="no-results"` with `onAction={clearAll}`.
- Deleted `src/components/empty-state.tsx` and `src/components/filters/filter-empty-state.tsx` — zero parallel-support window, zero alias re-exports.
- Added `EmptyStateSpecimen` to `src/components/tokens/patterns-specimen-empty-state.tsx` covering all 4 variants + override + suppression.
- `npm run build` and `npm run check:tokens` both pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EmptyState component + /tokens specimen** — `91315ee` (feat)
2. **Task 2: Migrate consumers + delete legacy files** — `b41ec27` (feat)

## Interface Shipped

```ts
export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'permissions';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode | null;   // undefined → default; null → suppress; ReactNode → override
  onAction?: () => void;             // handler for DEFAULT CTA only
  className?: string;
}

export function EmptyState(props: EmptyStateProps): JSX.Element;
```

## Variant Config (source of truth)

| Variant       | Icon           | Icon class                       | Default title                    | Default description                                      | Default CTA     |
| ------------- | -------------- | -------------------------------- | -------------------------------- | -------------------------------------------------------- | --------------- |
| `no-data`     | Database       | `text-muted-foreground/40`       | "No data yet"                    | "Data will appear here once batches load."               | _none_          |
| `no-results`  | SearchX        | `text-muted-foreground/40`       | "No data matches your filters"   | "Try adjusting your filters or refreshing the data."     | "Clear filters" |
| `error`       | AlertTriangle  | `text-error-fg/70`               | "Something went wrong"           | "We couldn't load this section. Please try again."       | "Retry"         |
| `permissions` | Lock           | `text-muted-foreground/40`       | "No access"                      | "You don't have permission to view this section."        | _none_          |

Layout: `flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center` (verbatim from the legacy recipe).

## Call Sites Migrated

| File                                    | Line  | Before                                          | After                                                    | Trigger classification                 |
| --------------------------------------- | ----- | ----------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `src/components/data-display.tsx`       | 21    | `import { EmptyState } from '@/components/empty-state'` | `import { EmptyState } from '@/components/patterns/empty-state'` | —                                      |
| `src/components/data-display.tsx`       | 440   | `<EmptyState />`                                | `<EmptyState variant="no-data" />`                       | `!data \|\| data.data.length === 0` = **dataset-empty** |
| `src/components/table/data-table.tsx`   | 25    | `import { FilterEmptyState } from '@/components/filters/filter-empty-state'` | `import { EmptyState } from '@/components/patterns/empty-state'` | —                                      |
| `src/components/table/data-table.tsx`   | 342   | `<FilterEmptyState onClearFilters={clearAll} />` | `<EmptyState variant="no-results" onAction={clearAll} />` | filter ∩ = ∅ = **filters-excluded-all** |

**Additional consumers discovered beyond the 2 in 29-RESEARCH:** None. Grep confirmed both legacy import paths were used by exactly one file each.

## Files Created/Modified

- `src/components/patterns/empty-state.tsx` (new) — EmptyState pattern, 4 variants, action override semantics
- `src/components/tokens/patterns-specimen-empty-state.tsx` (new) — /tokens demo with 6 cells in a 2-column grid
- `src/components/data-display.tsx` — migrated to `variant="no-data"` at line 440, import path updated
- `src/components/table/data-table.tsx` — migrated to `variant="no-results"` with `onAction={clearAll}`, import path updated
- `src/components/empty-state.tsx` (deleted)
- `src/components/filters/filter-empty-state.tsx` (deleted)

## Decisions Made

- **Copy-semantic realignment at data-display.tsx:440.** Legacy file rendered `SearchX` + "No data matches your filters" even though the trigger is dataset-empty. New default (`Database` + "No data yet") corrects the misalignment. The filter-copy now lives only on `variant="no-results"`, which is correctly wired in `data-table.tsx:342`.
- **CTA normalization "Clear filter" → "Clear filters".** Plural is accurate for multi-filter clear; matches the default baked into `EmptyState.no-results`.
- **Error icon color broken from the muted/40 recipe.** `text-error-fg/70` provides the "red-ish accent" called for by CONTEXT without a full red card chrome. All other variants share `text-muted-foreground/40`.
- **Client component boundary.** `'use client'` required because the default CTA renders a `<Button>` with `onClick={onAction}`. Pattern consumers can still live in server components via prop-drilled handlers.
- **Strict `action === null` check.** Enables the three-state override (undefined/null/ReactNode) with no extra prop.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1–4 deviations fired. No auth gates. No out-of-scope discoveries.

**Total deviations:** 0
**Impact on plan:** Plan shipped as specified.

## Issues Encountered

- Transient: a prior `next build` process was still running when Task 2 verification kicked off. Waited for it to exit, then re-ran — build passed clean. Not caused by plan changes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **DS-22 shipped** — zero imports of `@/components/empty-state` or `@/components/filters/filter-empty-state` remain in `src/`.
- **Pattern directory seeded.** `src/components/patterns/` now has its first inhabitant. Plans 29-01/02/04 can drop their patterns alongside it.
- **/tokens specimen orphaned until Plan 29-05.** `EmptyStateSpecimen` is exported but not yet wired into `token-browser.tsx` — Plan 29-05 (aggregator) owns that wiring per this plan's explicit instruction.

## Self-Check

- FOUND: src/components/patterns/empty-state.tsx
- FOUND: src/components/tokens/patterns-specimen-empty-state.tsx
- MISSING (as expected — deleted): src/components/empty-state.tsx
- MISSING (as expected — deleted): src/components/filters/filter-empty-state.tsx
- FOUND commit: 91315ee (Task 1)
- FOUND commit: b41ec27 (Task 2)
- `npm run build` exited 0
- `npm run check:tokens` exited 0
- grep `from '@/components/empty-state'` in src/ = 0 hits
- grep `from '@/components/filters/filter-empty-state'` in src/ = 0 hits

## Self-Check: PASSED

---

*Phase: 29-component-patterns*
*Plan: 03*
*Completed: 2026-04-18*
