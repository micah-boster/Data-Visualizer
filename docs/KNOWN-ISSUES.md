# Known Issues

Last updated: 2026-04-16
Codebase: ~13,500 LOC across ~130 files (src/)
Stack: Next.js 16, React 19, TanStack Table/Query, Recharts, Tailwind CSS

This document catalogs every known limitation, edge case, tech debt item, and future improvement area in the Bounce Data Visualizer codebase. It is a neutral snapshot -- not a roadmap or prioritization document.

## Summary

| Category | Count | High | Medium | Low |
|----------|-------|------|--------|-----|
| Data Layer | 4 | 0 | 2 | 2 |
| UI/UX | 3 | 0 | 1 | 2 |
| Architecture | 7 | 0 | 3 | 4 |
| Performance | 2 | 0 | 1 | 1 |
| Missing Features | 5 | 0 | 2 | 3 |
| **Total** | **21** | **0** | **9** | **12** |

---

## Data Layer

### KI-01: Snowflake responses not Zod-validated for live queries
**Severity:** Medium
**File(s):** `src/app/api/data/route.ts`, `src/app/api/accounts/route.ts`
Only cached data has schema validation via `src/lib/static-cache/schema-validation.ts`. Live Snowflake query responses are used as-is without runtime type checking.
**Suggested fix:** Add Zod schema to `/api/data` and `/api/accounts` response parsing before returning to the client.

### KI-02: Dynamic column key strings not type-checked
**Severity:** Low
**File(s):** `src/lib/columns/definitions.ts`, `src/lib/utils.ts`
Column keys are accessed via `Record<string, unknown>`, meaning typos in key strings like `row['PARTNER_NAMEE']` are not caught at compile time.
**Suggested fix:** Create a `ColumnKey` string literal union type derived from COLUMN_CONFIGS keys and use it in row accessors.

### KI-03: No retry logic on Snowflake query failures
**Severity:** Medium
**File(s):** `src/app/api/data/route.ts`, `src/app/api/accounts/route.ts`
API routes return an error response immediately on Snowflake failure with no retry mechanism.
**Suggested fix:** Add exponential backoff retry (1-2 attempts) in the API route handler before returning an error.

### KI-04: No request deduplication for imperative fetches
**Severity:** Low
**File(s):** `src/components/query/query-search-bar.tsx`
TanStack Query handles deduplication for `useData` hooks, but imperative `fetch` calls (e.g., in query search bar) could theoretically overlap.
**Suggested fix:** Unlikely to be triggered in practice; document as theoretical. Could add AbortController if needed.

---

## UI/UX

### KI-05: Chart expansion state uses localStorage read in useState initializer
**Severity:** Low
**File(s):** `src/components/data-display.tsx`
Server defaults to `true` while client reads localStorage, causing a potential hydration mismatch on the chart expansion toggle.
**Suggested fix:** Read localStorage in a `useEffect` to avoid SSR mismatch, defaulting to `true` on initial render.

### KI-06: Schema warning dismissal is ephemeral
**Severity:** Low
**File(s):** `src/lib/static-cache/schema-validation.ts`
The `useState`-based dismissal resets on page refresh; users see the same warning again.
**Suggested fix:** Persist dismissal to localStorage or sessionStorage.

### KI-07: Dimension filter at root level does not reduce table rows
**Severity:** Medium
**File(s):** `src/hooks/use-filter-state.ts`
Known bug from v2. When a dimension filter is applied at the root level, table rows are not filtered accordingly.
**Suggested fix:** Investigate filter predicate logic in `use-filter-state.ts` for root-level dimension handling.

---

## Architecture

### KI-08: data-display.tsx is the largest non-UI-primitive component at ~450 LOC
**Severity:** Low
**File(s):** `src/components/data-display.tsx`
Handles orchestration, layout, and state. Well-structured with clear sections but a candidate for future decomposition.
**Suggested fix:** If it grows further, extract chart section and context wiring into sub-components.

### KI-09: Three eslint-disable comments in use-filter-state.ts
**Severity:** Low
**File(s):** `src/hooks/use-filter-state.ts` (lines 57, 74, 111)
All three suppress `react-hooks/exhaustive-deps` for `searchParams.toString()` string optimization.
**Suggested fix:** Extract a `useStableSearchParams()` hook that returns a stable string representation.

### KI-10: lib/columns files have use client directive
**Severity:** Low
**File(s):** `src/lib/columns/root-columns.ts`, `src/lib/columns/definitions.ts`
Unusual for a `lib/` directory but correct because column definitions reference client components via `createElement`.
**Suggested fix:** No fix needed; document as intentional.

### KI-11: console.error and console.warn in production code
**Severity:** Low
**File(s):** `src/app/api/data/route.ts`, `src/app/api/accounts/route.ts`, `src/lib/static-cache/schema-validation.ts`, `src/components/query/query-search-bar.tsx`
Five instances across API routes and schema validation (3 console.error, 2 console.warn).
**Suggested fix:** Replace with a structured logger (e.g., pino) when observability becomes a priority.

