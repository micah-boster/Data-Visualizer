# Known Issues

Last updated: 2026-04-16 (KI-07 resolved)
Codebase: ~13,500 LOC across ~130 files (src/)
Stack: Next.js 16, React 19, TanStack Table/Query, Recharts, Tailwind CSS

This document catalogs every known limitation, edge case, tech debt item, and future improvement area in the Bounce Data Visualizer codebase. It is a neutral snapshot -- not a roadmap or prioritization document.

## Summary

| Category | Count | High | Medium | Low |
|----------|-------|------|--------|-----|
| Data Layer | 4 | 0 | 2 | 2 |
| UI/UX | 2 | 0 | 0 | 2 |
| Architecture | 4 | 0 | 0 | 4 |
| Performance | 1 | 0 | 0 | 1 |
| Missing Features | 5 | 0 | 2 | 3 |
| **Total** | **16** | **0** | **4** | **12** |

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
**File(s):** `src/components/data-display.tsx` (actual fix site; the v2 KNOWN-ISSUES entry mis-located this in `src/hooks/use-filter-state.ts`, which was correct and untouched)
Known bug from v2. When a dimension filter is applied at the root level, table rows are not filtered accordingly.
**Suggested fix:** Investigate filter predicate logic in `use-filter-state.ts` for root-level dimension handling.

