---
phase: 40-projected-curves-v1
plan: 03
subsystem: ui
tags: [kpi, baseline-selector, modeled-curve, type-tokens, docs-sync]

requires:
  - phase: 40-projected-curves-v1
    provides: BatchCurve.projection? (Plan 01 — modeled curve points merged onto each curve at usePartnerStats level)
  - phase: 38-polish-correctness
    provides: StatCard.trendLabel override + per-card suppressDelta scaffolding (shipped in Phase 38-04 explicitly for Phase 40 PRJ-04)

provides:
  - BaselineSelector — panel-level segmented control (Rolling avg | Modeled curve) with disabled-with-tooltip when modeledAvailable=false
  - computeModeledDelta + modeledRateAtMonth pure helpers for KpiSummaryCards routing (5% threshold, null-on-absent, divide-by-zero guard)
  - KpiSummaryCards extended with baselineMode + curves + onSwitchToRolling props; modeled-baseline routing per rate card; baseline-absent UX with inline "Switch to rolling avg" recovery
  - data-display.tsx mounts BaselineSelector above KPI row at partner-drill (CONTEXT lock — partner-only); useState<BaselineMode>('rolling') panel-level state; modeledAvailable derivation from partnerStats.curves; reset-to-rolling effect when modeled coverage disappears mid-session
  - ROADMAP + v4.1-REQUIREMENTS Phase 40 wording re-synced to match modeled-curve scope pivot (CONTEXT.md follow-up flag closed)

affects:
  - Phase 41+ — any future KPI baseline (e.g., target-anchored, partner-reported per Phase 49) can mount as a third option in BaselineSelector + a third routing branch in KpiSummaryCards; routing pattern + baseline-absent UX are reusable
  - Phase 49 (Dynamic Curve Re-Projection) — extends this with confidence-band / target-anchored variants; the panel-level selector chrome is the established UX

tech-stack:
  added: []
  patterns:
    - "Panel-level baseline selector for KPI rows — single useState owned at the page level, threaded into KpiSummaryCards via baselineMode prop, paired with a derived modeledAvailable boolean for the disabled state"
    - "Baseline-absent recovery UX — value-only render with a sibling caption + inline action button (callback flips parent's selector back), avoiding silent fallback to a stale baseline"
    - "Auto-reset side effect for selector availability — useEffect that resets baselineMode to 'rolling' when modeledAvailable flips false (prevents stuck 'modeled' selection when scope no longer has any modeled coverage)"
    - "rateSinceInception under modeled-baseline-mode — render value-only with a 'no modeled baseline at a single horizon' caption (lifetime aggregates have no horizon to look up)"

key-files:
  created:
    - src/components/kpi/baseline-selector.tsx
    - src/lib/computation/compute-projection.ts
    - src/lib/computation/compute-projection.smoke.ts
  modified:
    - src/components/kpi/kpi-summary-cards.tsx
    - src/components/data-display.tsx
    - .planning/ROADMAP.md
    - .planning/milestones/v4.1-REQUIREMENTS.md

key-decisions:
  - "BaselineSelector uses Button + aria-pressed (matching ChartTypeSegmentedControl precedent), NOT @base-ui/react/toggle-group as the plan suggested. The toggle-group primitive does not exist in this codebase — the plan's import would have failed to compile. The pattern in use is established and a11y-verified."
  - "Latest-curve selection for modeled baseline = lowest ageInMonths (defensive in-place sort inside KpiSummaryCards). Matches use-curve-chart-state.ts convention; safer than positional index since usePartnerStats does not pre-sort."
  - "rateSinceInception under baselineMode='modeled' renders VALUE-ONLY with a caption 'Lifetime rate — no modeled baseline at a single horizon.' No recovery action needed — the user can read the rolling-avg version of this card by switching the panel selector. Lifetime aggregates have no single horizon to look up against the projection."
  - "Baseline-absent caption + recovery copy: 'No modeled curve for this scope. Switch to rolling avg' (button is the second sentence's underlined verb). Matches CONTEXT.md verbatim for the empty-state language."
  - "rate3mo trendMetric set to 'COLLECTION_AFTER_3_MONTH' (was undefined) — semantically harmless for the rolling path (compute-trending.ts does not emit this metric so trends.find returns undefined and trend = null, behavior unchanged) and provides the correct metric key for getPolarity() lookup in the modeled path (defaults to higher_is_better for unknown metrics, which is the right business semantics for collection rates)."
  - "Auto-reset effect (modeledAvailable false → setBaselineMode('rolling')) prevents a stuck 'modeled' selection on a partner that has no projection data. CONTEXT lock: zero regression — modeled is always opt-in, default rolling."
  - "5% threshold for modeled-delta direction tagging uses STRICTLY GREATER THAN (>) — a delta of exactly 5.0% reports as flat. Matches the rolling-avg threshold convention in compute-trending.ts (which uses (1+THRESHOLD) and (1-THRESHOLD) bands; equality at the band edge is treated as flat there too)."
  - "BaselineSelector is mounted via a sibling div above KpiSummaryCards (justify-end), NOT via SectionHeader.actions. The KPI band has no SectionHeader today — adding one just to host the selector would be a larger refactor than CONTEXT scopes."
  - "modeledAvailable gates the panel-level selector's disabled state by checking if ANY visible batch has projection coverage (not all batches at all horizons). Per-card baseline-absent UX handles partial coverage gracefully — the right cut for the panel-level affordance."

