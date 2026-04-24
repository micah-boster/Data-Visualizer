/**
 * Phase 37 — chart inference heuristic.
 *
 * Given the parser's matched columns + unsupportedConstructs, propose a
 * ChartDefinition the Plan 02 preview can surface and the Plan 03 apply
 * wiring can embed into `ViewSnapshot.chartState`.
 *
 * Rules (37-CONTEXT "Claude's Discretion" — defensive + simple):
 *   0. Fewer than 2 matched columns → no inference.
 *   1. unsupportedConstructs has `groupby` + at least one text + one number →
 *      bar (X=first text, Y=first number).
 *   2. At least one date column → line (X=first date, Y=first numeric or null).
 *   3. Two or more numeric columns → scatter (X=first, Y=second).
 *   4. Otherwise → null.
 *
 * After proposing axes, every pick is gated through `isColumnEligible` so
 * we never emit an axis the Phase 36 builder would reject (Pitfall 8).
 * Final candidate is round-tripped through `migrateChartState` as the
 * schema-validity gate; on failure the inference falls back to
 * `{ chartType: null, x: null, y: null }` with a `skipped` reason.
 */

import { COLUMN_CONFIGS, type ColumnConfig } from '../columns/config.ts';
import { isColumnEligible } from '../columns/axis-eligibility.ts';
import { isNumericType } from '../formatting/numbers.ts';
import { migrateChartState } from '../views/migrate-chart.ts';
import type {
  ChartInferenceResult,
  MatchedColumn,
  UnsupportedConstruct,
} from './types.ts';

const configByKey = new Map(COLUMN_CONFIGS.map((c) => [c.key, c]));

function columnFor(key: string): ColumnConfig | undefined {
  return configByKey.get(key);
}

function firstOfType(
  matched: MatchedColumn[],
  predicate: (c: ColumnConfig) => boolean,
): string | null {
  for (const m of matched) {
    const cfg = columnFor(m.key);
    if (cfg && predicate(cfg)) return m.key;
  }
  return null;
}

function secondOfType(
  matched: MatchedColumn[],
  predicate: (c: ColumnConfig) => boolean,
): string | null {
  let seen = 0;
  for (const m of matched) {
    const cfg = columnFor(m.key);
    if (cfg && predicate(cfg)) {
      seen += 1;
      if (seen === 2) return m.key;
    }
  }
  return null;
}

const isText = (c: ColumnConfig): boolean => c.type === 'text';
const isDate = (c: ColumnConfig): boolean => c.type === 'date';
const isNumber = (c: ColumnConfig): boolean => isNumericType(c.type);

/** Null-result helper with a one-line reason. */
function empty(reason: string): ChartInferenceResult {
  return {
    chartType: null,
    x: null,
    y: null,
    skipped: [{ raw: 'chart-inference', reason }],
  };
}

export function inferChart(
  matched: MatchedColumn[],
  unsupportedConstructs: UnsupportedConstruct[],
): ChartInferenceResult {
  if (matched.length < 2) {
    return empty('need at least 2 columns to infer a chart');
  }

  const hasGroupBy = unsupportedConstructs.some((c) => c.kind === 'groupby');

  let chartType: 'line' | 'scatter' | 'bar' | null = null;
  let x: string | null = null;
  let y: string | null = null;

  if (hasGroupBy && firstOfType(matched, isText) && firstOfType(matched, isNumber)) {
    chartType = 'bar';
    x = firstOfType(matched, isText);
    y = firstOfType(matched, isNumber);
  } else if (firstOfType(matched, isDate) && firstOfType(matched, isNumber)) {
    chartType = 'line';
    x = firstOfType(matched, isDate);
    y = firstOfType(matched, isNumber);
  } else if (secondOfType(matched, isNumber)) {
    chartType = 'scatter';
    x = firstOfType(matched, isNumber);
    y = secondOfType(matched, isNumber);
  } else {
    return empty('no suitable chart type could be inferred');
  }

  // Axis-eligibility gate (Pitfall 8) — null any axis that violates the
  // Phase 36 rules but keep the chart type so the user can pick in-builder.
  if (x !== null && !isColumnEligible(chartType, 'x', x)) x = null;
  if (y !== null && !isColumnEligible(chartType, 'y', y)) y = null;

  // Final schema-validity round-trip — if migrateChartState can't make a
  // valid ChartDefinition from our proposal, fail closed.
  const candidate = {
    type: chartType,
    version: 1 as const,
    x: x ? { column: x } : null,
    y: y ? { column: y } : null,
  };
  const validated = migrateChartState(candidate);
  if (!validated) {
    return empty('inferred chart failed schema validation');
  }

  return { chartType, x, y, skipped: [] };
}

/**
 * Phase 38 MBI-01 — human-readable rationale for the Preview's chart-type
 * override control. Maps the result of `inferChart` into a one-line hint
 * displayed beside the segmented control.
 *
 * Three inference rules map to three default reasons; a more specific
 * skipped[0].reason wins when the inference fell through.
 */
export function inferenceReason(result: {
  inferredChart: ChartInferenceResult;
}): string {
  const inferred = result.inferredChart;
  if (!inferred) return 'No chart inferred — pick one to override.';

  switch (inferred.chartType) {
    case 'bar':
      return 'Inferred from GROUP BY + aggregate.';
    case 'line':
      return 'Inferred from date X-axis + numeric Y.';
    case 'scatter':
      return 'Inferred from two numeric columns.';
    case null: {
      // Surface the more specific upstream reason when present.
      const first = inferred.skipped?.[0]?.reason;
      return first
        ? `No chart inferred — ${first}.`
        : 'No chart inferred — pick one to override.';
    }
  }
}
