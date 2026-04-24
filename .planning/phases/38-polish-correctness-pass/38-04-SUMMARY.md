---
phase: 38-polish-correctness-pass
plan: 04
subsystem: computation-layer,kpi-cards
tags: [kpi, computation, cascade, suppression, phase-38]
requires:
  - Phase 29-01 StatCard pattern (TrendLine sub-component target)
  - v4.1-REQUIREMENTS.md KPI-01..04 definitions
provides:
  - Graduated cascade in KpiSummaryCards (1–2 rate cards per age tier)
  - Locked "vs 3-batch rolling avg" delta copy (KPI-02)
  - Per-horizon rolling-avg suppression (KPI-04)
  - KPI-03 deferred to Phase 41 in v4.1-REQUIREMENTS.md + ROADMAP.md
affects:
  - src/components/kpi/kpi-summary-cards.tsx (complete rewrite)
  - src/components/patterns/stat-card.tsx (trendLabel prop + default copy)
  - src/lib/computation/compute-kpis.ts (3 new aggregate fields + selectCascadeTier)
  - src/lib/computation/compute-trending.ts (computeSuppression + suppressDelta)
  - src/types/partner-stats.ts (KpiAggregates + TrendingData extensions)
tech-stack:
  added: []
  patterns:
    - Node --experimental-strip-types smoke tests (Phase 35-01 precedent)
    - Age-coercion helper inlined (TODO for Plan 05 shared extraction)
    - Pure-function exports for smoke testability
key-files:
  created:
    - src/lib/computation/cascade.smoke.ts
    - src/lib/computation/suppression.smoke.ts
    - .planning/phases/38-polish-correctness-pass/38-04-SUMMARY.md
  modified:
    - src/lib/computation/compute-kpis.ts
    - src/lib/computation/compute-trending.ts
    - src/components/kpi/kpi-summary-cards.tsx
    - src/components/patterns/stat-card.tsx
    - src/types/partner-stats.ts
    - .planning/milestones/v4.1-REQUIREMENTS.md
    - .planning/ROADMAP.md
decisions:
  - KpiAggregates extended in place (no new kpi-aggregates.ts file) — downstream
    consumers (definitions.ts trending, root-columns sum) continue to read
    collectionRate6mo/12mo directly
  - 3mo rate computed with horizon-matched denominator (placed3mo) rather than
    totalPlaced — aligns rate semantics with the 3-month horizon cards it drives
  - selectCascadeTier exported as pure function so cascade.smoke.ts and
    KpiSummaryCards both consume the same single source of truth
  - computeSuppression exported as pure helper over minimal { ageInMonths }
    shape — decouples unit tests from Snowflake row keys
  - "Prior" interpretation: all batches OTHER than the youngest-age batch
    (descending-sort precedent from compute-trending.ts:40)
  - suppressDelta populated on ALL return paths including early-returns so
    KpiSummaryCards can make per-card decisions regardless of legacy
    insufficientHistory shortcut
  - insufficientHistory field retained with @deprecated JSDoc — table-footer
    definitions.ts still reads it for trend cells (out-of-scope migration)
  - DEFAULT_TREND_EXPLANATION lives in stat-card.tsx as a module constant so
    every rolling-avg caller inherits the KPI-02 locked copy automatically;
    override via trendLabel prop when Phase 40 adds "vs projected curve"
  - 3mo rate card has no rolling-avg trend wire-up (TRENDING_METRICS does
    not include COLLECTION_AFTER_3_MONTH); card renders value only until
    Phase 40 supplies a projected-curve baseline
  - rateSinceInception card also renders value-only (age-agnostic aggregate
    has no horizon-matched trending metric in the existing registry)
  - Grid columns auto-adapt between lg:grid-cols-5 (1 rate card) and
    lg:grid-cols-6 (2 rate cards); identity cards remain 4 always
metrics:
  duration: ~7 min
  tasks_executed: 4 + 1 auto-approved checkpoint
  files_created: 3
  files_modified: 7
  completed_date: 2026-04-24
---

# Phase 38 Plan 04: KPI Clarity + KPI-03 Deferral Doc Summary

**One-liner:** Graduated age-driven KPI-card cascade (1–2 cards per tier), locked "vs 3-batch rolling avg" delta copy, per-horizon rolling-avg suppression, and KPI-03 documented as deferred to Phase 41.

## What Shipped

### KPI-01: Graduated Cascade

`KpiSummaryCards` no longer renders a fixed 6-card grid. `KpiAggregates` now
carries `maxBatchAgeMonths` (max of `BATCH_AGE_IN_MONTHS` across the current
scope, with legacy-days coercion matching `reshape-curves.ts:23`) plus three
new aggregates (`collectionRate3mo`, `collectionRateSinceInception`; existing
6mo / 12mo preserved for downstream consumers). The pure `selectCascadeTier`
helper maps max age → the rate-card keys to render:

