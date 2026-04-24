/**
 * Phase 38 MBI-01 — override-merge helper.
 *
 * The Metabase Import Preview exposes a chart-type override (`line | scatter
 * | bar | none`) plus X/Y axis pickers. On Apply, the user's override wins
 * over inference; absent an override, inference passes through. `'none'`
 * suppresses the chart entirely (imported view has no chart).
 *
 * Pure function — extracted from `ImportSheet#handleApply` so the MBI-01
 * smoke test can exercise every branch without a DOM. The real call site
 * consumes this and hands the result to `onImportSql`.
 */

import type { ChartInferenceResult } from './types';

export type OverrideChartType = 'line' | 'scatter' | 'bar' | 'none' | null;

/**
 * Merge a user-provided override on top of an inferred chart.
 *
 *   - `overrideType === null`       → pass `inferred` through unchanged.
 *   - `overrideType === 'none'`     → suppress (return a null-typed result
 *                                     that `mapToSnapshot` already treats as
 *                                     "no chart inferred").
 *   - `overrideType` is a concrete  → user-selected type wins; override axes
 *     chart type                      win over inferred; if neither is set,
 *                                     null (caller surfaces `Pick a column`).
 */
export function mergeOverride(
  inferred: ChartInferenceResult,
  overrideType: OverrideChartType,
  overrideX: string | null,
  overrideY: string | null,
): ChartInferenceResult {
  // No override — pass inferred result through unchanged. Call site may still
  // add more skipped[] entries elsewhere; this function does not consume them.
  if (overrideType === null) return inferred;

  // Explicit suppression — render no chart at all. Inferred skipped[] entries
  // are carried through so the Preview can still surface "why" context.
  if (overrideType === 'none') {
    return {
      chartType: null,
      x: null,
      y: null,
      skipped: inferred.skipped ?? [],
    };
  }

  // Concrete override — user-picked type + axes (override > inferred > null).
  return {
    chartType: overrideType,
    x: overrideX ?? inferred.x ?? null,
    y: overrideY ?? inferred.y ?? null,
    skipped: [],
  };
}
