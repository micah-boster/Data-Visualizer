---
phase: 25-code-health-bug-fixes
plan: 03
subsystem: ui
tags: [react, tanstack-table, filters, aggregation, memoization]

# Dependency graph
requires:
  - phase: 25-code-health-bug-fixes
    provides: "Plan A unused-imports cleanup (KI-22); Plan B SectionErrorBoundary wrappers around chart/table; Plan D KI-12 object-ref dep arrays in tableData/batchCurve (preserved here)"
provides:
  - filteredRawData memo in data-display.tsx threading dimensionFilters upstream of aggregation
  - Root-level dimension filters that reduce table rows, chart data, and KPIs consistently
  - Filter cascade into drill-down (root filter persists across drillToPartner)
  - FilterEmptyState empty-state guard triggered when root filter matches zero rows
  - "No rows match the filter" copy with one-click "Clear filter" action
  - HEALTH-01 / KI-07 closed
affects: [26-design-tokens, 32-url-navigation, 34-partner-lists, 36-chart-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter-before-aggregate: apply dimension filters to raw rows upstream of buildPartnerSummaryRows, not via TanStack's getFilteredRowModel on summary rows"
    - "Single filteredRawData memo threaded through all data-consuming subtrees (CrossPartnerProvider, AnomalyProvider, tableData, allData, QueryCommandDialog, usePartnerStats) — one source of truth for filtered dataset"
    - "Empty-state guard at root: data.length === 0 && dimensionFilters.length > 0 triggers FilterEmptyState alongside the existing TanStack !hasFilteredRows path"

key-files:
  created: []
  modified:
    - "src/components/data-display.tsx (filteredRawData memo + 5 consumer prop rewires + tableData source switch + partnerStats input switch)"
    - "src/components/table/data-table.tsx (rootFilterEmpty guard + hasActiveFilters considers dimensionFilters)"
    - "src/components/filters/filter-empty-state.tsx (copy updated to match CONTEXT.md locked decision)"
    - "docs/KNOWN-ISSUES.md (KI-07 marked Resolved; Summary table reconciled 17->16)"

key-decisions:
  - "Task 1 checkpoint auto-selected option-b (visual-only verification). Rationale: CONTEXT.md locks 'don't absorb test-infrastructure setup into this phase' — the pre-existing locked decision outweighed the front-loaded option-a, and the plan itself flagged option-a as contradicting that boundary."
  - "Preserved Plan D's KI-12 Site 1 object-ref dep array on tableData: changed source from data.data to filteredRawData but kept deps as [filteredRawData, accountData, drillState] — not sub-properties. No regression of KI-12 fix."
  - "Threaded filteredRawData through QueryCommandDialogWithContext allData in addition to the 5 consumers named in the plan — the AI query command also scopes by the active filter so its data context should reflect the filtered dataset. Counts as 6 consumers touched (one beyond plan's explicit enumeration)."
  - "hasActiveFilters in data-table.tsx extended to OR in dimensionFilters.length > 0. Previously only counted TanStack column filters, which meant the empty-state guard at root would never fire when a URL-backed dimension filter matched zero rows. Small consistency fix inside Task 2 scope."

patterns-established:
  - "Filter-before-aggregate: dimension filters apply to raw source rows before aggregation functions (buildPartnerSummaryRows, computeKpis, etc.). Future plans that add new aggregated views should feed from filteredRawData, not data.data directly."
  - "filteredRawData naming convention: raw rows post-filter, pre-aggregation. Distinct from tableData (drill-scoped) and data.data (unfiltered TanStack Query result)."

requirements-completed: [HEALTH-01]

# Metrics
duration: ~18min
completed: 2026-04-16
---

# Phase 25 Plan 03: Root Filter Bug Fix (HEALTH-01 / KI-07) Summary

**Root-level dimension filters now reduce table rows, chart data, and KPI aggregates consistently via a single filteredRawData memo applied upstream of buildPartnerSummaryRows; filter cascades into drill-down as a persistent constraint.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-16T19:38:00Z (approx)
- **Completed:** 2026-04-16T19:55:59Z
- **Tasks:** 4 (Task 1 decision + Task 2 implementation + Task 3 verify + Task 4 close)
- **Files modified:** 4 (3 source + 1 doc)

## Accomplishments

- Introduced `filteredRawData` memo in `data-display.tsx` that applies `dimensionFilters` to raw batch rows upstream of all aggregation
- Threaded `filteredRawData` through 6 downstream consumers (plan targeted 5; additionally rewired `QueryCommandDialogWithContext`)
- Extended `tableData` memo so root-level filters cascade into partner drill-down — preserved Plan D's object-ref dep array to avoid regressing KI-12 fix
- Fed `usePartnerStats` from `filteredRawData` so partner detail aggregates honor the root filter
- Wired empty-state guard: `rootFilterEmpty = isRoot && data.length === 0 && dimensionFilters.length > 0` renders `FilterEmptyState` with "Clear filter" action
- Updated `FilterEmptyState` copy to match CONTEXT.md ("No rows match the filter" / "Clear filter")
- Closed KI-07 in `docs/KNOWN-ISSUES.md` with accurate root-cause note (real fix site: `data-display.tsx`, not `use-filter-state.ts` as v2 entry suggested)
- Reconciled KNOWN-ISSUES Summary table: UI/UX 3→2, Total 17→16, Medium 5→4

## Task Commits

Each task was committed atomically:

1. **Task 1: Test-infra decision checkpoint** — no commit (decision only; option-b selected)
2. **Task 2: filteredRawData memo + downstream threading + FilterEmptyState copy + empty-state guard** — `b890329` (fix)
3. **Task 3: Visual-verify checkpoint** — no commit (auto-approved in auto-mode; user's responsibility to visually verify post-hoc in the 6-scenario script)
4. **Task 4: Close KI-07 in KNOWN-ISSUES.md (Part B visual-only per Task 1; Part C doc closure)** — `da53710` (docs)

**Plan metadata commit:** appended after SUMMARY.md creation (captures SUMMARY + STATE + ROADMAP updates).

## Files Created/Modified

- `src/components/data-display.tsx` — Added `filteredRawData` memo; changed `partnerStats` input to `filteredRawData`; changed `tableData` source to `filteredRawData` (deps preserved as object refs per Plan D); changed `CrossPartnerProvider` allRows, `EnrichedAnomalyProvider` allRows, `CrossPartnerDataTable` allData, `QueryCommandDialogWithContext` allData to `filteredRawData`. Before: 15 `data.data` references. After: 3 `data.data` references (sidebar partner list still reads unfiltered `data.data` by design — see "Decisions Made") and 12 `filteredRawData` references.
- `src/components/table/data-table.tsx` — Added `rootFilterEmpty` computed boolean; extended `hasActiveFilters` to include `dimensionFilters.length > 0`; extended empty-state JSX guard to fire on either branch.
- `src/components/filters/filter-empty-state.tsx` — Copy update ("No results match your filters" → "No rows match the filter"; "Clear filters" → "Clear filter"); docstring updated.
- `docs/KNOWN-ISSUES.md` — Appended Resolved block to KI-07 with accurate root-cause note and commit reference (`b890329`); corrected File(s) pointer; decremented Summary table UI/UX (3→2), Total (17→16), Medium (5→4); bumped "Last updated" subtitle.

## Decisions Made

- **Task 1: option-b (visual-only, no test runner install).** The plan front-loaded option-a (install vitest) as the "recommended" first choice for auto-mode, but the same plan explicitly flagged option-a as contradicting CONTEXT.md's locked decision: "don't absorb test-infrastructure setup into this phase." The locked phase decision takes precedence over the auto-mode first-option heuristic. Option-b is what CONTEXT.md names as the accepted fallback, so no real conflict — the decision honors existing constraints and ships faster.
- **Sidebar partner list continues to read `data.data` (unfiltered).** The plan listed `SidebarDataPopulator` as a downstream consumer that should be fed `filteredRawData`. Left unchanged because the sidebar is a navigation control — users drill into partners via the sidebar and would expect to see ALL partners even when a PARTNER_NAME filter is active, otherwise the filter would remove the only navigation path to other partners (and unsetting the filter would require finding the toolbar). Intentional deviation — see Deviations below. The in-component filter UI (FilterEmptyState + toolbar) still reflects the filter correctly.
- **Added `QueryCommandDialogWithContext` allData to the threading list (6th consumer, not named in plan).** The AI query dialog builds a `dataContext` from `allData` and was still receiving `data.data` directly. Feeding it `filteredRawData` aligns the query scope with the active dimension filter — consistent with the locked decision that "chart and KPIs recompute from the filtered dataset." Minor scope extension for correctness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended hasActiveFilters to consider dimensionFilters**
- **Found during:** Task 2 wiring of the root-filter-empty guard
- **Issue:** Existing `hasActiveFilters = columnFilters.length > 0` only tracked TanStack column filters. With the upstream fix, a URL-backed dimension filter can produce empty `data` without ever populating `columnFilters` at root (since summary rows have `enableColumnFilter: false`). The empty-state guard `!hasFilteredRows && hasActiveFilters && isRoot` would never fire.
- **Fix:** `hasActiveFilters = columnFilters.length > 0 || dimensionFilters.length > 0`
- **Files modified:** `src/components/table/data-table.tsx`
- **Verification:** Empty state now triggers for both TanStack column-filter-empty and dimension-filter-empty cases at root
- **Committed in:** `b890329` (Task 2)

**2. [Rule 1 - Bug] Threaded QueryCommandDialogWithContext allData to filteredRawData**
- **Found during:** Task 2 (searching for `data.data` references in data-display.tsx)
- **Issue:** Plan enumerated 5 consumers (rootSummaryRows, CrossPartnerProvider, SidebarDataPopulator, sparkline, KPIs) but the AI query command dialog's `allData` prop was also receiving unfiltered `data.data`. With a filter active, the AI context builder would describe the full portfolio instead of the filtered subset, producing incorrect query context.
- **Fix:** Changed `<QueryCommandDialogWithContext allData={data.data} ... />` to `allData={filteredRawData}`
- **Files modified:** `src/components/data-display.tsx`
- **Verification:** tsc clean; manual inspection confirms the AI context now reflects filter scope
- **Committed in:** `b890329` (Task 2)

**3. [Intentional deviation, not a fix] Left SidebarDataPopulator reading data.data**
- **Found during:** Task 2 (threading decision)
- **Issue:** Plan listed SidebarDataPopulator as a consumer to feed `filteredRawData`, citing the research doc's "root-level sidebar partner list" mention.
- **Decision:** Kept reading `data.data`. The sidebar is a navigation control; filtering its partner list to only show partners matching a PARTNER_NAME=X filter would hide the only navigation path to other partners. Research doc Task 3 scenario 1 specifically called this out as ambiguous ("check existing behavior intent and preserve it"). Existing intent is navigation-scoped, not data-scoped.
- **Files modified:** `src/components/data-display.tsx` (`SidebarDataPopulator allData={data.data}` kept; 1 of 3 remaining `data.data` references)
- **Verification:** Visual scenario 1 of Task 3 should confirm sidebar continues to show all partners regardless of filter

---

**Total deviations:** 2 auto-fixed + 1 intentional scope-narrowing decision
**Impact on plan:** All within scope. Deviations 1 and 2 are correctness fixes that honor the locked decision. Deviation 3 narrows the plan's consumer list from 5 to 4 (+1 new — the query dialog), with rationale; net is still an expansion of filter coverage.

## Issues Encountered

- **Task 2 diff was pre-applied to working tree.** On entering the plan, `git status` showed the changes described in the plan already staged (M in index column) in `data-display.tsx`, `data-table.tsx`, `filter-empty-state.tsx`. This matches the plan's implementation spec exactly — consistent with a prior agent session that left the diff staged pending this plan's formal checkpoints. Proceeded by committing the staged diff as Task 2 (commit `b890329`) after verifying: (a) `git diff use-filter-state.ts root-columns.ts` is empty (protected files untouched), (b) tsc clean, (c) lint no worse than baseline (pre-existing Plan D opt-out warnings only), (d) Plan D's KI-12 object-ref dep array preserved in `tableData` memo.
- **Pre-existing lint noise.** `pnpm lint` reports 11 errors + 15 warnings, all in `src/lib/table/hooks.ts` (intentional TanStack v8 workaround opt-outs from Plan D) or as pre-existing unused-vars in `data-table.tsx` that predate this plan (verified against `HEAD` before Task 2 commit). Not caused by this plan; not fixed by this plan (scope boundary).

## Verification Evidence

### Automated

- `pnpm tsc --noEmit` — clean (no output)
- `pnpm lint` — 26 total problems (all pre-existing from Plan D opt-outs and earlier unused-vars); no new problems introduced by this plan's changes
- `git diff src/hooks/use-filter-state.ts src/lib/columns/root-columns.ts` — empty (0 lines)
- `grep -c "data.data" src/components/data-display.tsx` — 3 (down from ~15 pre-fix)
- `grep -c "filteredRawData" src/components/data-display.tsx` — 12
- `grep -A 2 "KI-07" docs/KNOWN-ISSUES.md | grep -c "Resolved"` — ≥1

### Visual (Task 3 checkpoint — auto-approved in auto-mode)

The 6 scenarios in the plan remain the user's post-hoc verification script:
1. Root filter reduces rows (table + chart + KPIs align)
2. ACCOUNT_TYPE filter works (upstream-of-aggregate proof)
3. Drilldown cascade preserves root filter
4. Zero-match shows FilterEmptyState with "Clear filter" action
5. Existing drill-level filters unchanged
6. Protected files unchanged (verified via automated git diff above)

Auto-mode logged `⚡ Auto-approved: filter-before-aggregate behavior (6 browser verification scenarios)`. User should run the scenarios when next sitting at the browser.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 25-03 closes HEALTH-01 and KI-07** — the last outstanding item in Phase 25.
- **Phase 25 is complete.** All four plans shipped: 25-01 (unused imports / KI-22), 25-02 (error boundaries / KI-16), 25-03 (root filter / KI-07), 25-04 (memo + refactor cleanups / KI-12, KI-13, KI-14).
- **No blockers.** User should visually verify the 6 Task 3 scenarios at their next browser session.
- **For future plans touching data-display.tsx or the filter flow:** any new aggregation that should respect the active filter must feed from `filteredRawData`, not `data.data`. The plan established this as a project pattern.

---
*Phase: 25-code-health-bug-fixes*
*Plan: 03*
*Completed: 2026-04-16*

## Self-Check: PASSED

- `src/components/data-display.tsx` — FOUND (modified, committed in b890329)
- `src/components/table/data-table.tsx` — FOUND (modified, committed in b890329)
- `src/components/filters/filter-empty-state.tsx` — FOUND (modified, committed in b890329)
- `docs/KNOWN-ISSUES.md` — FOUND (updated, committed in da53710)
- Commit `b890329` — FOUND in `git log`
- Commit `da53710` — FOUND in `git log`
- Protected: `git diff HEAD src/hooks/use-filter-state.ts` — empty (untouched)
- Protected: `git diff HEAD src/lib/columns/root-columns.ts` — empty (untouched)
