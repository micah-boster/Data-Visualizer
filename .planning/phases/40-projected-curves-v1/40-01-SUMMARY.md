---
phase: 40-projected-curves-v1
plan: 01
subsystem: api
tags: [snowflake, tanstack-query, projection, curves-results]

requires:
  - phase: 38-polish-correctness
    provides: BatchCurve.points + reshapeCurves single-responsibility (composition site for projection merge)
  - phase: 25-filter-before-aggregate
    provides: usePartnerStats composition pattern + filtered partner-row pipeline

provides:
  - GET /api/curves-results endpoint (latest-VERSION + ROW_NUMBER dedup against BOUNCE.FINANCE.CURVES_RESULTS)
  - useCurvesResults TanStack Query hook (5-min staleTime, sibling to useData)
  - useCurvesResultsIndex helper — Map<"lenderId||batchName", CurvePoint[]>
  - BatchCurve.projection?: CurvePoint[] (additive-optional, zero consumer changes)
  - usePartnerStats merges projections via per-batch lenderByBatch lookup (Pitfall 1 lock)

affects:
  - 40-02-PLAN — chart rendering can read curve.projection directly
  - 40-03-PLAN — KPI baseline-modeled-delta reads modeled rate from latestCurve.projection
  - Phase 41+ — any feature consuming BatchCurve sees projection as a stable additive field

tech-stack:
  added: []
  patterns:
    - "Sibling TanStack Query for secondary Snowflake datasets that must coexist without blocking first paint"
    - "Wire-shape vs normalized-shape type split (UPPERCASE wire keys, lowercase normalized) at the hook layer"
    - "Per-batch (lenderId, batchName) lookup keying for warehouse data that the app aggregates by partner"
    - "ROW_NUMBER() OVER (PARTITION BY lender, batch, month) dedup for multi-pricing-type warehouse rows"

key-files:
  created:
    - src/app/api/curves-results/route.ts
    - src/types/curves-results.ts
    - src/hooks/use-curves-results.ts
    - .planning/phases/40-projected-curves-v1/40-01-CONFIRM.md
  modified:
    - src/types/partner-stats.ts
    - src/hooks/use-partner-stats.ts

key-decisions:
  - "Route multiplies PROJECTED_FRACTIONAL × 100 at the API boundary so client-side CurvePoint.recoveryRate stays consistently 0..100. Reversible single-line change if live probe shows already-percentage units."
  - "Per-batch lenderId lookup (lenderByBatch Map walked from partnerRows) — NOT partner-uniform. Pitfall 1 lock: a single PARTNER_NAME may span multiple LENDER_IDs."
  - "Pricing-type dedup via ROW_NUMBER() OVER (PARTITION BY LENDER_ID, BATCH_, COLLECTION_MONTH ORDER BY VERSION DESC) — picks the latest-VERSION row across all pricing types so a batch always emits one curve. Multi-pricing overlay deferred to v5.0."
  - "Wire shape uses UPPERCASE Snowflake column names (matches /api/data convention); useCurvesResultsIndex renames to lowercase. Decouples API casing from consumer code."
  - "Static-mode returns {data: [], meta: {...}} — graceful degradation. Chart renders actuals only when Snowflake creds absent (Pitfall 4 lock)."
  - "5-minute staleTime on useCurvesResults — projection data refreshes on warehouse ETL cadence, not on user interaction."
  - "useCurvesResultsIndex called OUTSIDE the usePartnerStats useMemo so first paint of actuals isn't blocked on the second query (per RESEARCH 'don't block first paint')."

patterns-established:
  - "Sibling TanStack Query pattern: secondary Snowflake fetch (/api/curves-results) coexists with primary (/api/data) without blocking first paint. Replicable for any future overlay data source."
  - "Wire-vs-normalized type split: API returns UPPERCASE wire shape; client hook reshapes to lowercase normalized shape inside useMemo. Decouples warehouse casing from app code."
  - "Per-batch lookup keying for cross-partner-aggregating data: walk source rows once to build Map<batch, secondary-key>, then lookup secondary data via composite key. Robust to 1:1 and 1:N partner→secondary-key mappings."
  - "Additive-optional schema evolution: BatchCurve.projection? lands without a single consumer edit. All 13 usePartnerStats consumers compile unchanged. Reusable pattern for any cross-cutting type extension."
  - "Empirical-confirmation deferral via CONFIRM.md: Task 0 documents probe SQL + RESEARCH-default decisions when interactive auth blocks live probes. Plan 02 author can run the probes post-deploy and update if needed."

