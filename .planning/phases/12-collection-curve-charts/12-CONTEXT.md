# Phase 12: Collection Curve Charts - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-line Recharts chart at partner drill-down level overlaying batch collection curves. Users visually compare trajectories to see which batches outperform or underperform. Data layer (usePartnerStats, reshape-curves) already built in Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Chart placement & layout
- Chart appears **above** the batch table at partner drill-down level
- When KPI cards (Phase 11) exist, ordering is: **chart first, then KPI cards, then table**
- **Responsive height** — 40vh, scaling with viewport
- **Full-width** — matches the table width for consistent alignment
- Small header label: "Collection Curves"

### Visual hierarchy
- Most recent batch: **bold line (3px) + primary chart color**
- Older batches: **each gets a unique color from the palette but at lower opacity/saturation** (muted, thinner ~1.5px)
- **Cap visible lines at ~8 most recent** by default
- "Show all batches" toggle to reveal all lines for partners with many batches

### Interaction behavior
- Hover tooltip: **batch name + recovery rate at that month** (e.g. "2024-Q1 Batch: 12.3% at Month 6") — single line per point, not crosshair
- Click a line: **isolate/solo mode** — dims all others, highlights the clicked batch. Click again to reset.
- **Metric toggle** above the chart: "Recovery Rate %" / "Dollars Collected" — both values exist in the data layer
- **Subtle line-draw animation** on chart load (lines animate left to right)

### Reference line & legend
- Partner average reference line: **dashed, toggle on/off, default ON**
- Legend: **right side panel** (vertical list with color swatches)
- Legend click: **toggles individual line visibility** on/off (separate from chart click isolate behavior)
- When batches are capped at 8: **all batches listed in legend**, hidden ones grayed out — user can click to swap which are visible

### Claude's Discretion
- Exact animation duration and easing
- Tooltip positioning and styling
- Legend panel width and responsive behavior on small screens
- "Show all batches" toggle styling and placement
- Grid line style and axis label formatting
- Empty state when a partner has only 1 batch (nothing to compare)

</decisions>

<specifics>
## Specific Ideas

- Chart is the star of the partner drill-down view — it comes first, before KPI cards and table
- The 8-batch cap + grayed legend pattern means users always see the full picture but aren't overwhelmed
- Solo mode on click + toggle on legend gives two complementary ways to focus: isolate one vs. build up a custom set

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-collection-curve-charts*
*Context gathered: 2026-04-12*
