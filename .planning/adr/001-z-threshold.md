# ADR 001: Z-score anomaly threshold = 2

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** n/a
**Cross-references:** ADR 002 (MIN_GROUPS gate), ADR 008 (eligibility filter that
gates which (batch, metric) cells reach this z-score evaluation)

## Context

Anomaly detection in the partner dashboard uses z-scores to flag batches whose
metric values lie far from their cohort norms. The threshold determines how far
is "far": z = 2 corresponds to ~95% confidence under a normal distribution
(top/bottom 2.5% on each tail).

The threshold is consumed by `evaluateMetric` in `compute-anomalies.ts`, which
is called for every (batch, curated-metric) cell in `ANOMALY_METRICS`
(11 metrics). A batch is candidate-flagged on a metric when its z-score exceeds
the threshold *in the polarity-bad direction* (`higher_is_better` metrics flag
on negative z, `lower_is_better` metrics flag on positive z). The candidate
flag then has to clear the MIN_GROUPS gate (see ADR 002) before the batch is
declared anomalous.

This is a daily-driver tool. The partnerships team checks the dashboard most
mornings, so the cost of false positives compounds across a workweek (flag
fatigue) while the cost of false negatives is bounded (a partner with a real
problem will trip the gate within 1-2 batches).

## Decision

**Value:** `2`
**Location:** `src/lib/computation/compute-anomalies.ts:76`
**Applies to:** every `evaluateMetric` call — anomaly badges in the partner
table, anomaly drilldown panel, anomaly counts in the comparison matrix.

## Alternatives considered

### Alternative A: Z = 3 (~99.7% confidence)

Too restrictive for this use case. At z = 3 only the most extreme outliers
flag, and most weeks no anomalies surface at all — which makes the feature
feel broken to a daily-driver user. Z = 3 is the right choice for high-stakes
binary decisions ("is this partner failing badly enough to fire?") because the
asymmetric cost of a false positive there is severe. Wrong tradeoff for the
"should the partnerships lead spend 2 minutes looking at this batch this
week?" decision the dashboard actually serves.

### Alternative B: Z = 1.5 (~87% confidence)

Too noisy. Surfaces too many flags and erodes signal-to-noise. Daily-driver
tools degrade fast under flag fatigue — once 30%+ of partners flag every week,
the badge becomes background noise and the feature stops driving behavior.

### Alternative C: Two-tail mixture (z = 1.96 × s.d., empirical-Bayes prior)

More statistically defensible for small cohorts (some partners have ≤5 batches,
which is where naive z-scores break down). Introduces complexity (priors,
hyperparameters, a chosen base distribution) that v4.5's targeted-fixes scope
rejects. Architectural rewrite candidate for v5.5 DEBT.

### Alternative D: Per-metric thresholds

Different metrics could plausibly carry different thresholds (penetration rate
distributions are bounded [0,1] and tail-heavy; collection-after-6-month is
roughly log-normal). Rejected for v4.5 — adds a new tunable parameter per
metric (11 of them) without a principled default. Revisit when an empirical
fitting exercise has fixtures to back the per-metric values.

## Why this value

- **Balances signal-to-noise** for the partnerships-team daily-driver use case.
- **Round number, easy to reason about** ("two standard deviations") — when
  the partnerships team asks "why did this flag?", the explanation is a
  one-sentence frame they already know.
- **Maps to a familiar 95% confidence frame**, which both reduces explanation
  cost and aligns the anomaly UX with how non-statisticians read percentages.
- **Combined with the MIN_GROUPS = 2 gate** (ADR 002), per-metric flag rates
  matter less than they would in a single-flag system. A z = 2 metric flag
  is *evidence*, not a verdict — the verdict requires two distinct evidence
  groups.

## Partner overrides

NONE. Per CONTEXT § "Penetration weighting + threshold ADRs" — partner-specific
overrides invite p-hacking and erode the cross-partner triangulation surface
that v5.0 builds on. The value is global. v5.5+ revisits if specific partners
need tuning that doesn't compromise triangulation.

## When to revisit

- If user feedback shows persistent under- or over-flagging *after* the Phase
  41 fixes ship — especially after DCR-07 young-batch censoring (ADR 008)
  removes the systematic false-positive bias against young batches.
- If v5.0 triangulation surfaces partners that flag here but don't flag in
  the partner's own scorecards — that's evidence the threshold is mis-calibrated
  for the corrected (post-eligibility-filter) signal.
- If `METRIC_GROUPS` (the correlated-metric taxonomy in `compute-anomalies.ts`)
  expands meaningfully — the MIN_GROUPS gate behaviour shifts under a richer
  taxonomy, and z = 2 may need re-tuning to compensate.

## References

- Code: `src/lib/computation/compute-anomalies.ts:76`
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Context: `.planning/phases/41-data-correctness-audit/41-CONTEXT.md` § "Penetration weighting + threshold ADRs"
- Related ADRs: 002 (MIN_GROUPS gate), 008 (eligibility filter)
