---
phase: 41-data-correctness-audit
plan: 02
subsystem: data
tags: [parser, null-semantics, anomaly-detection, eligibility, apples-and-oranges, vitest]

# Dependency graph
requires:
  - phase: 41-01-aggregation-contract
    provides: aggregation strategy + per-column meta — independent, no coupling
  - phase: 38-polish-correctness-pass
    provides: coerceAgeMonths shared helper + cascade.smoke pattern
  - phase: 39-partner-config-module
    provides: kpiAggregatesPerSegment pipeline — apples-and-oranges assertion injects here
provides:
  - "src/lib/data/parse-batch-row.ts (NEW directory) — parseBatchRow + isRateShapedNullable + RATE_SHAPED_NULLABLE_FIELDS, narrow scope (NULL semantics only)"
  - "src/lib/computation/metric-eligibility.ts — isMetricEligible + metricHorizonMonths (DCR-07 metric-age eligibility filter)"
  - "Anomaly detector skips ineligible (batch, metric) pairs BEFORE z-score check, and skips null-valued rate-shaped metrics"
  - "compute-kpis.ts exports assertSegmentsNonOverlapping (DCR-10 runtime invariant; dev throws, prod logs, never blocks render)"
  - "kpiAggregatesPerSegment calls assertSegmentsNonOverlapping once per compute pass"
  - "vitest.config.ts + npm run test:vitest — first Vitest install in the codebase; v5.5 DEBT-09 expansion seed"
  - "src/lib/computation/young-batch-censoring.test.ts — synthetic Vitest test pinning DCR-07 behavior"
affects:
  - 41-05-metric-audit  # parser narrow scope is the extension point — audit verifies static cache routes through parseBatchRow
  - 43-boundary-hardening  # BND-01 extends parse-batch-row.ts (branded BatchAgeMonths + long-format curve), inherits DCR-08 NULL semantics
  - 51-tech-debt-sweep   # DEBT-09 inherits the Vitest seed and expands coverage / property-based tests

# Tech tracking
tech-stack:
  added:
    - "vitest@2.1.9 (devDependency only; @vitest/ui + @vitest/coverage-v8 NOT installed — v5.5 DEBT-09 expands)"
  patterns:
    - "Eligibility-filter-before-z-score: gate (batch_age_months >= metric_horizon_months) BEFORE the z-score arithmetic. Filters the row out of evaluation entirely (NOT a 'found 0' outcome)"
    - "Null-skip-before-coerce: rate-shaped fields skip on null/undefined/empty before Number(...) coercion — preserves the meaningful difference between 'no activity' and 'genuinely zero'"
    - "Runtime invariant pattern: dev throws (visible in error boundary), prod console.error (telemetry surface, never blocks render). Tolerance: $0.01 absolute drift accepted for floating-point arithmetic"
    - "Synthetic Vitest test fixture: pure-compute tests in src/**/*.test.ts under environment: 'node'; @/ alias resolved via vitest.config.ts to keep import paths consistent with Next.js"

key-files:
  created:
    - "src/lib/data/parse-batch-row.ts"
    - "src/lib/computation/metric-eligibility.ts"
    - "src/lib/computation/metric-eligibility.smoke.ts"
    - "src/lib/computation/apples-and-oranges.smoke.ts"
    - "src/lib/computation/young-batch-censoring.test.ts"
    - "vitest.config.ts"
  modified:
    - "src/lib/computation/compute-anomalies.ts"
    - "src/lib/computation/compute-kpis.ts"
    - "src/lib/partner-config/segment-split.ts"
    - "package.json"
    - "pnpm-lock.yaml"

