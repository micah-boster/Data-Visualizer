---
phase: 16-anomaly-detection-ui
plan: 02
subsystem: ui-anomaly
tags: [anomaly-panel, chart-highlighting, curve-tooltip, recharts]

requires:
  - phase: 16-anomaly-detection-ui
    provides: AnomalyBadge, AnomalyDetail, anomaly-labels utilities, Status column
  - phase: 15-anomaly-detection-engine
    provides: AnomalyProvider context, PartnerAnomaly/BatchAnomaly types
provides:
  - Collapsible anomaly summary panel at root view with drill navigation
  - Anomaly-aware chart line styling (color, stroke, opacity)
  - Enhanced curve tooltip with anomaly deviation info
affects: [phase-17-claude-query]

tech-stack:
  added: []
  patterns: [context-driven-chart-styling, anomaly-dimming, collapsible-panel]

key-files:
  created:
    - src/components/anomaly/anomaly-summary-panel.tsx
  modified:
    - src/components/data-display.tsx
    - src/components/charts/collection-curve-chart.tsx
    - src/components/charts/use-curve-chart-state.ts
    - src/components/charts/curve-tooltip.tsx

key-decisions:
  - "CollectionCurveChart reads anomaly data directly from AnomalyProvider context via useAnomalyContext, matching partner by batchName overlap -- no prop-drilling needed"
  - "anomalyByKey map built in useCurveChartState for O(1) lookups during render"
  - "Solo mode takes precedence over anomaly dimming in getLineOpacity"
  - "Critical severity (4+ flags) uses red-500, warning (2-3 flags) uses amber-500"
  - "Summary panel uses inline maxHeight transition for smooth expand/collapse"

patterns-established:
  - "Context-driven chart styling: chart components consume anomaly context directly rather than receiving props from parent"
  - "Anomaly dimming: when flagged batches exist, non-flagged lines dim to 0.3 opacity"

requirements-completed: [AD-09, AD-10]

duration: 4min
completed: 2026-04-12
---

# Plan 16-02: Anomaly Summary Panel and Chart Highlighting

**Collapsible root-level anomaly banner with top 5 flagged partners and anomaly-aware curve chart styling with red/amber highlighting and enhanced tooltips**

## What Was Built

1. **Anomaly summary panel** (`anomaly-summary-panel.tsx`): Collapsible bar at root view showing total anomaly count. Expands to list top 5 flagged partners sorted by severity score descending. Each entry shows severity dot, partner name, severity label, and top anomalous metric with deviation. Clicking drills into that partner. Panel not rendered when no anomalies exist.

2. **Chart anomaly highlighting** (`collection-curve-chart.tsx`, `use-curve-chart-state.ts`): CollectionCurveChart reads anomaly data from AnomalyProvider context, matching partner by batchName overlap. Builds anomalyByKey map for O(1) lookups. Flagged batch curves render in red (critical) or amber (warning) with 3px stroke. Non-anomalous curves dim to 0.3 opacity when any anomalies present. Solo mode overrides anomaly dimming.

3. **Enhanced curve tooltip** (`curve-tooltip.tsx`): When hovering a flagged batch, tooltip appends a red dot with the top anomaly flag metric label and deviation (e.g., "Penetration Rate 2.4 SD below").

4. **DataDisplay integration**: Summary panel rendered at root drill level only, positioned above schema warnings and KPI cards.

## Deviations

None -- implementation follows plan exactly.

## Task Commits

1. **Task 1: Create anomaly summary panel for root view** - `602ad4e` (feat)
2. **Task 2: Add anomaly highlighting to collection curve charts** - `67f830e` (feat)

## Files Created/Modified
- `src/components/anomaly/anomaly-summary-panel.tsx` - Collapsible anomaly summary panel for root view
- `src/components/data-display.tsx` - Imports and renders AnomalySummaryPanel at root level
- `src/components/charts/collection-curve-chart.tsx` - Reads anomaly context, passes batchAnomalies to hook and tooltip
- `src/components/charts/use-curve-chart-state.ts` - Anomaly-aware opacity, stroke width, and line color helpers
- `src/components/charts/curve-tooltip.tsx` - Extended tooltip with anomaly flag info

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All anomaly UI requirements (AD-07 through AD-10) complete
- Ready for Phase 17: Claude Query Infrastructure

---
*Phase: 16-anomaly-detection-ui*
*Completed: 2026-04-12*
