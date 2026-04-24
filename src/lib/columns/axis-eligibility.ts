/**
 * Phase 36 — single source of truth for X/Y axis dropdowns in the chart builder.
 *
 * `getEligibleColumns` + `isColumnEligible` filter `COLUMN_CONFIGS` through
 * both a structural type rule AND an explicit headline-metrics allowlist, so
 * the raw registry (61 columns, many of which are narrow series or balance-
 * band slices) doesn't flood the axis dropdowns. Phase 36.x curation:
 *   - Y & scatter-X: CHART_HEADLINE_METRICS allowlist (~15 entries).
 *   - line X:        CHART_LINE_X_OPTIONS allowlist (BATCH_AGE_IN_MONTHS + BATCH).
 *   - bar X:         all categorical columns (text-type, 4 entries total).
 *
 * Adding a new column to `./config.ts` does NOT auto-appear in chart axis
 * dropdowns — explicit opt-in via the allowlists below. This is a deliberate
 * UX polish step; the "tables" and "presets" surfaces still iterate the raw
 * registry.
 */

import { COLUMN_CONFIGS, type ColumnConfig } from './config.ts';
import { isNumericType } from '../formatting/numbers.ts';

export type ChartTypeForAxis = 'line' | 'scatter' | 'bar';
/**
 * Phase 36.x — `series` is a third axis role used by line + bar charts to
 * group rows into color-coded series (one line per batch, one bar cluster
 * per batch, etc.). Eligibility is invariant across chart type: any text
 * (categorical) column. Scatter does not support series in v1.
 */
export type AxisRole = 'x' | 'y' | 'series';

/**
 * Headline metrics — the curated set of numeric columns worth plotting on a
 * generic chart axis. Used for every chart type's Y axis AND scatter's X axis.
 *
 * Excludes:
 *   - COLLECTION_AFTER_N_MONTH (20 columns — the collection-curve preset's
 *     wide-format domain; belongs on the preset, not a generic Y).
 *   - Balance-band slices (16 columns — `Accts $0-500`, `Placed $2K-5K`, ...;
 *     useful as table columns or filter dimensions, noisy as axis metrics).
 *   - PENETRATED_ACCOUNTS_* raw counts (duplicated by PENETRATION_RATE_* %).
 *   - BATCH_AGE_IN_MONTHS (numeric but semantically an X axis, not a metric).
 */
export const CHART_HEADLINE_METRICS: ReadonlySet<string> = new Set([
  // Financial scale
  'TOTAL_AMOUNT_PLACED',
  'AVG_AMOUNT_PLACED',
  'MEDIAN_AMOUNT_PLACED',
  'TOTAL_COLLECTED_LIFE_TIME',
  // Account volume
  'TOTAL_ACCOUNTS',
  'RESOLVED_ACCOUNTS',
  'TOTAL_ACCOUNTS_WITH_PAYMENT',
  'TOTAL_ACCOUNTS_WITH_PLANS',
  'TOTAL_CONVERTED_ACCOUNTS',
  // Performance rates
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  'PENETRATION_RATE_CONFIRMED_ONLY',
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
  // Portfolio quality
  'AVG_EXPERIAN_CA_SCORE',
  'AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT',
  // Digital channel
  'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
  'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
  'OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED',
]);

/**
 * Time/ordinal X-axis options for line charts. Line charts want a sequential
 * X axis — either temporal (batch age over months) or ordinal (batch cohort
 * name). Other numeric columns as X produce confusing non-monotonic lines.
 */
export const CHART_LINE_X_OPTIONS: ReadonlySet<string> = new Set([
  'BATCH_AGE_IN_MONTHS',
  'BATCH',
]);

function isCategorical(c: ColumnConfig): boolean {
  return c.type === 'text';
}

/**
 * Return the subset of COLUMN_CONFIGS eligible for `axis` on `chartType`.
 * Order preserved from COLUMN_CONFIGS so UI dropdowns render in registry order.
 */
export function getEligibleColumns(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
): ColumnConfig[] {
  if (axis === 'y') {
    return COLUMN_CONFIGS.filter(
      (c) => isNumericType(c.type) && CHART_HEADLINE_METRICS.has(c.key),
    );
  }

  if (axis === 'series') {
    // Invariant across chart type — any categorical column can group series.
    // Scatter doesn't use series in v1; callers gate on chartType upstream.
    return COLUMN_CONFIGS.filter(isCategorical);
  }

  // axis === 'x'
  switch (chartType) {
    case 'line':
      return COLUMN_CONFIGS.filter((c) => CHART_LINE_X_OPTIONS.has(c.key));
    case 'scatter':
      return COLUMN_CONFIGS.filter(
        (c) => isNumericType(c.type) && CHART_HEADLINE_METRICS.has(c.key),
      );
    case 'bar':
      return COLUMN_CONFIGS.filter(isCategorical);
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