**Resolved:** 2026-04-16 in Phase 25 Plan C. Root cause was filter-before-aggregate: at root, `rootSummaryRows = buildPartnerSummaryRows(data.data)` operated on unfiltered raw rows while filter columns either had `enableColumnFilter: false` (PARTNER_NAME on summary rows) or didn't exist on summary rows (BATCH, ACCOUNT_TYPE). Fix: introduced `filteredRawData` memo in `src/components/data-display.tsx` that applies `dimensionFilters` to raw batch rows upstream of `buildPartnerSummaryRows`. Threaded through five downstream consumers: `CrossPartnerProvider` allRows, `EnrichedAnomalyProvider` allRows, `tableData` memo (cascades filter into partner drill-down while preserving Plan D's KI-12 object-ref dep array), `CrossPartnerDataTable` allData (feeds `rootSummaryRows`), `QueryCommandDialogWithContext` allData, and `usePartnerStats` input. Zero-match case renders `FilterEmptyState` with one-click "Clear filter" action; copy updated to "No rows match the filter". `src/hooks/use-filter-state.ts` and `src/lib/columns/root-columns.ts` were NOT modified (verified via `git diff`). Visual regression verification per Task 1 checkpoint decision (option-b — visual-only, honoring CONTEXT.md's locked "don't absorb test-infrastructure setup into this phase" boundary); no automated test added because the repo has no test runner. Commit: `b890329`.

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

**Resolved:** 2026-04-16 in Phase 25 Plan D. Per-site decisions:
- `src/components/data-display.tsx:147` (`tableData`): FIXED — deps changed from sub-properties (`data?.data`, `accountData?.data`, `drillState.level`, `drillState.partner`) to object refs (`data`, `accountData`, `drillState`). Downstream refs are stable via TanStack Query / `useDrillDown`, so broadening the deps does not introduce extra recomputes.
- `src/components/data-display.tsx:161` (`batchCurve`): FIXED — deps changed from sub-properties to object refs (`drillState`, `partnerStats`). Same rationale as `tableData`.
- `src/lib/table/hooks.ts:127` (`columns`): OPTED-OUT with scoped `eslint-disable-next-line react-hooks/preserve-manual-memoization` + inline justification comment. `options` is recreated as a fresh object literal on every render inside `DataTable`, so depending on the object ref would re-memoize on every render and defeat the memo. A function-level `'use no memo'` directive would disable Compiler optimization for the entire `useDataTable` hook (including `columnPinning`, `meta`, etc.), so the opt-out is deliberately scoped to this single memo. Sub-property deps (`options?.columns`, `options?.extraColumns`) preserved.
Verified `pnpm build` emits no new React Compiler warnings for the three lines. Commit: `9320c03`.

### KI-13: setState called synchronously within effects
**Severity:** Medium
**File(s):** `src/components/columns/column-group.tsx` (line 127), `src/hooks/use-column-management.ts` (line 40), `src/hooks/use-saved-views.ts` (line 68), `src/components/views/save-view-input.tsx` (line 37), `src/lib/table/hooks.ts` (line 140)
Five instances of `setState` called directly in `useEffect` bodies, which can cause cascading renders.
**Suggested fix:** Refactor to derive state from props/context where possible, or use event-driven patterns instead of synchronization effects.

**Resolved:** 2026-04-16 in Phase 25 Plan D. Per-site decisions:
- `src/components/columns/column-group.tsx:127`: FIXED — `isExpanded` is now derived state (`const expanded = manualExpanded ?? searchAutoExpanded`). `manualExpanded` is `undefined` by default; the toggle button sets it to an explicit boolean. Auto-expand-on-search is pure derivation, no effect, no extra render.
- `src/hooks/use-column-management.ts:40`: OPTED-OUT with inline SSR hydration-guard comment. The effect bridges `localStorage` → React state; reading `localStorage` during render would break Next.js hydration (server has no access). Kept as deliberate pattern.
- `src/hooks/use-saved-views.ts:68`: OPTED-OUT with the same SSR hydration-guard comment. Same pattern as `use-column-management.ts`.
- `src/components/views/save-view-input.tsx:37`: FIXED — `showReplace` reset moved into a new `handleNameChange` callback wired to the input's `onChange`. Other setters of `name` (`handleSave`, `handleCancel`) already reset `showReplace` inline. No external callers of `setName` exist; the belt-and-suspenders question raised during Task 4 was resolved "skip" by the user.
- `src/lib/table/hooks.ts:140`: OPTED-OUT with inline comment. The effect resets `sorting` to `[]` when the columns ref changes (e.g. drill level switch). Fire timing is sensitive — the reset must land after the new columns commit so TanStack's `sortedRowModel` sees a consistent `(columns, sorting=[])` pair. A `useMemo`-based guard would shift timing and risk a render with stale sort state. Kept as intentional.
Commit: `1973191`.

### KI-14: Ref access during render in table hooks
**Severity:** Medium
**File(s):** `src/lib/table/hooks.ts` (lines 86, 98), `src/components/table/data-table.tsx` (line 159)
Three instances of reading or writing ref `.current` during the render phase, which can cause stale values or missed updates.
**Suggested fix:** Move ref reads/writes into effects or event handlers. For `setActivePresetRef`, use a callback pattern instead.

**Resolved:** 2026-04-16 in Phase 25 Plan D. Per-site decisions:
- `src/lib/table/hooks.ts:86` (`tableRef.current.setOptions(...)` during render) & `src/lib/table/hooks.ts:98` (`return tableRef.current;` during render): OPTED-OUT with TanStack v8 workaround comments. Both sites live inside `useStableReactTable`; the write at :86 merges incoming options synchronously so TanStack's row-model accessors see a consistent options snapshot, and the return at :98 hands the caller the table instance for immediate header/row rendering. Rewriting requires migrating to TanStack Table v9 — out of scope for this phase. Block comment + per-line inline comments point to the upstream issue.
- `src/components/table/data-table.tsx:159` (`setActivePresetRef.current = setActivePreset` during render): FIXED — assignment moved into a dependency-less `useEffect` that runs after every commit. Safe because `markCustomPreset` only fires from user-initiated handlers (`toggleColumn`, `toggleGroup`, etc.) which always run after the initial commit, so there is no synchronous render→ref read path that would see a stale value. Click-verified in the browser during Task 4 checkpoint: preset indicator activates immediately on click with no one-render lag.
Commit: `222dd33`.

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

**Resolved:** 2026-04-16 in Phase 25 Plan B. Added `SectionErrorBoundary` (using `react-error-boundary` v6) around the chart section and the table section in `data-display.tsx`. Fallback is a compact Alert card with "Try again" reset and expandable `<details>` for the error message. Reset semantics: `resetKeys={[data]}` auto-resets when the top-level query result reference changes; "Try again" re-renders with same props. Event-handler and async errors are NOT caught (React error boundary contract).

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
