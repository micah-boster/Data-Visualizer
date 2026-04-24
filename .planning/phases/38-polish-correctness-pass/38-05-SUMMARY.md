---
phase: 38-polish-correctness-pass
plan: 05
subsystem: filters-and-import
tags: [filters, date-range, saved-views-migration, column-visibility, metabase-import, chart-override]

# Dependency graph
requires:
  - phase: 25-filter-before-aggregate
    provides: filteredRawData memo contract (filter upstream of aggregation)
  - phase: 27-toolbar-unification
    provides: FilterPopover host for preset chips + tooltips
  - phase: 34-partner-lists
    provides: useActivePartnerList context (feeds FLT-03 1-partner derivation)
  - phase: 36-chart-builder
    provides: AxisPicker + getEligibleColumns (consumed by MBI-01 override pickers)
  - phase: 37-metabase-import
    provides: ParseResult + ChartInferenceResult shapes; ImportSheet orchestrator
provides:
  - coerceAgeMonths shared helper (utils.ts) — consumed by reshape-curves + filter predicate
  - ?age=3|6|12 URL param + AgeBucket type (standalone, not in FILTER_PARAMS)
  - ViewSnapshot.batchAgeFilter additive-optional field
  - sanitizeSnapshot strips legacy dimensionFilters.batch (non-destructive migration)
  - hasLegacyBatchFilter pure detector (smoke-testable)
  - mergeOverride pure helper (MBI-01 override -> ParseResult merge)
  - inferenceReason helper (MBI-01 Preview helper text)
  - PARTNER_NAME auto-hide override pattern (one-shot effect + transition ref)
