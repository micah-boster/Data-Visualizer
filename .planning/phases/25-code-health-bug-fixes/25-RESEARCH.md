# Phase 25: Code Health & Bug Fixes - Research

**Researched:** 2026-04-16
**Domain:** React 19 / Next.js 16 code-health cleanup (filter predicate bug, error boundaries, React Compiler / anti-pattern refactors, dead-code removal)
**Confidence:** HIGH (all findings are from direct source inspection; only the "react-error-boundary vs hand-rolled class" recommendation is MEDIUM because it depends on a stylistic call the user has delegated to Claude's discretion)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Root filter bug (HEALTH-01 / KI-07):**
- When a dimension filter is applied at the root level, the table **filters rows in place** — only rows matching the filter are shown
- **Chart and KPIs recompute** from the filtered dataset too, not just the table
- Root-level dimension filters **cascade into drilldowns** — drilling in preserves the filter, treating it as a persistent constraint rather than a level-scoped one
- When the filter matches zero rows, the table shows its **standard empty state with a contextual 'No rows match the filter' hint + one-click 'Clear filter' action**

**Error boundary UX (HEALTH-02 / KI-16):**
- **Per-section granularity** — one boundary around the chart section, one around the table section. Not per-chart-card, not app-wide
- **Compact inline fallback card** — same footprint as the working component (no layout shift), alert icon, short message ("Chart couldn't load"), and a "Try again" button
- **Expandable error details** — short message by default; "Show details" toggle reveals the error message (not a full stack trace)
- **"Try again" resets the boundary and re-renders** with the same props/data; transient errors recover without a page reload. **No automatic data refetch on retry.**

**Memoization & refactor stance (HEALTH-03, HEALTH-04, HEALTH-05):**
- **Pragmatic, behavior-preserving default** — fix patterns where safe; opt out / defer where a rewrite risks changing observable UX
- For the 3 React Compiler warnings (KI-12): fix dep arrays where safe, add `'use no memo'` **with a one-line explanatory comment** where a rewrite would change behavior
- Behavior-preservation trumps Compiler correctness when they conflict
- For KI-13 (5 sites) and KI-14 (3 sites): same pragmatic rule
- Every opt-out or deferred site gets a brief inline comment (why it's intentional)

**Verification approach:**
- **Per-fix targeted regression tests** for behavior-changing items: KI-07, KI-16, KI-13/KI-14 where the refactor changed shape. Skip tests for purely mechanical work (KI-12 opt-outs, KI-22 import deletions)
- Use whatever test infrastructure already exists. If none exists, flag to user — **do not absorb test-infrastructure setup into this phase**
- Run tests locally only — CI wiring is out of scope
- Tests pair with visual preview verification, not replace it
- Escalation rule: if a refactor turns risky mid-plan, **stop and ask the user**
- **`docs/KNOWN-ISSUES.md` is updated per fix** (mark closed in the same commit as the fix), not batched at the end

**Shipping strategy — group plans by risk, not by KI number:**
- **Plan A** — safe cleanups: unused imports (KI-22 / HEALTH-06)
- **Plan B** — additive: error boundaries (KI-16 / HEALTH-02)
- **Plan C** — behavior change: root filter bug (KI-07 / HEALTH-01) — needs visual + test verification
- **Plan D** — internal refactors: setState-in-effect, ref-during-render, memoization (KI-12, KI-13, KI-14 / HEALTH-03, HEALTH-04, HEALTH-05) — grouped because similar-risk cleanup with per-site pragmatism

### Claude's Discretion
- Exact wording of fallback-card copy, empty-state hint text, opt-out comments
- Which of the 3 memoization sites (KI-12) get fixed vs opted-out
- Which of the 8 refactor sites (KI-13 + KI-14) are clean rewrites vs deferred (stop-and-ask when risky)
- Exact test names, assertion style, and file layout within the repo's existing test conventions
- Whether to extract a shared `<SectionErrorBoundary>` component or use `react-error-boundary`'s defaults directly

### Deferred Ideas (OUT OF SCOPE)
- Full accessibility audit (KI-17) → Phase 33
- Structured logging for console.error/warn (KI-20 / KI-11)
- Snowflake retry logic (KI-03)
- Zod validation for live Snowflake responses (KI-01)
- CI wiring for new tests
- Test-infrastructure setup if repo lacks it — flag to user
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HEALTH-01 | Dimension filter at root level reduces table rows (closes KI-07) | Root cause located: `src/components/data-display.tsx:666-683` + `src/components/table/data-table.tsx:172`. See "KI-07 deep-dive" below. |
| HEALTH-02 | Error boundaries wrap chart and table sections (closes KI-16) | Target mount sites identified in `data-display.tsx:394-430` (chart section) and `434-480` (table section). `react-error-boundary` NOT yet installed. |
| HEALTH-03 | All setState-in-effect refactored (closes KI-13) | All 5 sites located with line numbers and code shape — see "KI-13 inventory" |
| HEALTH-04 | Ref-access-during-render moved to effects/handlers (closes KI-14) | All 3 sites located — see "KI-14 inventory" |
| HEALTH-05 | React Compiler memoization warnings resolved or opted out (closes KI-12) | All 3 sites located: `data-display.tsx:147`, `data-display.tsx:161`, `lib/table/hooks.ts:127` — see "KI-12 inventory" |
| HEALTH-06 | Unused imports removed across 7 flagged files (closes KI-22) | All 7 flagged symbols confirmed via grep — see "KI-22 inventory" |
</phase_requirements>

## Summary

Phase 25 is a six-item cleanup: one real behavior bug (root-level dimension filter), one additive safety net (section error boundaries), three categories of internal-only React anti-pattern refactors, and one batch of trivial dead-code deletions. All sites are already pinpointed in `docs/KNOWN-ISSUES.md` — research here is about **characterizing each site's risk shape** so the planner can slot them into the four risk-graded plans (A/B/C/D) without surprises.

Three things drive the plan's shape. **First**, the codebase has no test runner of any kind (no vitest/jest/playwright, nothing in `devDependencies`, zero `*.test.*` or `*.spec.*` files under `src/`). CONTEXT.md explicitly defers test-infra setup — the planner must escalate a test-infra decision to the user before any test-authoring tasks can land, or scope the tests differently. **Second**, `react-error-boundary` is not yet in `package.json` and there are no existing error boundaries anywhere in `src/`, so Plan B genuinely starts from zero. **Third**, the KI-07 filter bug is more architectural than it appears: at root level the table renders `rootSummaryRows` (one row per partner, built from `buildPartnerSummaryRows(allData)`) where all non-identity columns have `enableColumnFilter: false`, and several of the filter columns (BATCH, ACCOUNT_TYPE) don't even exist on summary rows. So the fix isn't a one-liner in `use-filter-state.ts` as the KNOWN-ISSUES entry suggests — it's a filter-before-aggregate redesign.

**Primary recommendation:** Before any tasks land, the planner must (a) ask the user how to handle the missing test runner — install vitest or go test-free on this phase — and (b) confirm the KI-07 fix location is the aggregation pipeline, not the hook. Plans A (imports), B (boundaries), and D (refactors) can proceed in parallel once those two answers land. Plan C (filter) depends on the test-infra answer if we want regression coverage.

## Standard Stack

### Core (already in repo)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI runtime | In use; React Compiler warnings (KI-12) originate here |
| Next.js | 16.2.3 | Framework | In use; `error.tsx` route-segment files exist but we need inline boundaries (different scope) |
| @tanstack/react-table | 8.21.3 | Table | Core of the filter flow for KI-07 |
| TypeScript | ^5 | Types | Already strict |
| ESLint | ^9 | Lint (with `eslint-config-next` 16.2.3) | Only available quality tool in the repo — handles KI-22 unused imports via `@typescript-eslint/no-unused-vars` |

### Supporting (to add for this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-error-boundary` | ^6.0.0 (latest as of 2025) | Hook-based error boundary with `onReset`, `resetKeys`, `fallbackRender` | **Plan B only, if Claude's discretion chooses the library route over a hand-rolled class.** See recommendation below. |

**Recommendation on error boundary library (MEDIUM confidence — user delegated to Claude):** Use `react-error-boundary` rather than a hand-rolled class component. Reasons:
- It ships `resetKeys` which declaratively resets on prop changes (matches the "same props, re-render" semantic from CONTEXT.md).
- It provides a `fallbackRender` prop that gets `{ error, resetErrorBoundary }` — maps directly to the "short message + Try again + Show details" shape the user described.
- Hand-rolling means writing `getDerivedStateFromError` / `componentDidCatch` plus reset plumbing; the library is ~1KB and battle-tested since 2020.
- The project already depends on Sonner and shadcn-derived components, so adding a small focused library isn't a stylistic outlier.

If the user prefers zero-dep, a ~30-line class wrapper is trivially achievable. Either is defensible.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-error-boundary` | Next.js `error.tsx` file convention | `error.tsx` works at **route-segment** granularity — wraps the entire page. Can't wrap just the chart section inside the existing page. Wrong tool for the stated requirement. |
| `react-error-boundary` | Hand-rolled class boundary | Works, but re-implements `resetKeys`/hook ergonomics. User explicitly flagged this as discretion — either is fine. |
| vitest for Plan C regression test | Manual visual check only | Skips automated regression. The filter bug was a v2 regression that stayed hidden — the user specifically wants a test for it. |
| Jest | Vitest | Vitest is substantially faster on Next 16 + React 19 and has first-class ESM support. If we add a runner, it's vitest. |

**Installation (only if Plan B uses the library):**
```bash
pnpm add react-error-boundary
```

**Installation (only if user approves test runner, conditionally):**
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

## Architecture Patterns

### Current Project Structure (relevant to Phase 25)

```
src/
├── app/                    # Next 16 App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── api/                # Route handlers (not touched this phase)
├── components/
│   ├── data-display.tsx    # Orchestrator, 790 LOC — HOSTS chart + table sections targeted by KI-16
│   ├── charts/             # collection-curve-chart.tsx etc.
│   ├── table/              # data-table.tsx (KI-14 site at line 159)
│   ├── columns/            # column-group.tsx (KI-13 site at line 127)
│   ├── filters/            # filter-empty-state.tsx — reusable for KI-07 empty state
│   ├── views/              # save-view-input.tsx (KI-13 site at line 37)
│   ├── empty-state.tsx     # Global "no data" empty state (NOT the filter one)
│   └── ui/                 # shadcn primitives (Alert, Button, etc.)
├── hooks/
│   ├── use-filter-state.ts     # URL-backed filter hook — NOT the root-cause of KI-07
│   ├── use-column-management.ts# KI-13 site at line 40
│   ├── use-saved-views.ts      # KI-13 site at line 68
│   └── use-drill-down.ts       # Drill state — KI-07 cascade lands here
├── lib/
│   ├── columns/
│   │   ├── root-columns.ts     # buildPartnerSummaryRows() — aggregation function, KI-07 surface
│   │   └── config.ts
│   └── table/
│       └── hooks.ts            # KI-12 site line 127, KI-13 line 140, KI-14 lines 86+98
└── docs/
    └── KNOWN-ISSUES.md         # Per-fix updates go here per CONTEXT.md
```

### Pattern 1: Per-section React error boundary (Plan B)

**What:** A client-only React error boundary wrapping one cohesive UI section.
**When to use:** Around a subtree whose failure shouldn't take down siblings. Here: the charts block and the DataTable block.
**Example (`react-error-boundary` route):**
```tsx
// Source: https://github.com/bvaughn/react-error-boundary README (verified in package README)
'use client';
import { ErrorBoundary } from 'react-error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

function SectionFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  // Compact card with same footprint as working component
  // "Try again" calls resetErrorBoundary — React re-renders with same props
  // "Show details" toggles a <details> element that renders error.message
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Chart couldn&apos;t load.
        <button onClick={resetErrorBoundary}>Try again</button>
        <details><summary>Show details</summary>{error.message}</details>
      </AlertDescription>
    </Alert>
  );
}