| Max batch age | Rate cards rendered |
|---|---|
| < 3 months | Rate Since Inception |
| 3 ≤ age < 6 | 3mo Rate + Rate Since Inception |
| 6 ≤ age < 12 | 3mo Rate + 6mo Rate |
| ≥ 12 months | 6mo Rate + 12mo Rate |

Identity cards (Batches, Accounts, Penetration, Total Collected) always
render. Non-applicable rate cards are NOT rendered — no "insufficient data"
placeholder tile for 12mo when the cohort is too young. The previous
`collectionRate12mo === 0` special case was removed; the cascade handles
that situation structurally.

### KPI-02: Locked Delta Copy

`StatCard` gains a `trendLabel?: string` prop with default
`"vs 3-batch rolling avg"`. Every rolling-avg-baseline KPI card inherits the
default automatically, so a single canonical source controls the copy. Phase
40's "vs projected curve" baseline can override per-card via the prop when
PRJ-04 lands.

### KPI-04: Per-Horizon Suppression

`TrendingData` gains `suppressDelta: { rate3mo, rate6mo, rate12mo,
rateSinceInception }`. A pure `computeSuppression` helper over a minimal
`{ ageInMonths: number }` shape computes per-horizon flags from PRIOR batches
(all batches except the latest-age, descending-sort precedent per
compute-trending.ts:40):

- `rate{3,6,12}mo`: suppressed when fewer than 3 prior batches have reached
  the horizon.
- `rateSinceInception`: suppressed only when there are zero prior batches.

`KpiSummaryCards` consumes the flags per card — when suppressed, the card
renders value only (no trend line, no arrow, no "vs N/A", no misleading 0%).
Legacy `insufficientHistory` boolean retained on `TrendingData` with
`@deprecated` JSDoc because `src/lib/columns/definitions.ts` table-footer
trend cells still read it (out-of-scope migration for this plan).

### KPI-03 Deferral Doc

- `.planning/milestones/v4.1-REQUIREMENTS.md` — KPI-03 entry prefixed with
  `*(Deferred to Phase 41 — requires new Snowflake column
  ACCOUNTS_WITH_PLANS_AT_{6,12}_MONTH…)*`; traceability row re-homed from
  Phase 38/Pending to Phase 41/Deferred.
- `.planning/ROADMAP.md` — Phase 38 Goal scope count updated 18 → 17
  (matches 38-RESEARCH.md conclusion); commitment-rate mention dropped from
  the Goal summary; Success Criterion 13 struck through with italic deferral
  note.

## Commits

| Task | Hash | Title |
|---|---|---|
| 1 | e9247c2 | feat(38-04): extend KpiAggregates with cascade aggregates + tier selector (KPI-01) |
| 2 | b37f85b | feat(38-04): per-horizon rolling-avg suppression (KPI-04) |
| 3 | 492f569 | feat(38-04): cascade renderer + locked delta copy (KPI-01, KPI-02) |
| 4 | d3fd4e2 | docs(38-04): defer KPI-03 matching-horizon commitment rate to Phase 41 |

## Verification

| Check | Command | Result |
|---|---|---|
| Cascade smoke | `node --experimental-strip-types src/lib/computation/cascade.smoke.ts` | `cascade smoke OK` (8 assertions, 4 tiers + boundaries) |
| Suppression smoke | `node --experimental-strip-types src/lib/computation/suppression.smoke.ts` | `suppression smoke OK` (6 scenarios, 24 assertions) |
| Type tokens guard | `npm run check:tokens` | PASS (no ad-hoc text-size / font-weight outside allowlist) |
| Type-check (plan files) | `npx tsc --noEmit` filtered to plan files | No new errors introduced by this plan |
| KPI-02 copy grep | `grep 'vs 3-batch rolling avg' src/components/patterns/stat-card.tsx` | 1 hit at `DEFAULT_TREND_EXPLANATION` constant |
| KPI-01 cascade wire-up grep | `grep selectCascadeTier src/components/kpi/kpi-summary-cards.tsx` | 1 import + 1 call site |
| KPI-03 deferral grep | `grep KPI-03 v4.1-REQUIREMENTS.md ROADMAP.md` | Deferred tag + Phase 41 traceability + ROADMAP Goal "17" |

Auto-advance mode auto-approved Task 5 (checkpoint:human-verify) after all
four implementation tasks landed green.

### Build Verification Note

