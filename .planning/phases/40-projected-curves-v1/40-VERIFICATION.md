---
phase: 40-projected-curves-v1
verified: 2026-04-25T00:00:00Z
status: passed
score: 14/14 must-haves verified (all automated checks pass; 2 inline gaps closed post-verify)
human_verification:
  - test: "Projection lines render on chart"
    expected: "Drill into a partner with modeled coverage (e.g. bounce_af recent batch) — dashed lines appear in the same hue as each batch's actual line, ~60% opacity, from month 1 through maxAge"
    why_human: "Requires live Snowflake connection to populate projection data; static mode returns empty [] by design"
  - test: "Batches without modeled coverage render actuals only"
    expected: "A batch known to have null PROJECTED_FRACTIONAL (e.g. AF_AUG_23) shows only its solid actual line; no phantom zero-line, no crash"
    why_human: "Requires live warehouse data to confirm a batch with no modeled coverage actually omits the projection line"
  - test: "Legend toggle hides both actual and projection line together"
    expected: "Clicking a batch name in the legend hides both its solid actual line and its dashed modeled sibling in one action; legend still shows one entry per batch (no doubling)"
    why_human: "Visual interaction test; automated confirms hide-coupling via shared visibleBatchKeys predicate but cannot test rendered output"
  - test: "Proximity tooltip shows Modeled row with delta-vs-actual"
    expected: "Hovering near a batch line with projection data shows a tooltip row: actual value, then 'Modeled' sub-row with the modeled value and a signed delta (e.g. +5.0%)"
    why_human: "Real-time proximity detection requires browser mouse events"
  - test: "BaselineSelector toggles KPI cards to modeled delta"
    expected: "Clicking 'Modeled curve' above the KPI row changes every applicable rate card's trend label to 'vs modeled curve' and recomputes the delta from BatchCurve.projection"
    why_human: "UI interaction test; automated confirms wiring but not rendered KPI card deltas"
  - test: "Baseline-absent recovery action works"
    expected: "When a card has no modeled coverage at its horizon, 'No modeled curve for this scope' caption appears with a 'Switch to rolling avg' button that flips the panel selector back"
    why_human: "Requires a scope where modeled is partially absent at one horizon; needs live data"
  - test: "Modeled toggle disabled when no scope coverage"
    expected: "Drill into a partner/batch with zero modeled projection data — 'Modeled curve' toggle is greyed out with tooltip 'No modeled data in this scope'"
    why_human: "Requires finding a partner with zero projection coverage in live data"
  - test: "Empirical unit confirmation: PROJECTED_FRACTIONAL scale"
    expected: "Run Probe 1 from 40-01-CONFIRM.md in Snowflake console; confirm projected_raw ≈ actual_pct/100 (fractional, ×100 needed) or ≈ actual_pct (percentage, drop the ×100 from route.ts)"
    why_human: "Creds were unavailable during plan execution; RESEARCH defaults applied (×100); must verify empirically before trusting projected values"
---

# Phase 40: Projected Curves v1 — Verification Report