// Use resetKeys to auto-reset when data changes
<ErrorBoundary FallbackComponent={SectionFallback} resetKeys={[data]}>
  <ChartSection ... />
</ErrorBoundary>
```

**Important:** Error boundaries can ONLY be client components in Next 16 (the bundled docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` still require `'use client'`). The host `data-display.tsx` is already a client component, so the boundary drops in directly.

### Pattern 2: Filter-before-aggregate for KI-07

**What:** Apply dimension filters to the raw `data.data` batch rows BEFORE `buildPartnerSummaryRows` aggregates them into partner summaries. Feed the filtered rows to the summary builder, to `usePartnerStats`, and to `computeKpis` consistently.
**Where it goes:** `src/components/data-display.tsx` — introduce a `filteredRawData` memo that applies `dimensionFilters` to `data.data`, then use it everywhere `data.data` is currently referenced downstream (summary rows, KPIs, sparkline, sidebar partner list).

### Pattern 3: `useMemo` dep alignment for React Compiler (Plan D / KI-12)

**What:** React Compiler infers deps from the closure. It rejects a `useMemo` when the written dep array differs from its inference in a way that could produce stale results. Two clean fixes:
1. **Align deps** — use broader object references (pass `options` instead of `options.columns, options.extraColumns`) so the Compiler can see the full closure.
2. **Opt out** — add `'use no memo'` as the first statement of the function body, with a comment: `// 'use no memo' — preserved manual memo below; refactoring to object-ref deps would trigger extra re-renders when [explain why]`.

