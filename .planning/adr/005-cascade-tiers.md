# ADR 005: KPI cascade breakpoints = 3 / 6 / 12 months

**Status:** Accepted (v4.5 Phase 41-04)
**Date:** 2026-04-27
**Supersedes:** n/a (formalises the Phase 38 KPI-01 design)
**Cross-references:** ADR 006 (denominator floor — companion suppression
mechanism), ADR 008 (eligibility filter — analogous "this batch isn't old
enough" pattern at the anomaly surface)

## Context

The KPI shelf at the top of every partner page renders a small set of
collection-rate cards. The cascade decides *which* cards to show as a function
of the maximum batch age in scope, not which values to render. A partner whose
oldest batch is 4 months old has no meaningful 12-month rate to display — the
12mo card would render as 0% or "—" and look broken. The cascade hides cards
that aren't yet evaluable rather than rendering empty placeholders.

This is the KPI-card analogue of the metric-age-eligibility filter (ADR 008)
that operates at the anomaly surface. Both mechanisms encode the same
principle: "don't pretend to have a number when the time window doesn't
support one."

## Decision

In `selectCascadeTier(maxBatchAgeMonths)` at
`src/lib/computation/compute-kpis.ts:50-57`:

| Max batch age | Cards rendered |
| --- | --- |
| `< 3 months` | `['rateSinceInception']` |
| `3 ≤ age < 6` | `['rate3mo', 'rateSinceInception']` |
| `6 ≤ age < 12` | `['rate3mo', 'rate6mo']` |
| `≥ 12` | `['rate6mo', 'rate12mo']` |

**Applies to:** the KPI strip (`KpiSummaryCards`), comparison-matrix KPI
columns, and any future surface that consumes `selectCascadeTier`.

## Alternatives considered

### Alternative A: Show all 4 cards always (3mo / 6mo / 12mo / since-inception)

Pre-Phase-38 behaviour. Rejected because cards with insufficient batches
showed as 0% or "—" and looked broken. The dashboard's audience reads "0%" as
"this partner collected nothing," not as "this partner's batches haven't aged
enough to evaluate."

### Alternative B: Show only the most recently-evaluable card

E.g., for a 14-month-mature partner, render only the 12mo card. Rejected —
single-card density looks under-built; two cards reads as a proper KPI shelf
and gives the partnerships team a comparison frame ("the 6mo rate is here,
the 12mo rate is there, the spread tells me about late-stage tail").

### Alternative C: Different breakpoints (e.g., 6 / 12 / 24)

Rejected — collection-rate horizons are conventionally 3 / 6 / 12 in this
domain. The Snowflake schema directly exposes
`COLLECTION_AFTER_3_MONTH`, `_6_MONTH`, `_12_MONTH` columns, and the
partnerships team reasons in those exact horizons. Picking different
breakpoints would create a translation layer between the data model and the
UI that no one needs.

### Alternative D: Continuous "fade-in" rendering (e.g., show card with reduced opacity when partially-evaluable)

Rejected — the value rendered would still be misleading regardless of opacity.
Suppression is a binary decision; the card either has enough batches at the
horizon to compute a confident rate or it doesn't.

## Why these breakpoints

- **They track the canonical horizons in the data.** A partner with batches
  all under 3mo only has the lifetime rate to show; once batches reach 3mo
  the 3mo card becomes meaningful; once they reach 12mo the 6mo+12mo card
  pair becomes the meaningful comparison.
- **Two cards at every tier** preserves consistent shelf density across
  partners — a 5-month partner's shelf doesn't look more or less "complete"
  than a 24-month partner's shelf. The partnerships team scans the dashboard
  fast and consistent shelf density is part of "looking like a finished
  product."
- **The `< 3 months → since-inception` tier** specifically exists for new
  partners. Showing them a 3mo card with `—` reads as failure; showing them a
  lifetime card reads as "we have data on you."
- **The companion `MIN_PLACED_DENOMINATOR_DOLLARS` floor (ADR 006)** handles
  the second axis — even when the cascade selects the 3mo card, if the
  eligibility-gated dollars are too small, the card is rendered with an
  "Insufficient data" caption. Cascade picks which card; ADR 006 picks
  whether the value within is trustworthy.

## Partner overrides

NONE. Per CONTEXT lock — global cascade preserves cross-partner comparison.

## When to revisit

- If new collection-rate horizons enter the schema (e.g., a 24-month rate),
  the cascade tiers extend.
- If user feedback indicates the `< 3 months → since-inception` tier feels
  thin (single-card shelf), pair it with a second card (e.g., a placement-
  volume KPI) to preserve density.
- If batch cadence shifts industry-wide (e.g., quarterly batches become
  standard), the `< 3 months` tier may need to widen because most new partners
  would land there for a long time.

## References

- Code: `src/lib/computation/compute-kpis.ts:50-57` (the selector)
- Smoke tests: `src/lib/computation/cascade.smoke.ts`
- Snowflake columns: `COLLECTION_AFTER_3_MONTH`, `_6_MONTH`, `_12_MONTH` (the
  canonical horizons this cascade tracks)
- Roadmap: `.planning/milestones/v4.5-ROADMAP.md` (Phase 41 — DCR-11)
- Origin spec: Phase 38 KPI-01 in `v4.1-REQUIREMENTS.md`
- Related ADRs: 006 (denominator floor), 008 (eligibility filter — same
  pattern, anomaly surface)
