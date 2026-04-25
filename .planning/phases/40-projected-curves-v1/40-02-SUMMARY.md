---
phase: 40-projected-curves-v1
plan: 02
subsystem: ui
tags: [recharts, chart-overlay, projection, tooltip, dashed-line, type-tokens]

requires:
  - phase: 40-projected-curves-v1
    provides: BatchCurve.projection? (Plan 01) — modeled curve points merged into curves at usePartnerStats level
  - phase: 38-polish-correctness
    provides: pivotCurveData + CHT-01 maxAge truncation contract + CurveLegend one-entry-per-batch pattern

provides:
  - pivotCurveData emits batch_N__projected sibling keys when curve.projection has data (grep-unique double-underscore convention)
  - CollectionCurveChart renders a dashed, same-hue, 60%-opacity <Line> per batch with modeled coverage; hide-coupled to actual line via shared visibleBatchKeys.includes(key) check
  - CurveTooltip renders a "Modeled" sub-row with delta-vs-actual when payload[batch_N__projected] is present at hovered month
  - composeBatchTooltipRow pure helper (delta math + polarity-aware direction tagging + suppression rules) — smoke-testable in isolation

affects:
  - 40-03-PLAN — KPI baseline-modeled-delta computation can reuse the same modeled-rate-at-month lookup pattern; composeBatchTooltipRow's polarity-aware direction logic informs delta coloring across other surfaces
  - any future overlay series — pivot-key __ suffix convention now established as the grep-unique pattern for sibling series

tech-stack:
  added: []
  patterns:
    - "Grep-unique sibling pivot keys for overlay series (DOUBLE underscore: batch_N__projected) — prevents Pitfall 5 substring collision in proximity logic"
    - "Pure-helper extraction for testability — composeBatchTooltipRow handles delta math + polarity tagging without React, smoke-tested directly"
    - "isAnimationActive={false} on overlay <Line> components when sibling primary already animated — prevents Pitfall 3 second-pass animation flash on async query resolution"
    - "Hide-coupling via shared visibility predicate — actual + modeled <Line> read from the SAME visibleBatchKeys.includes(key) check, so legend toggles flow to both without UI doubling"

key-files:
  created:
    - src/components/charts/pivot-curve-data.smoke.ts
    - src/components/charts/compose-batch-tooltip-row.ts
    - src/components/charts/curve-tooltip-modeled.smoke.ts
  modified:
    - src/components/charts/pivot-curve-data.ts
    - src/components/charts/collection-curve-chart.tsx
    - src/components/charts/curve-tooltip.tsx
    - .planning/phases/40-projected-curves-v1/deferred-items.md

key-decisions:
  - "Dash pattern '6 3' — matches the partner-average reference line precedent at line 358 of collection-curve-chart.tsx, so modeled lines visually 'rhyme' with the existing CHT-02 dashed series. RESEARCH default."
  - "isAnimationActive={false} on projection <Line> components (Pitfall 3 lock) — actuals already animated on first paint; projection mounts later when /api/curves-results resolves, and a second animation pass would read as a glitch."
  - "No showProjection toggle/state in v1 — modeled renders whenever curve.projection has data. CONTEXT lock: 'dashed line alongside actuals, per-batch' is always-on. Toggle deferred to fast-follow if user feedback requests it."
  - "Tooltip row ordering LOCKED — actual value first (primary reading), Modeled sub-row below (benchmark). Future consumers reading the tooltip can rely on this order."
  - "Pure-helper extraction for tooltip math — composeBatchTooltipRow lives in a separate module so smoke tests don't need React/jsdom. Matches Phase 38 precedent."
  - "Divide-by-zero suppression in helper — modeled === 0 → deltaPercent: null. Avoids Infinity% rows; tooltip simply hides the delta segment."
  - "Polarity-aware direction tagging — uses getPolarity('COLLECTION_AFTER_6_MONTH') for the recoveryRate chart (higher_is_better → +delta colors emerald). Lower_is_better metrics flip the sign mapping."
  - "Tooltip target priority unchanged but now explicitly skips __projected entries (Pitfall 5 guard) — proximity always lands on actual lines; modeled value composes onto the same row via payload lookup."

patterns-established:
  - "Sibling overlay <Line> pattern: render primary + secondary lines from a single sortedCurves.map inside a <Fragment>, share visibleBatchKeys.includes(key) for hide-coupling. Reusable for any future per-batch overlay (variance bands, target lines, etc.)."
  - "Pivot-key suffix convention: double-underscore suffix (__projected, __target, etc.) for sibling series that must be grep-unique against the primary key family. Documented in PROJECTED_KEY_SUFFIX export."
  - "Tooltip row composition helper: a pure function returning {actual, modeled, deltaPercent, direction} that the JSX layer maps to type-token spans. Decouples the math (testable) from the layout (visual)."

requirements-completed:
  - PRJ-02
  - PRJ-03
  - PRJ-05

# Metrics
duration: 5min
completed: 2026-04-25
---

# Phase 40 Plan 02: Modeled Projection Rendering Summary

