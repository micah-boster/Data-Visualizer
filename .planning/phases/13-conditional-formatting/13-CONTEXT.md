# Phase 13: Conditional Formatting - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Batch table cells at partner drill-down level are color-tinted (green/red) based on deviation from partner historical norms (mean ± 1.5 stddev). Color intensity proportional to deviation magnitude. Hover tooltips explain deviation. Toggle to turn formatting on/off. Existing root-level static threshold formatting is not touched.

</domain>

<decisions>
## Implementation Decisions

### Color scheme & intensity
- Cell background tint (not text color) — light green/red wash, numbers stay default text color
- Continuous gradient — opacity scales smoothly with deviation magnitude, no discrete steps
- Neutral zone (within 1.5 stddev): no color at all, plain cell
- Green/red palette is fine for now — tooltips provide the numbers so color isn't the only signal

### Deviation tooltip content
- Format: "12.3% vs partner avg 18.7% (-34%)" — value, benchmark, and percentage deviation
- Hover trigger (standard mouse hover, disappears on leave)
- No tooltip on neutral cells — only colored cells get tooltips
- Dollar columns show percentage deviation: "$1.2M vs partner avg $1.8M (-33%)"

### Toggle behavior
- Toggle in table toolbar/header area — small switch labeled "Heatmap"
- State persists in localStorage across sessions
- When off: all cell backgrounds return to default, tooltips disappear — clean numbers only

### Which columns get formatted
- Strictly the listed metrics only: collection curve milestones (3mo, 6mo, 9mo, 12mo rates), penetration rate, conversion rate, total collected
- Other numeric columns stay plain
- Polarity: higher is always better (green = above avg) for all formatted metrics
- Footer/aggregate row: no formatting, only individual batch rows

### Claude's Discretion
- Exact green/red color values and opacity curve
- Max opacity cap (so tints don't overwhelm readability)
- Transition animation when toggling on/off
- Tooltip positioning and delay timing

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

*Phase: 13-conditional-formatting*
*Context gathered: 2026-04-12*