key-decisions:
  - "Eligibility filter as ONE shared helper file (src/lib/computation/metric-eligibility.ts) rather than inline per-detector — keeps the rule discoverable and makes the strict 'batch_age >= horizon' contract reviewable in one place. Future cascade-tier or projection-overlay code can reuse the same horizon table"
  - "Parser narrow scope LOCKED to NULL semantics only (DCR-08) — no branded types, no long-format curves. Phase 43 BND-01/02 inherits parse-batch-row.ts as an extension point; the file's docstring explicitly delineates the boundary so a future extender doesn't accidentally widen scope here"
  - "Apples-and-oranges canary scalar = totalCollected (KpiAggregates) — the user-facing dollar metric the apples-and-oranges contract was originally written about. Tolerance set to $0.01 absolute (NOT relative) — a $0.01 drift on $50M collected is rounding noise; a $1 drift is overlap. Absolute keeps the threshold legible to a future debugger reading the error message"
  - "Dev = throw, prod = console.error — does NOT use process.env.NODE_ENV === 'development' check (could be undefined in browser). Uses `process.env.NODE_ENV !== 'production'` so any non-prod env (test, staging, undefined) fails loud"
  - "Penetration metric used as the 'always-eligible' probe in the second test rather than COLLECTION_AFTER_3_MONTH — surprise: 3mo metric is NOT in ANOMALY_METRICS (only 6mo + 12mo). Penetration is in ANOMALY_METRICS with horizon 0, so it's the cleanest 'always evaluable' lever for testing post-filter behavior on young batches"
  - "BATCH_AGE_IN_MONTHS (not MAX_AGE_MONTHS) is the field compute-anomalies reads via coerceAgeMonths — the plan template named MAX_AGE_MONTHS but the actual code reads BATCH_AGE_IN_MONTHS. Test fixture corrected to write the field the code actually reads"
  - "Vitest 2.1.9 over 4.x — pnpm offered 4.1.5 as available but 2.x is the version specified by plan and CONTEXT (matches the v5.5 DEBT-09 seed bound; future expansion can bump if needed). Minimal footprint: only vitest installed, no @vitest/ui, no coverage-v8, no fast-check"
  - "@/ path alias added to vitest.config.ts (path.resolve(__dirname, './src')) — matches Next.js tsconfig paths so test imports use the same shape as production code. Without it, ./compute-anomalies-style relative imports work but the @-aliased imports (used by compute-anomalies.ts internals) would fail when transitively resolved"

patterns-established:
  - "Eligibility-filter-not-bucket-norms: chosen over per-age-bucket norms (CONTEXT lock cited in ADR 008) — simpler, defensible to partners as one-sentence frame ('12-month collection on a 4-month batch is meaningless'), matches step-function nature of horizon metrics, less surface area than per-age-bucket cohorts"
  - "Narrow-scope parser as an extension point: parse-batch-row.ts ships only what DCR-08 needs today (NULL semantics for 7 rate-shaped fields). Phase 43 extends; v4.5 doesn't widen. The docstring explicitly delineates the boundary"
  - "Vitest seed pattern: install vitest, ship config + ONE test that exercises the most CONTEXT-locked behavior, defer port + coverage to a later phase. Mirrors Phase 25/27-06/29-05/30-05/35-01 test-infra-deferral precedent"

requirements-completed:
  - DCR-07
  - DCR-08
  - DCR-10

# Metrics
duration: ~50min (interrupted + resumed across two sessions; first session shipped Tasks 1+2 with 3 commits; second session shipped Task 3 + SUMMARY)
completed: 2026-04-30
---

# Phase 41 Plan 02: Null Semantics + Young-Batch Censoring + Apples-and-Oranges Invariant Summary

**Three statistical correctness fixes (DCR-07/08/10) + Vitest seed pulled forward from v5.5 DEBT-09. Anomaly detector now skips young batches on metrics whose horizon they haven't reached, distinguishes "no activity" from "genuinely zero" on rate-shaped fields, and a runtime invariant fails loud in dev when segments overlap.**

## Performance

- **Duration:** ~50 min net across two sessions (rate-limit interruption between Task 2 commit and Task 3)
- **Started:** 2026-04-27T22:30Z (estimated from `703da63` commit time)
- **Completed:** 2026-04-30T02:25Z
- **Tasks:** 3 / 3
- **Files created:** 6 — `parse-batch-row.ts`, `metric-eligibility.ts`, `metric-eligibility.smoke.ts`, `apples-and-oranges.smoke.ts`, `young-batch-censoring.test.ts`, `vitest.config.ts`
- **Files modified:** 5 — `compute-anomalies.ts`, `compute-kpis.ts`, `segment-split.ts`, `package.json`, `pnpm-lock.yaml`

## Accomplishments

