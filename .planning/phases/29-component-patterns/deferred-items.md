# Phase 29 — Deferred Items

Pre-existing issues discovered during plan execution, NOT caused by the current plan, logged here per execute-plan scope boundary rules.

---

## Found during 29-04 execution (2026-04-18)

### Pre-existing `npm run build` type errors (out of scope for 29-04)

**Baseline check:** Verified via `git stash` on main before applying 29-04 changes — both errors reproduce on the pre-plan tree.

**1. `src/components/charts/collection-curve-chart.tsx:69`**
```
Property 'getChartSnapshot' does not exist on type '...' returned from useCurveChartState(...).
```
Likely stale consumer after `use-curve-chart-state.ts` was refactored (appears in `git status` as modified, uncommitted). Not touched by 29-04. Owner: earlier phase (Phase 28 surfaces pilot) or current working-tree changes.

**2. `src/components/data-display.tsx:440`**
```
Property 'variant' is missing in type '{}' but required in type 'EmptyStateProps'.
```
`<EmptyState />` called without required `variant` prop. Introduced in Plan 29-03 (EmptyState pattern). Belongs to the EmptyState migration plan 29-05 (which is responsible for migrating ad-hoc empty-state call sites and deleting legacy).

Neither error is in 29-04's touched files. Migration completes cleanly on its own; build regressions predate this plan and belong to their owning plans.

### comparison-matrix.tsx:110 `mx-1` divider

Per resolved decision #5 scope reduction, the comparison-matrix site is intentionally NOT migrated in 29-04. Different margin recipe (`mx-1`), conditional on `viewMode !== 'bar'`, lives inside a DataPanel actions cluster. Plan 29-05's enforcement guard will sweep it (allowlist with inline justification OR flag for separate migration).