**Per-batch dashed modeled <Line> overlays on `CollectionCurveChart` (same hue, 60% opacity, 6/3 dash pattern), wired through pivotCurveData via grep-unique `batch_N__projected` keys, with proximity tooltip extended to render a "Modeled" sub-row carrying signed delta-vs-actual coloring via metric polarity. Pure-helper extraction (`composeBatchTooltipRow`) makes the delta math + suppression rules smoke-testable without React.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-25T02:36:57Z
- **Completed:** 2026-04-25T02:41:58Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 3 modified, 1 docs updated)

## Accomplishments

- `pivotCurveData` now emits `batch_N__projected` sibling keys when `curve.projection` is populated (grep-unique double-underscore prevents Pitfall 5 substring collision). Months union across actuals + projection so 80mo modeled coverage on 12mo actuals produces 80 pivot rows; chart caller's existing `.filter((p) => p.month <= maxAge)` pass clips to visible domain (CHT-01 truncation contract reused).
- `CollectionCurveChart` renders a dashed, same-hue, 60%-opacity `<Line>` per batch with projection data (Pattern 4 from RESEARCH). Each Fragment now wraps actual + projection lines that share the same `visibleBatchKeys.includes(key)` predicate for legend-hide-coupling (Pattern 5). `isAnimationActive={false}` on the projection line prevents Pitfall 3 second-pass animation flash when the second TanStack query resolves.
- `CurveTooltip` extended with a "Modeled" sub-row showing the modeled value at the hovered month + signed delta-vs-actual. Delta is colored by polarity (higher_is_better metrics → +delta colors emerald). Partner-average (`__avg__`) row UNCHANGED per CONTEXT lock. Modeled row only renders for the `recoveryRate` metric (v1 rate-only).
- New pure helper `composeBatchTooltipRow(actual, modeled, metric)` returns `{actual, modeled, deltaPercent, direction}` with suppression rules (divide-by-zero, non-finite inputs, missing modeled → `deltaPercent: null`) and polarity-aware direction tagging. Smoke-tested in isolation — 7 scenarios pass.
- All three guards (check:tokens, check:motion, check:surfaces) clean; tsc clean for the four files Plan 02 modifies.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend pivotCurveData to emit `batch_N__projected` keys** — `3a577c6` (feat)
2. **Task 2: Render dashed modeled <Line> per batch with hide-couple to actual** — `418193e` (feat)
3. **Task 3: Tooltip Modeled sub-row with delta-vs-actual** — `a3dc675` (feat)

**Plan metadata:** _(captured in final commit appended after this summary)_

## Files Created/Modified

- `src/components/charts/pivot-curve-data.ts` — Extended to walk `curve.projection` alongside `curve.points`; new `PROJECTED_KEY_SUFFIX` export documents the grep-unique convention; keyMap maps `batch_N__projected` → batch display name when projection exists.
- `src/components/charts/pivot-curve-data.smoke.ts` (NEW) — 4 scenarios: no projection, full overlap, projection-extends-past-actuals, mixed batches. All pass.
- `src/components/charts/collection-curve-chart.tsx` — Per-batch render block now wraps actual + (optional) projection `<Line>` in a `<Fragment>`; shared color, shared hide predicate, isAnimationActive=false on projection. Imports `Fragment` from 'react'.
- `src/components/charts/curve-tooltip.tsx` — Tooltip target priority skips `__projected` entries (Pitfall 5 guard); when payload has `batch_N__projected` for the hovered batch, composes a Modeled sub-row via `composeBatchTooltipRow` with direction-tagged delta coloring. Type-token compliant.
- `src/components/charts/compose-batch-tooltip-row.ts` (NEW) — Pure helper with `composeBatchTooltipRow` + `formatDeltaPercent`; relative imports (`.ts` extension) so node `--experimental-strip-types` resolves it.
- `src/components/charts/curve-tooltip-modeled.smoke.ts` (NEW) — 7 scenarios: positive delta + higher_is_better, absent modeled, divide-by-zero, lower_is_better polarity flip, flat threshold, NaN/Infinity inputs, negative delta. All pass.
- `.planning/phases/40-projected-curves-v1/deferred-items.md` — Confirmed pre-existing Phase 39 consumer errors persist unchanged; Plan 02 introduces no new tsc errors.

## Decisions Made

See frontmatter `key-decisions` for the full list. Highlights:

