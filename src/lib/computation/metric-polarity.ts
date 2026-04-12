/**
 * Metric polarity map for context-aware trend coloring.
 *
 * Defines whether "up" is good or bad for each trended metric.
 * Used by TrendIndicator to determine arrow color:
 * - higher_is_better + up = green (good), down = red (bad)
 * - lower_is_better + up = red (bad), down = green (good)
 */

export type MetricPolarity = 'higher_is_better' | 'lower_is_better';

export const METRIC_POLARITY: Record<string, MetricPolarity> = {
  PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: 'higher_is_better',
  RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: 'higher_is_better',
  TOTAL_COLLECTED_LIFE_TIME: 'higher_is_better',
  COLLECTION_AFTER_6_MONTH: 'higher_is_better',
  COLLECTION_AFTER_12_MONTH: 'higher_is_better',
};

/** Look up polarity for a metric. Defaults to higher_is_better for unknown metrics. */
export function getPolarity(metric: string): MetricPolarity {
  return METRIC_POLARITY[metric] ?? 'higher_is_better';
}
