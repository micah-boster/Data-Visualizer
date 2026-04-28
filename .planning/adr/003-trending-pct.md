# ADR 003: Trending threshold = 5% relative change

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** n/a
**Cross-references:** ADR 004 (baseline window — companion threshold)

## Context

Trending compares the latest batch's value on each `TRENDING_METRICS` member
against a rolling-average baseline computed from prior batches (see ADR 004
for the baseline window). The threshold determines whether the comparison
renders as `up`, `down`, or `flat` in the trending pill / arrow. A small
threshold makes every batch look like a meaningful move; a large threshold
makes everything look flat.

This is a "did something move?" gut check, not a statistical test. The
partnerships team uses the trending arrow to triage which partners deserve a
deeper look, not as evidence of a real trend on its own.

## Decision

**Value:** `0.05` (5% relative change)
**Location:** `src/lib/computation/compute-trending.ts:17` (named `THRESHOLD`)
**Applies to:** the latest batch's per-metric direction selection in
`computeTrending` for all 5 `TRENDING_METRICS`.

```ts
if (value > rollingAvg * (1 + THRESHOLD)) {
  direction = 'up';
} else if (value < rollingAvg * (1 - THRESHOLD)) {
  direction = 'down';
} else {
  direction = 'flat';
}
```

The 5% test is a *relative* test against the rolling average, not an absolute
basis-point test (see Alternative C below).

## Alternatives considered

### Alternative A: 3% relative threshold

Too noisy. Too many batches register as `up` or `down` when they're really
within batch-over-batch noise. Erodes the signal of the trending arrow as a
triage tool — if every partner has a non-flat arrow every week, the arrow
isn't doing work.

### Alternative B: 10% relative threshold

Too restrictive — misses real moves. A penetration rate going from 35% to 32%
is a meaningful shift in this domain (~9% relative drop) and should not render
as flat.

### Alternative C: Absolute (basis-points) instead of relative

Rejected because the same absolute move is more meaningful on a 10% baseline
than on a 60% baseline. A 5pp change on 10% is huge (50% relative); on 60% it
is modest (8% relative). Relative captures the "is this a meaningful shift"
intuition better across metrics with very different baseline ranges (penetration
rates ~10-50%, lifetime collected as a number $ in the millions, etc.).

### Alternative D: Per-metric thresholds

Different metrics could carry different thresholds (penetration rates are
naturally noisier than lifetime collected). Rejected for v4.5 — adds a tunable
parameter per metric without a principled default. Same rejection logic as
ADR 001 Alternative D.

## Why this value

- **Empirical fit** for the partnerships team's "did something move?" gut
  check, validated against existing batch data during Phase 38.
- **Round number** that matches how non-statisticians read percentages.
- **Symmetric** (`× (1 ± 0.05)`) — the same threshold catches up-moves and
  down-moves consistently, which matters because polarity (good direction vs
  bad direction) is metric-dependent.

## Partner overrides

NONE. Per CONTEXT lock — global threshold preserves cross-partner comparison.

## When to revisit

- If user feedback indicates trending arrows feel "always up/down" or
  "always flat" for a sustained period.
- If new metrics with very different volatility profiles enter
  `TRENDING_METRICS` (e.g., a metric with a typical batch-over-batch coefficient
  of variation > 20%) and the 5% threshold either over-fires or under-fires
  on them. Per-metric thresholds become the sane fallback at that point.

## References

- Code: `src/lib/computation/compute-trending.ts:17`, `:143-149` (the gate
  callsite)
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Companion ADR: 004 (baseline window — the THRESHOLD is the "by how much"
  question; ADR 004 answers the "compared to what" question)
