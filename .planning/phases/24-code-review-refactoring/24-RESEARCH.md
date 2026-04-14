# Phase 24: Code Review & Refactoring - Research

**Researched:** 2026-04-14
**Domain:** Codebase quality audit (TypeScript/React/Next.js 16)
**Confidence:** HIGH

## Summary

The Bounce Data Visualizer codebase is in remarkably good shape for a ~13,500 LOC project. The TypeScript compiler reports **zero errors** with `strict: true` enabled. There are **zero `any` types**, **zero `@ts-ignore`/`@ts-expect-error` directives**, **zero TODO/FIXME comments**, and only **3 justified eslint-disable comments** (all in one file for a documented reason). File naming is 100% consistent kebab-case. Exports are exclusively named (no default exports except Next.js-required `page.tsx` and `layout.tsx`). Memoization is thorough and appropriate.

The main opportunities for improvement are: (1) the `data-display.tsx` orchestrator at 455 lines doing layout + data wiring + context nesting, (2) a repeated `String(row.PARTNER_NAME ?? '')` pattern appearing 14+ times that should be extracted, (3) three eslint-disable comments in `use-filter-state.ts` that could be eliminated with a different dependency approach, (4) `console.error`/`console.warn` calls in production code that should use a structured approach, and (5) creating the `docs/KNOWN-ISSUES.md` document.

**Primary recommendation:** This is a light-touch refactoring phase. The codebase is already well-structured. Focus on extracting the repeated `PARTNER_NAME` accessor, tightening `data-display.tsx`, cleaning up console statements, and producing a thorough known-issues document.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Only split components that are egregiously doing too many things (data fetching + computation + rendering in one blob) -- don't over-engineer working code
- Extract shared utilities when the same pattern repeats 3+ times (DRY it up)
- Audit the entire codebase evenly -- no priority area; Claude identifies severity and addresses accordingly
- Keep current file/folder structure unless restructuring is clearly warranted
- Delete unused code outright -- git history preserves everything
- Comprehensive known issues document (docs/KNOWN-ISSUES.md) covering bugs, tech debt, missing features, edge cases, future improvements
- Each known issue item includes a suggested fix/approach (one-liner)
- Standardize null/undefined handling across the codebase -- prefer `??` over `||`, explicit null checks

### Claude's Discretion
- Overall refactoring depth and file structure changes
- `any` removal aggressiveness (pragmatic exceptions allowed)
- TypeScript compiler flag changes
- Zod schema coverage decisions
- Known issues document organization structure
- Dependency pruning safety calls
- CSS cleanup necessity
- Commented-out code judgment (delete noise, keep valuable TODOs)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Codebase Overview

### File Inventory

| Directory | Files | LOC | Purpose |
|-----------|-------|-----|---------|
| `src/app/` | 6 | 383 | Next.js routes (page, layout, 4 API routes) |
| `src/components/anomaly/` | 3 | 247 | Anomaly badges, detail, summary panel |
| `src/components/charts/` | 8 | 822 | Collection curves, sparklines, tooltips, legends |
| `src/components/columns/` | 3 | 374 | Column picker, groups, search |
| `src/components/cross-partner/` | 8 | 834 | Comparison matrix, trajectory charts, heatmap |
| `src/components/filters/` | 4 | 263 | Filter bar, chips, combobox, empty state |
| `src/components/kpi/` | 2 | 276 | KPI cards and summary |
| `src/components/layout/` | 2 | 148 | App sidebar, header |
| `src/components/navigation/` | 2 | 106 | Breadcrumb trail, drillable cell |
| `src/components/query/` | 4 | 354 | AI query search bar, response, scope pill, prompts |
| `src/components/table/` | 14 | 1,546 | Data table and all sub-components |
| `src/components/ui/` | 15 | 1,616 | shadcn/ui primitives |
| `src/components/views/` | 3 | 267 | Saved views sidebar, save input, view item |
| `src/components/` (root) | 5 | 557 | data-display, empty/error/loading states, theme toggle |
| `src/contexts/` | 4 | 242 | Anomaly, cross-partner, data-freshness, partner-norms |
| `src/hooks/` | 13 | 834 | All custom hooks |
| `src/lib/ai/` | 2 | 405 | Context builder, system prompt |
| `src/lib/columns/` | 10 | 857 | Column definitions, config, groups, presets |
| `src/lib/computation/` | 6 | 813 | Anomalies, cross-partner, KPIs, norms, trending, curves |
| `src/lib/export/` | 2 | 158 | CSV generation, download helper |
| `src/lib/formatting/` | 5 | 360 | Numbers, dates, thresholds, anomaly labels, deviation |
| `src/lib/snowflake/` | 3 | 120 | Connection, queries, types |
| `src/lib/static-cache/` | 2 | 204 | Schema validation, fallback data |
| `src/lib/table/` | 2 | 274 | Table hooks, aggregations |
| `src/lib/views/` | 4 | 282 | Defaults, schema, storage, types |
| `src/lib/` (root) | 2 | 28 | utils.ts, query-client.ts |
| `src/types/` | 3 | 183 | data.ts, partner-stats.ts, query.ts |
| **TOTAL** | **~130** | **~13,500** | |