### Anti-Patterns to Avoid

- **Hand-rolling `useSearchParams` filter cascade in the fix for KI-07**: The hook `use-filter-state.ts` is NOT the bug site. It correctly parses URL params into TanStack `ColumnFiltersState`. The bug is downstream — summary rows stripping the filter columns. Don't touch the hook unless absolutely needed; it has three deliberate `eslint-disable-next-line react-hooks/exhaustive-deps` (KI-09) that must not be regressed.
- **Applying filters via TanStack Table's `getFilteredRowModel` at root**: At root level, `rootColumnDefs` have `enableColumnFilter: false` and the filter columns don't exist on summary rows. Don't try to route root-level filtering through the table — route it through the aggregation pipeline.
- **Resetting error boundaries on every parent render**: Use `resetKeys={[stableKey]}` not `resetKeys={[someComputedValue]}` or the boundary will thrash.
- **Running React Compiler opt-outs without a comment**: The user's decision record is explicit — every `'use no memo'` gets a one-line justification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundary with reset | Class component + `componentDidCatch` + local reset state | `react-error-boundary` `<ErrorBoundary>` with `resetKeys` | Library handles resetKeys, onReset callbacks, fallbackRender prop, useErrorBoundary hook — all needed by CONTEXT.md requirements |
| URL-backed filter parsing | Custom `useSearchParams` wiring | The existing `use-filter-state.ts` hook (KEEP IT) | It already works; KI-07 is downstream, not in this hook |
| Lint rule for unused imports | Grep or manual scan | `pnpm lint` — `eslint-config-next` ships `@typescript-eslint/no-unused-vars` which already flags these 7 files | Lint is deterministic; confirm with `pnpm lint` before and after |
| Deep-equality for resetKeys | `JSON.stringify(data)` | Pass stable references (e.g. `data` itself, or a length/key) | `resetKeys` does referential comparison by default — pass stable refs |