### KI-12: React Compiler memoization preservation errors
**Severity:** Medium
**File(s):** `src/components/data-display.tsx` (lines 147, 161), `src/lib/table/hooks.ts` (line 127)
Three `useMemo` calls have dependency arrays that differ from what the React Compiler infers. The Compiler skips optimizing these components, falling back to manual memoization which still works correctly.
**Suggested fix:** Align dependency arrays with Compiler expectations (use broader object references instead of sub-property drilling) or annotate with `'use no memo'` to explicitly opt out.

### KI-13: setState called synchronously within effects
**Severity:** Medium
**File(s):** `src/components/columns/column-group.tsx` (line 127), `src/hooks/use-column-management.ts` (line 40), `src/hooks/use-saved-views.ts` (line 68), `src/components/views/save-view-input.tsx` (line 37), `src/lib/table/hooks.ts` (line 140)
Five instances of `setState` called directly in `useEffect` bodies, which can cause cascading renders.
**Suggested fix:** Refactor to derive state from props/context where possible, or use event-driven patterns instead of synchronization effects.

### KI-14: Ref access during render in table hooks
**Severity:** Medium
**File(s):** `src/lib/table/hooks.ts` (lines 86, 98), `src/components/table/data-table.tsx` (line 159)
Three instances of reading or writing ref `.current` during the render phase, which can cause stale values or missed updates.
**Suggested fix:** Move ref reads/writes into effects or event handlers. For `setActivePresetRef`, use a callback pattern instead.

---

## Performance

### KI-15: computeKpis runs for all partner groups on every allData change
**Severity:** Low
**File(s):** `src/components/query/query-search-bar.tsx`
Called in `QuerySearchBarWithContext` useMemo. The memo prevents unnecessary recomputation, but the full partner-group aggregation runs whenever batch data changes.
**Suggested fix:** Cache KPI results in a context or move to React Query.

### KI-16: No error boundary wrapping individual sections
**Severity:** Medium
**File(s):** `src/components/data-display.tsx`
A chart render error takes down the entire DataDisplay component tree.
**Suggested fix:** Wrap chart sections and table in individual `<ErrorBoundary>` components.

---

## Missing Features / Future Work

### KI-17: No accessibility audit
**Severity:** Medium
**File(s):** `src/components/`
ARIA labels, keyboard navigation, and screen reader compatibility have not been tested.
**Suggested fix:** Run axe-core audit, add ARIA labels to interactive elements.

### KI-18: Dynamic curves do not re-project based on actuals
**Severity:** Low
**File(s):** `src/lib/computation/reshape-curves.ts`
Curves are static projections that do not adjust as actual collection data arrives.
**Suggested fix:** Recalculate projection curve endpoints using actual collection data.

### KI-19: Metabase query import not implemented
**Severity:** Low
**File(s):** N/A (not yet built)
Planned for Milestone 3.1. Accept and translate MBQL or SQL into the app's query system.
**Suggested fix:** Build a query parser that maps Metabase question JSON to the app's column/filter model.

### KI-20: No structured logging
**Severity:** Low
**File(s):** `src/app/api/data/route.ts`, `src/app/api/accounts/route.ts`, `src/lib/static-cache/schema-validation.ts`
Uses `console.error`/`console.warn` for server-side logging.
**Suggested fix:** Adopt pino or similar; route server logs through Vercel's log drain.

### KI-21: Snowflake credentials not provisioned
**Severity:** Medium
**File(s):** `src/app/api/data/route.ts`, `src/app/api/accounts/route.ts`
App runs on static cache only. Live data requires `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_WAREHOUSE` environment variables.
**Suggested fix:** Add Snowflake credentials to Vercel environment variables.

### KI-22: Unused imports and variables across 7 files
**Severity:** Low
**File(s):** `src/components/charts/collection-curve-chart.tsx` (BatchAnomaly), `src/components/charts/pivot-curve-data.ts` (_metric), `src/components/columns/column-picker-sidebar.tsx` (IDENTITY_COLUMNS), `src/components/data-display.tsx` (dataUpdatedAt), `src/components/table/sort-dialog.tsx` (config), `src/components/table/table-body.tsx` (useRef), `src/hooks/use-suggested-prompts.ts` (KpiAggregates, TableState, Updater)
Seven files have unused imports or variable assignments flagged by ESLint.
**Suggested fix:** Remove unused imports/variables. These are safe, mechanical deletions.

**Resolved:** 2026-04-16 in Phase 25 Plan A. Unused imports/symbols removed from the 7 flagged files. Verified via `pnpm lint` (zero `no-unused-vars` warnings for these specific symbols). Note: during execution, `KpiAggregates` was found in `src/lib/computation/compute-cross-partner.ts` (not `use-suggested-prompts.ts`) and `TableState`/`Updater` were found in `src/lib/table/hooks.ts` (not `use-suggested-prompts.ts`); the unused imports were removed from their actual locations. `_metric` in `pivot-curve-data.ts` was removed (parameter + call-site argument + docstring) because the project's ESLint config does not honor underscore-prefix for unused parameters.
