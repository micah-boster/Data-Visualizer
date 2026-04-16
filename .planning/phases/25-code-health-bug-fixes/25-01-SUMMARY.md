---
phase: 25-code-health-bug-fixes
plan: 01
subsystem: code-health
tags: [lint, eslint, unused-imports, cleanup, typescript]

# Dependency graph
requires:
  - phase: 24-stabilization
    provides: baseline KNOWN-ISSUES.md catalog with KI-22 flagged
provides:
  - 7 files cleaned of unused imports and symbols
  - KI-22 closed in docs/KNOWN-ISSUES.md
  - Reduced lint surface area (41 -> 29 total problems)
affects: [25-02, 25-03, 25-04, future phases touching the 7 cleaned files]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Project ESLint config does NOT honor argsIgnorePattern ^_ — unused params must be removed, not underscore-prefixed"
    - "Deviation documentation: corrected research inaccuracies about symbol locations without broadening scope"

key-files:
  created: []
  modified:
    - src/components/charts/collection-curve-chart.tsx
    - src/components/charts/pivot-curve-data.ts
    - src/components/columns/column-picker-sidebar.tsx
    - src/components/table/sort-dialog.tsx
    - src/components/table/table-body.tsx
    - src/lib/computation/compute-cross-partner.ts
    - src/lib/table/hooks.ts
    - docs/KNOWN-ISSUES.md

key-decisions:
  - "Removed _metric parameter entirely (both signature and call site) because the project ESLint config does not honor the underscore-prefix convention for unused parameters"
  - "Corrected research inaccuracy: KpiAggregates, TableState, Updater were not in use-suggested-prompts.ts as documented in 25-RESEARCH.md — they were in compute-cross-partner.ts and lib/table/hooks.ts. Fixed actual locations per baseline lint output"
  - "Did NOT touch pre-existing unused-vars warnings outside KI-22's 7-file scope (UnifiedToolbar in data-display.tsx, 8 unused symbols in data-table.tsx, Sparkles in query-command-dialog.tsx) — out of scope"

patterns-established:
  - "When plan references research findings, always re-verify against current lint output before editing — research docs can drift"
  - "For Next.js ESLint (eslint-config-next), unused parameters cannot be masked with _ prefix; they must be removed"

requirements-completed: [HEALTH-06]

# Metrics
duration: 5 min
completed: 2026-04-16
---

# Phase 25 Plan 01: Safe Cleanups (KI-22) Summary

**Removed 10 unused imports and symbols across 7 files, closing KI-22 and reducing lint surface from 41 problems to 29 without behavior change.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-16T18:29:21Z
- **Completed:** 2026-04-16T18:34:40Z
- **Tasks:** 3
- **Files modified:** 8 (7 source + 1 docs)

## Accomplishments

- Removed BatchAnomaly type import from collection-curve-chart.tsx
- Removed unused _metric parameter from addAverageSeries (plus call site + docstring)
- Removed IDENTITY_COLUMNS import from column-picker-sidebar.tsx
- Removed unused config local assignment in sort-dialog.tsx
- Removed unused useRef import from table-body.tsx
- Removed unused KpiAggregates type import from compute-cross-partner.ts
- Removed unused Updater and TableState type imports from lib/table/hooks.ts
- Marked KI-22 Resolved in docs/KNOWN-ISSUES.md with date, phase reference, and explanatory deviation note
- Updated KNOWN-ISSUES.md summary table (Architecture 8 -> 7, Low 13 -> 12, Total 22 -> 21)
- Updated "Last updated" date in KNOWN-ISSUES.md (2026-04-14 -> 2026-04-16)

## Task Commits

All edits shipped in a single atomic commit per the plan's explicit requirement that Task 2 (code changes) and Task 3 (KI-22 closure) land together:

1. **Task 1: Baseline lint and confirm flagged symbols** - (read-only, no commit)
2. **Tasks 2 & 3: Remove unused symbols + close KI-22** - `b791c55` (refactor)

## Files Created/Modified

- `src/components/charts/collection-curve-chart.tsx` - Removed BatchAnomaly from type import + dropped metric arg from addAverageSeries call
- `src/components/charts/pivot-curve-data.ts` - Removed _metric parameter from addAverageSeries signature + updated docstring
- `src/components/columns/column-picker-sidebar.tsx` - Removed IDENTITY_COLUMNS from import
- `src/components/table/sort-dialog.tsx` - Removed dead config = COLUMN_CONFIGS.find(...) assignment
- `src/components/table/table-body.tsx` - Removed `import { useRef } from 'react'`
- `src/lib/computation/compute-cross-partner.ts` - Removed KpiAggregates from type import list
- `src/lib/table/hooks.ts` - Removed Updater and TableState from @tanstack/react-table type imports
- `docs/KNOWN-ISSUES.md` - KI-22 marked Resolved with explanatory note; summary table and "Last updated" reconciled

## Decisions Made

