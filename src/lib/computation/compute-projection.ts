import type { BatchCurve, BatchTrend } from '@/types/partner-stats';

/**
 * Pure helpers for the Phase 40 PRJ-04 "vs modeled curve" KPI baseline.
 *
 * These mirror the shape and threshold convention of `compute-trending.ts` so
 * `StatCard` can consume the result via its existing `trend?: StatCardTrend`
 * prop with no new branches in the renderer. Caller flips
 * `trendLabel="vs modeled curve"` when delivering a modeled trend instead of a
 * rolling-avg trend (see `kpi-summary-cards.tsx`).
 *
 * Threshold convention: 5% relative — matches `compute-trending.ts:17`. We use
 * STRICTLY GREATER THAN ('>') so a delta of exactly 5% reports as 'flat',
 * matching how the rolling-avg path treats values within ±threshold as flat.
 *
 * Suppression rules (returns `null` so KpiSummaryCards renders the
 * baseline-absent UX without silent fallback):
 *   - No `projection` array on the curve → null
 *   - No projection point at the requested month → null
 *   - Modeled rate of 0 (would divide by zero / produce Infinity%) → null
 */

import type { CurvePoint } from '@/types/partner-stats';

const TREND_THRESHOLD_PERCENT = 5;

/**
 * Find the modeled rate at a specific horizon (month) for a batch.
 *
 * Returns `null` when:
 *   - the curve has no projection array (no modeled coverage for this batch)
 *   - the projection has no point at the requested month
 */
export function modeledRateAtMonth(
  curve: Pick<BatchCurve, 'projection'>,
  month: number,
): number | null {
  if (!curve.projection) return null;
  const point = curve.projection.find((p: CurvePoint) => p.month === month);
  return point ? point.recoveryRate : null;
}

/**
 * Compute the "vs modeled curve" delta for a batch at a given horizon.
 *
 * Returns null whenever a meaningful delta cannot be produced — caller should
 * render the KPI card's baseline-absent state ("No modeled curve for this
 * scope" with a "Switch to rolling avg" recovery action) rather than silently
 * fall back to rolling-avg.
 *
 * Reuses the `BatchTrend` shape so the result drops directly into
 * `StatCard.trend` via `KpiSummaryCards`'s existing wire-up. The
 * `rollingAvg` field carries the modeled value (field name is vestigial in
 * this path — `StatCard` only reads `direction`, `deltaPercent`, and
 * `metric`).
 */
export function computeModeledDelta(
  latestCurve: BatchCurve,
  horizon: number,
  actualRate: number,
  metricKey: string,
): BatchTrend | null {
  const modeled = modeledRateAtMonth(latestCurve, horizon);
  if (modeled == null || modeled === 0) return null;

  const deltaPercent = ((actualRate - modeled) / modeled) * 100;

  let direction: 'up' | 'down' | 'flat';
  if (deltaPercent > TREND_THRESHOLD_PERCENT) {
    direction = 'up';
  } else if (deltaPercent < -TREND_THRESHOLD_PERCENT) {
    direction = 'down';
  } else {
    direction = 'flat';
  }

  return {
    batchName: latestCurve.batchName,
    metric: metricKey,
    value: actualRate,
    // Vestigial field in this path — see JSDoc above.
    rollingAvg: modeled,
    direction,
    deltaPercent,
    baselineCount: 1,
  };
}