- **DCR-07 satisfied** — `compute-anomalies.ts:213` gates every (batch, metric) pair through `isMetricEligible(batchAgeMonths, metric)` BEFORE the z-score check. A 4-month-old batch is no longer evaluated against `COLLECTION_AFTER_12_MONTH` (or 6mo). The synthetic Vitest test (`young-batch-censoring.test.ts`) pins the behavior with two assertions: young batches don't flag on the 12mo metric (ineligible — 4mo < 12mo horizon), but young batches DO still flag on `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` (always-eligible — horizon 0).
- **DCR-08 satisfied** — `src/lib/data/parse-batch-row.ts` ships as the canonical narrow-scope parser with `RATE_SHAPED_NULLABLE_FIELDS` enumerating the 7 rate-shaped fields where null is meaningful (SMS open/click, email open/click, call connect/RPC, dispute). `compute-anomalies.ts` uses `isRateShapedNullable(metric)` + an explicit `(rawValue === null || rawValue === undefined || rawValue === '')` guard before `Number(...)` coercion so an SMS-no-engagement partner is no longer flagged as zero-engagement.
- **DCR-10 satisfied** — `assertSegmentsNonOverlapping(segmentTotals, allRowsTotal, context)` exported from `compute-kpis.ts` with $0.01 absolute tolerance. Dev throws (visible in error boundary), prod `console.error`s (telemetry surface, never blocks render). Wired in `segment-split.ts` once per compute pass against `totalCollected` as the canary scalar.
- **Vitest seed in place** — `vitest@2.1.9` installed as dev dependency, `vitest.config.ts` at repo root with `@/` alias matching Next.js tsconfig, `npm run test:vitest` exits 0 with 2 passing tests. v5.5 DEBT-09 inherits and expands.
- All existing smokes still green (`smoke:cascade`, `smoke:pair`, `smoke:segment-split`, `smoke:metric-eligibility`, `smoke:apples-and-oranges`).

## Task Commits

Each task committed atomically across two sessions (rate-limit interruption between Task 2 and Task 3):

1. **Task 1: Narrow parser + metric-eligibility helper** — `703da63` (feat) — `parse-batch-row.ts`, `metric-eligibility.ts`, `metric-eligibility.smoke.ts`, `package.json` smoke script
2. **Task 2: Wire eligibility + null-skip + apples-and-oranges** — `5650a66` (fix) — `compute-anomalies.ts`, `compute-kpis.ts`, `segment-split.ts`, `apples-and-oranges.smoke.ts`, `package.json` smoke script
3. **Task 3: Bootstrap Vitest + young-batch synthetic test** — `6523d7e` (test) — `vitest.config.ts`, `young-batch-censoring.test.ts`, `package.json` test:vitest scripts, `pnpm-lock.yaml` (vitest install)