patterns-established:
  - "Panel-level baseline selector mounted as a sibling above the KPI grid — useState at page level, derived availability boolean for disabled state, callback recovery from per-card baseline-absent UX. Reusable for any future panel-level KPI baseline."
  - "Modeled-vs-actual delta routing via shared StatCard.trend prop + trendLabel override — keeps StatCard rendering single-source-of-truth and lets the parent component own which baseline the delta represents."
  - "Pure-helper extraction (compute-projection.ts) for KPI delta math — smoke-testable in isolation via node --experimental-strip-types. Matches Phase 38 / Plan 02 precedent."

requirements-completed:
  - PRJ-04
  - PRJ-01  # docs re-sync component (already shipped functionally by 40-01)
  - PRJ-02  # docs re-sync component (already shipped functionally by 40-02)
  - PRJ-03  # docs re-sync component (already shipped functionally by 40-02)
  - PRJ-05  # docs re-sync component (already shipped functionally by 40-02)

# Metrics
duration: 6min
completed: 2026-04-25
---

# Phase 40 Plan 03: KPI Baseline Selector + Docs Re-sync Summary

**Panel-level `BaselineSelector` (Rolling avg | Modeled curve) above the KPI row at partner drill-down, with `KpiSummaryCards` routing per-card delta source through `computeModeledDelta` and overriding `StatCard.trendLabel` to "vs modeled curve" when modeled is selected. Per-card baseline-absent UX renders value-only with a "No modeled curve for this scope. Switch to rolling avg" inline recovery action — no silent fallback. ROADMAP + v4.1-REQUIREMENTS Phase 40 wording re-synced from the original "historical-average projection" framing to the actually-shipped modeled-deal curve scope (CONTEXT.md follow-up flag closed).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-25T02:47:56Z
- **Completed:** 2026-04-25T02:54:15Z
- **Tasks:** 3 (component + helper, KPI/data-display wiring, docs re-sync)
- **Files modified:** 7 (3 created, 2 modified, 2 docs updated)

## Accomplishments

