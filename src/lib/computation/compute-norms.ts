import type { MetricNorm } from '@/types/partner-stats';
import { COLLECTION_MONTHS } from './reshape-curves';

/** Metric columns to compute norms for. */
const BASE_METRICS = [
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
  'TOTAL_COLLECTED_LIFE_TIME',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
];

/** All collection month columns. */
const COLLECTION_METRICS = COLLECTION_MONTHS.map(
  (m) => `COLLECTION_AFTER_${m}_MONTH`,
);

/** Deduplicated set of all norm-eligible metrics. */
const ALL_METRICS = [
  ...new Set([...BASE_METRICS, ...COLLECTION_METRICS]),
];

/**
 * Compute mean and population standard deviation for each metric column.
 *
 * Uses population stddev (divide by n, not n-1) because these are all
 * the partner's batches, not a sample from a larger population.
 */
export function computeNorms(
  rows: Record<string, unknown>[],
): Record<string, MetricNorm> {
  const result: Record<string, MetricNorm> = {};

  for (const metric of ALL_METRICS) {
    // Extract valid numeric values, filtering out NaN/null
    const values: number[] = [];
    for (const row of rows) {
      const raw = row[metric];
      if (raw == null) continue;
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        values.push(num);
      }
    }

    const count = values.length;
    if (count === 0) {
      result[metric] = { mean: 0, stddev: 0, count: 0 };
      continue;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    // Population stddev: sqrt(sum((x - mean)^2) / n)
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
    const stddev = Math.sqrt(variance);

    result[metric] = { mean, stddev, count };
  }

  return result;
}
