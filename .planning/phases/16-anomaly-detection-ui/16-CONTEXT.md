# Phase 16: Anomaly Detection UI - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface anomaly data visually so users see at a glance which partners and batches need attention. Includes badges on table rows, detail popovers, a summary panel, and chart highlighting. Anomaly computation is handled by Phase 15 — this phase only consumes that data.

</domain>

<decisions>
## Implementation Decisions

### Badge design & placement
- Colored dot indicator (small circle) — yellow for warning, red for critical (two severity levels)
- Status column positioned as the first (leftmost) column in both root and drill-down tables
- Empty cell for non-anomalous rows — anomalies stand out by contrast, no green dot for healthy rows
- Badge is clickable to open the detail popover

### Popover detail depth
- Click-triggered (not hover) — popover stays open until dismissed
- Header shows severity label + anomalous metric count (e.g., "Warning — 3 anomalous metrics")
- Shows ALL anomalous metrics (no truncation/pagination) — list is naturally bounded by the 2+ metric threshold
- Each metric displays: metric name, actual value, expected range, deviation magnitude (e.g., "Penetration Rate: 3.2% (expected 8.1% - 14.3%). 2.4 SD below mean.")

### Summary panel behavior
- Collapsed by default — compact bar showing "X anomalies detected" with expand toggle
- Shows top 5 flagged entities sorted by severity
- Each entry shows: entity name + severity level + top anomalous metric (e.g., "Affirm — Warning — Penetration Rate 2.4 SD below")
- Clicking an entry drills into that partner/batch (navigates to drill-down view)
- Panel appears at the top of root-level view only

### Chart highlighting style
- Anomalous batch curves rendered in warning/red color with thicker stroke (color shift + bold)
- Non-anomalous curves get subtle opacity reduction when anomalies are present
- Hovering an anomalous curve shows tooltip with anomaly info (flagged metrics + severity)
- Anomaly highlighting is always on — no toggle control

### Claude's Discretion
- Exact dot size and color hex values (within yellow/red palette)
- Popover positioning and dismiss behavior
- Summary panel expand/collapse animation
- Chart opacity values for dimmed curves
- Tooltip layout and formatting details

</decisions>

<specifics>
## Specific Ideas

- Two-level severity (warning/critical) maps directly to the anomaly engine's scoring — keep it simple, avoid over-categorization
- Summary panel collapsed bar should feel like a notification banner — present but not dominating
- Chart highlighting should make anomalous curves pop without making the chart feel cluttered

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-anomaly-detection-ui*
*Context gathered: 2026-04-12*
