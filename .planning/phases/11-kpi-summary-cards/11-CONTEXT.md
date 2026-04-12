# Phase 11: KPI Summary Cards - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

4-6 KPI summary cards displayed above the batch table at partner drill-down level. Cards show headline metrics (total batches, total accounts, weighted penetration rate, 6mo collection rate, 12mo collection rate, total collected) with trend indicators on rate metrics. Cards aggregate from the same filtered data source as the table.

</domain>

<decisions>
## Implementation Decisions

### Card layout & density
- Claude's discretion on layout arrangement (single row vs grid) based on card count and screen width
- Compact, number-forward design: big number, small label underneath, trend arrow inline
- Subtle card borders (light border, no background fill)
- Responsive: reflow to 2 rows on smaller screens (no horizontal scroll)

### Metric presentation
- 6 separate cards: Batches, Accounts, Penetration, 6mo Rate, 12mo Rate, Total Collected
- Dollar amounts abbreviated: $1.2M, $450K
- Percentages to one decimal: 23.4%
- Short labels: "Batches", "Accounts", "Penetration", "6mo Rate", "12mo Rate", "Total Collected"

### Trend indicators
- Green up arrow + delta percentage, red down arrow + delta, gray dash for flat
- Trends only on rate metrics (penetration, 6mo rate, 12mo rate) — skip trends on count/dollar cards (batches, accounts, total collected)
- Rolling average = all prior batches except the latest
- Single-batch partner: gray dash with "1 batch — no trend yet" note

### Claude's Discretion
- Flat threshold (how much change counts as "flat" vs up/down)
- Exact card sizing, spacing, and typography
- Responsive breakpoint choices

### Empty & loading states
- Skeleton cards (gray pulsing placeholders) during loading
- Metric not computable (e.g., no 12mo data yet): show "—" with explanation text like "No batches at 12mo yet"
- Zero-batch partner: show empty state message "No batch data available for this partner" in card area

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-kpi-summary-cards*
*Context gathered: 2026-04-12*