### Technology Stack

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 16.2.3 (Turbopack) | Framework |
| React | 19.2.4 | UI library |
| TypeScript | 5.9.3 | Type system |
| TanStack Table | 8.21.3 | Data table engine |
| TanStack Query | 5.97.0 | Data fetching |
| Recharts | 3.8.0 | Charts |
| AI SDK | 6.0.158 | Streaming AI query |
| Zod | 4.3.6 | Runtime validation |
| shadcn/ui | 4.2.0 | Component primitives |
| simple-statistics | 7.8.9 | Statistical computations |
| Tailwind CSS | 4.x | Styling |

## Type Safety Assessment

**Confidence: HIGH**

### TypeScript Configuration
- `strict: true` is enabled (includes strictNullChecks, noImplicitAny, strictFunctionTypes, etc.)
- `npx tsc --noEmit` passes with **zero errors**
- Target: ES2017, Module: ESNext, Module Resolution: bundler

### `any` Types: NONE
Zero `any` type annotations in the entire codebase. No `as any` casts. No `@ts-ignore` or `@ts-expect-error` directives.

### Data Row Typing Pattern
The codebase uses `Record<string, unknown>` for Snowflake data rows throughout. This is intentional -- the schema is dynamic (61 columns defined in `COLUMN_CONFIGS`) and values are coerced at point-of-use with `Number()` or `String()`. This is the correct pattern for a dynamic-schema data table.

### Zod Schema Coverage
| Boundary | File | Coverage |
|----------|------|----------|
| AI query API | `src/app/api/query/route.ts` | Full request validation with Zod |
| Static cache | `src/lib/static-cache/schema-validation.ts` | Permissive schema validation |
| View persistence | `src/lib/views/schema.ts` | localStorage data validation |

**Gap:** The `/api/data` and `/api/accounts` routes do not validate Snowflake response shapes with Zod. The static-cache schema validator handles the cached case, but live Snowflake responses pass through unvalidated. This is a known boundary -- Snowflake SDK returns `Record<string, unknown>[]` and the app coerces at point-of-use.

### Switch Statement Exhaustiveness
7 switch statements found. All use `default` clauses. The switch values are `DrillLevel` ('root' | 'partner' | 'batch') and `ColumnType` ('currency' | 'percentage' | 'count' | 'number'). Since these are string unions with stable members and all switches have reasonable defaults, this is acceptable.

**Recommendation:** No action needed on type safety. The codebase already exceeds typical production standards.

### ESLint Suppressions
3 `eslint-disable-next-line react-hooks/exhaustive-deps` in `src/hooks/use-filter-state.ts` (lines 56, 73, 110). These exist because the hook uses `searchParams.toString()` as a primitive dependency instead of the `searchParams` object reference (to avoid unnecessary re-renders). This is a documented, intentional pattern.

**Recommendation:** These suppressions are justified. Could be eliminated by extracting a `useStableSearchParams()` wrapper, but the current approach works and is well-commented.

## Readability & Consistency Assessment

**Confidence: HIGH**

### Naming Conventions: CONSISTENT
- **Files:** 100% kebab-case (`use-filter-state.ts`, `anomaly-badge.tsx`, `compute-kpis.ts`)
- **Components:** PascalCase (`DataTable`, `KpiSummaryCards`, `AnomalySummaryPanel`)
- **Hooks:** camelCase with `use` prefix (`useFilterState`, `usePartnerStats`)
- **Utilities:** camelCase (`computeKpis`, `formatCurrency`, `buildDataContext`)
- **Types/Interfaces:** PascalCase (`PartnerAnomaly`, `BatchCurve`, `ColumnConfig`)
- **Constants:** UPPER_SNAKE_CASE (`COLUMN_CONFIGS`, `FILTER_PARAMS`, `IDENTITY_COLUMNS`)