- **Fate of `_metric`:** Removed entirely (parameter + call-site argument + docstring) because Next.js's default ESLint config does not honor `argsIgnorePattern: ^_` — the symbol was still flagged. Preserving the parameter "for future use" would have contradicted the plan's stated goal of zero unused-vars across the 7 files.
- **Symbol-location corrections:** Research doc (25-RESEARCH.md) listed `KpiAggregates`, `TableState`, `Updater` as unused in `src/hooks/use-suggested-prompts.ts`. Baseline lint showed they were actually unused in `src/lib/computation/compute-cross-partner.ts` (KpiAggregates) and `src/lib/table/hooks.ts` (Updater, TableState). Fixed at actual locations; `use-suggested-prompts.ts` was left untouched (its only warning was a react-hooks dependency warning, out of KI-22 scope).
- **Scope discipline:** Pre-existing `no-unused-vars` warnings in other files (e.g., `UnifiedToolbar` in `data-display.tsx`, 8 unused symbols in `data-table.tsx`, `Sparkles` in `query-command-dialog.tsx`) were NOT addressed — they are outside KI-22's explicit 7-file list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected inaccurate symbol locations from research**
- **Found during:** Task 1 (baseline lint)
- **Issue:** Research (25-RESEARCH.md) and the plan's interfaces table listed `KpiAggregates`, `TableState`, and `Updater` as unused imports in `src/hooks/use-suggested-prompts.ts`. Baseline `pnpm lint` output showed they were actually in different files: `KpiAggregates` in `src/lib/computation/compute-cross-partner.ts:3` and `TableState`/`Updater` in `src/lib/table/hooks.ts:20-21`. `use-suggested-prompts.ts` had no `no-unused-vars` warnings at all.
- **Fix:** Removed the unused imports from their actual locations rather than the documented-but-wrong ones. `use-suggested-prompts.ts` left unmodified. Decision recorded in commit body and KI-22 Resolved block.
- **Files modified:** `src/lib/computation/compute-cross-partner.ts`, `src/lib/table/hooks.ts` (instead of `src/hooks/use-suggested-prompts.ts`)
- **Verification:** `pnpm lint` shows zero `no-unused-vars` warnings for `KpiAggregates`, `TableState`, `Updater` after the change.
- **Committed in:** `b791c55`

**2. [Rule 1 - Bug] _metric parameter fully removed instead of underscore-kept**
- **Found during:** Task 1 (baseline lint)
- **Issue:** Plan allowed leaving `_metric` in place IF ESLint's `argsIgnorePattern: ^_` was honored. Baseline lint showed it still flagged `_metric` as unused, meaning the project's `eslint-config-next`-based config does not apply that exemption.
- **Fix:** Removed the parameter from `addAverageSeries`, the corresponding argument at the single call site in `collection-curve-chart.tsx`, and updated the docstring.
- **Files modified:** `src/components/charts/pivot-curve-data.ts`, `src/components/charts/collection-curve-chart.tsx`
- **Verification:** `pnpm lint` shows zero `no-unused-vars` for `_metric`; `pnpm tsc --noEmit` passes clean.
- **Committed in:** `b791c55`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - factual corrections to plan assumptions)
**Impact on plan:** Both deviations were in-scope corrections to stale/incorrect research assumptions. No scope creep — same 10 symbols cleaned as originally intended, just at their actual file locations with the appropriate handling for `_metric`.

## Issues Encountered

- **Editor/linter race on hooks.ts:** After the first successful edit to `src/lib/table/hooks.ts`, an external linter or file watcher re-inserted the `type Updater` and `type TableState` imports. Re-applied the edit and verified it stuck. Suspected cause: a formatter with auto-fix that ran against the stale staged-but-uncommitted baseline. Final state verified via `grep` and `pnpm lint`.
- **Parallel `next build` running:** Could not run `pnpm build` because another `next build` process (PID 37285) held the build lock. Sidestepped by using `pnpm tsc --noEmit` which passes cleanly — this satisfies the plan's fallback verification criterion ("at minimum `pnpm tsc --noEmit` is clean").

## User Setup Required

None - pure code cleanup, no external service configuration.

## Next Phase Readiness

- Ready for Plan 25-02 (next cleanup batch). This plan shipped first by design to shrink file diff noise for subsequent parallel plans.
- KI-22 is now closed; the 7-file cleanup scope is complete.
- No new blockers. Pre-existing concerns around other unused-vars warnings (UnifiedToolbar, data-table.tsx symbols, Sparkles) remain documented but untouched — they are not within KI-22's scope.

## Self-Check: PASSED

Verified:
- All 8 modified files present on disk
- Commit `b791c55` exists in git log matching `refactor(25-01):` pattern
- `pnpm lint` shows zero `no-unused-vars` for the 10 targeted symbols (grep returned empty)
- `pnpm tsc --noEmit` completes with no errors
- KI-22 "Resolved" block verified via `grep -A 6 "^### KI-22" docs/KNOWN-ISSUES.md | grep -c "Resolved"` = 1

---
*Phase: 25-code-health-bug-fixes*
*Completed: 2026-04-16*