`npm run build` (Turbopack) fails at the CSS compile step with
`CssSyntaxError: Missed semicolon` in `src/app/globals.css` during
tailwindcss-generated output reading. **This failure reproduces from a clean
HEAD with this plan's changes stashed** — it is a pre-existing Turbopack /
PostCSS / Tailwind v4 environment regression unrelated to any Phase 38 work.
Captured in `.planning/phases/38-polish-correctness-pass/deferred-items.md`
(authored by a sibling plan) and verified out-of-scope here. Type-correctness
confirmed via `tsc --noEmit` on plan-related files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 3mo rate denominator matched to horizon**

- **Found during:** Task 1
- **Issue:** Plan said `sumCollection3 / totalPlaced`, but mixing the 3mo
  numerator (only batches that reached 3 months contributed) with the full
  `totalPlaced` denominator (includes young batches) would deflate the rate.
- **Fix:** Accumulate `placed3mo` in the same `ageMonths >= 3` guard as
  `sumCollection3`; compute `collectionRate3mo = sumCollection3 / placed3mo`.
  Aligns semantics with how 6mo / 12mo rates are defined on the same-shape
  data (those accumulate everything into `totalPlaced` because Snowflake
  backfills `COLLECTION_AFTER_6_MONTH = 0` for young batches; the 3mo case
  needs explicit denominator matching because our gate is explicit).
- **Commit:** e9247c2

**2. [Rule 3 - Blocking] Prior-batch semantics via descending age sort**

- **Found during:** Task 2
- **Issue:** Plan snippet used `rows.slice(1)` after sorting — but the sort
  direction must be explicit for "latest = youngest / last prior = oldest"
  to be deterministic. A BATCH-name string sort (as used in the trend loop)
  would put oldest first; an age-descending sort puts oldest first; neither
  matches `slice(1) == drop latest`.
- **Fix:** Sort by `ageInMonths` DESCENDING (oldest first, youngest last) and
  use `slice(0, -1)` to drop the youngest-age batch. Unit tests in
  `suppression.smoke.ts` exercise mixed-age inputs (scenario 2: ages
  `[2, 4, 5, 7]`) so the prior set is verifiably `{7, 5, 4}`.
- **Commit:** b37f85b

### Auth Gates

None.

### Deferred Issues

- **3mo rate rolling-avg trend wire-up** — `TRENDING_METRICS` in
  `compute-trending.ts` does not include `COLLECTION_AFTER_3_MONTH`; the
  3mo rate card therefore renders value only when displayed. Not a KPI-04
  suppression issue — there's no trend metric to surface at all. Phase 40's
  projected-curve baseline (PRJ-04) is the natural home for a non-historical
  comparison on the 3mo card.
- **rateSinceInception rolling-avg trend** — age-agnostic lifetime aggregate
  has no horizon-matched trending metric in the existing registry. Same
  Phase 40 deferral applies.
- **Legacy `insufficientHistory` consumer** — `src/lib/columns/definitions.ts`
  table-footer trend cells still read the deprecated boolean. Migration to
  per-metric suppression on table cells is out of scope for this plan and
  lives under Phase 40 or later KPI-consistency work.
- **Global `npm run build` Turbopack CSS failure** — pre-existing, reproduced
  on clean HEAD; logged in sibling-plan `deferred-items.md`. Does not affect
  type-correctness verification for this plan's files.

## Key Links

- `compute-kpis.ts::maxBatchAgeMonths` → `KpiSummaryCards` cascade-tier
  selection via `selectCascadeTier(kpis.maxBatchAgeMonths)`.
- `compute-trending.ts::suppressDelta` → `KpiSummaryCards` per-card trend
  gate via `trending.suppressDelta[spec.key]`.
- `selectCascadeTier` + `CascadeRateKey` exported from `compute-kpis.ts`
  for single-source cascade definition shared with `cascade.smoke.ts` and
  `RATE_CARDS` catalog.
- `computeSuppression` + `SuppressionInput` exported from `compute-trending.ts`
  for unit-test consumption and future table-footer migration.

## Self-Check: PASSED

Files created (existence verified):
- `src/lib/computation/cascade.smoke.ts` — FOUND
- `src/lib/computation/suppression.smoke.ts` — FOUND

Commits (verified via `git log --oneline`):
- `e9247c2` — FOUND (Task 1)
- `b37f85b` — FOUND (Task 2)
- `492f569` — FOUND (Task 3)
- `d3fd4e2` — FOUND (Task 4)

Doc edits (verified via grep):
- `v4.1-REQUIREMENTS.md` KPI-03 Deferred annotation — FOUND
- `v4.1-REQUIREMENTS.md` traceability Phase 41 / Deferred — FOUND
- `ROADMAP.md` Goal count "17 small-but-high-friction" — FOUND
- `ROADMAP.md` Success Criterion 13 strike-through deferral — FOUND