### Export Style: CONSISTENT
Named exports exclusively. Only Next.js-required `page.tsx` and `layout.tsx` use default exports.

### Import Style: MOSTLY CONSISTENT
Mix of `import type { X }` (standalone type imports) and `import { type X, Y }` (inline type imports). Both are valid TypeScript patterns but mixing them is slightly inconsistent. Not worth fixing -- the mixed style causes no problems.

### Dead Code: NONE FOUND
- No unused imports detected by analysis
- No commented-out code blocks
- No TODO/FIXME/HACK/XXX comments anywhere in the codebase
- No `@ts-ignore` or `@ts-expect-error` directives

### `use client` Directives
68 files have `'use client'` -- this is appropriate since this is a heavily interactive data visualization app. The three `use client` files in `src/lib/columns/` (`anomaly-column.tsx`, `root-columns.tsx`, `percentile-columns.tsx`) are justified because they use `createElement` and reference client components in column definitions.

## Repeated Patterns to Extract

### 1. `String(row.PARTNER_NAME ?? '')` -- 14+ occurrences (EXTRACT)

This pattern appears in 12+ files across the codebase:

| File | Occurrences |
|------|-------------|
| `src/components/data-display.tsx` | 4 |
| `src/components/filters/filter-bar.tsx` | 3 |
| `src/hooks/use-partner-stats.ts` | 1 |
| `src/hooks/use-filter-state.ts` | 1 |
| `src/lib/computation/compute-cross-partner.ts` | 1 |
| `src/lib/computation/compute-anomalies.ts` | 1 |
| `src/lib/columns/anomaly-column.tsx` | 1 |
| `src/lib/columns/root-columns.ts` | 2 |
| `src/lib/columns/percentile-columns.tsx` | 1 |
| `src/lib/columns/definitions.ts` | 1 |

**Recommendation:** Extract a `getPartnerName(row: Record<string, unknown>): string` utility. Similarly consider `getBatchName()` and `getAccountType()` for the same pattern on those columns.

### 2. `Number(row[KEY]) || 0` coercion -- ~15 occurrences (KEEP)

Found in computation files (`compute-kpis.ts`, `compute-anomalies.ts`, `reshape-curves.ts`, `compute-trending.ts`, `root-columns.ts`). This is `|| 0` not `?? 0` because `Number(x)` can return `NaN`, which `??` does not catch. The `||` usage here is **correct and intentional**.

**Recommendation:** No change. Document this as a "looks wrong but isn't" pattern in code comments if not already clear.

### 3. Skeleton loading placeholders in dynamic imports -- 5 occurrences in `data-display.tsx` (MINOR)

```tsx
loading: () => (
  <div className="h-[40vh] w-full">
    <Skeleton className="h-full w-full rounded-lg" />
  </div>
)
```

Appears 3 times with `h-[40vh]` and once with `h-48`. Minor duplication. Could extract a `ChartSkeleton` component but it's borderline.

**Recommendation:** Low priority. Could extract but not required.

## Performance Assessment

**Confidence: HIGH**

### Memoization Coverage: THOROUGH
The codebase has extensive `useMemo` and `useCallback` usage (~100+ instances). Every context provider memoizes its value. Computation hooks properly memoize derived data. Filter state hooks memoize parsed URL params.

Key memoized paths:
- All context values (`AnomalyProvider`, `CrossPartnerProvider`, `PartnerNormsProvider`)
- Table data filtering in `data-display.tsx`
- Chart data pivoting and configuration
- Filter option lists in `filter-bar.tsx`
- Column definitions and pinning state in `lib/table/hooks.ts`

### Dynamic Imports (Code Splitting): GOOD
5 chart components are dynamically imported in `data-display.tsx`:
- `CollectionCurveChart` (with loading skeleton)
- `CrossPartnerTrajectoryChart` (with loading skeleton)
- `PartnerComparisonMatrix` (with loading skeleton)
- `RootSparkline` (no loading state)
- `PartnerSparkline` (no loading state)

All use `ssr: false` since they depend on Recharts (client-only).

