# Side-Task: Fix ACCOUNT_TYPE filter leak in cross-partner view

**Surfaced during:** Phase 27 UAT (Test 7, Test 10)
**Date:** 2026-04-17
**Status:** ready-to-start
**Severity:** medium — throws console errors on every filter apply in cross-partner view; doesn't crash the UI but pollutes devtools and blocks UAT of empty states

## Problem

Runtime error in the cross-partner data table:

```
[Table] Column with id 'ACCOUNT_TYPE' does not exist.
```

Fires during `getFilteredRowModel` on the `CrossPartnerDataTable` render path whenever a filter is applied (or on initial render if ACCOUNT_TYPE filter is persisted).

## Root cause (hypothesis — confirm during investigation)

`src/lib/columns/root-columns.ts` intentionally replaces batch-level columns (`BATCH`, `BATCH_AGE`, `ACCOUNT_TYPE`) with root-level columns. But when the user switches to cross-partner view while they have an ACCOUNT_TYPE filter active (from a saved view, persisted filter state, or default dimension filter), the filter is still applied to a column that isn't in the cross-partner column set, which tanstack-table rejects.

## Files to investigate

- `src/components/data-display.tsx:281, 291` — reads ACCOUNT_TYPE from data and finds ACCOUNT_TYPE in dimensionFilters
- `src/hooks/use-filter-state.ts:13` — ACCOUNT_TYPE in default filter state shape
- `src/lib/columns/root-columns.ts` — root columns that replace batch-level (no ACCOUNT_TYPE)
- `src/lib/views/defaults.ts:27` — ACCOUNT_TYPE in default view config
- `src/components/cross-partner/*` — the CrossPartnerDataTable consumer

## Fix direction

When switching to cross-partner view (or when computing filters for any table), filter out any `columnFilters` whose `id` isn't in the currently-rendered column set. Could live in:

- A `useEffect` that prunes stale filters after column-set changes, OR
- A derived filter list passed into tanstack-table's `state.columnFilters`, OR
- A guard at the filter-application layer before handing filters to tanstack

## Reproduction

1. Open the main page with the app running.
2. Apply any dimension filter (e.g., Account Type = individual) while in cross-partner / "all partners" view.
3. Open the browser devtools console — error fires on render.

## Verification

- Console stays clean when toggling between cross-partner and standard views with filters active.
- All existing filter workflows still work (apply, clear, save-view round-trip).
- No new columns accidentally added to cross-partner view.

## Unblocks

- Phase 27 UAT Test 10 live re-verification (heading-tier empty state can be triggered by zero-row filter without throwing first).

## Prompt for a fresh Claude Code session

> Fix ACCOUNT_TYPE filter leak in cross-partner view. There's a tanstack-table runtime error `[Table] Column with id 'ACCOUNT_TYPE' does not exist.` firing during `getFilteredRowModel` on the `CrossPartnerDataTable` render path. Hypothesis: the cross-partner view uses root-columns (which intentionally drop BATCH, BATCH_AGE, ACCOUNT_TYPE), but filter state still contains an ACCOUNT_TYPE filter from saved-view defaults or persisted state. Investigate `src/components/data-display.tsx:281,291`, `src/hooks/use-filter-state.ts:13`, `src/lib/columns/root-columns.ts`, `src/lib/views/defaults.ts:27`, and `src/components/cross-partner/*`. Fix: prune stale `columnFilters` whose `id` isn't in the current column set before handing them to tanstack-table. Reproduce by applying a filter in cross-partner view — error fires in console. Verify the console stays clean when toggling between cross-partner and standard views with filters active.
