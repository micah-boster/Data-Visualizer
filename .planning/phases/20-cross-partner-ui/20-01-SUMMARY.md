---
phase: 20-cross-partner-ui
plan: 01
subsystem: ui
tags: [recharts, tanstack-table, percentile, cross-partner, trajectory-chart]

requires:
  - phase: 19-cross-partner-computation
    provides: CrossPartnerData types, useCrossPartnerContext hook, compute pipeline
provides:
  - PercentileCell component with tier-colored P72 (3/8) format
  - Percentile rank columns injected dynamically at root table level
  - CrossPartnerTrajectoryChart with reference lines and hover interaction
  - TrajectoryTooltip and TrajectoryLegend components
  - Dollar-weighted/equal-weight curve mode toggle
affects: [20-02-PLAN, cross-partner-ui]

tech-stack:
  added: []
  patterns:
    - "Dynamic virtual columns via extraColumns in useDataTable hook"
    - "Table meta for passing crossPartnerData to cell renderers"
    - "Deterministic color assignment by alphabetical partner sort"

key-files:
  created:
    - src/components/cross-partner/percentile-cell.tsx
    - src/lib/columns/percentile-columns.tsx
    - src/components/cross-partner/trajectory-chart.tsx
    - src/components/cross-partner/trajectory-tooltip.tsx
    - src/components/cross-partner/trajectory-legend.tsx
  modified:
    - src/components/table/data-table.tsx
    - src/lib/columns/definitions.ts
    - src/lib/table/hooks.ts
    - src/components/data-display.tsx

key-decisions:
  - "Percentile columns are virtual/computed, not added to COLUMN_CONFIGS -- injected via extraColumns pattern"
  - "Positional rank computed by sorting rankedPartners on metric descending"
  - "Best-in-class determined by highest perDollarPlacedRate"
  - "Default curve mode is dollarWeighted with toggle to equalWeight"

patterns-established:
  - "extraColumns pattern: useDataTable accepts extra ColumnDef[] appended after standard columns"
  - "CrossPartnerTableMeta: table meta extended with crossPartnerData for cell access"

requirements-completed: [XPC-05, XPC-06, XPC-07]

duration: 2min
completed: 2026-04-14
---

# Phase 20 Plan 01: Cross-Partner Percentile Columns and Trajectory Chart Summary

**Percentile rank columns (P72 3/8 format) for 4 KPI metrics in root table, plus multi-partner trajectory overlay chart with best-in-class/portfolio-avg reference lines and dollar-weighted/equal-weight toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T14:54:51Z
- **Completed:** 2026-04-14T14:57:07Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- PercentileCell component renders tier-colored badges (green/yellow/red) in "P72 (3/8)" format with em dash for non-ranked partners
- Four percentile rank columns (Pen. Rank, 6mo Rank, 12mo Rank, Collected Rank) appear only at root drill level
- CrossPartnerTrajectoryChart renders one solid line per ranked partner with deterministic color assignment
- Best-in-class (black dashed) and portfolio average (gray dashed) reference lines always visible
- Hover highlights single partner and dims all others; legend toggles partner visibility
- Dollar-weighted vs equal-weight mode toggle in chart header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PercentileCell component and add percentile columns to root table** - `5d6b679` (feat)
2. **Task 2: Build CrossPartnerTrajectoryChart with reference lines and wire into DataDisplay** - `eebf1c1` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/cross-partner/percentile-cell.tsx` - Percentile badge cell renderer with tier coloring
- `src/lib/columns/percentile-columns.tsx` - ColumnDef builder for 4 percentile rank columns
- `src/components/cross-partner/trajectory-chart.tsx` - Multi-partner trajectory overlay with reference lines
- `src/components/cross-partner/trajectory-tooltip.tsx` - Custom tooltip showing partner name and recovery rate
- `src/components/cross-partner/trajectory-legend.tsx` - Clickable legend with reference line indicators
- `src/components/table/data-table.tsx` - Accept crossPartnerData prop, build percentile columns
- `src/lib/columns/definitions.ts` - Extended TableDrillMeta with crossPartnerData
- `src/lib/table/hooks.ts` - Added extraColumns and crossPartnerData to UseDataTableOptions

## Decisions Made
- Percentile columns are virtual/computed, not added to COLUMN_CONFIGS -- injected via extraColumns pattern through table hooks
- Positional rank computed by sorting rankedPartners on that metric descending
- Best-in-class partner determined by highest perDollarPlacedRate
- Default curve mode is dollarWeighted (matching primary business use case)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added dollar-weighted/equal-weight curve mode toggle**
- **Found during:** Task 2
- **Issue:** Plan specified a curveMode toggle but initial implementation hardcoded equalWeight
- **Fix:** Added curveMode state, updated pivot function and reference line data sources, added toggle buttons in CardHeader
- **Files modified:** src/components/cross-partner/trajectory-chart.tsx
- **Verification:** TypeScript compilation and Next.js build both pass
- **Committed in:** eebf1c1

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix aligned implementation with plan specification. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All cross-partner UI components ready for Plan 02 (comparison matrix and polish)
- CrossPartnerData flows through context to both table and chart
- extraColumns pattern established for future dynamic column injection

## Self-Check: PASSED

All 8 files verified present. Both commit hashes (5d6b679, eebf1c1) confirmed in git log.

---
*Phase: 20-cross-partner-ui*
*Completed: 2026-04-14*