### Bundle Considerations
- **Recharts 3.8.0** is the largest dependency. Properly code-split via dynamic imports.
- **simple-statistics** is small and tree-shakeable.
- **snowflake-sdk** is server-only (`serverExternalPackages` in next.config).
- **shadcn/ui** components are local copies (not imported from a package), so only used components are bundled.

### Potential Re-render Concerns
- `data-display.tsx` creates partner groups and computes KPIs inline in a `useMemo` inside `QuerySearchBarWithContext`. This runs on every `allData` or `drillState` change, which is fine since those are the actual dependencies.
- `useFilterState` uses `searchParams.toString()` as a string dependency to prevent object-reference re-renders. Smart pattern.

**Recommendation:** No performance issues found. The existing memoization is appropriate.

## Architecture Assessment

**Confidence: HIGH**

### Component Tree

```
RootLayout (server)
  Providers (client) -- QueryClient, Theme, Tooltip, DataFreshness
    Home (server)
      Suspense
        DataDisplay (client) -- main orchestrator
          CrossPartnerProvider
            EnrichedAnomalyProvider
              QuerySearchBarWithContext
              AnomalySummaryPanel (root only)
              Charts section (level-dependent)
              PartnerNormsProvider
                CrossPartnerDataTable
                  DataTable -- the big table component
                    FilterBar, FilterChips
                    BreadcrumbTrail
                    ColumnPickerSidebar, ViewsSidebar
                    TableHeader, TableBody, TableFooter
```

### Data Flow Pattern
1. **Snowflake -> API routes** (`/api/data`, `/api/accounts`) -- server-side data fetching
2. **API -> TanStack Query** (`useData`, `useAccountData`) -- client-side caching
3. **Raw data -> Computation layer** (`compute-*` pure functions) -- deterministic transforms
4. **Computed data -> Contexts** (Anomaly, CrossPartner, PartnerNorms) -- shared state
5. **Contexts -> Components** -- rendering

This is a clean, unidirectional flow. No circular dependencies detected.

### Context/Provider Hierarchy
```
QueryClientProvider (global)
  ThemeProvider (global)
    TooltipProvider (global)
      DataFreshnessProvider (global)
        CrossPartnerProvider (data-scoped)
          AnomalyProvider (data-scoped, needs CrossPartner)
            PartnerNormsProvider (drill-scoped)
```

The nesting is justified: AnomalyProvider needs CrossPartner data to enrich anomalies with percentile outlier information. PartnerNormsProvider is drill-level scoped.

### Separation of Concerns: GOOD

| Layer | Location | Responsibility |
|-------|----------|----------------|
| API | `src/app/api/` | Snowflake queries, request validation |
| Computation | `src/lib/computation/` | Pure functions, statistical analysis |
| Formatting | `src/lib/formatting/` | Number/date/label formatting |
| Columns | `src/lib/columns/` | TanStack Table column definitions |
| Contexts | `src/contexts/` | Shared computed data |
| Hooks | `src/hooks/` | State management, data fetching |
| Components | `src/components/` | UI rendering |
| Types | `src/types/` | Shared type definitions |

### Largest Files (Candidates for Review)

| File | LOC | Assessment |
|------|-----|------------|
| `src/components/ui/sidebar.tsx` | 723 | shadcn/ui primitive -- do not touch |
| `src/components/table/data-table.tsx` | 469 | Large but well-organized: imports, props, hooks, handlers, JSX. Has clear sections. |
| `src/components/data-display.tsx` | 455 | **Main concern.** Orchestrates data loading, drill state, context nesting, chart visibility, error states, and AI query context. Contains 3 inner components. |
| `src/components/ui/chart.tsx` | 373 | shadcn/ui primitive -- do not touch |
| `src/lib/ai/context-builder.ts` | 283 | Pure function, well-structured with helper functions per drill level |
| `src/lib/computation/compute-cross-partner.ts` | 257 | Complex but necessary -- cross-partner statistical analysis |
| `src/lib/computation/compute-anomalies.ts` | 256 | Complex but necessary -- anomaly detection algorithm |
| `src/components/cross-partner/trajectory-chart.tsx` | 244 | Chart component with data transformation -- reasonable size |

### `data-display.tsx` Assessment