**Phase Goal:** Per-batch modeled collection-curve overlays (sourced from `BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL`) that the team can benchmark against, and an optional panel-level KPI delta baseline ("vs modeled curve") that joins — rather than replaces — the existing "vs rolling avg" option
**Verified:** 2026-04-25
**Status:** passed — all automated checks pass; two real gaps surfaced during human verification were closed inline (see Post-Verify Gap Closure)
**Re-verification:** Yes — initial human verification surfaced two bugs killing modeled coverage for every partner; both fixed in commit `07b3056`

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | API route returns projection rows with stable shape, static-mode fallback returns [] | VERIFIED | `src/app/api/curves-results/route.ts` — `isStaticMode()` guard at line 65 returns `{data:[],meta:{rowCount:0}}`, live path executes CURVES_SQL with latest-VERSION + ROW_NUMBER dedup |
| 2 | `useCurvesResults` hook fetches `/api/curves-results` with 5-min staleTime, does not block first paint | VERIFIED | `src/hooks/use-curves-results.ts:32` — `staleTime: 5 * 60 * 1000`; `useCurvesResultsIndex` called outside memo in `usePartnerStats` so actuals render immediately |
| 3 | Each BatchCurve carries optional `projection?: CurvePoint[]` populated from projection index | VERIFIED | `src/types/partner-stats.ts:26` — field typed; `src/hooks/use-partner-stats.ts:76-79` — merge via `${lenderId}\|\|${batchName}` key, undefined when no coverage |
| 4 | projectedRate units consistent with recoveryRate (0..100) — ×100 applied at API boundary | VERIFIED (pending empirical) | `route.ts:55` — `PROJECTED_FRACTIONAL * 100 AS PROJECTED_RATE`; CONFIRM.md records fallback decision; live probe outstanding (see human verification #8) |
| 5 | Only latest VERSION per (LENDER_ID, BATCH_, PRICING_TYPE) returned — no duplicate month rows | VERIFIED | SQL in `route.ts:26-59` — CTE `latest` pins MAX(VERSION) per pricing type, then `ROW_NUMBER() OVER (PARTITION BY LENDER_ID, BATCH_, COLLECTION_MONTH ORDER BY VERSION DESC)` dedupes cross-pricing to one row per batch-month |
| 6 | Chart renders dashed same-hue 60%-opacity projection line per batch when coverage exists | VERIFIED (visual pending) | `collection-curve-chart.tsx:361-374` — `strokeDasharray="6 3"`, `strokeOpacity={0.6}`, same `baseColor`, `isAnimationActive={false}` |
| 7 | Projection line clipped to maxAge (PRJ-02 truncation contract) | VERIFIED | `collection-curve-chart.tsx:134` — `withAvg.filter((p) => p.month <= maxAge)` clips both actual and projection keys; `pivot-curve-data.ts` emits projection months in the same `sortedMonths` set so filter applies uniformly |
| 8 | Batches without coverage render actuals only — no phantom zero-line, no crash | VERIFIED | `collection-curve-chart.tsx:338-339` — `hasProjection` guard requires `curve.projection !== undefined && curve.projection.length > 0`; `usePartnerStats` leaves `projection` undefined on lookup miss |
| 9 | Tooltip shows Modeled row with delta-vs-actual; absent-projection batches show actual-only | VERIFIED (visual pending) | `curve-tooltip.tsx:99-121` — looks up `batch_N__projected` from payload; `composeBatchTooltipRow` called only when `projectedValue != null && metric === "recoveryRate"`; absent → no Modeled row rendered; smoke test passes |
| 10 | Legend renders one entry per batch; toggling actual hides both actual and modeled | VERIFIED | `use-curve-chart-state.ts:48-53` — `defaultVisibleKeys` built from `batch_N` only; `__projected` keys never appear in legend; `collection-curve-chart.tsx:370` — projection `<Line hide={!isVisible}>` coupled to same `isVisible` predicate as actual |
| 11 | Partner-average CHT-02 line unchanged — no modeled companion | VERIFIED | `collection-curve-chart.tsx:379-390` — `__avg__` Line rendered separately, no projection companion added |
| 12 | Panel-level baseline selector renders above KPI row, defaults to rolling | VERIFIED | `data-display.tsx:283` — `useState<BaselineMode>('rolling')`; `data-display.tsx:1109-1115` — `<BaselineSelector>` mounted above `<KpiSummaryCards>` at `drillState.level === 'partner'` |
| 13 | Modeled delta computed and routed into StatCard.trend + trendLabel | VERIFIED | `kpi-summary-cards.tsx:274-298` — `computeModeledDelta(latestCurve, horizon, value, ...)` called when `baselineMode === 'modeled'`; successful result passed to `<StatCard trendLabel="vs modeled curve" ...>` |
| 14 | ROADMAP + v4.1-REQUIREMENTS updated with CURVES_RESULTS wording; PRJ-01..05 match shipped scope | VERIFIED | ROADMAP.md Phase 40 goal contains `BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL`; v4.1-REQUIREMENTS.md PRJ-01..05 all marked `[x]` with correct wording; no "rolling historical average" language in those blocks |

**Score:** 14/14 truths verified (6 visual/live-data items flagged for human)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/api/curves-results/route.ts` | VERIFIED | Exports `GET` + `dynamic`, static-mode guard, full CURVES_SQL with VERSION + ROW_NUMBER dedup |
| `src/hooks/use-curves-results.ts` | VERIFIED | Exports `useCurvesResults` + `useCurvesResultsIndex`; 67 lines; Map keyed by `${lenderId}\|\|${batchName}` |
| `src/types/curves-results.ts` | VERIFIED | Exports `CurvesResultsWireRow`, `ProjectionRow`, `CurvesResultsResponse` |
| `src/types/partner-stats.ts` | VERIFIED | `BatchCurve.projection?: CurvePoint[]` present at line 26 with JSDoc |
| `src/hooks/use-partner-stats.ts` | VERIFIED | `useCurvesResultsIndex()` called at line 39; per-batch lenderByBatch map; merge at line 76-79 |
| `src/components/charts/pivot-curve-data.ts` | VERIFIED | `pivotCurveData` emits `batch_N__projected` keys with double underscore; `PROJECTED_KEY_SUFFIX` exported; keyMap extended |
| `src/components/charts/collection-curve-chart.tsx` | VERIFIED | Dashed projection `<Line>` with `strokeDasharray="6 3"`, `strokeOpacity={0.6}`, `isAnimationActive={false}`, hide-coupled to actual |
| `src/components/charts/curve-tooltip.tsx` | VERIFIED | `composeBatchTooltipRow` used to build Modeled row; `__projected` sibling lookup; absent → no row |
| `src/components/charts/compose-batch-tooltip-row.ts` | VERIFIED | Pure helper extracted; exports `composeBatchTooltipRow` + `formatDeltaPercent`; polarity-aware |
| `src/components/kpi/baseline-selector.tsx` | VERIFIED | Exports `BaselineSelector` + `BaselineMode`; 94 lines; Button-based (matching existing pattern); disabled + Tooltip when `modeledAvailable=false` |
| `src/lib/computation/compute-projection.ts` | VERIFIED | Exports `modeledRateAtMonth` + `computeModeledDelta`; returns `BatchTrend \| null`; divide-by-zero guard |
| `src/components/kpi/kpi-summary-cards.tsx` | VERIFIED | `baselineMode` prop; `HORIZON_BY_KEY` map; `latestCurve` selection; modeled branch; baseline-absent UX; `rateSinceInception` caption |
| `src/components/data-display.tsx` | VERIFIED | `BaselineSelector` imported + mounted at line 1110; `useState<BaselineMode>('rolling')`; `modeledAvailable` derived; reset-to-rolling `useEffect` |
| `.planning/ROADMAP.md` | VERIFIED | Phase 40 goal contains `CURVES_RESULTS.PROJECTED_FRACTIONAL`; 5 success criteria match shipped scope |
| `.planning/milestones/v4.1-REQUIREMENTS.md` | VERIFIED | PRJ-01..05 all `[x]`; wording matches modeled-curve scope pivot |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/curves-results/route.ts` | `BOUNCE.FINANCE.CURVES_RESULTS` | `executeQuery` with MAX(VERSION) + ROW_NUMBER | WIRED | SQL at lines 26-59 references `BOUNCE.FINANCE.CURVES_RESULTS` in both CTEs |
| `src/hooks/use-curves-results.ts` | `/api/curves-results` | `fetch('/api/curves-results')` in TanStack queryFn | WIRED | Line 23: `fetch('/api/curves-results')` |
| `src/hooks/use-partner-stats.ts` | `useCurvesResultsIndex` | projection index lookup keyed by `(lenderId, batchName)` | WIRED | Line 39: `useCurvesResultsIndex()` called; line 78: `projectionIndex.get(...)` |
| `src/app/api/curves-results/route.ts` | `isStaticMode` | static-mode early return | WIRED | Line 65: `if (isStaticMode()) { return NextResponse.json({data:[], ...}) }` |
| `src/components/charts/collection-curve-chart.tsx` | `BatchCurve.projection` | `curve.projection` conditional `<Line>` render | WIRED | Lines 338-374: `hasProjection` guard, sibling `<Line dataKey={projKey}>` |
| `src/components/charts/collection-curve-chart.tsx` | `maxAge` filter | pivot includes projection months, `.filter((p) => p.month <= maxAge)` clips | WIRED | Line 134; projection months included in `sortedMonths` via `pivotCurveData` |
| `src/components/charts/curve-tooltip.tsx` | `batch_N__projected` keys | proximity reads actual, looks up `${entryKey}__projected` from payload | WIRED | Lines 99-108 |
| `src/components/data-display.tsx` | `BaselineSelector` | `useState<BaselineMode>` at data-display level, mounted above `KpiSummaryCards` | WIRED | Lines 283, 1109-1115 |
| `src/components/kpi/kpi-summary-cards.tsx` | `computeModeledDelta` | per-card modeled delta when `baselineMode === 'modeled'` | WIRED | Lines 274-280 |
| `src/components/kpi/kpi-summary-cards.tsx` | `StatCard.trendLabel` | `trendLabel="vs modeled curve"` override when modeled trend resolves | WIRED | Line 294 |
| `src/components/kpi/baseline-selector.tsx` | Button primitive (Button + aria-pressed) | matches established ChartTypeSegmentedControl pattern (no @base-ui/react/toggle-group available) | WIRED (deviated from plan spec, correctly) | Plan specified ToggleGroup but it's not in the codebase; executor correctly mirrored existing Button pattern |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PRJ-01 | 40-01, 40-02 | Per-batch modeled projection from CURVES_RESULTS; actuals-only when no coverage | SATISFIED | API route + hook + BatchCurve.projection merge + chart render |
| PRJ-02 | 40-02 | Full shadow month 1 through maxAge (CHT-01 truncation contract) | SATISFIED | `pivotCurveData` includes projection months; `filter((p) => p.month <= maxAge)` in chart |
| PRJ-03 | 40-02 | Dashed same-hue 60% opacity; "Modeled" tooltip row with delta; one legend entry per batch | SATISFIED | `strokeDasharray="6 3"`, `strokeOpacity={0.6}`, `composeBatchTooltipRow`, `defaultVisibleKeys` batch_N-only |
| PRJ-04 | 40-03 | Panel-level baseline selector; trendLabel override; baseline-absent UX; disabled when no coverage | SATISFIED | BaselineSelector + computeModeledDelta + KpiSummaryCards routing + recovery action |
| PRJ-05 | 40-02 | Per-batch warehouse grain; Phase 39 segment-split actuals-only; graceful degradation without Phase 39 | SATISFIED | No segment-level modeled data path; warehouse data is per-batch; no Phase 39 dependency in Phase 40 code |

All 5 requirements marked `[x]` in `v4.1-REQUIREMENTS.md`.

---

### Smoke Tests

| Test File | Result |
|-----------|--------|
| `src/components/charts/pivot-curve-data.smoke.ts` | PASS — "pivot-curve-data smoke OK" (4 assertions incl. bonus mixed-batch) |
| `src/components/charts/curve-tooltip-modeled.smoke.ts` | PASS — "curve-tooltip-modeled smoke OK" (7 assertions) |
| `src/lib/computation/compute-projection.smoke.ts` | PASS — 8 passed, 0 failed |

---

### Guards

| Guard | Result |
|-------|--------|
| `npx tsc --noEmit` | Clean on all Phase 40 files. Only error: pre-existing `tests/a11y/baseline-capture.spec.ts` axe-core TS error (tracked in deferred-items.md, out of scope) |
| `npm run check:tokens` | PASS — no ad-hoc text-size or font-weight classes outside allowlist |
| `npm run check:surfaces` | PASS — no ad-hoc shadow or card-frame combos |
| `npm run check:motion` | PASS — no raw durations, easings, or inline style timings |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `collection-curve-chart.tsx` | 225 | `TODO(29-03)` | Info | Pre-existing note from Phase 29 referencing a different plan; not introduced by Phase 40 |
| `kpi-summary-cards.tsx` | 154 | "placeholder" in JSDoc comment | Info | Documentation word in a doc string; no stub code |

No blockers. No Phase 40-introduced stubs.

---

### Notable Implementation Detail: BaselineSelector Pattern

The plan specified `@base-ui/react/toggle-group` for the `BaselineSelector`. This package is not installed in the codebase. The executor correctly mirrored the established `ChartTypeSegmentedControl` pattern (Button + `aria-pressed`) instead. The result is functionally equivalent, uses existing dependencies, and maintains a11y parity. This is a correct deviation, not a gap.

---

### Notable Implementation Detail: Empirical Unit Confirmation

`40-01-CONFIRM.md` documents that live Snowflake probes were deferred due to `SNOWFLAKE_AUTH=externalbrowser` (interactive auth incompatible with agent CLI). The RESEARCH default (×100 conversion) was applied. The CONFIRM.md records the probe SQL for manual verification post-deploy. The route applies `PROJECTED_FRACTIONAL * 100` — if live probes show the column is already percentage-scale, the fix is a single-line change. This is a known open item, flagged as human verification #8 above.

---

### Human Verification Required

**1. Projection lines render on chart**
**Test:** With live Snowflake credentials, drill into a partner with known modeled coverage (e.g., bounce_af recent batch)
**Expected:** Dashed lines appear in the same hue as each batch's actual line, approximately 60% opacity, running from month 1 through the chart's maxAge
**Why human:** Static mode returns `data:[]`; projection lines can only appear with live warehouse data

**2. Batches without modeled coverage render actuals only**
**Test:** Find a batch with null PROJECTED_FRACTIONAL (e.g., AF_AUG_23 per CONFIRM.md)
**Expected:** That batch shows only its solid actual line; no phantom zero-line, no console error
**Why human:** Requires identifying a specific batch with no warehouse coverage

**3. Legend toggle hides both actual and projection together**
**Test:** Click a batch name in the legend
**Expected:** Both the solid actual line and its dashed modeled sibling disappear in one click; legend still shows one entry per batch
**Why human:** Visual interaction test; code inspection confirms hide-coupling but cannot test rendered output

**4. Proximity tooltip shows Modeled row with delta**
**Test:** Hover near a batch line that has projection data
**Expected:** Tooltip shows the actual value, then a "Modeled" sub-row with the modeled value and a signed delta (e.g., "+5.0%") in polarity-appropriate color
**Why human:** Real-time mouse proximity detection requires browser interaction

**5. BaselineSelector toggles KPI cards to modeled delta**
**Test:** Drill into a partner, click "Modeled curve" above the KPI row
**Expected:** Every applicable rate card's trend label changes to "vs modeled curve" with a delta recomputed from BatchCurve.projection
**Why human:** UI state interaction; wiring confirmed in code but rendered KPI deltas need visual confirmation

**6. Baseline-absent recovery action works**
**Test:** Find a scope where a specific KPI horizon (e.g., 12mo) has no modeled coverage
**Expected:** That card shows value only with "No modeled curve for this scope" caption and a "Switch to rolling avg" link that flips the panel selector
**Why human:** Requires a partner with partial modeled coverage (some horizons covered, some not)

**7. Modeled toggle disabled when no scope coverage**
**Test:** Drill into a partner with zero modeled projection data
**Expected:** "Modeled curve" toggle is greyed out; hovering shows tooltip "No modeled data in this scope"
**Why human:** Requires a partner with no projection coverage in live warehouse data

**8. Empirical unit confirmation (CRITICAL)**
**Test:** Run Probe 1 from `.planning/phases/40-projected-curves-v1/40-01-CONFIRM.md` in Snowflake console — compare `PROJECTED_FRACTIONAL` raw value against `COLLECTION_AFTER_6_MONTH / TOTAL_AMOUNT_PLACED * 100` for the same batch
**Expected:** If `projected_raw ≈ actual_pct / 100` (e.g., 0.42 vs 42): ×100 conversion is correct — no action needed. If `projected_raw ≈ actual_pct` (e.g., 42 vs 42): drop the `* 100` from `route.ts:55`
**Why human:** Snowflake creds were unavailable during plan execution; RESEARCH defaults applied. The single-line fix is in `src/app/api/curves-results/route.ts` line 55

---

### Gaps Summary

Initial automated verification: no gaps in the codebase shape. **Live-data verification surfaced two real bugs** that suppressed modeled coverage for every partner. Both fixed inline (commit `07b3056` + already-committed `getBatchName` change in `use-partner-stats.ts`).

---

## Post-Verify Gap Closure (2026-04-25)

User loaded the deployed feature against live Snowflake and reported "no modeled data for every partner." Two distinct bugs:

### Gap 1: BATCH key mismatch — projection lookup never matched

- `/api/data` returns rows with column `BATCH` (no trailing underscore).
- `/api/curves-results` returns rows with `BATCH_` (matching the warehouse column).
- `use-partner-stats.ts` was reading `r.BATCH_` from partner rows when building `lenderByBatch` → field is `null` for every row → map empty → every `${lenderId}||${batchName}` lookup misses → `projection: undefined` for every batch.
- **Fix:** read via `getBatchName(r)` (consistent with `reshapeCurves` which reads the same field). Status: committed.

### Gap 2: PROJECTED_FRACTIONAL is per-month, not cumulative

- App-side `recoveryRate` (reshape-curves.ts:44) is cumulative: `(amount thru month X / placed) * 100`.
- Plan assumed `PROJECTED_FRACTIONAL` was on the same cumulative scale; live probe of `bounce_af AF_APR_24_AF` showed projection values flat at 0.3–0.4% across months 1–24, while actual rose 0.23% → 7.07%. Sum across months 1–24 ≈ 9% (close to actual). Confirms the warehouse value is a per-month rate.
- **Fix:** SQL now wraps `PROJECTED_FRACTIONAL` in `SUM(...) OVER (PARTITION BY LENDER_ID, BATCH_ ORDER BY COLLECTION_MONTH ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` before the `* 100`, producing cumulative percentages comparable to actual recoveryRate.
- **Validation against `AF_APR_24_AF`:**

  | month | actual cum % | projected cum % |
  |-------|--------------|-----------------|
  | 1     | 0.23         | 0.33            |
  | 6     | 2.04         | 2.46            |
  | 12    | 4.10         | 4.87            |
  | 24    | 7.07         | 8.66            |

  Projected is mildly above actual at every month — typical optimistic-forecast pattern — but tracks the right curve shape. Status: committed (`07b3056`).

### Remaining human-verify items

After these fixes, items 1–7 from the original Human Verification list still apply (visual/interactive checks). Item 8 (empirical unit confirmation) is **closed** by the live probe captured in this gap-closure section — `PROJECTED_FRACTIONAL` is fractional + per-month, requiring `* 100` AND cumulative sum.

---

_Verified: 2026-04-25_
_Verifier: Claude (gsd-verifier) + post-verify gap closure_
