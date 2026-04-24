/**
 * Phase 36 Plan 04 — pure helpers for chart-type transitions.
 *
 * `switchChartType` implements the carryover rules from 36-RESEARCH §Pattern 5
 * so the ChartBuilderToolbar can dispatch a single call on every segmented-
 * control click. `seedGenericFromPreset` implements the CONTEXT-locked
 * collection-curve → generic conversion (36-CONTEXT.md:33).
 *
 * Registry-derivation rule (36-CONTEXT lock): generic → generic carryover uses
 * `isColumnEligible` from the axis-eligibility helper — NEVER a hand-rolled
 * compatibility list.
 *
 * Node ESM convention: relative `../` imports with explicit `.ts` suffixes so
 * the co-located `transitions.smoke.ts` file can run under Node's native
 * --experimental-strip-types resolver. Matches the chart-presets slice
 * convention (Phase 36 Plan 02, Deviation Rule 3).
 */

import type {
  ChartDefinition,
  CollectionCurveDefinition,
  GenericChartDefinition,
} from '../views/types.ts';
import { DEFAULT_COLLECTION_CURVE } from '../views/migrate-chart.ts';
import { isColumnEligible } from '../columns/axis-eligibility.ts';

type GenericType = GenericChartDefinition['type'];

/**
 * Seed a fresh generic chart definition from the collection-curve preset.
 *
 * CONTEXT-locked conversion (36-CONTEXT.md:33):
 *   "Switching from collection-curve preset → generic type: convert with
 *    sensible defaults. Preset's `metric` field maps to generic Y-axis.
 *    X defaults to batch/time."
 *
 * Mapping:
 *   - preset.metric === 'recoveryRate' → Y = PENETRATION_RATE_POSSIBLE_AND_CONFIRMED
 *     (closest always-numeric rate column in the registry — no literal
 *     `RECOVERY_RATE` column ships in COLUMN_CONFIGS, so the mapping resolves
 *     to the rate-family column that represents running recovery performance.
 *     Downstream users can adjust Y freely; the seed is "sensible default",
 *     not a one-to-one preset field).
 *   - preset.metric === 'amount' → Y = TOTAL_COLLECTED_LIFE_TIME (cumulative
 *     collected amount — currency, numeric, matches the preset's $-tier).
 *
 * X defaults by chart type:
 *   - 'line'    → BATCH_AGE_IN_MONTHS (the ordinal time axis the preset uses today).
 *   - 'bar'     → BATCH (categorical — one bar per batch).
 *   - 'scatter' → null (two-numeric has no sensible default; user picks).
 *
 * Preset-only fields (hiddenBatches, showAverage, showAllBatches) are
 * discarded on exit — 36-CONTEXT.md:33 lock.
 */
export function seedGenericFromPreset(
  preset: CollectionCurveDefinition,
  nextType: GenericType,
): ChartDefinition {
  const yColumn =
    preset.metric === 'amount'
      ? 'TOTAL_COLLECTED_LIFE_TIME'
      : 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED';

  let x: { column: string } | null;
  switch (nextType) {
    case 'line':
      x = { column: 'BATCH_AGE_IN_MONTHS' };
      break;
    case 'bar':
      x = { column: 'BATCH' };
      break;
    case 'scatter':
      x = null;
      break;
  }

  // Phase 36.x — all three generic variants seed `series: { column: 'BATCH' }`:
  //   - line + bar: splits rows into color-coded groups (one line/bar cluster
  //     per batch when data has multiple rows per X; mostly decorative with
  //     this dataset's one-row-per-batch shape but still useful when X is a
  //     non-batch dimension).
  //   - scatter: colors and labels each point by batch value. Distinct
  //     semantic from line/bar grouping — the toolbar labels the picker
  //     "Color" (not "Series") on scatter to match.
  return {
    type: nextType,
    version: 1,
    x,
    y: { column: yColumn },
    series: { column: 'BATCH' },
  } as ChartDefinition;
}

/**
 * Carry the current ChartDefinition to `nextType`, preserving compatible
 * axis references and honoring the CONTEXT preset-reset + preset-seed rules.
 *
 * Rules (verbatim from 36-RESEARCH §Pattern 5):
 *   1. Same-type no-op: reference-equal return.
 *   2. next === 'collection-curve': reset to DEFAULT_COLLECTION_CURVE (the
 *      canonical preset reference).
 *   3. current === 'collection-curve' AND next is generic: delegate to
 *      seedGenericFromPreset (CONTEXT-locked preset→generic conversion).
 *   4. Generic → generic: carry x/y refs ONLY when still eligible under the
 *      next chart type (`isColumnEligible`). Otherwise clear to null. Always
 *      return a fresh object (not a mutation of `current`).
 */
export function switchChartType(
  current: ChartDefinition,
  nextType: ChartDefinition['type'],
): ChartDefinition {
  // Rule 1 — same-type no-op (reference equality per RESEARCH §Pattern 5).
  if (current.type === nextType) return current;

  // Rule 2 — any → 'collection-curve' resets to the canonical preset.
  if (nextType === 'collection-curve') {
    return DEFAULT_COLLECTION_CURVE;
  }

  // Rule 3 — collection-curve → generic uses the CONTEXT-locked seed.
  if (current.type === 'collection-curve') {
    return seedGenericFromPreset(current, nextType);
  }

  // Rule 4 — generic → generic carryover via registry-derived eligibility.
  const generic = current as GenericChartDefinition;
  const nextX =
    generic.x && isColumnEligible(nextType, 'x', generic.x.column)
      ? { column: generic.x.column }
      : null;
  const nextY =
    generic.y && isColumnEligible(nextType, 'y', generic.y.column)
      ? { column: generic.y.column }
      : null;

  // Phase 36.x — series carries between all three generic variants.
  // Eligibility is chart-type invariant (any categorical column). On scatter
  // the field drives point coloring + labeling instead of group splitting,
  // but the stored value has the same shape.
  const currentSeries =
    'series' in generic && generic.series ? generic.series : null;
  const nextSeries =
    currentSeries &&
    isColumnEligible(nextType, 'series', currentSeries.column)
      ? { column: currentSeries.column }
      : null;

  return {
    type: nextType,
    version: 1,
    x: nextX,
    y: nextY,
    series: nextSeries,
  } as ChartDefinition;
}