**Key insight:** Every task in this phase has an off-the-shelf tool. The value of the phase is **site triage and per-site judgment**, not clever engineering.

## Common Pitfalls

### Pitfall 1: "Filtering the URL-backed hook will fix KI-07"
**What goes wrong:** Engineer edits `use-filter-state.ts` thinking the filter predicate is broken there. The hook is fine.
**Why it happens:** `docs/KNOWN-ISSUES.md` names `src/hooks/use-filter-state.ts` as the file. The actual root cause is upstream in `data-display.tsx` (summary row aggregation happens on unfiltered `data.data`).
**How to avoid:** Trace the data flow end-to-end before editing. Verify: when a filter is set at root, inspect what `tableData` and `rootSummaryRows` contain vs what the user would expect. The table cannot filter rows that never existed as rows at that level.
**Warning signs:** Engineer is editing the hook and claims the test passes — but the chart still shows unfiltered cross-partner trajectory.

### Pitfall 2: Error boundary wraps but doesn't actually catch async/event errors
**What goes wrong:** `react-error-boundary` (like React's built-in error boundaries) catches errors during render and lifecycle methods — NOT errors in event handlers, timers, or async code. Team sees the boundary in place and assumes full coverage.
**Why it happens:** React's error boundary contract hasn't changed since v16.
**How to avoid:** Tell the user that the boundaries guard render/lifecycle errors. Event handler errors inside the section (e.g. a `onClick` that throws) bubble normally and don't trigger the fallback. Use `useErrorBoundary().showBoundary(error)` inside handlers when needed.
**Warning signs:** A "Chart couldn't load" fallback never appears during a known broken state — the error was in an event handler, not render.

### Pitfall 3: React Compiler `'use no memo'` silently killing adjacent optimizations
**What goes wrong:** Adding `'use no memo'` at the top of a function opts the **entire function** out of Compiler optimization, not just the flagged line.
**Why it happens:** It's a directive, not a line-level annotation.
**How to avoid:** When opting out, accept that the whole function loses Compiler optimization. If only one `useMemo` is problematic, prefer fixing the dep array; only reach for `'use no memo'` when the whole function is hand-tuned.
**Warning signs:** Adding `'use no memo'` in a hot component suddenly causes extra re-renders downstream.

### Pitfall 4: "Refactoring setState-in-effect is always safe"
**What goes wrong:** Three of the five KI-13 sites use the effect-synchronization pattern to bridge localStorage with React state (see `use-column-management.ts:40` and `use-saved-views.ts:68`). Refactoring them to derived state would require reading localStorage during render, which breaks Next.js SSR hydration.
**Why it happens:** These sites were written this way deliberately — initialize with server-safe default, then hydrate from localStorage in an effect. The comment `// Hydration-safe: initializes with defaults in useState, then applies localStorage values in useEffect to avoid Next.js hydration mismatch` is explicit.
**How to avoid:** Per CONTEXT.md, these are **opt-out sites** — leave them, add inline comments explaining the deliberate pattern. Don't try to "fix" them.
**Warning signs:** Engineer plans to remove the `useEffect` in `use-column-management.ts:37-44`. That's a rewrite that changes SSR behavior. STOP.

### Pitfall 5: The `tableRef.current.setOptions(...)` call in `lib/table/hooks.ts` is not what it appears
**What goes wrong:** Lines 86-98 of `src/lib/table/hooks.ts` look like ref-write-during-render (KI-14 material) and they ARE, but this is the React-19-safe wrapper around TanStack Table's `useReactTable`. The comment block explains it: TanStack v8 calls `setOptions()` during render, which in React 19 is an infinite loop. This custom wrapper is the workaround.
**Why it happens:** TanStack Table v8 hasn't adapted to React 19's stricter concurrent-mode rules.
**How to avoid:** This is a **defer site** — leave it with a comment, don't try to refactor. A fix requires patching TanStack Table itself or waiting for v9. CONTEXT.md's escalation rule applies: stop and ask if the user wants to accept the ref-write or find a different workaround.
**Warning signs:** Engineer rewrites `useStableReactTable` and the table starts throwing "Maximum update depth exceeded" in dev.

### Pitfall 6: Missing test runner silently punts verification
**What goes wrong:** Plan C (filter bug) requires a regression test per CONTEXT.md. Without a runner, the "test" becomes a manual browser click that gets forgotten in the next refactor.
**Why it happens:** CONTEXT.md explicitly defers test-infra setup, meaning the planner must either escalate or document "visual verification only" as an accepted gap.
**How to avoid:** Escalate to user at plan time: "Install vitest or ship Plan C with visual verification only?" Don't sneak a vitest install into one of the plans.

## KI-07 deep-dive: root dimension filter bug (HEALTH-01)

### Filter flow today
1. User clicks a dimension chip in the toolbar → `setFilter('partner', 'Acme')` from `useFilterState`.
2. Hook writes URL param via `router.replace`.
3. `useFilterState` returns `columnFilters: ColumnFiltersState` derived from URL params.
4. `DataDisplay` passes these as `dimensionFilters` down to `CrossPartnerDataTable`.
5. `CrossPartnerDataTable` builds `effectiveData` at root = `rootSummaryRows` (one row per partner, from `buildPartnerSummaryRows(allData)`).
6. `DataTable` (at line 172) passes `columnFilters` (dimensionFilters) into `useDataTable` ONLY when `isRoot` is true.
7. TanStack Table filters summary rows by column — but:
   - `rootColumnDefs` set `enableColumnFilter: false` on every data column (`src/lib/columns/root-columns.ts:45`).
   - The filter columns `BATCH` and `ACCOUNT_TYPE` don't exist on summary rows. `buildPartnerSummaryRows` outputs `{ PARTNER_NAME, LENDER_ID, __BATCH_COUNT, TOTAL_ACCOUNTS, ... }` only.

**Net effect:** Only a `PARTNER_NAME` filter can conceivably match (because that column exists on summary rows), and even that is subject to TanStack's `enableColumnFilter` gate — which is FALSE. So effectively no filter reduces rows at root.

### What the chart/KPI path does
- `CrossPartnerTrajectoryChart` at root pulls from `CrossPartnerProvider` (receives `allRows={data.data}` unfiltered) — chart ignores filters.
- `usePartnerStats` is gated on `drillState.partner`, so at root it's inactive.
- Root-level sparkline and sidebar partner list: both consume `data.data` unfiltered.

### What the fix has to do (per locked decision)
1. Apply `dimensionFilters` to the raw `data.data` batch rows → produce `filteredRawData`.
2. Feed `filteredRawData` to: `buildPartnerSummaryRows`, `CrossPartnerProvider`, `SidebarDataPopulator`, sparklines, KPI computations.
3. Ensure drilldown cascade: when `drillState.level !== 'root'`, preserve the dimension filter in the filtered data passed downstream. (Today, the `tableData` memo at `data-display.tsx:175` filters by `drillState.partner` but not by root-level dimension filters — so drilling in "resets" the filter implicitly.)
4. When `filteredRawData` is empty, render `<FilterEmptyState onClearFilters={clearAll} />` (already exists at `src/components/filters/filter-empty-state.tsx` — reusable).

### Surfaces to touch (ordered by risk)
1. `src/components/data-display.tsx` — new `filteredRawData` memo, threaded through 5 downstream consumers.
2. `src/components/data-display.tsx:666-683` — `rootSummaryRows` memo switches from `allData` to `filteredRawData`.
3. `src/components/table/data-table.tsx:172` — currently passes `columnFilters` to `useDataTable` only at root; with the upstream fix, this pass-through becomes redundant for root and can be removed (filter is already reflected in the summary rows).
4. `FilterEmptyState` copy — CONTEXT.md asks for "No rows match the filter" hint. Current copy says "No results match your filters." Close enough — adjust to match.
5. Empty-state detection — at root, `!hasFilteredRows && hasActiveFilters && isRoot` (current guard at `data-table.tsx:326`) works but relies on `hasFilteredRows` being derived from `table.getRowModel().rows.length`. If we fix upstream, `rootSummaryRows` may be empty directly → needs an `effectiveData.length === 0 && hasActiveFilters` check before rendering the table at all.

## KI-16 inventory: error boundary sites (HEALTH-02)

Exact mount points in `src/components/data-display.tsx`:

| Mount | Lines | Child(ren) |
|-------|-------|-----------|
| Chart section boundary | 394-430 | `CrossPartnerTrajectoryChart`, `PartnerComparisonMatrix`, `KpiSummaryCards`, `CollectionCurveChart` (both partner and batch level), `RootSparkline`, `PartnerSparkline` |
| Table section boundary | 432-480 | `CrossPartnerDataTable` |

**Fallback UI reuse:** `src/components/ui/alert.tsx` (Alert + AlertDescription) is already imported and used for schema warnings at lines 367-391. Same shape can host the fallback. `AlertTriangle` icon from `lucide-react` is also already imported.

**Expandable details:** Use native `<details>` / `<summary>` to avoid Radix / state plumbing. Matches the "compact" decision.

**Resource check:** `react-error-boundary` NOT in `package.json`. Either add it OR hand-roll a ~30-line class component. User delegated this to Claude's discretion. See recommendation above.

## KI-13 inventory: setState-in-effect (HEALTH-03, 5 sites)

| # | File:Line | Shape | Risk | Recommendation |
|---|-----------|-------|------|----------------|
| 1 | `src/components/columns/column-group.tsx:127` | `useEffect` auto-expands group when search matches — `setExpanded(true)` | **Clean refactor candidate**: can be derived state — `const isExpanded = manualExpanded ?? (searchFilter && filteredColumns.length > 0)` | FIX |
| 2 | `src/hooks/use-column-management.ts:40` | `useEffect` reads localStorage, calls `setColumnVisibility`/`setColumnOrder` | **Deferred**: SSR hydration guard — must not run during render (see Pitfall 4) | OPT-OUT with comment |
| 3 | `src/hooks/use-saved-views.ts:68` | Same pattern as #2 — localStorage hydration → setViews | **Deferred**: SSR hydration guard | OPT-OUT with comment |
| 4 | `src/components/views/save-view-input.tsx:37` | `useEffect([name])` → `setShowReplace(false)` | **Clean refactor candidate**: derived — `showReplace` can be tracked by a ref + event handler, or reset in the `onChange` handler | FIX |
| 5 | `src/lib/table/hooks.ts:140` | `useEffect` checking `prevColumnsRef.current !== columns` → `setSorting([])` | **Behavior-risk**: this resets sort when columns change (e.g. drill level change). Refactor would shift when sort resets fire | OPT-OUT with comment OR refactor to a `useMemo` guard — decide per site |

## KI-14 inventory: ref access during render (HEALTH-04, 3 sites)

| # | File:Line | Shape | Risk | Recommendation |
|---|-----------|-------|------|----------------|
| 1 | `src/lib/table/hooks.ts:86` | `tableRef.current.setOptions(prev => ...)` called directly in render | **Defer** — intentional React-19 workaround for TanStack v8 (see Pitfall 5). Rewriting likely breaks the table. | OPT-OUT / stop-and-ask |
| 2 | `src/lib/table/hooks.ts:98` | `return tableRef.current;` — ref read in render | **Defer** — same site as #1, same intentional pattern | OPT-OUT / stop-and-ask |
| 3 | `src/components/table/data-table.tsx:159` (and :175) | `setActivePresetRef.current = setActivePreset` written during render; read via callback | **Clean refactor candidate** using callback-ref or `useEffectEvent` pattern. But: the callback was specifically designed so that `useColumnManagement` can call `setActivePreset` without re-subscribing. Refactoring needs care. | Attempt refactor; STOP-AND-ASK if behavior shifts |

## KI-12 inventory: React Compiler memoization warnings (HEALTH-05, 3 sites)

| # | File:Line | Shape | Recommendation |
|---|-----------|-------|----------------|
| 1 | `src/components/data-display.tsx:147` | `const tableData = useMemo(() => { ... }, [data?.data, accountData?.data, drillState.level, drillState.partner])` — sub-property drilling | Fix dep array: use `data`, `accountData`, `drillState` object refs instead. Low risk. |
| 2 | `src/components/data-display.tsx:161` | `const batchCurve = useMemo(() => { ... }, [drillState.level, drillState.batch, partnerStats?.curves])` — similar pattern | Fix dep array: use `drillState`, `partnerStats` object refs. Low risk. |
| 3 | `src/lib/table/hooks.ts:127` | `const columns = useMemo(() => { ... }, [options?.columns, options?.extraColumns])` | Fix dep array: use `options` object ref. BUT — `options` is recreated on every render inside `DataTable`, so this may trigger more recomputes. **Test before committing.** Could become opt-out if it breaks memoization. |

## KI-22 inventory: unused imports (HEALTH-06, 7 files)

| File | Unused symbol | Verified via grep |
|------|---------------|-------------------|
| `src/components/charts/collection-curve-chart.tsx` | `BatchAnomaly` (line 15) | ✅ Imported but not referenced |
| `src/components/charts/pivot-curve-data.ts` | `_metric` (line 105, param) | ✅ Prefixed — intentionally unused? Check if ESLint rule allows `_` prefix; if yes, leave it with a comment. If no, remove. |
| `src/components/columns/column-picker-sidebar.tsx` | `IDENTITY_COLUMNS` (line 22) | ✅ Imported but not referenced |
| `src/components/data-display.tsx` | `dataUpdatedAt` (line 113, destructured) | ✅ Destructured but never read |
| `src/components/table/sort-dialog.tsx` | `config` (line 119) | ✅ Local variable never read after assignment |
| `src/components/table/table-body.tsx` | `useRef` | Import-level unused |
| `src/hooks/use-suggested-prompts.ts` | `KpiAggregates, TableState, Updater` | Type imports unused |

**Scan/verify command:** `pnpm lint` — flags these via `@typescript-eslint/no-unused-vars`. Run before AND after to confirm zero new warnings.

## Code Examples

### Apply filter upstream (KI-07 fix shape, illustrative)
```tsx
// Source: adapted from existing data-display.tsx patterns
const filteredRawData = useMemo(() => {
  if (!data?.data) return [];
  if (dimensionFilters.length === 0) return data.data;
  return data.data.filter((row) =>
    dimensionFilters.every((cf) => {
      const value = row[cf.id];
      return value != null && String(value) === String(cf.value);
    }),
  );
}, [data?.data, dimensionFilters]);

// Downstream: use filteredRawData instead of data.data
const rootSummaryRows = useMemo(
  () => (drillState.level === 'root' ? buildPartnerSummaryRows(filteredRawData) : []),
  [drillState.level, filteredRawData],
);
```

### Section error boundary with reset (Plan B)
```tsx
// Source: react-error-boundary README (v6+)
'use client';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

function SectionFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Alert className="mx-2 mt-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <span className="font-medium">Chart couldn&apos;t load.</span>
        <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
          Try again
        </Button>
        <details className="mt-2 text-xs text-muted-foreground">
          <summary>Show details</summary>
          {error.message}
        </details>
      </AlertDescription>
    </Alert>
  );
}

// At each section site:
<ErrorBoundary FallbackComponent={SectionFallback} resetKeys={[data]}>
  <ChartSection />
</ErrorBoundary>
```

### React Compiler opt-out with comment (KI-12, one of three)
```tsx
// 'use no memo' — deps intentionally sub-property to avoid re-memoizing
// when unrelated `options` props change (e.g. `trendingData`). Align at the
// cost of extra recomputes we don't want here.
const columns = useMemo(() => {
  const base = options?.columns ?? columnDefs;
  if (options?.extraColumns?.length) return [...base, ...options.extraColumns];
  return base;
}, [options?.columns, options?.extraColumns]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class component error boundary | `react-error-boundary` library (hooks-based) | React 16.6+ (2018); library stable since 2020 | Less boilerplate; declarative reset keys |
| Next.js `reset` fn in `error.tsx` | Next.js `unstable_retry` fn in `error.tsx` | Next 16 | Renamed; behavior similar. **Irrelevant to this phase — we don't use `error.tsx` for section boundaries** |
| Manual `React.memo` + `useMemo` dep tuning | React Compiler auto-memoization | React 19 (opt-in via `babel-plugin-react-compiler`) | Compiler warns when manual and inferred deps disagree (KI-12). Fix deps or opt out per function. |
| `setState` in `useEffect` for derived state | Derive during render or in event handlers | React 18+ docs (2022+) | Explicit React docs guidance: "You Might Not Need an Effect" |
| Jest + Enzyme | Vitest + Testing Library | ~2022 onward | Vitest faster with ESM + Next 16 + React 19 |

**Deprecated / outdated in this repo:**
- Nothing deprecated. The repo is on current stable versions.

## Open Questions

1. **Test runner — install or skip?**
   - What we know: Repo has zero `*.test.*` or `*.spec.*` files, no runner config, no runner in `devDependencies`.
   - What's unclear: CONTEXT.md says "don't absorb test-infrastructure setup into this phase" AND "per-fix targeted regression tests." These conflict when no infra exists.
   - Recommendation: **Escalate at plan time.** Either (a) install vitest + testing-library in a Wave 0 task (user approves), OR (b) ship Plan C with visual-verification-only and document the test gap.

2. **`lib/table/hooks.ts:86-98` — refactor or defer?**
   - What we know: It's an intentional React-19 workaround for TanStack v8. Comments are explicit.
   - What's unclear: Whether "fix it pragmatically" means leaving it with an opt-out comment vs. waiting for TanStack v9.
   - Recommendation: Opt out with a pointer comment to TanStack v8→v9 migration. Apply the escalation rule if anyone tries to rewrite.

3. **`react-error-boundary` vs hand-roll?**
   - What we know: User delegated to Claude's discretion.
   - Recommendation: Library — see "Standard Stack" rationale.

4. **Cascade semantics edge case: drill cascading with a filter that's already narrower than the drill?**
   - Example: User sets `PARTNER_NAME=Acme` at root, then drills into partner Acme. The partner filter is redundant but shouldn't cause duplication errors.
   - Recommendation: No special handling needed — the filter applies to `data.data`, drill applies to the same filtered set. Additive and idempotent. Confirm visually.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **NONE** — no vitest, jest, playwright, or any other runner installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| HEALTH-01 | Root filter reduces rows; zero-match shows empty state; cascade into drill | unit + integration | TBD after runner decision | ❌ Wave 0 |
| HEALTH-02 | Boundary catches render error in chart section; "Try again" resets | component | TBD | ❌ Wave 0 |
| HEALTH-02 | Boundary catches render error in table section; "Try again" resets | component | TBD | ❌ Wave 0 |
| HEALTH-03 | Refactored hooks preserve observable behavior (3 of 5 sites) | unit | TBD | ❌ Wave 0 |
| HEALTH-04 | Ref refactor at `data-table.tsx:159` preserves preset-change behavior | unit | TBD | ❌ Wave 0 |
| HEALTH-05 | Compiler warnings gone from `pnpm build` output (skip test) | build-log check | `pnpm build` | ✅ |
| HEALTH-06 | `pnpm lint` reports zero unused-vars in the 7 files | lint | `pnpm lint` | ✅ |

### Sampling Rate
- **Per task commit:** `pnpm lint` (always runnable) + `pnpm build` (for Compiler warnings)
- **Per wave merge:** Full test run (IF runner installed) + visual preview for Plans B and C
- **Phase gate:** Visual UAT from `docs/UAT-TEST-SCRIPT.md` + `pnpm lint` clean + (if installed) `pnpm test` green

### Wave 0 Gaps
- [ ] **DECISION REQUIRED:** Install vitest + @testing-library/react + jsdom, OR ship test-free and rely on visual verification for Plans B and C. Per CONTEXT.md, this decision must go to the user before any test-authoring task enters a plan.
- [ ] If vitest installed: `vitest.config.ts`, `tests/setup.ts` with `@testing-library/jest-dom`, `package.json` script `"test": "vitest"`.
- [ ] Add `react-error-boundary` to `dependencies` (only if Plan B uses the library).

*(If the user chooses test-free: this section's gaps collapse to "Add react-error-boundary (if library route)." All HEALTH requirements verify via visual UAT + `pnpm lint` + `pnpm build`.)*

## KNOWN-ISSUES.md update mechanics

Format of existing entries (verified from the live file):

```markdown
### KI-07: Dimension filter at root level does not reduce table rows
**Severity:** Medium
**File(s):** `src/hooks/use-filter-state.ts`
Known bug from v2. When a dimension filter is applied at the root level, table rows are not filtered accordingly.
**Suggested fix:** Investigate filter predicate logic in `use-filter-state.ts` for root-level dimension handling.
```

**Per-fix update pattern (aligned with CONTEXT.md):**
Append a closing block at the bottom of each KI entry in the same commit that closes the fix:
```markdown
**Resolved:** 2026-04-XX in Phase 25 (commit SHA). See `src/components/data-display.tsx` — filter now applied upstream of `buildPartnerSummaryRows`.
```

Alternatively, move resolved entries to a new "## Resolved" section. The planner should pick one convention and apply it consistently across all six KIs. Document counter in the Summary table will need a decrement per fix.

**Location:** `/Users/micah/Desktop/CODE/DATA VISUALIZER/docs/KNOWN-ISSUES.md`

## Sources

### Primary (HIGH confidence)
- Direct inspection of all source files cited: `src/hooks/use-filter-state.ts`, `src/components/data-display.tsx`, `src/components/table/data-table.tsx`, `src/lib/table/hooks.ts`, `src/components/columns/column-group.tsx`, `src/hooks/use-column-management.ts`, `src/hooks/use-saved-views.ts`, `src/components/views/save-view-input.tsx`, `src/lib/columns/root-columns.ts`, `src/components/filters/filter-empty-state.tsx`, `src/components/empty-state.tsx`
- `package.json` — confirms library versions, absence of test runner, absence of `react-error-boundary`
- `eslint.config.mjs` — confirms `eslint-config-next` is the only lint config
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` — confirms Next 16 `unstable_retry` rename and client-only requirement
- `docs/KNOWN-ISSUES.md` — confirms KI-07 through KI-22 site references

### Secondary (MEDIUM confidence)
- `react-error-boundary` README at https://github.com/bvaughn/react-error-boundary — `resetKeys`, `FallbackComponent`, `useErrorBoundary` API contract

### Tertiary (LOW confidence)
- None. This phase is entirely about sites already in the repo; no speculative research needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from `package.json`; Next 16 docs verified from bundled `node_modules` path
- Architecture: HIGH — all 22 KI sites opened and read
- Pitfalls: HIGH — pitfalls sourced from comments in the repo itself (hydration guards, TanStack workaround) and React 19 semantics

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — stable dependencies, phase scope is narrow)
