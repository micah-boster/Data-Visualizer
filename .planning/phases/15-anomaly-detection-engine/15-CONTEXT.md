# Phase 15: Anomaly Detection Engine - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Deterministic z-score anomaly computation module that produces anomaly scores, flags, severity rankings, and grouped anomaly reports for every partner and batch. Pure computation — no UI in this phase. Downstream consumers: Phase 16 (UI), Phase 17 (Claude context), Phase 19 (cross-partner outlier flags).

</domain>

<decisions>
## Implementation Decisions

### Metric Selection
- Curated subset of ~10-15 metrics, NOT all 61 columns
- Performance metrics: penetration rate, conversion rate, collection milestones (6mo, 12mo), total collected lifetime
- Diagnostic metrics: contact rates, payment rates, average balance — these explain WHY a performance metric is off
- Use existing v2 conditional formatting metric set as the starting point, then expand with diagnostic metrics
- Claude can pick the final metric list based on what exists in the column config and metric-polarity.ts

### Flagging Sensitivity
- Moderate sensitivity — balanced between false positives and missed issues
- Threshold: 2+ key metrics at 2 SD from partner mean to flag a batch
- Polarity-aware: only flag deviations in the "bad" direction (existing metric-polarity.ts)
- **Fallback for partners with <3 batches:** Compare against portfolio average curve as proxy for expected performance
- Partners with 3+ batches use their own historical norms as baseline
- This naturally upgrades as history accumulates

### Severity Ranking
- Composite score formula: (count of flagged metrics) x (average deviation magnitude) x log(placement volume)
- Log scale for dollar impact — big partners matter more but don't completely dominate
- More flagged metrics = higher severity (systematic issues outrank single-metric deviations)
- Entire algorithm documented in docs/ANOMALY-ALGORITHM.md per explainability constraint

### Anomaly Data Shape
- Lean per-flag data: metric name, actual value, z-score, deviation direction
- UI/Claude can compute expected range from existing norms if needed — don't duplicate data
- **Correlated metric grouping:** Predefined metric groups (e.g., "funnel metrics", "collection metrics", "volume metrics"). If multiple metrics in the same group flag on the same batch, group them as one anomaly (e.g., "funnel degradation") instead of N separate alerts
- **Two levels:** Partner-level roll-up (flagged yes/no, severity score, count of flagged batches) AND batch-level details underneath
- Partner flag is based on latest batch status plus overall partner severity

### Claude's Discretion
- Exact metric list selection (guided by column config + metric-polarity.ts)
- Predefined metric group definitions (how to bucket the curated metrics)
- Whether to use population stddev or sample stddev (team is small, either works)
- Internal data structure design for AnomalyReport type

</decisions>

<specifics>
## Specific Ideas

- "Track performance against our curves" — Micah originally wanted to compare against projected recovery curves. No projection data exists in Snowflake, so portfolio average curve serves as the proxy. Future enhancement: build projected curves from installment probability data (INSTALLMENT_SUCCESS_PROBABILITY_CALCULATION table has per-installment success probabilities).
- Severity ranking should make dollar impact matter but not linearly — a $50M partner anomaly is more urgent but shouldn't drown out a severe issue at a smaller partner.
- Grouped anomalies should feel like "this partner has a funnel problem" not "this partner has 5 separate issues."

</specifics>

<deferred>
## Deferred Ideas

- Build projected recovery curves from installment probability data — future enhancement, would replace portfolio average fallback with true expected curves
- Adaptive thresholds that learn from user feedback (which flags did the team act on?) — v4+
- Seasonal decomposition (STL/Prophet) for time-aware detection — v4+
- Column drag-and-drop crash bug — separate fix, not part of Phase 15

</deferred>

---

*Phase: 15-anomaly-detection-engine*
*Context gathered: 2026-04-12*
