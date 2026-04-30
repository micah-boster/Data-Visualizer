# ADR 008: Young-batch censoring via metric-age-eligibility filter (strict rule)

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** the prior implicit "evaluate every metric on every batch
regardless of age" behaviour, which produced systematic false-positive
anomaly flags on young batches. (Implementation lands in Plan 41-02.)
**Cross-references:** ADR 005 (KPI cascade — analogous "this batch isn't old
enough" pattern at the KPI surface), ADR 006 (denominator floor —
analogous "don't pretend" pattern), ADR 001 + 002 (anomaly thresholds this
filter sits in front of)

## Context

A 4-month-old batch's `COLLECTION_AFTER_12_MONTH` is structurally near-zero
— there has been no time for late-stage collection to populate. Comparing it
against a norm computed from 24-month-old batches' fully-populated 12mo
metrics produces systematic false-positive flags. The phenomenon is
statistical: the young batch is *guaranteed* to score in the bad-direction
tail of the cohort distribution because the metric hasn't reached its
horizon yet.

DCR-07's fix is to censor young batches on metrics whose horizon they
haven't reached. The censoring happens at the anomaly-detection boundary —
ineligible (batch, metric) cells skip evaluation entirely (no z-score
computed) and render in the UI as em-dash with an explanatory tooltip.

This is the anomaly-surface twin of the KPI cascade (ADR 005): the cascade
hides KPI cards that aren't yet evaluable, the eligibility filter hides
anomaly evaluations that aren't yet evaluable. Both encode the same domain
truth: don't show metrics whose underlying time window doesn't yet support
them.

## Decision

**Mechanism:** metric-age-eligibility filter at the anomaly-detection
boundary. A (batch, metric) cell is eligible for evaluation only when
`batch_age_months >= metric_horizon_months`. Strict rule, no safety margin.

**Implementation:** `src/lib/computation/metric-eligibility.ts`
`isMetricEligible` (introduced by Plan 41-02). Called from
`compute-anomalies.ts` `evaluateMetric` to gate per-cell evaluation.

**UI behaviour:** ineligible metrics on a young batch render as em-dash with
a tooltip explaining "this batch isn't old enough yet to evaluate this
metric." NO anomaly badge, regardless of value. Mirrors the Wave-0 KPI
suppression pattern for `MIN_PLACED_DENOMINATOR_DOLLARS` (ADR 006).

