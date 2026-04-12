# Batch-over-Batch Trending Algorithm

## Overview

Trending compares a partner's latest batch metrics against a rolling baseline of prior batches. The result is a directional indicator (up/down/flat) shown next to key metrics in the partner-level batch table.

## Metrics Tracked

| Metric | Column Key | Type |
|--------|-----------|------|
| Penetration Rate | PENETRATION_RATE | percentage |
| Conversion Rate | CONVERSION_RATE | percentage |
| Total Collected | TOTAL_COLLECTED | currency |
| 6-Month Collection | COLLECTION_AFTER_6_MONTH | currency |
| 12-Month Collection | COLLECTION_AFTER_12_MONTH | currency |

## Baseline Computation

1. Sort partner's batches by BATCH name (chronological)
2. Take up to 4 prior batches as the baseline (excluding the current/latest batch)
3. Minimum 2 prior batches required (3 total including current)
4. Compute the arithmetic mean of each metric across the baseline batches
5. Null/NaN values are excluded from the average

## Direction Determination

For each metric:

- **Up**: value > rollingAverage * 1.05 (more than 5% above baseline)
- **Down**: value < rollingAverage * 0.95 (more than 5% below baseline)
- **Flat**: within +/-5% of baseline

The 5% threshold is a relative threshold (5% OF the baseline value), not absolute percentage points.

Special case: if the rolling average is 0 and the current value is positive, direction is "up". If both are 0, direction is "flat".

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Partner has 1-2 batches | "Insufficient history" -- gray dash indicator |
| Partner has 3-4 batches | Trends shown with low-confidence styling (faded arrows) |
| Partner has 5+ batches | Full confidence -- uses 4-batch baseline |
| Metric value is null/NaN | Metric skipped for that batch |
| All prior values are null | Metric not included in trends |

## Visual Indicators

| Direction | Symbol | Color Logic |
|-----------|--------|-------------|
| Up | Arrow up | Green if "up" is good for this metric, red if bad |
| Down | Arrow down | Red if "down" is bad for this metric, green if good |
| Flat | Dash | Gray (neutral) |

Color is context-aware via a polarity map:

- All current metrics use "higher_is_better" polarity
- Up + higher_is_better = green (positive trend)
- Down + higher_is_better = red (negative trend)

## Tooltip

Hover over any trend indicator to see:

- Direction and delta percentage (e.g., "Up 12.3%")
- Baseline description (e.g., "vs 4-batch avg")
- Formatted rolling average value (e.g., "(69.5%)")

## Implementation

- Computation: `src/lib/computation/compute-trending.ts`
- Polarity map: `src/lib/computation/metric-polarity.ts`
- UI component: `src/components/table/trend-indicator.tsx`
- Types: `src/types/partner-stats.ts` (BatchTrend, TrendingData)

---

*Last updated: 2026-04-12*