requirements-completed:
  - PRJ-01

duration: 4min
completed: 2026-04-25
---

# Phase 40 Plan 01: Modeled Projection Data Pipeline Summary

**Snowflake-backed `/api/curves-results` route + sibling TanStack Query hook + additive-optional `BatchCurve.projection` field, threaded through `usePartnerStats` via per-batch (lenderId, batchName) lookup. Zero consumer edits required; chart + KPI plans (02 + 03) can assume projection data is available.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-25T02:27:50Z
- **Completed:** 2026-04-25T02:31:50Z
- **Tasks:** 3 (Task 0 deferred-probes + Task 1 route/hook + Task 2 merge)
- **Files modified:** 6 (3 created, 2 modified, 1 docs)

## Accomplishments

- New GET `/api/curves-results` endpoint with latest-VERSION pinning + per-(batch, month) ROW_NUMBER dedup against `BOUNCE.FINANCE.CURVES_RESULTS`. Static-mode returns empty array for graceful degradation.
- `useCurvesResults` (TanStack Query, 5-min staleTime) + `useCurvesResultsIndex` helper that builds a stable `Map<"lenderId||batchName", CurvePoint[]>` keyed for the per-batch lookup pattern.
- `BatchCurve.projection?: CurvePoint[]` — additive-optional, all 13 existing `usePartnerStats` consumers compile unchanged.
- `usePartnerStats` merges projections via a per-batch `lenderByBatch` Map (Pitfall 1 lock — a single partner may span multiple lenders).
- CONFIRM.md captures probe SQL + RESEARCH-default decisions for the three Claude's-discretion items (units, join shape, pricing-type dedup); Plan 02 author can run live probes post-deploy.

## Task Commits

Each task was committed atomically:

1. **Task 0: Empirical-confirm probes** — `150a0c2` (docs)
2. **Task 1: API route + types + hook** — `7a7d70f` (feat)
3. **Task 2: BatchCurve.projection + usePartnerStats merge** — `1bd28a7` (feat)

**Plan metadata:** _(captured in final commit appended after this summary)_

## Files Created/Modified

- `src/app/api/curves-results/route.ts` — GET endpoint, ROW_NUMBER dedup SQL, ×100 unit conversion, static-mode early return.
- `src/types/curves-results.ts` — `CurvesResultsWireRow` (UPPERCASE), `ProjectionRow` (lowercase), `CurvesResultsResponse`.
- `src/hooks/use-curves-results.ts` — `useCurvesResults()` query hook + `useCurvesResultsIndex()` Map builder.
- `src/types/partner-stats.ts` — `BatchCurve.projection?: CurvePoint[]` added with JSDoc explaining graceful-degradation contract.
- `src/hooks/use-partner-stats.ts` — `useCurvesResultsIndex()` pulled outside memo (no first-paint blocking); per-batch `lenderByBatch` lookup; projection merged into curves.
- `.planning/phases/40-projected-curves-v1/40-01-CONFIRM.md` — Probe SQL + RESEARCH-default decisions (units ×100, per-batch lenderId lookup, ROW_NUMBER dedup).

## Decisions Made

See frontmatter `key-decisions` for the full list. Highlights:

