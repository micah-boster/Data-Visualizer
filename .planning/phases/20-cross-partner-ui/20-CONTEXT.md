# Phase 20: Cross-Partner UI - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can visually compare all partners' performance rankings and collection trajectories at root level. Phase 19 computed the data (percentile ranks, normalized trajectories, portfolio outliers). This phase builds the UI to display that data: percentile columns in the root table, a trajectory overlay chart, benchmark reference lines, and a partner comparison matrix with multiple view modes.

</domain>

<decisions>
## Implementation Decisions

### Percentile display format
- Show both formats combined: "P72 (3/8)" — percentile badge plus positional rank
- Green/yellow/red gradient color coding on percentile cells based on performance tier (top 25% = green, bottom 25% = red)
- All four key metrics get percentile rank columns: penetration rate, 6mo collection rate, 12mo collection rate, total collected
- Rank columns appear inline next to their corresponding metric value column (not grouped separately)

### Trajectory chart design
- Unique color per partner from a distinct palette, with clickable legend to toggle partners on/off
- Hover interaction: highlight hovered partner's line + dim all other lines + show tooltip with partner name and value at that month
- X-axis = months since placement (0, 1, 2... 12+) — normalized timeline, not calendar dates
- Y-axis = recovery rate %

### Comparison matrix layout
- Three view modes available, switchable by the user:
  1. **Heatmap table** (default) — grid with cells colored by performance tier
  2. **Horizontal bar ranking** — select a metric, see all partners as sorted horizontal bars
  3. **Plain table** — raw values, no color
- Orientation is switchable: rows=partners/cols=metrics OR rows=metrics/cols=partners
- Click column/row headers to sort by that metric

### Reference line styling
- Best-in-class: black dashed line, labeled "Best-in-class (Partner X)" showing which partner it represents
- Portfolio average: gray dashed line, labeled "Portfolio Avg"
- Both reference lines always visible (not togglable)
- Dashed pattern distinguishes reference lines from solid partner lines

### Claude's Discretion
- Chart library choice and configuration
- Exact color palette for partner lines (ensure sufficient contrast for 8+ partners)
- Loading states and skeleton patterns
- Responsive behavior / mobile layout adjustments
- View mode toggle UI design (tabs, dropdown, icon buttons)
- Exact percentile tier thresholds (top/bottom quartile or custom breakpoints)

</decisions>

<specifics>
## Specific Ideas

- Percentile display combines both formats ("P72 (3/8)") so users get statistical context AND intuitive ranking in small portfolios
- Trajectory chart hover should be the primary discovery mechanism — muted-then-highlighted pattern reduces visual noise on dense charts
- Comparison matrix should feel like a dashboard widget, not a separate page — it lives at root level alongside the existing partner table
- Heatmap default because it gives the most information at a glance without interaction

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-cross-partner-ui*
*Context gathered: 2026-04-13*