- New pure helper `computeModeledDelta(latestCurve, horizon, actualRate, metricKey)` returns `BatchTrend | null` — null when projection absent / month outside coverage / modeled === 0 (divide-by-zero guard). Companion `modeledRateAtMonth(curve, month)` for the underlying lookup. Both compile/test cleanly via `node --experimental-strip-types` — 8 smoke scenarios pass (modeled absent, present, out-of-coverage, threshold-flat, up, down, divide-by-zero, projection-absent for delta path).
- New `BaselineSelector` component — panel-level segmented control with `Button` + `aria-pressed` (matches `ChartTypeSegmentedControl` precedent; the plan's `@base-ui/react/toggle-group` import does not resolve in this codebase). Disabled state on the modeled option is wrapped in `Tooltip` ("No modeled data in this scope") via the `<TooltipTrigger render={<span />}>` pattern used by `PresetDropdown` + `FilterPopover`.
- `KpiSummaryCards` extended with `baselineMode`, `curves`, `onSwitchToRolling` props. Each rate card branches: rolling path is unchanged; modeled path computes via `computeModeledDelta` with horizon from `HORIZON_BY_KEY[spec.key]`. When the modeled lookup returns null, the card renders value-only with a sibling caption + inline "Switch to rolling avg" button. `rateSinceInception` under modeled mode renders value-only with a "Lifetime rate — no modeled baseline at a single horizon" caption (no recovery action — user can switch the panel selector instead).
- `data-display.tsx` — `useState<BaselineMode>('rolling')` panel state + `modeledAvailable` derivation walks `partnerStats.curves.some(c => c.projection?.length > 0)` + auto-reset `useEffect` that flips back to rolling when modeled coverage disappears mid-session. `BaselineSelector` mounted via a `flex justify-end` div above `KpiSummaryCards` ONLY in the partner-drill block (CONTEXT lock — not at root, not at batch).
- ROADMAP.md Phase 40 goal + 5 success criteria rewritten to match modeled-curve scope; plan list 40-02 / 40-03 flipped to COMPLETE; the Phase 40 entry in the v4.1 phase list updated.
- v4.1-REQUIREMENTS.md PRJ-01..05 re-worded per RESEARCH.md "Phase Requirements" table; traceability table flipped PRJ-04 → Complete (40-03), PRJ-01 → Complete (data + chart shipped). Requirement IDs unchanged. "Rolling historical average" phrasing eliminated from the PRJ block.
- All guards clean: `npx tsc --noEmit` introduces zero new errors (only pre-existing `axe-core` test error persists — unchanged from Plan 01/02). `npm run check:tokens` + `npm run check:surfaces` both green.

## Task Commits

Each task was committed atomically:

1. **Task 1: BaselineSelector component + computeModeledDelta helper** — `0fdeb2a` (feat)
2. **Task 2: Wire baselineMode through KpiSummaryCards + mount selector in data-display.tsx** — `55fa034` (feat)
3. **Task 3: Re-sync ROADMAP + v4.1-REQUIREMENTS to modeled-curve scope** — `b21c9c4` (docs)

**Plan metadata:** *(captured in final commit appended after this summary)*

## Files Created/Modified

- `src/lib/computation/compute-projection.ts` (NEW) — `modeledRateAtMonth` + `computeModeledDelta` pure helpers; 5% threshold via `>` comparison; null returns drive baseline-absent UX in `KpiSummaryCards`.
- `src/lib/computation/compute-projection.smoke.ts` (NEW) — 8 scenarios via inline node `--experimental-strip-types` runner. Mirrors Phase 35/36/37/38 precedent.
- `src/components/kpi/baseline-selector.tsx` (NEW) — `Button` + `aria-pressed` segmented control, `Tooltip` wrap on the modeled option's disabled state. Type-token-clean (`text-caption text-muted-foreground` for the "Compare vs:" label; Button primitive owns its internal `text-[0.8rem]` per ui/ allowlist).
- `src/components/kpi/kpi-summary-cards.tsx` — extended props (`baselineMode`, `curves`, `onSwitchToRolling`); `HORIZON_BY_KEY` map drives modeled-rate lookup per cascade key; `rate3mo.trendMetric` set to `'COLLECTION_AFTER_3_MONTH'` (semantically harmless for rolling path; correct metric key for modeled-path getPolarity). Latest curve picked via in-place defensive sort by `ageInMonths`.
- `src/components/data-display.tsx` — `useState<BaselineMode>` + `modeledAvailable` memo + reset-to-rolling `useEffect`; `BaselineSelector` mounted in a `flex justify-end` sibling div above `KpiSummaryCards` in the partner-drill block ONLY.
- `.planning/ROADMAP.md` — Phase 40 goal + 5 success criteria rewritten to match modeled-curve scope; plan list 40-02 + 40-03 flipped COMPLETE; v4.1 milestone phase summary entry updated.
- `.planning/milestones/v4.1-REQUIREMENTS.md` — PRJ-01..05 re-worded per RESEARCH.md "Phase Requirements" pivoted column; traceability table updated (PRJ-04 → Complete, PRJ-01 → Complete).

## Decisions Made

See frontmatter `key-decisions` for the full list. Highlights:

1. **Button + aria-pressed instead of `@base-ui/react/toggle-group`** — the plan's suggested import does not exist in this codebase (verified via grep). The codebase pattern for segmented controls is `ChartTypeSegmentedControl` which uses `<Button>` + `aria-pressed`. Mirroring that pattern keeps a11y semantics consistent and avoids introducing an unused primitive. Documented inline in `baseline-selector.tsx`.
2. **Latest-curve selection via in-place sort by `ageInMonths`** — `usePartnerStats` does not pre-sort `curves` (it preserves `reshapeCurves` row order). The defensive sort inside `KpiSummaryCards` matches `use-curve-chart-state.ts:36-39` ("newest first = lowest ageInMonths"). Safer than positional index when row order is upstream-controlled.
3. **`rateSinceInception` under modeled mode = value-only with caption** — lifetime aggregate has no single horizon to look up against the projection. Caption explains the gap; no inline recovery action (user can flip the panel selector). Documented inline in `KpiSummaryCards`.
4. **Baseline-absent caption + recovery copy: "No modeled curve for this scope. Switch to rolling avg"** — matches CONTEXT.md's verbatim language. Recovery is an inline `<button>` whose underline is the affordance — fits inside a `<p>` without adding chrome.
5. **`rate3mo.trendMetric` set to `'COLLECTION_AFTER_3_MONTH'`** (was undefined) — semantically safe (rolling path's `trends.find` returns undefined since `compute-trending.ts` doesn't emit this metric; behavior unchanged), but provides a real metric key for the modeled path so `getPolarity()` defaults correctly. Eliminates the special-case `String(spec.aggregateKey)` fallback.
6. **`modeledAvailable` checks ANY visible batch has projection coverage** (not all-at-all-horizons). The panel-level affordance enables/disables on coarse availability; per-card baseline-absent UX handles partial coverage gracefully via the recovery action. Aligns with "panel-level decision, per-card refinement" pattern.
7. **Auto-reset side effect** — `useEffect(() => { if (!modeledAvailable && baselineMode === 'modeled') setBaselineMode('rolling'); }, [modeledAvailable, baselineMode])`. Prevents stuck 'modeled' selection when scope changes (e.g., switching partners) remove modeled coverage. Required for CONTEXT's zero-regression contract.
8. **Mount via sibling `<div>` not `SectionHeader.actions`** — KPI band has no SectionHeader today; adding one would be a larger refactor than this plan scopes. The selector lands as `<div className="flex items-center justify-end px-1">` directly above `<KpiSummaryCards>` in the partner-drill block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan's `@base-ui/react/toggle-group` import does not resolve**

- **Found during:** Task 1 (BaselineSelector creation)
- **Issue:** The plan's BaselineSelector sketch imported `ToggleGroup` and `ToggleGroupItem` from `@base-ui/react/toggle-group`, claiming "ToggleGroup primitive (already in codebase via ChartTypeSegmentedControl)." Grep confirmed (a) `ChartTypeSegmentedControl` does NOT use `ToggleGroup` — it uses `<Button>` + `aria-pressed` from `@/components/ui/button`; (b) no file in `src/` imports `@base-ui/react/toggle-group`; (c) only the plan + research docs reference the path.
- **Fix:** Implemented `BaselineSelector` using the actual codebase pattern: `<Button variant={active ? 'default' : 'ghost'} size="sm" aria-pressed={active}>` per option, `Tooltip` + `TooltipTrigger render={<span />}` wrapping the modeled option's disabled state (matches `PresetDropdown` / `FilterPopover` precedent for tooltip-wrapping a disabled/affordance element). Documented the deviation inline in the component's JSDoc.
- **Files modified:** `src/components/kpi/baseline-selector.tsx`
- **Verification:** `npx tsc --noEmit | grep baseline-selector` → empty. Component compiles cleanly.
- **Committed in:** `0fdeb2a` (Task 1 commit)

**2. [Rule 1 — Bug] Plan's hint `curves[curves.length - 1]` for "latest curve" is incorrect**

- **Found during:** Task 2 (KpiSummaryCards wiring)
- **Issue:** The plan suggested `const latestCurve = curves[curves.length - 1]` with the comment "newest batch — reshapeCurves sorts by ageInMonths asc." Grep on `reshape-curves.ts` shows it does NOT sort — it preserves `rows.map` input order. `use-curve-chart-state.ts:36-39` (the actual pre-sort site for the chart) sorts `[...curves].sort((a, b) => a.ageInMonths - b.ageInMonths)` and treats `sortedCurves[0]` as the newest (lowest age). So the plan's hint would have picked the OLDEST batch, not the latest.
- **Fix:** Defensive in-place sort inside `KpiSummaryCards` at the modeled-baseline branch — `[...curves].sort((a, b) => a.ageInMonths - b.ageInMonths)[0]`. Matches `use-curve-chart-state.ts` convention. Stable regardless of upstream `usePartnerStats` ordering.
- **Files modified:** `src/components/kpi/kpi-summary-cards.tsx`
- **Verification:** Code compiles + typecheck clean. Conceptual correctness validated against `use-curve-chart-state.ts:36-39`.
- **Committed in:** `55fa034` (Task 2 commit)

**Note on out-of-scope discovery:**
- Pre-existing TS error in `tests/a11y/baseline-capture.spec.ts:18` (`Cannot find module 'axe-core'`) persists unchanged from Plans 01 + 02. Logged in `.planning/phases/40-projected-curves-v1/deferred-items.md` already; no action needed in this plan.

---

**Total deviations:** 2 auto-fixed (1 blocking — wrong import path; 1 bug — wrong array-index hint)
**Impact on plan:** Both deviations were caught and corrected pre-commit. Final shipped behavior matches CONTEXT.md and plan's intent — only the plumbing details (Button vs ToggleGroup, defensive sort vs positional index) differ from the plan's literal sketches.

## Issues Encountered

None blocking. Phase 39 in-progress consumer changes (visible in `git status` at execution start) appear to have been resolved upstream during this plan's execution — the previously-deferred `table-body.tsx` / `filter-popover.tsx` errors no longer surface in `tsc --noEmit`.

## User Setup Required

None. The Phase 40 panel-level baseline selector ships with default state `'rolling'` so existing users see zero behavioral change. To exercise the modeled path:

1. Drill into a partner with at least one batch that has modeled curve coverage in `BOUNCE.FINANCE.CURVES_RESULTS` (per Plan 01's `useCurvesResults` hook resolving — note: the deployed Vercel env may not yet have Snowflake creds, in which case the route returns `data: []` and modeled curves never surface, so the BaselineSelector's modeled option stays disabled with the "No modeled data in this scope" tooltip).
2. Click "Modeled curve" in the panel-level selector above the KPI cards.
3. Each rate card swaps its delta source from rolling-avg to modeled-curve and updates the trend label to "vs modeled curve". Rate cards whose horizon has no modeled coverage in the latest batch render value-only with the recovery action.

## Next Phase Readiness

- **Phase 40 complete.** All 3 plans landed (40-01 data pipeline, 40-02 chart render, 40-03 KPI baseline selector + docs re-sync). All 5 PRJ requirements (PRJ-01..05) marked Complete in v4.1-REQUIREMENTS.md traceability.
- **Phase 41+ extension surfaces:**
  - Adding a third baseline (target-anchored, partner-reported) is a one-line `BaselineMode` union extension + a third routing branch in `KpiSummaryCards`. The pattern is now established.
  - Phase 49 (Dynamic Curve Re-Projection) extends Plan 02's chart overlay with confidence bands + target curves; the panel-level selector chrome is the established UX.
- **localStorage / URL persistence for `baselineMode`** — CONTEXT Deferred Idea, intentionally not shipped. One-line additions: `useState(() => localStorage.getItem('baselineMode') as BaselineMode ?? 'rolling')` + a `useEffect` write. Defer until user feedback confirms the need.

## Self-Check: PASSED

All claimed artifacts verified to exist on disk and in git history:
- `src/lib/computation/compute-projection.ts` — FOUND
- `src/lib/computation/compute-projection.smoke.ts` — FOUND
- `src/components/kpi/baseline-selector.tsx` — FOUND
- `src/components/kpi/kpi-summary-cards.tsx` (modified) — FOUND
- `src/components/data-display.tsx` (modified) — FOUND
- `.planning/ROADMAP.md` (modified) — FOUND
- `.planning/milestones/v4.1-REQUIREMENTS.md` (modified) — FOUND
- Commit `0fdeb2a` (Task 1) — FOUND in `git log --oneline`
- Commit `55fa034` (Task 2) — FOUND in `git log --oneline`
- Commit `b21c9c4` (Task 3) — FOUND in `git log --oneline`
- `node --experimental-strip-types src/lib/computation/compute-projection.smoke.ts` — 8 / 8 PASS
- `npx tsc --noEmit` — only pre-existing `axe-core` error (no new errors from Plan 03)
- `npm run check:tokens` — clean
- `npm run check:surfaces` — clean
- `grep -q "CURVES_RESULTS" .planning/ROADMAP.md` — match (3 occurrences)
- `grep -q "CURVES_RESULTS" .planning/milestones/v4.1-REQUIREMENTS.md` — match (1 occurrence)
- `grep -E "rolling historical average" .planning/milestones/v4.1-REQUIREMENTS.md .planning/ROADMAP.md` — no matches (legacy phrasing eliminated)

---
*Phase: 40-projected-curves-v1*
*Completed: 2026-04-25*
