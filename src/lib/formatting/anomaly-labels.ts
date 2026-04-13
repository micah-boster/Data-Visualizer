/**
 * Anomaly display utilities: metric labels, severity classification,
 * and expected-range formatting.
 *
 * Single source of truth for how anomaly data is presented in the UI.
 */

import type { MetricAnomaly } from '@/types/partner-stats';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { getFormatter } from '@/lib/formatting/numbers';

/**
 * Human-readable metric labels for anomaly display.
 * Keys match ANOMALY_METRICS from compute-anomalies.ts.
 */
const METRIC_LABELS: Record<string, string> = {
  PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: 'Penetration Rate',
  RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: 'First-Time Conversion Rate',
  TOTAL_COLLECTED_LIFE_TIME: 'Total Collected (Lifetime)',
  COLLECTION_AFTER_6_MONTH: '6-Month Collection',
  COLLECTION_AFTER_12_MONTH: '12-Month Collection',
  TOTAL_ACCOUNTS_WITH_PAYMENT: 'Accounts with Payment',
  TOTAL_ACCOUNTS_WITH_PLANS: 'Accounts with Plans',
  AVG_AMOUNT_PLACED: 'Avg Amount Placed',
  AVG_EXPERIAN_CA_SCORE: 'Avg Credit Score',
  OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED: 'SMS Open Rate',
  OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED: 'Email Open Rate',
};

/**
 * Look up the human-readable label for a metric key.
 * Falls back to title-casing the key with underscores replaced.
 */
export function getMetricLabel(metric: string): string {
  if (METRIC_LABELS[metric]) return METRIC_LABELS[metric];
  return metric
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Classify anomaly severity into two discrete levels.
 *
 * - critical: 4+ flagged metrics (many things are off)
 * - warning: 2-3 flagged metrics (a couple things off)
 */
export function classifySeverity(anomaly: {
  flags: MetricAnomaly[];
  severityScore: number;
}): 'warning' | 'critical' {
  return anomaly.flags.length >= 4 ? 'critical' : 'warning';
}

/** CSS color classes for each severity level. */
export const SEVERITY_COLORS = {
  warning: 'text-amber-500',
  critical: 'text-red-500',
} as const;

/** Background color classes for badge dots. */
export const SEVERITY_BG_COLORS = {
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
} as const;

/** Label text for each severity level. */
export const SEVERITY_LABELS = {
  warning: 'Warning',
  critical: 'Critical',
} as const;

/**
 * Format the expected range for a metric using its norm (mean +/- 2 SD).
 * Uses the column type from COLUMN_CONFIGS for consistent formatting.
 */
export function formatExpectedRange(
  mean: number,
  stddev: number,
  metric: string,
): string {
  const low = mean - 2 * stddev;
  const high = mean + 2 * stddev;

  // Look up column type for proper formatting
  const config = COLUMN_CONFIGS.find((c) => c.key === metric);
  const formatter = getFormatter(config?.type ?? 'number');

  return `${formatter(Math.max(low, 0))} \u2013 ${formatter(high)}`;
}

/**
 * Format a deviation magnitude string, e.g. "2.4 SD below mean".
 */
export function formatDeviation(zScore: number, direction: 'above' | 'below'): string {
  return `${Math.abs(zScore).toFixed(1)} SD ${direction} mean`;
}