**Horizon table** (illustrative — actual values lived in
`metric-eligibility.ts`'s `METRIC_HORIZON_MONTHS` after Plan 41-02 lands):
- `COLLECTION_AFTER_3_MONTH` → horizon 3
- `COLLECTION_AFTER_6_MONTH` → horizon 6
- `COLLECTION_AFTER_12_MONTH` → horizon 12
- `TOTAL_COLLECTED_LIFE_TIME` → horizon 0 (no censoring; age-agnostic)
- `PENETRATION_RATE_*`, engagement metrics, portfolio-quality metrics →
  horizon 0 (no censoring; populated within ~days of placement)

## Alternatives considered

### Alternative A: Per-age-bucket norms

Compute norms separately for young / mid / old batches, so a 4-month batch
is compared only against other 4-month batches' 12mo metrics. Rejected for
v4.5 because:

- **Small-cohort statistical risk.** Many partners have ≤2 batches in a given
  age bucket, which is below `compute-norms.ts`'s `count < 2` floor. The
  buckets become unreliable exactly where they would matter most.
- **New tunable parameters.** Bucket boundaries (3 / 6 / 9 / 12 / 18 / 24?)
  are themselves a tunable surface that would need their own ADR.
- **Asymmetric explainability.** "We compare you against batches your age"
  is a defensible frame, but breaks down when a young batch flags against a
  same-age cohort that's also structurally near-zero — the user sees a flag
  with no mental model for why.

v5.5 candidate if the eligibility filter proves too coarse (e.g., young
batches are systematically *over*-flagged on metrics the filter doesn't
censor).

### Alternative B: Bayesian / t-distribution rewrite

Use a small-sample-friendly statistical framework (t-distribution for
critical values, Bayesian shrinkage toward portfolio norms for low-confidence
cells). Out of scope (architectural rewrite). v5.5 DEBT candidate if signal
quality remains a complaint after Phase 41 fixes ship.

### Alternative C: Soft eligibility (e.g., batch_age >= 0.75 × metric_horizon)

A 75% rule would let a 9-month batch evaluate against the 12-month metric
with reduced confidence. Rejected:

- **Adds a tunable parameter without a principled default.** "Why 75%?
  Why not 80%?" — no principled answer.
- **Doesn't match how a human reads the metric.** A partner asking "what's
  this batch's 12-month collection rate at month 9?" expects an em-dash, not
  a partial-confidence number.
- **Introduces a confidence-rendering surface** ("how confident is this
  number?") that doesn't otherwise exist in the dashboard. v5.0 triangulation
  is the right place for that surface, not the eligibility filter.

### Alternative D: Configurable per-metric eligibility horizons

Per-partner or per-deal horizon tuning. Rejected per the CONTEXT lock —
partner-overrides invite p-hacking. Per-metric horizons stay in code, in
`METRIC_HORIZON_MONTHS`, where changes are reviewable.

### Alternative E: Hide young batches entirely from the partner page

Rejected — too coarse. Young batches still have meaningful penetration
rates, engagement metrics, and portfolio-quality metrics. The censoring is
metric-level, not batch-level.

## Why strict (no safety margin)

- **Simpler.** No tunable safety-margin parameter to defend.
- **Defensible to partners.** "We don't show 12mo metrics on a 4mo batch
  because there's nothing to show" is a one-sentence frame that a non-
  statistician understands.
- **Matches how a human reads the metric.** A 5.99-month batch's 6mo metric
  is genuinely different from a 6.01-month batch's 6mo metric in our schema,
  and the strict rule mirrors that step function.
- **Less surface area than per-age-bucket cohorts.** No new dimension on
  norm-computation, no new bucket-boundary parameters, no new statistical
  failure modes for sparse partners.

## Partner overrides

NONE. Per-metric eligibility horizons are also NOT configurable per partner
— see CONTEXT § Deferred ("Configurable per-metric eligibility horizons
rejected for DCR-07"). Horizons live in `METRIC_HORIZON_MONTHS` in code.

## When to revisit

- **Schema evolves.** If a future `COLLECTION_AFTER_24_MONTH` metric lands,
  add it to `METRIC_HORIZON_MONTHS` with horizon 24. Same pattern.
- **Edge-case suppression complaints.** If the strict rule produces
  undesirable suppression on edge cases (e.g., a 5.99-month batch on a 6mo
  metric the partner expected to see), discuss whether to add a small grace
  period — but only with an empirical justification for the specific value
  chosen.
- **Per-age-bucket norms become viable.** If portfolio scale grows enough
  that most partners have 5+ batches in each age bucket, Alternative A
  becomes statistically viable. This is the v5.5 revisit trigger.
- **Phase 41-02 synthetic test fixtures fail in production.** If the test
  fixtures (`young-batch-censoring.test.ts`) catch real bugs, the filter is
  working; if they don't but production users still see false-positive flags
  on young batches, the filter is missing a metric whose horizon needs
  declaring.

## References

- Implementation: Plan 41-02 (introduces `metric-eligibility.ts`,
  `isMetricEligible`, `METRIC_HORIZON_MONTHS`)
- Anomaly callsite: `src/lib/computation/compute-anomalies.ts`
  `evaluateMetric` (patched in Plan 41-02 to consult `isMetricEligible`)
- Synthetic test: `src/lib/computation/young-batch-censoring.test.ts`
  (introduced in Plan 41-02)
- KPI surface analogue (Wave 0 suppression precedent): ADR 006
- KPI cascade analogue (which-cards-to-show): ADR 005
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-07,
  DCR-11)
- Context: `.planning/phases/41-data-correctness-audit/41-CONTEXT.md`
  § "Young-batch censoring"