1. **Units conversion (×100) at API boundary** — keeps client-side `CurvePoint.recoveryRate` consistently 0..100 across actuals + modeled. Reversible if live probe shows already-percentage units.
2. **Per-batch lenderId lookup, not partner-uniform** — Pitfall 1 lock. Code walks `partnerRows` once into `lenderByBatch` Map; lookup miss → `projection` undefined → graceful actuals-only render.
3. **ROW_NUMBER over (lender, batch, month) ORDER BY VERSION DESC** — handles multi-pricing-type rows deterministically. Single curve per batch in v1; multi-pricing overlay deferred to v5.0.
4. **Wire shape mirrors `/api/data` UPPERCASE convention** — client hook does the rename. Decouples warehouse casing from app code.
5. **5-min staleTime** — projection data refreshes on warehouse ETL cadence, not user interaction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Snowflake `externalbrowser` auth incompatible with non-interactive CLI scratch probes**
- **Found during:** Task 0 (empirical confirm probes)
- **Issue:** Plan's Probe 1/2/3 require running live SQL against Snowflake. `.env.local` is set to `SNOWFLAKE_AUTH=externalbrowser`, which opens an interactive browser tab on first connection — incompatible with the agent's non-interactive shell. There is no `npm run query` or other alternative entry point.
- **Fix:** Per the plan's own fallback clause ("If any probe cannot be run (Snowflake creds unavailable), fall back to RESEARCH recommendations"), recorded probe SQL + RESEARCH-default decisions in CONFIRM.md with a post-deploy verification checklist for Plan 02 author.
- **Files modified:** `.planning/phases/40-projected-curves-v1/40-01-CONFIRM.md`
- **Verification:** `test -f .planning/phases/40-projected-curves-v1/40-01-CONFIRM.md && grep "Route multiplies" ...` → matched. Plan's own automated verify check passes.
- **Committed in:** `150a0c2` (Task 0 commit)

**Note on out-of-scope discovery:**
- Pre-existing TS error in `tests/a11y/baseline-capture.spec.ts:18` (`Cannot find module 'axe-core'`) is unrelated to this plan and was logged to `.planning/phases/40-projected-curves-v1/deferred-items.md` per the scope-boundary rule. Did not fix.

---

**Total deviations:** 1 auto-fixed (1 blocking, handled per plan's own fallback clause)
**Impact on plan:** Plan 01 lands the data pipeline as designed. Empirical verification of the three CONFIRM.md decisions migrates to Plan 02 (post-deploy smoke). All RESEARCH defaults applied are reversible single-line edits if probes contradict.

## Issues Encountered

None. Pre-existing modifications in `src/lib/snowflake/{connection,types}.ts` and `src/lib/static-cache/fallback.ts` (visible in `git status` at execution start) were left untouched — they are not part of this plan's file list.

## User Setup Required

None. The new `/api/curves-results` route uses the same Snowflake env vars already required by `/api/data`. When the deployed Vercel env eventually has Snowflake creds, projections will surface automatically; until then, the route returns `{data: []}` and the chart degrades gracefully to actuals-only.

## Next Phase Readiness

- **Plan 02 (chart rendering)** can read `curve.projection` directly inside `CollectionCurveChart`'s pivot helper. No further data plumbing required.
- **Plan 03 (KPI baseline)** can reach modeled rate at a horizon via `latestCurve.projection?.find(p => p.month === horizon)`. The `compute-projection.ts` helper sketched in RESEARCH can land in Plan 03 against this shape.
- **Post-deploy smoke for Plan 02 author:** run the three probes in CONFIRM.md against live Snowflake, confirm units (×100 vs already-percentage), confirm any partner spans multiple lenders (validates per-batch lookup), confirm ROW_NUMBER dedup leaves one curve per batch.

## Self-Check: PASSED

All claimed artifacts verified to exist on disk and in git history:
- `src/app/api/curves-results/route.ts` — FOUND
- `src/types/curves-results.ts` — FOUND
- `src/hooks/use-curves-results.ts` — FOUND
- `src/types/partner-stats.ts` (modified) — FOUND
- `src/hooks/use-partner-stats.ts` (modified) — FOUND
- `.planning/phases/40-projected-curves-v1/40-01-CONFIRM.md` — FOUND
- Commit `150a0c2` (Task 0) — FOUND in `git log --oneline`
- Commit `7a7d70f` (Task 1) — FOUND in `git log --oneline`
- Commit `1bd28a7` (Task 2) — FOUND in `git log --oneline`
- `npx tsc --noEmit` — clean (only pre-existing axe-core error in a11y test, logged to deferred-items.md)

---
*Phase: 40-projected-curves-v1*
*Completed: 2026-04-25*