This file is the main candidate for refactoring. It currently:
1. Orchestrates all data fetching hooks (`useData`, `useAccountData`, `useDrillDown`)
2. Manages UI state (chart expansion, comparison visibility, schema warning dismissal)
3. Syncs freshness state to context via effects
4. Computes derived data (`tableData`, `rootSummaryRows`)
5. Handles error/loading/empty states
6. Nests 3 context providers
7. Contains 3 helper components (`EnrichedAnomalyProvider`, `CrossPartnerDataTable`, `QuerySearchBarWithContext`)

**Recommendation:** The 3 inner helper components are fine where they are (they exist to bridge context access). The main `DataDisplay` function could benefit from extracting the chart visibility toggle state and the schema warning state into smaller components, but this is a "nice to have" -- it reads fine as-is. The user's instruction was "only split components that are egregiously doing too many things." This file is structured with clear sections and comments. Mild cleanup, not a rewrite.

## Console Statements

| File | Type | Usage |
|------|------|-------|
| `src/app/api/accounts/route.ts:49` | `console.error` | Snowflake error logging |
| `src/app/api/data/route.ts:68` | `console.error` | Snowflake error logging |
| `src/components/query/query-search-bar.tsx:59` | `console.error` | Query streaming error |
| `src/lib/static-cache/schema-validation.ts:90` | `console.warn` | Schema validation warnings |
| `src/lib/static-cache/schema-validation.ts:103` | `console.warn` | Missing column warnings |

**Recommendation:** The `console.error` calls in API routes are fine (server-side logging to Vercel). The `console.warn` in schema validation is useful for debugging. The `console.error` in `query-search-bar.tsx` is client-side and could be improved but is harmless. Overall, this is a very small number of console statements for a project this size. Low priority.

## `||` vs `??` Audit

| Pattern | Count | Assessment |
|---------|-------|------------|
| `Number(x) \|\| 0` | ~15 | CORRECT -- `NaN` is falsy, `??` doesn't catch it |
| `process.env.X \|\| 'fallback'` | 2 | Could use `??` but empty string env vars are typically meant to fall through too |
| `error?.message \|\| 'default'` | 1 | Could use `??` but empty error messages should also fall through |

**Recommendation:** The `||` usage in this codebase is intentional and correct in all cases found. No changes needed.

## Existing Documentation

| File | Content |
|------|---------|
| `docs/ANOMALY-ALGORITHM.md` | Anomaly detection algorithm documentation |
| `docs/TRENDING-ALGORITHM.md` | Batch-over-batch trending algorithm documentation |
| `docs/QUERY-ARCHITECTURE.md` | AI query system architecture (new, unstaged) |

**Missing:** `docs/KNOWN-ISSUES.md` -- this is a deliverable of this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dead code detection | Manual grep | TypeScript compiler + ESLint `no-unused-vars` | Already have `strict: true`; compiler catches unused locals |
| Bundle analysis | Manual chunk inspection | `@next/bundle-analyzer` or Turbopack's built-in | Need actual size data, not guesses |
| Unused dependencies | Manual checking | `depcheck` npm package | Automated and comprehensive |

## Common Pitfalls for Code Review Phases

### Pitfall 1: Over-Refactoring Working Code
**What goes wrong:** Restructuring stable code introduces bugs with no user-visible benefit.
**Why it happens:** Desire for "perfect" architecture trumps pragmatism.
**How to avoid:** Apply the CONTEXT.md rule: only split components that are "egregiously doing too many things." The current codebase is well-structured. Light touch.
**Warning signs:** Moving files between directories, introducing new abstraction layers, creating "manager" or "orchestrator" patterns.

### Pitfall 2: Breaking Memoization Dependencies
**What goes wrong:** Extracting code changes reference equality of objects passed as deps, causing infinite re-renders.
**Why it happens:** Moving a `useMemo` or extracting a helper changes closure scope.
**How to avoid:** Test any memoization changes with React DevTools Profiler. Keep dependency arrays stable.
**Warning signs:** Adding `useEffect` warnings, components rendering on every keystroke.

### Pitfall 3: Incomplete Known Issues
**What goes wrong:** Known issues document misses items, becomes stale immediately.
**Why it happens:** Only recording what was found during refactoring, not doing a systematic audit.
**How to avoid:** Audit systematically by category: performance, UX, data edge cases, deployment, security, accessibility, browser compatibility.
**Warning signs:** Document is only 10-15 items for a 13K LOC project.

