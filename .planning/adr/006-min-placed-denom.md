# ADR 006: MIN_PLACED_DENOMINATOR_DOLLARS = $100,000

**Status:** Accepted (v4.5 Phase 41-04, Wave 0)
**Date:** 2026-04-27 (formalised); 2026-04-26 (Wave 0 ship date)
**Supersedes:** the prior implicit "no floor" behaviour (rendered noisy rates
on tiny denominators without flagging them).
**Cross-references:** ADR 005 (KPI cascade — companion mechanism that picks
*which* card; this ADR picks whether the *value* in that card is trustworthy)

## Context

Wave 0 fix (shipped 2026-04-26 in commit `5462acc`). The 3-month KPI rate has
a denominator of "placed dollars from batches at least 3 months old"
(`placed3mo`). When that denominator is small — e.g., one tiny test batch
from 4 months ago — the resulting rate is statistically noisy. A $5K-placed
batch with 50% collection feels meaningful, but it's actually a single tail
draw on a tiny sample.

The fix introduces a denominator floor below which the 3mo card renders
value-only with an "Insufficient data" caption rather than displaying a
misleadingly precise percentage. The mechanism mirrors the "young-batch
suppression" pattern from ADR 008 — both are forms of "don't pretend to know
what we don't know."

The 3mo horizon is the only one currently floored because:
- 6mo and 12mo horizons use `totalPlaced` as denominator (lifetime placed),
  which is large by construction.
- Lifetime / since-inception is similarly broad.
- Only the 3mo rate uses the eligibility-gated `placed3mo` denominator, which
  can be tiny for partners with only 1-2 batches at horizon.

## Decision

**Value:** `100_000` (USD)
**Location:** `src/lib/computation/compute-kpis.ts:39` (constant declaration),
`:142-144` (the suppression callsite)
**Applies to:** `KpiAggregates.insufficientDenominator.rate3mo`. UI consumers
(`KpiSummaryCards`) render the value as a number with an "Insufficient data"
caption rather than a confident percentage.

```ts
const MIN_PLACED_DENOMINATOR_DOLLARS = 100_000;

if (placed3mo > 0 && placed3mo < MIN_PLACED_DENOMINATOR_DOLLARS) {
  insufficientDenominator.rate3mo = true;
}
```

## Alternatives considered

### Alternative A: No floor (pre-Wave-0 behaviour)

Rejected — produces noisy rates that the partnerships team would either
second-guess or trust incorrectly. Wave-0 review surfaced this as a concrete
correctness regression: small partners were showing collection rates that
looked confident but were essentially one-batch noise.

### Alternative B: $50K floor

Rejected — too low. Still admits noisy rates. $50K placed in a single small
batch produces the same statistical-tail-draw problem the floor exists to
prevent.

### Alternative C: $500K floor

Rejected — too high. Suppresses the KPI for many legitimate small partners
(test deals, niche-vertical pilots). The floor's purpose is to flag *noise*,
not to hide *small partners*.

### Alternative D: Fraction-of-total (e.g., "≥ 5% of partner's lifetime placed")

Variable per partner, harder to reason about, no clean ADR-able number.
Rejected — partners with very small lifetime placement (test deals where
lifetime is itself tiny) would always pass the fraction test, exactly the
case the floor exists to flag.

### Alternative E: Account-count floor (e.g., ≥ 1000 placed accounts)

A natural alternative since penetration is account-driven. Rejected because
the dollar threshold is more aligned with the rate it gates (`sumCollection3
/ placed3mo` is a dollar/dollar ratio). Account-count floors would be the
right pick for ADR 007's account-weighted penetration column.

## Why $100K

- **Empirical fit.** Tested against existing partner data — partners with
  denominators below $100K were the same partners producing the noisy rates
  that the Wave-0 review surfaced. Above $100K, rates were consistently
  defensible.
- **Round number.** Easy to reason about ("six figures placed at horizon")
  and easy to communicate.
- **Typical batch size context:** most partner batches are $1M+, so <$100K
  eligible means a fraction of one batch contributing to the rate — clearly
  insufficient sample.

## Partner overrides

NONE. Per CONTEXT lock.

## When to revisit

- If a partner with a legitimate $80K small-batch program needs the 3mo rate
  visible. The pattern of solution there is a per-card "Switch to since-
  inception" recovery action, not a denominator-floor change. The since-
  inception card uses `totalPlaced` and isn't gated by this floor.
- Phase 41.6 (Statistical Correctness Pass, per the Wave-0 commit comment in
  `compute-kpis.ts:36`) plans to revisit this threshold per-horizon and
  potentially augment with a placed-account floor (combining ADR 006 + a
  Plan-41-1 derivation of "placed accounts at horizon"). Stays $100K until
  that pass.
- If new horizons (e.g., 24mo) enter the cascade, they need their own
  denominator-floor analysis — not a global $100K, because the eligibility-
  gated denominator at longer horizons is structurally smaller.

## References

- Code: `src/lib/computation/compute-kpis.ts:39`, `:142-144`
- Wave 0 commit: `5462acc fix(data): wave-0 correctness fixes (MIN_GROUPS,
  matrix bar default, KPI denominator floor)`
- UI consumer: `src/components/kpis/KpiSummaryCards.tsx` (renders the
  "Insufficient data" caption when the flag is set)
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Related ADRs: 005 (KPI cascade), 008 (eligibility filter — analogous
  "don't pretend" pattern at anomaly surface)
