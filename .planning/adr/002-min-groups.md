# ADR 002: Anomaly MIN_GROUPS = 2 (correlated-metric dedup)

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** Wave 0 supersedes the prior `MIN_FLAGS = 2` gate (Phase 41-pre,
shipped 2026-04-26).
**Cross-references:** ADR 001 (Z_THRESHOLD), `METRIC_GROUPS` dict in
`compute-anomalies.ts`

## Context

Wave 0 (shipped 2026-04-26 as part of Phase 41-pre quick fixes) replaced the
prior `MIN_FLAGS = 2` gate (which counted individual metric flags) with
`MIN_GROUPS = 2` (which counts metric *groups*, where correlated metrics share
a group and contribute as a single piece of evidence).

The bug under the prior gate: highly-correlated metrics like
`COLLECTION_AFTER_6_MONTH` and `COLLECTION_AFTER_12_MONTH` (both in the
`collection` group) were triple-counting the same evidence. A partner with a
single weak vintage would flag in all three collection-horizon metrics and
look like a 3-flag partner when it was really 1 group of evidence. The
multi-flag gate inadvertently selected for partners with metrics that
*correlate*, not partners with *broad* problems.

The Wave 0 fix moves the gate to operate on `groups.length` (computed by
`groupFlags()` against the `METRIC_GROUPS` dict — funnel, collection,
portfolio_quality, engagement, other). A flag counts as evidence in exactly
one group. To clear the gate, a batch must have flags from at least 2 distinct
groups — meaning the evidence comes from 2 distinct dimensions of weakness,
not one cluster firing repeatedly.

## Decision

**Value:** `2`
**Location:** `src/lib/computation/compute-anomalies.ts:90`
**Applies to:** the per-batch `isFlagged` decision in `computeAnomalies`. Drives
the partner badge, the comparison-matrix anomaly count, and severity
calculation.

## Alternatives considered

### Alternative A: MIN_GROUPS = 1

Any single weak group flags the partner. Too noisy — every partner flags on
something every week. Defeats the purpose of having a gate at all (might as
well render the raw flag count and let the user filter).

### Alternative B: MIN_GROUPS = 3

Too restrictive. Most partners don't have anomalies in 3 distinct metric
groups simultaneously even when they have real problems — a partner with a
genuine collection-side weakness plus an engagement softening (2 groups) is
worth surfacing, but adding a third concern-area to clear the gate raises the
bar past where most real signals live.

### Alternative C: Stay with MIN_FLAGS (pre-Wave-0)

Rejected because it conflates correlated evidence (the Wave-0 finding). The
gate's intent was always "at least two distinct things wrong" — counting flags
silently violated that intent whenever correlated metrics were involved.

### Alternative D: Severity-weighted gate (sum of group avgDeviations)

E.g., flag when `Σ avgDeviation >= 4.0` instead of `groups.length >= 2`. More
information-rich but harder to reason about and harder to explain ("why is
this flagged? because the weighted sum of average deviations cleared 4"). Z = 2
+ MIN_GROUPS = 2 is explicable in one sentence ("two distinct dimensions of
2-sigma weakness"). Defer to v5.5 DEBT if signal quality remains a complaint.

## Why this value

- **A single group flagging is interesting but maybe just one thing.** Two
  groups means two distinct dimensions of weakness — high-signal that the
  partner deserves a human look.
- **Mirrors the implicit prior intent of MIN_FLAGS = 2** without the
  correlated-metric inflation bug.
- **Explicable in one sentence**: "two distinct concern-areas firing." The
  partnerships team can look at the badge and immediately understand what
  triggered it.
- **The METRIC_GROUPS taxonomy is the calibration knob.** As long as the
  taxonomy correctly reflects "metrics that move together for the same
  underlying reason," the threshold of 2 is the right number. If the taxonomy
  shifts (see "When to revisit"), the threshold needs re-evaluation.

## Partner overrides

NONE. Per CONTEXT lock — partner-overrides invite p-hacking and erode the
cross-partner triangulation surface that v5.0 builds on. v5.5+ revisits if
specific partners need tuning that doesn't compromise triangulation.

## When to revisit

- If v5.0 triangulation reveals partners flagging here that triangulation
  contradicts (i.e., the partner's own scorecards say they're fine), the
  metric-group taxonomy or the threshold may need adjustment.
- If `METRIC_GROUPS` is expanded to include new concern-areas (e.g., a "fraud"
  group, a "data-quality" group), the calibration of `2` should be revisited.
  More groups means more opportunities for 2-of-N to fire by chance.
- If the synthetic anomaly fixtures (Phase 41-02 introduces these for young-
  batch censoring; future work can add fixtures for the MIN_GROUPS gate)
  reveal recall < 80% on known-bad partner trajectories, drop to MIN_GROUPS
  = 1 + tighter Z_THRESHOLD as an alternative configuration.

## References

- Code: `src/lib/computation/compute-anomalies.ts:90`, `:202-203` (the gate
  callsite)
- Wave 0 commit: `5462acc fix(data): wave-0 correctness fixes (MIN_GROUPS,
  matrix bar default, KPI denominator floor)`
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Related: `METRIC_GROUPS` dict in `compute-anomalies.ts:41-73` — the
  grouping taxonomy is the calibration knob this threshold is tuned against.
- Related ADRs: 001 (Z_THRESHOLD), 008 (eligibility filter that prevents
  young-batch metrics from joining either side of the gate)
