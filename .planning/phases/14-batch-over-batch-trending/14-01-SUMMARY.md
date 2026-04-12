---
phase: 14-batch-over-batch-trending
plan: "01"
status: complete
started: "2026-04-12"
completed: "2026-04-12"
---

# Plan 14-01: Extend Types & Build TrendIndicator — Summary

## What was built
Extended the trending computation types and built the TrendIndicator UI component for rendering trend arrows next to metric values.

## Changes

### Modified
- **src/types/partner-stats.ts** — Added `deltaPercent` and `baselineCount` to BatchTrend; added `batchCount` to TrendingData
- **src/lib/computation/compute-trending.ts** — Exported TRENDING_METRICS, fixed rolling window from 6 to 4 prior batches, added deltaPercent and baselineCount computation

### Created
- **src/lib/computation/metric-polarity.ts** — Metric polarity map (all 5 metrics are higher_is_better) with getPolarity helper
- **src/components/table/trend-indicator.tsx** — TrendIndicator (colored arrow + tooltip) and InsufficientTrendIndicator (gray dash + tooltip)

## Key decisions
- Used base-ui Tooltip pattern (no `asChild` prop) matching existing formatted-cell.tsx conventions
- Used Unicode arrows (↑↓—) rather than Lucide icons for inline text alignment
- Low confidence rendered via `opacity-50` CSS class

## Deviations
None — implemented as planned.

## Self-Check: PASSED
- [x] All files created/modified
- [x] TypeScript compilation clean
- [x] Atomic commit created
