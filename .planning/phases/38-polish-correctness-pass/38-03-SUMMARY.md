---
phase: 38-polish-correctness-pass
plan: 03
subsystem: charts
tags: [recharts, chart-correctness, layout, laptop-viewport, visible-scope]

# Dependency graph
requires:
  - phase: 32-url-backed-navigation-drill
    provides: filter-before-aggregate contract, charts-expanded localStorage pattern
  - phase: 36-chart-builder
    provides: CollectionCurveChart preset architecture, useCurveChartState hook
provides:
  - Visible-scope x-axis domain (no phantom tail past visible vintages)
  - Visible-scope partner-average computed inline in CollectionCurveChart
  - __avg__ participates in proximity-hover tooltip when showAverage is on
  - Scrolling curve legend with max-h-[40vh]
  - Laptop-viewport layout caps via @media (max-height: 900px)
  - Single-batch partners now render the chart (render-ASAP, no >= 2 gate)
affects: [phase-40-projected-curves, phase-41-data-correctness-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Visible-scope chart derivation: visibleBatchKeys drives maxAge, pivot month clip, and avg series (no full-curve-set overshoot)"
    - "@media (max-height: Npx) + named class pairs for viewport-conditional layout caps (avoids Tailwind arbitrary variants that the codebase hasn't standardized on)"
    - "Per RESEARCH Pitfall 8: apply max-height to the INNER chart container, never the grid-rows-[1fr] row, to avoid grid-child height fights"

key-files:
  created:
    - src/components/charts/visible-curves.smoke.ts
  modified:
    - src/components/charts/collection-curve-chart.tsx
    - src/components/charts/curve-legend.tsx
    - src/components/data-display.tsx
    - src/app/globals.css

key-decisions:
  - "Inline avg-series computation in CollectionCurveChart (scoped to visibleBatchKeys) instead of modifying addAverageSeries signature — keeps pivot-curve-data.ts contract stable for any future non-chart callers"
  - "Render-ASAP gate relaxed from `curves.length >= 2` to `>= 1` on BOTH the chart branch and the collapsed-sparkline branch — single-batch partners get a chart AND a sparkline"
  - "@media (max-height: 900px) cap applied to inner shrink-0 container only, not grid row (Pitfall 8) — max-height + grid-rows-[1fr] would otherwise fight and clip mid-expand"
  - "Partner-average proximity key added as `[...visibleBatchKeys, '__avg__']`; __avg__ deliberately NOT in visibleBatchKeys (that set means 'user-toggled batch curves')"
  - "Duplicate `maxAge` declaration (deferred-items.md hazard) resolved by hoisting maxAge above the pivot useMemo and removing the post-empty-state block"

patterns-established:
  - "Visible-scope chart derivation: compute `visibleCurves = sortedCurves.filter((_, i) => visibleSet.has(\"batch_${i}\"))` once, then drive maxAge + clip + avg-series off it"
  - "Laptop-viewport cap recipe: named class pair in globals.css wrapped in @media (max-height: 900px); apply to inner content containers, never grid rows"

requirements-completed:
  - CHT-01
  - CHT-02
  - CHT-03
  - CHT-04

# Metrics
duration: 7 min
completed: 2026-04-24
---

# Phase 38 Plan 03: Chart Correctness + Laptop Layout Summary

**Visible-scope x-axis + avg-series clip to currently-displayed vintages, partner-average joins proximity hover, curve legend scrolls at max-h-[40vh], laptop (≤900px) viewports cap chart at 48vh and floor table at 320px, and single-batch partners now render the chart.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-24T04:37:53Z
- **Completed:** 2026-04-24T04:44:56Z
- **Tasks:** 3 executed (Task 4 was a checkpoint:human-verify — auto-approved under workflow.auto_advance)
- **Files modified:** 4 (1 created, 3 modified; plus globals.css modified)

## Accomplishments

- **CHT-01:** X-axis domain + partner-average both clip to max age of the CURRENTLY-DISPLAYED vintages (not all sortedCurves). Single-batch partners render the chart (prior `>= 2` gate removed on both the chart branch and the collapsed-sparkline branch). Pivoted dataset filtered to `p.month <= maxAge` so avg line can't drift past visible data.
- **CHT-02:** `__avg__` joins proximity hover keys when `showAverage` is true. CurveTooltip already handled the display branch — no tooltip edits needed, the gate was the proximity-candidate list.
- **CHT-03:** CurveLegend gains `max-h-[40vh]` alongside existing `thin-scrollbar overflow-y-auto`. "Show all" now scrolls internally instead of pushing the chart below the fold.
- **CHT-04:** `@media (max-height: 900px)` block in globals.css with `.chart-laptop-cap { max-height: 48vh }` and `.table-laptop-floor { min-height: 320px }`. Applied to the inner chart container (Pitfall 8) and the table wrapper. Desktop (>900px height) behavior unchanged.
- **Smoke test:** `src/components/charts/visible-curves.smoke.ts` — 6 scenarios covering the maxAge derivation (youngest-only, all, single-batch, empty, oldest-only, unknown-key).

## Task Commits

Each task was committed atomically:

1. **Task 1: Visible-scope pivot + avg-series + x-axis clip + drop render gate (CHT-01)** — `f8d8fdb` (feat)
2. **Task 2: Partner-average in proximity hover + scrolling legend (CHT-02, CHT-03)** — `00a9004` (feat)
3. **Task 3: Laptop-height layout caps (CHT-04)** — `ff9ad07` (feat)
4. **Task 4: Visual checkpoint** — auto-approved under `workflow.auto_advance`, no separate commit.

**Plan metadata:** pending final docs commit.

## Files Created/Modified

- `src/components/charts/visible-curves.smoke.ts` (NEW) — Smoke test for `maxAgeFromVisible` helper; runs under `node --experimental-strip-types`.
- `src/components/charts/collection-curve-chart.tsx` — `visibleCurves` memo, hoisted `maxAge`/`collectionMonthsTicks` above pivot, inline avg computation scoped to `visibleBatchKeys`, pivot clipped to `month <= maxAge`, proximity-keys extended with `__avg__` when `showAverage` is on. Dropped unused `addAverageSeries` import; added `type PivotedPoint` import.
- `src/components/charts/curve-legend.tsx` — Added `max-h-[40vh]` to the legend container so `overflow-y-auto` actually activates.
- `src/components/data-display.tsx` — Dropped `partnerStats.curves.length >= 2` gate (both chart and sparkline branches) to `>= 1`. Added `chart-laptop-cap` to inner chart container (inside `overflow-hidden`). Added `table-laptop-floor` to table wrapper.
- `src/app/globals.css` — Appended `@media (max-height: 900px)` block with `.chart-laptop-cap` + `.table-laptop-floor` rules.

## Decisions Made

- **Inline avg computation over signature change:** When the original plan proposed `addAverageSeries(pivotedRaw, visibleBatchKeys)`, the existing function signature takes `BatchCurve[]` and uses `batchCount = curves.length` to iterate positional keys 0..N-1. Changing the signature was attempted but reverted by stash/linter interaction; computing the average inline in `CollectionCurveChart` sidesteps the contract question entirely and keeps pivot-curve-data.ts usable by any future non-chart caller. Semantically identical output; localized blast radius.
- **Sparkline gate relaxed too:** CONTEXT lock says "render ASAP with whatever data exists" — we applied that rule consistently to the collapsed-sparkline branch (`data-display.tsx:960`) as well, not just the expanded chart branch, so the "single new batch" experience is consistent across expand/collapse states.
- **Grid-row NOT capped:** Per 38-RESEARCH Pitfall 8, `max-height: 48vh` on `grid-rows-[1fr]` would have forced grid+child to fight over height during expand/collapse. Cap lives on the inner `shrink-0` container; outer `overflow-hidden` handles any clipping naturally.
- **`overflow-y-auto` NOT added to chart inner container:** Briefly considered during Task 3 for "scroll within chart cap" but reverted — CONTEXT says "capped max-heights. No resize handle, no auto-collapse." Cap + clip matches the spec; users who want the full chart back can uncap via desktop viewport.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Duplicate `maxAge` declaration prevented inline-compile**
- **Found during:** Task 1 (visible-scope pivot)
- **Issue:** `deferred-items.md` flagged a pre-existing duplicate `maxAge` from an earlier abandoned CHT-01 attempt. Adding a new `maxAge` tied to `visibleCurves` above the pivot useMemo would collide with the original declaration still sitting below the empty-state early return.
- **Fix:** Removed the old `const maxAge = Math.max(...sortedCurves.map(...), 1)` + associated `collectionMonthsTicks` block below the empty-state. Single `maxAge` now lives above the pivot useMemo and is consumed by both the pivot-clip filter and the XAxis domain/ticks.
- **Files modified:** src/components/charts/collection-curve-chart.tsx
- **Verification:** `tsc --noEmit` zero errors on collection-curve-chart.tsx; smoke test passes.
- **Committed in:** `f8d8fdb` (Task 1)

**2. [Rule 4-ish — scope boundary note, NOT a deviation] Plan-suggested `addAverageSeries(pivotedRaw, visibleBatchKeys)` signature change NOT applied**
- **Found during:** Task 1 (visible-scope avg-series)
- **Issue:** The plan sketched `addAverageSeries(pivotedRaw, visibleBatchKeys)`, implying a signature change from `(data, curves: BatchCurve[])` to `(data, keys: readonly string[])`. A prior abandoned attempt's stash (`stash@{1}`) triggered linter-style reverts when I tried to edit the function body.
- **Resolution:** Kept `pivot-curve-data.ts` untouched — computed the visible-scope average inline in `CollectionCurveChart` instead. Zero semantic drift from the plan's intent (avg uses ONLY currently-visible batch keys), zero risk of breaking other callers. Not a deviation in the behavioral sense; a localization shift only.
- **Files modified:** src/components/charts/collection-curve-chart.tsx (inline logic) — pivot-curve-data.ts unchanged.
- **Verification:** `tsc --noEmit` clean for collection-curve-chart.tsx and pivot-curve-data.ts; smoke test independently covers the maxAge derivation.
- **Committed in:** `f8d8fdb` (Task 1)

---

**Total deviations:** 1 auto-fixed (1 blocking) + 1 scope-localization (signature preserved).
**Impact on plan:** Functionally zero. All four lock criteria (CHT-01..04) satisfied; avg-series scoping semantically identical to plan intent; signature preserved for downstream stability.

## Authentication Gates

None.

## Issues Encountered

- **`npm run build` fails pre-existing** with `CssSyntaxError: tailwindcss: globals.css:2:18124: Missed semicolon` from the compiled CSS output. Pre-existing per `.planning/phases/38-polish-correctness-pass/deferred-items.md` (discovered during Plan 38-01 execution). Unrelated to Plan 38-03 changes. Plan's stated verify command (`npm run build`) was substituted with `tsc --noEmit` (passes on all touched files) + `npm run check:tokens` (clean) + smoke test (`visible-curves.smoke.ts` prints "visible-curves smoke OK") + grep spot checks. Production-build fix belongs to a separate build-pipeline plan.
- **Uncommitted WIP from prior agents** observed in working tree (app-sidebar.tsx, stat-card.tsx, partner-stats.ts, heatmap-toggle.tsx, plus `stash@{0}` and `stash@{1}`). All out of scope for Plan 38-03. Left untouched — belongs to their respective plans (38-01 continuation, 38-04).

## User Setup Required

None — no external service configuration.

## Self-Check: PASSED

- `src/components/charts/visible-curves.smoke.ts` — FOUND on disk, executes successfully.
- `src/components/charts/collection-curve-chart.tsx` — FOUND, contains `visibleCurves`, `__avg__` in proximity keys, `maxAge` derived from `visibleCurves`.
- `src/components/charts/curve-legend.tsx` — FOUND, contains `max-h-[40vh]`.
- `src/components/data-display.tsx` — FOUND, contains `chart-laptop-cap`, `table-laptop-floor`, `curves.length >= 1` (dropped from `>= 2`).
- `src/app/globals.css` — FOUND, contains `@media (max-height: 900px)` block with both `.chart-laptop-cap` and `.table-laptop-floor`.
- Commits `f8d8fdb`, `00a9004`, `ff9ad07` present in `git log --oneline`.

## Next Phase Readiness

- Ready for Plan 38-04 (KPI cascade redesign) and 38-05 (filters + Metabase Import).
- No blockers introduced. Pre-existing build failure remains deferred to a future build-pipeline plan.

---
*Phase: 38-polish-correctness-pass*
*Completed: 2026-04-24*