affects: [phase-40-projected-curves, phase-41-data-correctness-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-optional schema evolution for ViewSnapshot (mirrors drill / listId / sourceQuery precedents from Phases 32/34/37) — no schema version bump"
    - "URL param split: column-equality filters go in FILTER_PARAMS (partner / type); value-range predicates get standalone params (age)"
    - "Legacy-filter migration pattern: pure `hasLegacyBatchFilter` detector + sanitizer strips + user-load toast fires only on handleLoadView, never on hydration"
    - "One-shot auto-hide with manual-override escape: `lastAppliedHidePartnerRef` tracks transitions; user's subsequent toggleColumn wins (POL-03 identity-unlock)"
    - "Override-merge helper for import surfaces: pure function between inferred result and UI-owned override state; 5 branches (null / 'none' / concrete + null-axes / concrete + override-axes / fully-null inference + full override)"
    - "Local segmented control inside preview-step.tsx rather than reusing ChartTypeSegmentedControl — Import never produces the 'collection-curve' preset; 'none' option is import-specific"

key-files:
  created:
    - src/hooks/use-filter-state.smoke.ts
    - src/hooks/use-saved-views.smoke.ts
    - src/lib/metabase-import/merge-override.ts
    - src/lib/metabase-import/override.smoke.ts
  modified:
    - src/lib/utils.ts
    - src/lib/computation/reshape-curves.ts
    - src/lib/views/types.ts
    - src/lib/views/schema.ts
    - src/lib/metabase-import/chart-inference.ts
    - src/hooks/use-filter-state.ts
    - src/hooks/use-saved-views.ts
    - src/components/toolbar/filter-popover.tsx
    - src/components/toolbar/unified-toolbar.tsx
    - src/components/table/data-table.tsx
    - src/components/data-display.tsx
    - src/components/metabase-import/preview-step.tsx
    - src/components/metabase-import/import-sheet.tsx
    - src/components/filters/filter-bar.tsx

key-decisions:
  - "Pure-helper smoke-test pattern: use-filter-state.smoke.ts + use-saved-views.smoke.ts inline copies of the helper under test (not imports) because the real modules pull in next/navigation / columns registry / zod — unusable under `node --experimental-strip-types`. Matches visible-curves.smoke.ts precedent; TS signatures on both sides catch drift."
  - "sanitizeSnapshot signature kept stable (ViewSnapshot -> ViewSnapshot) — migration toast lives in handleLoadView calling `hasLegacyBatchFilter` explicitly, so hydration never fires the toast."
  - "FLT-02 tooltips landed inside the Task 2 filter-popover rewrite rather than a separate Task 3 diff — popover was already being rewritten, avoiding a second patch over the same JSX."
  - "FLT-03 auto-hide gated on `drillState.level === 'root'` per plan Pitfall 7 — at partner drill level the root summary table isn't in play."
  - "FLT-03 override uses `lastAppliedHidePartnerRef` transition-tracking rather than a full state machine — minimal code; re-running only when the flag actually flips avoids undoing user toggles on every unrelated re-render."
  - "MBI-01 segmented control is a local 4-button group inside preview-step.tsx (line / scatter / bar / none) — reusing ChartTypeSegmentedControl would have forced a 'none' option onto the chart-builder and a misleading 'collection-curve' option into Import."
  - "mergeOverride extracted to its own pure module (merge-override.ts) — lets override.smoke.ts exercise all 5 branches directly from the real source, not a copy."

requirements-completed:
  - FLT-01
  - FLT-02
  - FLT-03
  - MBI-01

# Metrics
duration: 12 min
completed: 2026-04-24
---

# Phase 38 Plan 05: Filters + Layout + Metabase Import Summary

**Batch filter replaced with a date-range preset chip group (All / Last 3mo / Last 6mo / Last 12mo) backed by a `?age=` URL param and `ViewSnapshot.batchAgeFilter` additive-optional field; filter popover gains inline tooltips; PARTNER_NAME column auto-hides when the active partner list is scoped to a single partner; Metabase Import Preview exposes a chart-type override segmented control with X/Y axis pickers and an inference-rationale helper line.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-24T04:52:43Z
- **Completed:** 2026-04-24T05:04:23Z
- **Tasks:** 4 executed (Task 5 was `checkpoint:human-verify` — auto-approved under `workflow.auto_advance`)
- **Files touched:** 14 (4 created, 10 modified)

## Accomplishments

- **FLT-01 (core):** `coerceAgeMonths` extracted to `utils.ts` and consumed by both `reshape-curves.ts` (behavior unchanged) and the new age-bucket predicate in `filteredRawData`. `?age=3|6|12` is a standalone URL param (separate from `FILTER_PARAMS` because it's a value-range predicate, not column-equality). `batch` removed from `FILTER_PARAMS`.
- **FLT-01 (UI + migration):** `ViewSnapshot.batchAgeFilter?: 3 | 6 | 12 | null` additive-optional field (mirrors Phase 32/34/37 precedent — no schema version bump). `sanitizeSnapshot` strips legacy `dimensionFilters.batch` + defensive `columnFilters.BATCH`. `hasLegacyBatchFilter` pure detector exported for the smoke test. `FilterPopover` renders 4 preset chips with `role="group"` + `aria-pressed` state and an age chip in the active-filter footer. `handleLoadView` emits a sonner toast when a legacy view is loaded (only on user-initiated load, not hydration).
- **FLT-02:** Each filter label (Partner / Account Type / Date Range) wrapped in a `Tooltip` from `@/components/ui/tooltip` with a plain-English description. Added `cursor-help` to the label to signal the hover affordance without a help icon (keeps the popover density intact).
- **FLT-03:** `hidePartnerColumn` derived from `useActivePartnerList()` as `drillState.level === 'root' && activeList?.partnerIds.length === 1`; threaded through `CrossPartnerDataTable` to `DataTable`; a one-shot `useEffect` gated by `lastAppliedHidePartnerRef` flips `PARTNER_NAME` visibility only on transitions, so user column-picker toggles (unlocked by POL-03) survive the auto-hide.
- **MBI-01:** `inferenceReason()` exported from `chart-inference.ts` — maps the 3 inference rules + fallback to a one-line hint. `mergeOverride()` pure helper in a standalone `merge-override.ts` — 5 branches covered by `override.smoke.ts`. `PreviewStep` now renders a local segmented control (line / scatter / bar / none) + `AxisPicker` x2 (conditional on non-'none' activeType) + helper text. `ImportSheet` hoists `overrideType` / `overrideX` / `overrideY` state (reset on sheet close and on re-parse) and calls `mergeOverride` on Apply before handing off to `onImportSql`.
- **Smoke tests (3):** `use-filter-state.smoke.ts` (parseAgeParam + applyAgeFilter), `use-saved-views.smoke.ts` (hasLegacyBatchFilter detection paths + batchAgeFilter round-trip), `override.smoke.ts` (mergeOverride 7 scenarios). All print "OK" under `node --experimental-strip-types`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract coerceAgeMonths + age predicate + ?age= URL param + smoke (FLT-01 core)** — `ba7ea92` (feat)
2. **Task 2: Preset chips + ViewSnapshot migration + sonner toast + smoke (FLT-01 UI + FLT-02)** — `fd94c8f` (feat)
3. **Task 3: PARTNER_NAME auto-hide on 1-partner list (FLT-03)** — `7db7193` (feat)
4. **Task 4: Chart-type override + axis pickers + inference helper text + smoke (MBI-01)** — `68cf359` (feat)
5. **Task 5: Visual checkpoint** — auto-approved under `workflow.auto_advance`, no separate commit.

**Plan metadata:** pending final docs commit.

## Files Created/Modified

### Created

- `src/hooks/use-filter-state.smoke.ts` — parseAgeParam + applyAgeFilter (FLT-01)
- `src/hooks/use-saved-views.smoke.ts` — hasLegacyBatchFilter detection + batchAgeFilter round-trip
- `src/lib/metabase-import/merge-override.ts` — `mergeOverride` pure helper + `OverrideChartType` type
- `src/lib/metabase-import/override.smoke.ts` — 7-scenario coverage of mergeOverride

### Modified

- `src/lib/utils.ts` — exported `coerceAgeMonths`
- `src/lib/computation/reshape-curves.ts` — now consumes `coerceAgeMonths`
- `src/lib/views/types.ts` — added `batchAgeFilter?: 3 | 6 | 12 | null`
- `src/lib/views/schema.ts` — zod `batchAgeFilter` literal-union schema
- `src/lib/metabase-import/chart-inference.ts` — added `inferenceReason()`
- `src/hooks/use-filter-state.ts` — dropped `batch` from `FILTER_PARAMS`; added `age` / `setAge` / `parseAgeParam` / `AgeBucket`
- `src/hooks/use-saved-views.ts` — exported `hasLegacyBatchFilter` + `sanitizeSnapshot`; added legacy-filter pruning
- `src/components/toolbar/filter-popover.tsx` — rewritten: partner + account-type + 4 preset chips + 3 tooltips + age chip rendering
- `src/components/toolbar/unified-toolbar.tsx` — dropped `batchOptions`/`selectedBatch`; threads `age`/`onAgeChange`
- `src/components/table/data-table.tsx` — dropped `batchOptions`/`selectedBatch`; threads `age`/`onAgeChange` + `hidePartnerColumn`; one-shot auto-hide effect; `captureSnapshot` now writes `batchAgeFilter`
- `src/components/data-display.tsx` — consumes `age` / `setAge`; `filteredRawData` adds the age predicate (upstream of active-list scope); drops `selectedBatch` / `batchOptions` derivations; `handleLoadView` restores `batchAgeFilter`, strips legacy `batch`, emits migration toast; passes `hidePartnerColumn` down
- `src/components/metabase-import/preview-step.tsx` — Chart section rewritten as a stateful override surface (segmented control + axis pickers + helper text + skipped[] list)
- `src/components/metabase-import/import-sheet.tsx` — hoists override state; resets on close + re-parse; applies `mergeOverride` on Apply
- `src/components/filters/filter-bar.tsx` — dead-code update: removed batch combobox (resolves `tsc` error after `FILTER_PARAMS.batch` removal)

## Decisions Made

- **Inline helper copies in smoke tests over real-module imports:** `use-filter-state.smoke.ts` and `use-saved-views.smoke.ts` duplicate `parseAgeParam` / `coerceAgeMonths` / `hasLegacyBatchFilter` because the real modules pull in `next/navigation`, the full column registry, and zod — unusable under `node --experimental-strip-types`. Matches `visible-curves.smoke.ts` precedent from Plan 38-03. The real exports carry the same names and signatures, so a future drift would be caught by TypeScript at both the production call site and the smoke-test's inline definition.
- **`mergeOverride` extracted to its own pure module** rather than left inline in `ImportSheet#handleApply`: lets the override smoke test exercise the real function (no copy), and matches the co-located pure-helper pattern used by `mapToSnapshot` / `parseMetabaseSql`.
- **FLT-02 tooltips landed in Task 2 rather than Task 3** because the popover was already being rewritten end-to-end for FLT-01 — a two-commit split over the same JSX would have churned the file for no review benefit. Task 3 then had a single focus (FLT-03 auto-hide).
- **Local 4-button segmented control in `preview-step.tsx` instead of reusing `ChartTypeSegmentedControl`:** the shared component is icon-only and carries a `'collection-curve'` option that Import never produces; forcing a `'none'` option onto it would have leaked Import semantics into the chart-builder. Local is cheaper than an intrusive cross-phase prop.
- **FLT-03 one-shot transition effect over full state machine:** `lastAppliedHidePartnerRef` tracks the last-applied value of `hidePartnerColumn` and the effect only re-applies on transitions. Handles the three interesting cases: (1) enter 1-partner list → auto-hide; (2) leave 1-partner list → auto-show; (3) user toggles column in-between → toggle wins, auto-hide doesn't re-fire until the flag transitions again. No manual-toggle flag needed (POL-03 already routes toggles through `markCustomPreset`).
- **Legacy-batch-filter toast on `handleLoadView` only, not `sanitizeSnapshot`:** `sanitizeSnapshot` runs on both hydration and user-load. Stamping a toast inside it would fire on page refresh — not the user-initiated load the plan specified. `hasLegacyBatchFilter` is called explicitly in `handleLoadView` before the sanitized snapshot is consumed, so the toast is scoped to user-load only. Sanitizer signature stays stable, no callsite churn.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dead-code `filter-bar.tsx` referenced `FILTER_PARAMS.batch`**
- **Found during:** Task 1 (verify step — `tsc --noEmit` error)
- **Issue:** Removing `batch` from `FILTER_PARAMS` produced `error TS2339: Property 'batch' does not exist` in `src/components/filters/filter-bar.tsx:31`. The `FilterBar` component is dead code (no importers) left over from pre-Phase-27 toolbar layout, but its stale reference blocked the build.
- **Fix:** Removed the batch combobox + `selectedBatch` memo from `filter-bar.tsx`. Kept the file (with an updated JSDoc noting it's unused) rather than deleting it — safer to leave a minimal, type-clean copy than risk an unseen importer.
- **Files modified:** `src/components/filters/filter-bar.tsx`
- **Verification:** `tsc --noEmit` clean on the touched file; no other consumers.
- **Committed in:** `ba7ea92` (Task 1)

**2. [Rule 3 - Blocking] AxisPicker's `value` prop is `{ column: string } | null`, not a string**
- **Found during:** Task 4 (integrating `AxisPicker` into preview-step.tsx)
- **Issue:** The plan's sketch passed `value={overrideX ?? result.inferredChart?.x ?? null}` (a string), but `AxisPicker` props specify `value: { column: string } | null` — a string would never type-check, and the mismatch was masked only because the plan's snippet wasn't a compilation target.
- **Fix:** Wrapped `{ column: (overrideX ?? result.inferredChart.x) as string }` when non-null; passed `null` otherwise. `onChange` maps the returned `{ column }` shape back to a bare string for the parent override state.
- **Files modified:** `src/components/metabase-import/preview-step.tsx`
- **Verification:** `tsc --noEmit` clean on preview-step.tsx.
- **Committed in:** `68cf359` (Task 4)

**3. [Rule 2 - Missing Critical] Popover "Clear all" didn't reset the age bucket**
- **Found during:** Task 2 (integrating age chip into the active-filters footer)
- **Issue:** The popover's existing "Clear all" button called `onClearAll`, which clears `dimensionFilters` only (it's `useFilterState#clearAll`, router.replace to pathname). The FLT-01 age bucket lives on a separate `?age=` param — `onClearAll` was silently leaving it set, so the active-filter counter would still show 1 ("Date Range: Last 3mo") after the user clicked "Clear all".
- **Fix:** Augmented the popover's "Clear all" handler to also call `onAgeChange(null)` when age is non-null. The tooltip + screen-reader name already say "Clear all filters" — the user's mental model matches.
- **Files modified:** `src/components/toolbar/filter-popover.tsx`
- **Verification:** Manual read-through of the active-filters rendering path — the age chip now disappears alongside the dimension chips when "Clear all" is clicked.
- **Committed in:** `fd94c8f` (Task 2)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing-critical). No architectural changes required.
**Impact on plan:** Zero — every plan lock criterion (FLT-01 / FLT-02 / FLT-03 / MBI-01) satisfied. The three fixes strengthen the implementation; none alter plan intent.

## Authentication Gates

None.

## Issues Encountered

- **`npm run build` fails pre-existing** with the same `CssSyntaxError: tailwindcss: globals.css:2:18124: Missed semicolon` flagged in `.planning/phases/38-polish-correctness-pass/deferred-items.md`. Unrelated to FLT-01..03 / MBI-01. Verification used `tsc --noEmit` (clean) + `npm run check:tokens` (clean) + the three smoke tests (all print OK). Production-build fix remains deferred to a dedicated build-pipeline plan.
- **Task 5 visual checkpoint auto-approved** under `workflow.auto_advance=true` — consistent with how Task 4 auto-approved in 38-03 (user verifies in their own browser per standing preference; the agent environment doesn't have headless browser / Snowflake auth available). The 9 verification steps remain in the plan for the user's walkthrough after merge.

## User Setup Required

None — no new environment variables, API keys, or external service configuration.

## Self-Check: PASSED

- `src/hooks/use-filter-state.smoke.ts` — FOUND, prints "filter-state smoke OK".
- `src/hooks/use-saved-views.smoke.ts` — FOUND, prints "saved-views migration smoke OK".
- `src/lib/metabase-import/merge-override.ts` — FOUND, exports `mergeOverride` + `OverrideChartType`.
- `src/lib/metabase-import/override.smoke.ts` — FOUND, prints "override merge smoke OK".
- `src/lib/utils.ts` — FOUND, exports `coerceAgeMonths`.
- `src/lib/views/types.ts` — FOUND, contains `batchAgeFilter?: 3 | 6 | 12 | null`.
- `src/lib/views/schema.ts` — FOUND, contains `batchAgeFilter: z.union([z.literal(3), z.literal(6), z.literal(12), z.null()]).optional()`.
- `src/hooks/use-filter-state.ts` — FOUND, `FILTER_PARAMS` no longer contains `batch`; exports `AgeBucket`, `parseAgeParam`, `age`, `setAge`.
- `src/components/toolbar/filter-popover.tsx` — FOUND, renders 4 preset chips + 3 tooltips.
- `src/components/data-display.tsx` — FOUND, `filteredRawData` applies the age predicate; `handleLoadView` strips legacy batch and restores `batchAgeFilter`; passes `hidePartnerColumn` to the table.
- `src/components/table/data-table.tsx` — FOUND, `hidePartnerColumn` effect + transition ref; `captureSnapshot` writes `batchAgeFilter`.
- `src/components/metabase-import/preview-step.tsx` — FOUND, renders segmented control + `AxisPicker` x2 + `inferenceReason` helper text.
- `src/components/metabase-import/import-sheet.tsx` — FOUND, hoisted override state; `mergeOverride` applied on Apply.
- Commits `ba7ea92`, `fd94c8f`, `7db7193`, `68cf359` present in `git log --oneline`.

## Next Phase Readiness

- Phase 38 is now COMPLETE (5/5 plans shipped: 38-01 sidebar, 38-02 columns, 38-03 charts, 38-04 KPI cascade, 38-05 filters + import).
- All 18 v4.1 feedback items closed: POL-01..06, CHT-01..04, KPI-01..04, FLT-01..03, MBI-01.
- Downstream milestones (Phase 39 Partner Config Module, Phase 40 Projected Curves v1) are unblocked.
- No new deferred items introduced; pre-existing build-pipeline issue remains.

---
*Phase: 38-polish-correctness-pass*
*Completed: 2026-04-24*