### Pitfall 4: Removing "Dead" Code That's Actually Used
**What goes wrong:** Deleting exports that are only used in dynamic/computed contexts.
**Why it happens:** Static analysis misses dynamic property access patterns.
**How to avoid:** For `Record<string, unknown>` patterns, column keys are accessed dynamically. Never remove column configs or formatting functions without checking the full data flow.

## Known Issues to Document (Preliminary Findings)

These should go into `docs/KNOWN-ISSUES.md`. This is not exhaustive -- the implementation phase will find more.

### Data Layer
1. Snowflake responses are not Zod-validated for live queries (only cached data has schema validation)
2. `Record<string, unknown>` row type means column access is dynamically typed -- typos in column key strings are not caught by TypeScript
3. No retry logic on Snowflake query failures (API routes return error immediately)
4. No request deduplication if multiple components trigger the same API call simultaneously (TanStack Query handles this for `useData` but not for imperative fetches)

### UI/UX
5. `localStorage.getItem('charts-expanded')` in `data-display.tsx` is read during `useState` initializer -- on server render this returns `true` (the fallback), potentially causing a hydration flash
6. No loading state for `RootSparkline` and `PartnerSparkline` dynamic imports
7. Schema warning dismissal is ephemeral (useState, not persisted)
8. The batch drill-down curve section uses an IIFE in JSX which is unusual/hard to read

### Architecture
9. `data-display.tsx` (455 LOC) is the largest non-UI-primitive component and handles orchestration + layout + state
10. Three `eslint-disable` comments in `use-filter-state.ts` for deps optimization
11. `lib/columns/` files have `'use client'` because they reference client components in column definitions -- this is correct but unusual for a `lib/` directory

### Performance
12. `computeKpis` is called inline in `QuerySearchBarWithContext` on every render where `allData` changes -- this is memoized but the computation runs for every partner group on each data update
13. `new Set(data.data.map(r => String(r.PARTNER_NAME ?? ''))).size` computed inline in JSX (line 303 of data-display.tsx) -- should be memoized

### Missing Features / Future Work
14. No structured logging (uses `console.error`/`console.warn`)
15. No error boundary wrapping individual sections (a chart error takes down the whole page)
16. No accessibility audit has been done (ARIA labels, keyboard navigation, screen reader testing)
17. Dynamic curves don't re-project based on actuals (per project memory)
18. Metabase query import capability planned but not implemented (Milestone 3.1)

## Recommendations by Priority

### High Priority (Should Do)
1. **Extract `getPartnerName()` utility** -- 14+ occurrences of `String(row.PARTNER_NAME ?? '')`
2. **Create `docs/KNOWN-ISSUES.md`** -- comprehensive, organized by category with severity and suggested approach
3. **Memoize inline Set computation** in `data-display.tsx:303`
4. **Extract batch-curve IIFE** in `data-display.tsx:279-288` into a named component or variable

### Medium Priority (Nice to Have)
5. **Extract chart visibility state** from `data-display.tsx` into a small `useChartExpansion` hook
6. **Add loading state** for `RootSparkline` and `PartnerSparkline` dynamic imports
7. **Review unused dependencies** with `depcheck` (likely clean, but worth verifying)
8. **Consider `noUncheckedIndexedAccess`** tsconfig flag -- would add safety to `Record<string, unknown>` access but may require many `!` assertions

### Low Priority (Skip Unless Easy)
9. Unify import type style (standalone vs inline) -- cosmetic only
10. Add error boundaries around chart sections
11. Replace console statements with structured logging

## Sources

### Primary (HIGH confidence)
- Direct codebase audit via file reading and grep analysis
- `npx tsc --noEmit` -- zero errors confirmed
- `npx next build` -- clean build confirmed with Turbopack

### Secondary (MEDIUM confidence)
- Next.js 16.2.3 docs for `serverExternalPackages` and dynamic import patterns
- TanStack Table 8.x patterns for `Record<string, unknown>` row types

## Metadata

**Confidence breakdown:**
- Type safety: HIGH -- compiler confirms zero errors, zero `any` types
- Architecture: HIGH -- direct codebase reading, full component tree mapped
- Readability: HIGH -- naming conventions verified by listing all files
- Performance: HIGH -- all memoization patterns reviewed
- Known issues: MEDIUM -- preliminary list, implementation phase will find more

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable codebase, no external dependency concerns)
