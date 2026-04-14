---
phase: 22-ui-polish-data-reliability
plan: 01
subsystem: ui
tags: [recharts, tooltip, sparkline, comparison-matrix, lucide-react]

requires:
  - phase: 20-cross-partner-ui
    provides: Cross-partner trajectory chart and comparison matrix components
provides:
  - Soloed-batch tooltip filtering for collection curve chart
  - Sparkline mini-preview components for collapsed chart state
  - Enter/exit toggle for comparison matrix with descriptive labeling
  - Confirmation that metric view switch (UI-04) works via internal toggle
affects: [cross-partner, charts, data-display]

tech-stack:
  added: []
  patterns:
    - "ChartSparkline reusable component — minimal Recharts LineChart with no axes/grid/tooltip"
    - "Wrapper sparkline pattern — RootSparkline/PartnerSparkline fetch data from context/hooks"

key-files:
  created:
    - src/components/charts/chart-sparkline.tsx
    - src/components/charts/root-sparkline.tsx
    - src/components/charts/partner-sparkline.tsx
  modified:
    - src/components/charts/curve-tooltip.tsx
    - src/components/charts/collection-curve-chart.tsx
    - src/components/data-display.tsx
    - src/components/cross-partner/comparison-matrix.tsx

key-decisions:
  - "UI-04 confirmed working — chart internal metric toggle IS the view switch, no external selector needed"
  - "Sparkline extracted into 3 files (base + 2 wrappers) for clean separation of data-fetching and rendering"
  - "Comparison toggle uses comparisonVisible state — matrix only renders when both expanded AND comparison visible"

patterns-established:
  - "ChartSparkline pattern: reusable minimal chart preview accepting data + lineKeys"

requirements-completed: []

duration: 8min
completed: 2026-04-14
---

# Plan 22-01: UI Polish Summary

**Fixed tooltip batch tracking, added sparkline collapse preview, comparison matrix enter/exit toggle with descriptive labeling**

## Performance

- **Duration:** 8 min
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Tooltip now tracks the soloed/clicked batch line instead of always showing the first line's data
- Collapsing charts shows an 80px sparkline mini-preview at both root and partner levels
- Comparison matrix has an enter/exit toggle ("Compare Partners" / "Hide Comparison") in the chart header bar
- Comparison matrix card has info tooltip, icon+label view mode buttons, and partner count context
- UI-04 confirmed working — the chart's internal metric toggle already updates everything reactively

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix curve tooltip to filter by soloed batch** - `9b7b74b` (fix)
2. **Task 2+3: Sparkline preview + comparison toggle** - `708bd73` (feat)
3. **Task 3: Comparison matrix labeling** - `4e6cc75` (feat)
4. **Task 4: Confirm UI-04 metric view switch** - `bff3d43` (docs)

## Files Created/Modified
- `src/components/charts/curve-tooltip.tsx` - Added soloedBatch prop for filtered tooltip
- `src/components/charts/collection-curve-chart.tsx` - Threads soloedBatch to tooltip, UI-04 doc comment
- `src/components/charts/chart-sparkline.tsx` - Reusable minimal sparkline component
- `src/components/charts/root-sparkline.tsx` - Cross-partner trajectory sparkline wrapper
- `src/components/charts/partner-sparkline.tsx` - Collection curve sparkline wrapper
- `src/components/data-display.tsx` - Sparkline rendering, comparison toggle, dynamic imports
- `src/components/cross-partner/comparison-matrix.tsx` - Info tooltip, icon+label buttons, partner count

## Decisions Made
- UI-04 is resolved — the chart's internal Recovery Rate % / Dollars Collected toggle already updates chart data, Y-axis, and tooltip values. No external metric selector exists or is needed.
- Sparklines split into 3 files (base + root + partner wrappers) for clean data/render separation
- Tasks 2 and 3 committed together since they both modify data-display.tsx chart section

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## Next Phase Readiness
- All four UI issues (UI-01 through UI-04) resolved
- Charts now have proper tooltip tracking, collapse preview, and comparison toggle

---
*Phase: 22-ui-polish-data-reliability*
*Completed: 2026-04-14*
