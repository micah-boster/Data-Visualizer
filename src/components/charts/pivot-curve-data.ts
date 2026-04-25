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
 * - Phase 40 PRJ-01: when a curve has `projection`, emit a sibling
 *   `batch_N__projected` key (DOUBLE underscore — grep-unique to prevent
 *   substring collision in tooltip proximity logic per Pitfall 5).
 */

import type { BatchCurve } from "@/types/partner-stats";

/** Prefix for sanitized batch keys. batch_0, batch_1, etc. */
export const BATCH_KEY_PREFIX = "batch_";

/**
 * Suffix for the modeled-projection sibling key. Double underscore is
 * deliberate — keeps `batch_N__projected` grep-unique against any future
 * `batch_N_*` keys and prevents substring collisions in tooltip proximity
 * logic that filters keys like `batch_\d+`.
 */
export const PROJECTED_KEY_SUFFIX = "__projected";

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
  // Build key map: batch_N -> display name. Phase 40: also map
  // batch_N__projected -> same display name so the tooltip can resolve either
  // key back to its batch (only emitted for curves that actually have
  // projection data — keeps the keyMap a useful "is this a real series" check).
  const keyMap: BatchKeyMap = new Map();
  curves.forEach((curve, i) => {
    const baseKey = `${BATCH_KEY_PREFIX}${i}`;
    keyMap.set(baseKey, curve.batchName);
    if (curve.projection && curve.projection.length > 0) {
      keyMap.set(`${baseKey}${PROJECTED_KEY_SUFFIX}`, curve.batchName);
    }
  });

  // Collect all unique months across all curves -- include projection months so
  // batches with modeled coverage extending past their actuals (e.g. 80mo
  // projection on a 12mo batch) get rows out to maxAge. Caller clips later.
  const monthSet = new Set<number>();
  for (const curve of curves) {
    for (const pt of curve.points) {
      monthSet.add(pt.month);
    }
    if (curve.projection) {
      for (const pt of curve.projection) {
        monthSet.add(pt.month);
      }
    }
  }
  const sortedMonths = [...monthSet].sort((a, b) => a - b);

  // Build lookup: for each curve, month -> metric value (actual + projected)
  const curveLookups: Map<number, number>[] = curves.map((curve) => {
    const lookup = new Map<number, number>();
    for (const pt of curve.points) {
      lookup.set(pt.month, pt[metric]);
    }
    return lookup;
  });
  const projectionLookups: Array<Map<number, number> | null> = curves.map(
    (curve) => {
      if (!curve.projection || curve.projection.length === 0) return null;
      const lookup = new Map<number, number>();
      for (const pt of curve.projection) {
        lookup.set(pt.month, pt[metric]);
      }
      return lookup;
    },
  );

  // Pivot: one PivotedPoint per month
  const data: PivotedPoint[] = sortedMonths.map((month) => {
    const point: PivotedPoint = { month };
    curves.forEach((_, i) => {
      const key = `${BATCH_KEY_PREFIX}${i}`;
      const value = curveLookups[i].get(month);
      // undefined for months beyond batch age -- Recharts skips these
      point[key] = value;
      // Phase 40: emit sibling __projected key when modeled coverage exists at
      // this month. Absence is the absence of the key (matches actual-line
      // behavior for batches shorter than max age — Recharts treats missing
      // keys as gaps when connectNulls={false}).
      const projLookup = projectionLookups[i];
      if (projLookup) {
        const projValue = projLookup.get(month);
        if (projValue !== undefined) {
          point[`${key}${PROJECTED_KEY_SUFFIX}`] = projValue;
        }
      }
    });
    return point;
  });

  return { data, keyMap };
}

/**
 * Add a partner average reference series (`__avg__`) to pivoted data.
 *
 * For each month, computes the mean of the batch values present at that month
 * across the provided `keys` subset. Months where no batch has data get
 * `undefined` (line gap, not zero).
 *
 * The `keys` parameter is an explicit list of sanitized batch keys (e.g.
 * `['batch_0', 'batch_3']`) rather than a curves array so callers can scope
 * the average to a possibly-non-contiguous user-visible subset (Phase 38
 * CHT-01). Passing `sortedCurves.map((_, i) => `batch_${i}`)` reproduces the
 * previous full-width behavior.
 *
 * Returns a new array -- does not mutate the input.
 *
 * @param data - Pivoted data from pivotCurveData
 * @param keys - Sanitized batch keys to include in the average
 * @returns New pivoted data array with __avg__ key added to each point
 */
export function addAverageSeries(
  data: PivotedPoint[],
  keys: readonly string[],
): PivotedPoint[] {
  return data.map((point) => {
    const newPoint: PivotedPoint = { ...point };

    let sum = 0;
    let count = 0;
    for (const key of keys) {
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
