/**
 * Data pivot utility for transforming BatchCurve[] into Recharts-compatible flat format.
 *
 * Recharts LineChart requires flat objects with one key per series.
 * BatchCurve[] has nested points arrays. This module bridges the two.
 *
 * Key design decisions:
 * - Batch names from Snowflake may contain dots, brackets, or other characters
 *   that break Recharts property access. We sanitize to `batch_0`, `batch_1`, etc.
 * - Missing months use `undefined` (NOT 0) so Recharts skips them instead of
 *   drawing false zero-cliff lines for young batches.
 */

import type { BatchCurve } from "@/types/partner-stats";

/** Prefix for sanitized batch keys. batch_0, batch_1, etc. */
export const BATCH_KEY_PREFIX = "batch_";

/**
 * A single data point for Recharts, with month on X and one key per batch series.
 * Values are `undefined` when a batch has no data at that month (beyond its age).
 */
export interface PivotedPoint {
  month: number;
  [key: string]: number | undefined;
}

/**
 * Maps sanitized batch keys back to their display names.
 * e.g. `batch_0` -> `"2024-Q1 Batch"`
 */
export type BatchKeyMap = Map<string, string>;

/**
 * Transform an array of BatchCurve objects into Recharts-compatible flat data.
 *
 * Each batch gets a sanitized key (`batch_0`, `batch_1`, ...) based on its
 * index in the input array. The caller controls sort order -- the state hook
 * sorts by ageInMonths ascending (newest first) before passing here.
 *
 * @param curves - Batch curve data, pre-sorted by the caller
 * @param metric - Which numeric field to pivot: 'recoveryRate' (%) or 'amount' ($)
 * @returns Pivoted data array and a key-to-display-name map
 */
export function pivotCurveData(
  curves: BatchCurve[],
  metric: "recoveryRate" | "amount",
): { data: PivotedPoint[]; keyMap: BatchKeyMap } {
  // Build key map: batch_N -> display name
  const keyMap: BatchKeyMap = new Map();
  curves.forEach((curve, i) => {
    keyMap.set(`${BATCH_KEY_PREFIX}${i}`, curve.batchName);
  });

  // Collect all unique months across all curves
  const monthSet = new Set<number>();
  for (const curve of curves) {
    for (const pt of curve.points) {
      monthSet.add(pt.month);
    }
  }
  const sortedMonths = [...monthSet].sort((a, b) => a - b);

  // Build lookup: for each curve, month -> metric value
  const curveLookups: Map<number, number>[] = curves.map((curve) => {
    const lookup = new Map<number, number>();
    for (const pt of curve.points) {
      lookup.set(pt.month, pt[metric]);
    }
    return lookup;
  });

  // Pivot: one PivotedPoint per month
  const data: PivotedPoint[] = sortedMonths.map((month) => {
    const point: PivotedPoint = { month };
    curves.forEach((_, i) => {
      const key = `${BATCH_KEY_PREFIX}${i}`;
      const value = curveLookups[i].get(month);
      // undefined for months beyond batch age -- Recharts skips these
      point[key] = value;
    });
    return point;
  });

  return { data, keyMap };
}

/**
 * Add a partner average reference series (`__avg__`) to pivoted data.
 *
 * For each month, computes the mean of all batch values present at that month.
 * Months where no batch has data get `undefined` (line gap, not zero).
 *
 * Returns a new array -- does not mutate the input.
 *
 * @param data - Pivoted data from pivotCurveData
 * @param curves - Original curves (used to determine batch count for key generation)
 * @param metric - Which metric is being displayed (unused in computation but
 *   kept in signature for consistency and future formatting needs)
 * @returns New pivoted data array with __avg__ key added to each point
 */
export function addAverageSeries(
  data: PivotedPoint[],
  curves: BatchCurve[],
  _metric: "recoveryRate" | "amount",
): PivotedPoint[] {
  const batchCount = curves.length;

  return data.map((point) => {
    const newPoint: PivotedPoint = { ...point };

    let sum = 0;
    let count = 0;
    for (let i = 0; i < batchCount; i++) {
      const key = `${BATCH_KEY_PREFIX}${i}`;
      const val = point[key];
      if (val !== undefined) {
        sum += val;
        count += 1;
      }
    }

    newPoint.__avg__ = count > 0 ? sum / count : undefined;
    return newPoint;
  });
}
