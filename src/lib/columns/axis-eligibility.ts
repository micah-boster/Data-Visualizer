/**
 * Phase 36 — single source of truth for X/Y axis dropdowns in the chart builder.
 *
 * Both `getEligibleColumns` and `isColumnEligible` derive their output purely
 * from `COLUMN_CONFIGS` + `isNumericType` — NEVER a hand-maintained list.
 * Adding a new column to `./config.ts` automatically propagates to every
 * builder toolbar, preset catalog, and GenericChart axis picker without a
 * second edit here (36-CONTEXT lock; 36-RESEARCH Anti-Patterns).
 *
 * Classification rules (verbatim from 36-RESEARCH §Pattern 2):
 *   - Y axis (any chart type): numeric columns only.
 *   - X axis by chart type:
 *       line    — time OR numeric OR identity-categorical
 *       scatter — numeric only
 *       bar     — categorical only
 *
 * `isOrdinal` is included even though the v1 rules don't consume it so Plan 03
 * can reuse the helper without expanding this file.
 */

import { COLUMN_CONFIGS, type ColumnConfig } from './config.ts';
import { isNumericType } from '../formatting/numbers.ts';

export type ChartTypeForAxis = 'line' | 'scatter' | 'bar';
export type AxisRole = 'x' | 'y';

function isCategorical(c: ColumnConfig): boolean {
  return c.type === 'text';
}

function isTime(c: ColumnConfig): boolean {
  return c.type === 'date';
}

// Kept available for Plan 03 reuse (ordinal = numeric-but-discrete axis slot).
// Intentionally unused in v1 rules — do not remove without a cross-plan search.
function isOrdinal(c: ColumnConfig): boolean {
  return c.type === 'count' || c.type === 'number';
}
void isOrdinal;

/**
 * Return the subset of COLUMN_CONFIGS eligible for `axis` on `chartType`.
 * Order preserved from COLUMN_CONFIGS so UI dropdowns render in registry order.
 */
export function getEligibleColumns(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
): ColumnConfig[] {
  if (axis === 'y') {
    return COLUMN_CONFIGS.filter((c) => isNumericType(c.type));
  }

  // axis === 'x'
  switch (chartType) {
    case 'line':
      return COLUMN_CONFIGS.filter(
        (c) =>
          isTime(c) ||
          isNumericType(c.type) ||
          (isCategorical(c) && c.identity),
      );
    case 'scatter':
      return COLUMN_CONFIGS.filter((c) => isNumericType(c.type));
    case 'bar':
      return COLUMN_CONFIGS.filter((c) => isCategorical(c));
  }
}

/**
 * True iff `columnKey` names an eligible column for `axis` on `chartType`.
 * Returns false for null / undefined / unknown-registry keys — callers can
 * pass raw saved-view values without defensive pre-checks.
 */
export function isColumnEligible(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
  columnKey: string | null | undefined,
): boolean {
  if (columnKey === null || columnKey === undefined) return false;
  const eligible = getEligibleColumns(chartType, axis);
  return eligible.some((c) => c.key === columnKey);
}
