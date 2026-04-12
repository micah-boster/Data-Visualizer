# Phase 14: Batch-over-Batch Trending - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see at a glance whether key metrics are improving or degrading across a partner's recent batches. Trend arrows appear next to metrics in the partner-level batch table. This phase covers the trending computation, visual indicators, and edge-case handling. New chart types, sparklines, or historical trend views are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Trend indicator design
- Colored arrows: green up, red down, gray flat dash
- Color is context-aware — green = good direction for that metric (e.g. recovery up = green, delinquency up = red). Claude infers polarity from metric semantics.
- Arrow placement: right of the metric value (e.g. `78.2% ↑`). Keeps number alignment clean.
- Tooltip on hover shows baseline context: delta and rolling average (e.g. "Up 12% vs 4-batch avg of 69.5%")

### Which metrics get trends
- Curated subset, not all columns — avoid visual noise
- Confirmed metrics: Recovery rate %, Liquidation rate, Avg payment amount
- Claude also selects additional meaningful metrics from the batch table data model (target 3-5 total)
- Trend arrows appear at partner-level batch table only, not account-level drill-down

### Baseline & threshold tuning
- Rolling window: fixed at 4 prior batches (use fewer if partner has < 5 total batches)
- Current batch is excluded from its own baseline
- Flat threshold: ±5% relative change (5% OF the baseline value, not absolute points)
- Uniform ±5% for all metrics — no per-metric thresholds
- Minimum to show trends: 3 total batches (2 baseline + 1 current). Partners with 1-2 batches get gray dash.

### Insufficient data handling
- Partners with fewer than 3 total batches: gray dash '—' where arrow would be, tooltip says "Need 3+ batches for trending"
- When baseline uses fewer than 4 batches (i.e. partner has 3-4 total): show a subtle visual cue (lighter/faded arrow or similar) to signal lower confidence
- Tooltip should still work on low-confidence arrows, showing the smaller baseline context

### Claude's Discretion
- Exact arrow icon/character choice and sizing
- Faded arrow implementation (opacity, lighter color, asterisk, etc.)
- Tooltip styling and positioning
- Algorithm documentation format (TREND-05)
- Selection of additional trending metrics beyond the 3 confirmed ones

</decisions>

<specifics>
## Specific Ideas

- Tooltip should feel informative but not overwhelming — one line like "↑ 12% vs 4-batch avg (69.5%)" is ideal
- The gray dash for insufficient data should be genuinely unobtrusive — not a loud "N/A" label
- Context-aware coloring is important: the team looks at these metrics and green should always mean "this is going well"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-batch-over-batch-trending*
*Context gathered: 2026-04-12*