Mid-plan supplementary commit: `5083c88` (fix) — RootSparkline data keys updated to use pairKey (carryover from prior session, included in Plan 41-02's git log because the file was touched alongside the apples-and-oranges work).

## Files Created/Modified

### Created

- **`src/lib/data/parse-batch-row.ts`** (NEW directory `src/lib/data/`) — Narrow-scope canonical parser. Exports `parseBatchRow`, `isRateShapedNullable`, `RATE_SHAPED_NULLABLE_FIELDS`. The 7 rate-shaped nullable fields: `SMS_OPEN_RATE`, `SMS_CLICK_RATE`, `EMAIL_OPEN_RATE`, `EMAIL_CLICK_RATE`, `CALL_CONNECT_RATE`, `CALL_RPC_RATE`, `DISPUTE_RATE`. Other downstream parser concerns (branded types, long-format curves) explicitly deferred to Phase 43 BND-01/02 with an inline note.
- **`src/lib/computation/metric-eligibility.ts`** — `isMetricEligible(batchAgeMonths, metric)` and `metricHorizonMonths(metric)`. Strict rule (no safety margin) per CONTEXT lock. Horizon table: `COLLECTION_AFTER_3_MONTH → 3`, `_6_MONTH → 6`, `_12_MONTH → 12`, all others default 0 (always evaluable).
- **`src/lib/computation/metric-eligibility.smoke.ts`** — 11 assertions covering strict eligibility (4mo < 12mo, 11.99mo < 12mo, 12mo == 12mo eligible), 6mo metric, always-evaluable, NaN/negative defensive cases, horizon lookup. Wired as `smoke:metric-eligibility` in package.json.
- **`src/lib/computation/apples-and-oranges.smoke.ts`** — 3 assertions: happy path (sum equals total → no throw), within-tolerance (floating-point drift), violation in dev mode → throws. Wired as `smoke:apples-and-oranges`.
- **`src/lib/computation/young-batch-censoring.test.ts`** — Vitest synthetic test (2 `it()` blocks, see test-shape notes below).
- **`vitest.config.ts`** (repo root) — Minimal config: `include: ['src/**/*.test.ts']`, `environment: 'node'`, `globals: false`, `@/` alias resolving to `./src` (matches Next.js tsconfig).

### Modified

- **`src/lib/computation/compute-anomalies.ts`** — Imported `isMetricEligible` and `isRateShapedNullable`; inserted eligibility gate at line 213 (before z-score check) and null gate at line 222-228. Uses shared `coerceAgeMonths(row.BATCH_AGE_IN_MONTHS)` helper from `src/lib/utils.ts` (handles legacy-days static-cache rows alongside live months). Inline ADR comments cite `metric-eligibility.ts` + `.planning/adr/008-young-batch-censoring.md`.
- **`src/lib/computation/compute-kpis.ts`** — Added `assertSegmentsNonOverlapping` near the top of the file with `APPLES_TOLERANCE_DOLLARS = 0.01` constant. Dev throws, prod `console.error`s. Inline JSDoc cites the Phase 39 PCFG-07 invariant the function defends.
- **`src/lib/partner-config/segment-split.ts`** — `kpiAggregatesPerSegment` calls `assertSegmentsNonOverlapping(segmentTotals, allRowsTotal, 'kpiAggregatesPerSegment')` once per compute pass with `totalCollected` as the canary scalar.
- **`package.json`** — Added scripts: `smoke:metric-eligibility`, `smoke:apples-and-oranges`, `test:vitest`, `test:vitest:watch`. Added `vitest: ^2.1.9` to `devDependencies`.
- **`pnpm-lock.yaml`** — vitest@2.1.9 + 35 transitive packages added (chai, fast-glob, @vitest/runner, etc.).

## Implementation Surprises (test-fixture adaptation)

The plan's test fixture template needed three corrections during execution to match the actual `compute-anomalies.ts` contract:

1. **Field name: `BATCH_AGE_IN_MONTHS`, not `MAX_AGE_MONTHS`.** The plan template named `MAX_AGE_MONTHS` but `compute-anomalies.ts:202` reads `coerceAgeMonths(row.BATCH_AGE_IN_MONTHS)`. Fixture corrected.
2. **`COLLECTION_AFTER_3_MONTH` is NOT in `ANOMALY_METRICS`.** Only 6mo and 12mo collection horizons are evaluated by the anomaly detector (see `compute-anomalies.ts:31-45`). The plan's second-test idea (test outlier flag on the 3mo metric for a 4mo-old batch) doesn't exercise any code path. Substituted `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` (in ANOMALY_METRICS, horizon 0, always evaluable) as the eligible-for-young-batch probe.
3. **`computeAnomalies(rows, norms)` signature** takes pre-computed norms (from `computeNorms(rows)`), not partner+product separately as the plan template suggested. Fixture computes norms inline via `computeNorms(allBatches)` and passes both into `computeAnomalies`.

These adaptations are documented inline at the test file's docstring so a future reader sees the contract surface without git-archeology.

## Eligibility-Filter Insertion Point (line numbers)

The eligibility + null gates land in `computeAnomalies`'s per-row metric loop:

- **Line 202** — `coerceAgeMonths(row.BATCH_AGE_IN_MONTHS)` derives once per row, OUTSIDE the metric loop.
- **Line 213** — `if (!isMetricEligible(batchAgeMonths, metric)) continue;` — eligibility gate, BEFORE the z-score arithmetic.
- **Lines 222-228** — `isRateShapedNullable(metric)` + explicit null/undefined/empty guard, BEFORE `Number(...)` coercion.

The inline comments at each gate are extensive (8 + 8 lines respectively) — they document precedence (eligibility before null before z-score), the architectural commitment (filter, not per-bucket norms; ADR 008), and the contract with `computeNorms` upstream (norms are pre-computed and don't repollute by the eligibility filter — `computeNorms` already filters null and the filter only operates inside `computeAnomalies`).

## Apples-and-Oranges Canary Scalar

`totalCollected` was chosen as the canary scalar over `totalPlaced` or `totalAccounts` for three reasons:

1. **User-facing relevance** — totalCollected is the dollar metric the apples-and-oranges contract was originally written about (the comment at the top of `computeKpis` cites it explicitly). Picking the same scalar keeps the failure message readable: "segment sum X.XX does not equal total Y.YY" maps directly to a number a partner manager would recognize.
2. **Always-present** — every row has a `TOTAL_COLLECTED_LIFE_TIME` value (no null). totalAccounts can be zero on a placeholder row; totalPlaced can have edge cases on the smaller v1 fixtures.
3. **Float drift is bounded** — totalCollected on the largest partner is in the $50M range; $0.01 tolerance on that is 2×10⁻¹⁰ relative drift, well below floating-point noise. Tolerance set absolute (not relative) for legibility of the error message.

## Decisions Made

- **Filter, not per-bucket norms** (CONTEXT lock + ADR 008 reaffirmation) — simpler and matches partner-facing framing.
- **Parser narrow scope** — DCR-08 NULL semantics only; explicitly defers branded types + long-format curves to Phase 43 BND-01/02 with an inline note.
- **Apples-and-oranges tolerance: $0.01 absolute** — float drift bounded; legible message.
- **Dev = throw, prod = console.error** via `process.env.NODE_ENV !== 'production'` (any non-prod env fails loud).
- **Penetration as the always-eligible probe in tests** — 3mo metric isn't in ANOMALY_METRICS; penetration is the cleanest replacement.
- **Vitest 2.1.9 over 4.x** — matches plan + CONTEXT spec; v5.5 DEBT-09 may bump.
- **Minimal Vitest footprint** — no @vitest/ui, no coverage-v8, no fast-check; v5.5 expansion seed.
- **`@/` alias in vitest.config.ts** — matches Next.js tsconfig so test imports look like production imports. Without this, transitive imports inside compute-anomalies.ts would fail to resolve from a test context.
- **CI hook deferred to user** — per Phase 27-06 `check:tokens` precedent: script lives, CI wiring user-owned (one-line addition to Vercel build or GitHub Actions).

## Deviations from Plan

### Auto-fixed (Rule 1 / Rule 3)

**1. [Rule 3 - Blocking] npm install failed with internal arborist error**
- **Found during:** Task 3 install step.
- **Issue:** `npm install --save-dev vitest@^2.0.0` failed with `Cannot read properties of null (reading 'matches')` deep in the npm arborist's dedupe logic. `--legacy-peer-deps` produced the same error.
- **Fix:** Discovered the project uses pnpm (pnpm-lock.yaml present, no package-lock.json). Switched to `pnpm add --save-dev vitest@^2.0.0`, which installed cleanly.
- **Files modified:** `package.json`, `pnpm-lock.yaml`.
- **Commit:** `6523d7e`.

**2. [Rule 3 - Blocking] @/ alias unresolved by Vitest**
- **Found during:** Task 3 first test run.
- **Issue:** Without `@/` alias resolution, transitive imports inside `compute-anomalies.ts` (e.g. `import { ... } from '@/lib/utils'`) failed when Vitest loaded the test.
- **Fix:** Added `resolve.alias` block to `vitest.config.ts` resolving `@` → `./src` via `path.resolve(__dirname, './src')`. Matches the Next.js tsconfig path mapping.
- **Files modified:** `vitest.config.ts`.
- **Commit:** `6523d7e`.

**3. [Rule 1 - Bug in test fixture] Test 2 wrote outlier on COLLECTION_AFTER_3_MONTH, which isn't in ANOMALY_METRICS**
- **Found during:** First Vitest run — Test 2 failed with "expected false to be true."
- **Issue:** The plan template's second test set up a 4mo outlier on `COLLECTION_AFTER_3_MONTH`, expecting it to flag. But `ANOMALY_METRICS` only includes 6mo + 12mo collection horizons (not 3mo), so the detector never evaluates the 3mo metric — no flag could be produced.
- **Fix:** Substituted `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` (in ANOMALY_METRICS with horizon 0). Test 2 now asserts: 4mo-old outlier with `PENETRATION_RATE = 2` (cohort cluster ~25) is flagged on the penetration metric — confirming the eligibility filter does NOT silently swallow legitimate flags on always-evaluable metrics.
- **Files modified:** `src/lib/computation/young-batch-censoring.test.ts`.
- **Commit:** `6523d7e`.

### Out-of-scope (deferred)

- Pre-existing typecheck error in `tests/a11y/baseline-capture.spec.ts` (missing `axe-core` types) — unrelated to this plan, logged as deferred per SCOPE BOUNDARY.
- Pre-existing 50 lint problems in unrelated files — none in `compute-anomalies.ts`, `compute-kpis.ts`, `segment-split.ts`, `parse-batch-row.ts`, `metric-eligibility.ts`, `young-batch-censoring.test.ts`, or `vitest.config.ts`.

### CI hook (deferred per Phase 27-06 precedent)

`npm run test:vitest` script lives; wiring into Vercel build step or GitHub Actions is a one-line user-owned change. Plan does NOT auto-wire CI for the same reason `check:tokens` (Phase 27-06) didn't: project precedent is "ship the script, defer the CI hook to the user-owned config layer." A note recorded for the user in this SUMMARY.

## Issues Encountered

- **Session interrupted by usage limit between Tasks 2 and 3.** Confirmed all prior work committed (`703da63`, `5650a66`, `5083c88`); resumed by reading the plan + STATE, verifying which artifacts already existed (parse-batch-row.ts ✓, metric-eligibility.ts ✓, both smokes ✓), and shipping Task 3 + SUMMARY in the second session.
- **npm vs pnpm package manager mismatch.** Plan template assumed npm; project uses pnpm. Documented as Rule 3 deviation above.
- **Plan's test fixture had three contract drifts** (field name, missing-from-ANOMALY_METRICS metric, signature shape) — all surfaced on first run and corrected before commit. Documented in "Implementation Surprises" section above.

## User Setup Required

- **Optional: wire `npm run test:vitest` into CI** (Vercel build step or GitHub Actions). One-line change. Project precedent (Phase 27-06 `check:tokens`) is to defer this to the user. v5.5 DEBT-09 may codify the wiring as part of the test-pyramid expansion.

## Next Phase Readiness

- **Plan 41-05 (final audit / phase close):** Static cache parity verification — route the JSON fixture rows through `parseBatchRow` and confirm behavior matches live Snowflake rows. The parser narrow scope is the canary surface for the audit.
- **Phase 43 BND-01 (Boundary Hardening):** Inherits `parse-batch-row.ts` as an extension point. Adds branded `BatchAgeMonths = number & { __brand: 'months' }` and long-format `curve: CurvePoint[]` baked into the row shape. Phase 41-02 explicitly delineated the boundary in the file's docstring so a future extender doesn't widen scope.
- **Phase 51 DEBT-09 (Tech Debt Sweep):** Inherits `vitest.config.ts` + `npm run test:vitest`. Expands by porting the 9+ existing `*.smoke.ts` scripts to Vitest, moving tests under `tests/`, adding coverage reporting (≥95% on `src/lib/computation/**`), and adding property-based tests via fast-check.
- **Plan 41-04 ADRs (already shipped):** ADR 007 (penetration weighting) cites Plan 41-01; ADR 008 (young-batch censoring) cites this plan as the implementation of the metric-age-eligibility filter architecture.

## Self-Check: PASSED

Verified end-of-execution state:

- `src/lib/data/parse-batch-row.ts` exists; exports `parseBatchRow`, `isRateShapedNullable`, `RATE_SHAPED_NULLABLE_FIELDS`.
- `src/lib/computation/metric-eligibility.ts` exists; exports `isMetricEligible`, `metricHorizonMonths`.
- `src/lib/computation/young-batch-censoring.test.ts` exists; 2 `it()` blocks, both pass under `npm run test:vitest`.
- `vitest.config.ts` exists at repo root with `@/` alias, `environment: 'node'`, `include: ['src/**/*.test.ts']`.
- `package.json` declares `test:vitest` + `test:vitest:watch` scripts; `vitest@^2.1.9` in `devDependencies`.
- Commits `703da63`, `5650a66`, `6523d7e` all present in `git log`.
- `compute-anomalies.ts:213` calls `isMetricEligible` BEFORE the z-score check; line 222-228 calls `isRateShapedNullable` + null guard.
- `compute-kpis.ts` exports `assertSegmentsNonOverlapping`; `segment-split.ts` calls it once per compute pass.
- `npm run smoke:metric-eligibility`, `smoke:apples-and-oranges`, `smoke:cascade`, `smoke:pair`, `smoke:segment-split` all green.
- `npx tsc --noEmit` introduces no new errors in any of the touched files (only pre-existing axe-core defer in `tests/a11y/`).
- `npm run lint` introduces no new errors in any of the touched files (50 pre-existing problems, all in unrelated files).

---
*Phase: 41-data-correctness-audit*
*Completed: 2026-04-30*