1. **Dash pattern "6 3"** — RESEARCH default; matches the partner-average reference line precedent in the same file. Modeled lines visually rhyme with the existing CHT-02 series.
2. **`isAnimationActive={false}` on projection** — Pitfall 3 lock. Actuals animate on first paint; projection mounts when `/api/curves-results` resolves, and a second animation pass would read as a glitch.
3. **No `showProjection` toggle** — CONTEXT lock: "dashed line alongside actuals, per-batch" is always-on for v1. Toggle deferred to fast-follow if feedback requests one.
4. **Tooltip row ordering LOCKED** — actual first, modeled second. Future consumers can rely on this order.
5. **Pure-helper extraction** — `composeBatchTooltipRow` lives in its own module so smoke tests don't need React/jsdom. Matches Phase 38 precedent.
6. **Divide-by-zero / non-finite suppression** — modeled === 0 or NaN/Infinity inputs → `deltaPercent: null`; tooltip simply hides the delta segment (no Infinity%, no "—" placeholder).
7. **Polarity-aware direction tagging** — `getPolarity()` from `metric-polarity.ts` flips coloring on lower_is_better metrics. Smoke-tested with `AVG_AMOUNT_PLACED`.
8. **Tooltip target Pitfall-5 guard** — proximity logic explicitly skips `__projected` entries; modeled value composes onto the same row via payload lookup, never as a separate target.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Smoke test relative-path `.ts` extension required for node ESM resolution**
- **Found during:** Task 3 (composing the tooltip helper smoke test)
- **Issue:** First pass used `@/lib/computation/metric-polarity` import in the new pure helper. Smoke test under `node --experimental-strip-types` doesn't resolve the `@/` alias (no tsconfig path mapping in the runtime), and even after switching to relative `../../lib/computation/metric-polarity` the loader required an explicit `.ts` extension.
- **Fix:** Changed import in `compose-batch-tooltip-row.ts` to `../../lib/computation/metric-polarity.ts`. Matches the existing smoke-test convention used by `pivot-curve-data.smoke.ts` (and other smoke tests in the repo). Verified tsc still passes — TypeScript accepts `.ts` extensions in import paths under `moduleResolution: bundler` / `allowImportingTsExtensions`.
- **Files modified:** `src/components/charts/compose-batch-tooltip-row.ts`
- **Verification:** `node --experimental-strip-types src/components/charts/curve-tooltip-modeled.smoke.ts` → `curve-tooltip-modeled smoke OK`. `npx tsc --noEmit` → no errors on the new file.
- **Committed in:** `a3dc675` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — tooling resolution).
**Impact on plan:** Trivial — purely a smoke-test runtime adjustment. No behavioral change to the rendered tooltip.

## Issues Encountered

None. The plan-locked work landed cleanly on top of Plan 01's data pipeline. The pre-existing Phase 39 consumer errors (`data-display.tsx`, `filter-bar.tsx`, `data-table.tsx`, `table-body.tsx`, `unified-toolbar.tsx`, `sidebar-data.tsx`) and the `axe-core` test error were left untouched per the SCOPE BOUNDARY rule — none are in Plan 02's file list, and none are introduced by Plan 02 changes (verified by grep against tsc output).

## User Setup Required

None. The chart now renders modeled overlays whenever `BatchCurve.projection` is populated (which is automatic via Plan 01's `usePartnerStats` merge). When the deployed Vercel env eventually has Snowflake creds, modeled lines surface on every partner with `BOUNCE.FINANCE.CURVES_RESULTS` coverage. Until then, `/api/curves-results` returns `{data: []}` and the chart degrades gracefully to actuals-only.

## Next Phase Readiness

- **Plan 03 (KPI baseline selector + modeled-delta computation)** can reuse `composeBatchTooltipRow`'s delta math + polarity tagging directly, or extract the pure delta function for cross-surface use. The recommended `compute-projection.ts` helper sketched in RESEARCH (modeledRateAtMonth + computeModeledDelta) can be built on top of the same `latestCurve.projection?.find(p => p.month === horizon)` pattern.
- **Visual verification deferred to user smoke** (per plan's verification section): drill into a partner with known modeled coverage (e.g., bounce_af) once Snowflake creds are deployed, confirm dashed line per batch, hover for "Modeled" sub-row with delta, click legend to verify both actual + modeled hide together.
- **No regressions to existing surfaces** — partner-average line, anomaly highlighting, soloedBatch click priority, and CHT-03 legend scroll behavior all preserved.

## Self-Check: PASSED

All claimed artifacts verified to exist on disk and in git history:
- `src/components/charts/pivot-curve-data.ts` (modified) — FOUND
- `src/components/charts/pivot-curve-data.smoke.ts` (NEW) — FOUND, smoke OK
- `src/components/charts/collection-curve-chart.tsx` (modified) — FOUND, Fragment + projection <Line> render visible
- `src/components/charts/curve-tooltip.tsx` (modified) — FOUND, modeled row composition wired
- `src/components/charts/compose-batch-tooltip-row.ts` (NEW) — FOUND
- `src/components/charts/curve-tooltip-modeled.smoke.ts` (NEW) — FOUND, smoke OK
- `.planning/phases/40-projected-curves-v1/deferred-items.md` (updated) — FOUND
- Commit `3a577c6` (Task 1) — FOUND in `git log --oneline`
- Commit `418193e` (Task 2) — FOUND in `git log --oneline`
- Commit `a3dc675` (Task 3) — FOUND in `git log --oneline`
- `npx tsc --noEmit` — clean for all four Plan 02 files (pre-existing Phase 39 + axe-core errors persist, logged to deferred-items.md)
- `npm run check:tokens`, `check:motion`, `check:surfaces` — all green

---
*Phase: 40-projected-curves-v1*
*Completed: 2026-04-25*
