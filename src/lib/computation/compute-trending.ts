import type { BatchTrend, TrendingData } from '@/types/partner-stats';

/** Metrics to compute trending for. */
const TRENDING_METRICS = [
  'PENETRATION_RATE',
  'CONVERSION_RATE',
  'TOTAL_COLLECTED',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
];

/** 5% threshold for determining trend direction. */
const THRESHOLD = 0.05;

/**
 * Compute batch-over-batch trending for the latest batch.
 *
 * Compares each metric's current value to the rolling average of
 * the previous 2-6 batches. Returns up/down/flat based on a 5% threshold.
 */
export function computeTrending(
  rows: Record<string, unknown>[],
): TrendingData {
  // Need at least 3 batches to compute meaningful trends
  if (rows.length < 3) {
    return { trends: [], insufficientHistory: true };
  }

  // Sort by BATCH name (string sort is fine -- batch names contain dates like MAR_26)
  const sorted = [...rows].sort((a, b) =>
    String(a.BATCH ?? '').localeCompare(String(b.BATCH ?? '')),
  );

  const latestRow = sorted[sorted.length - 1];
  const latestBatch = String(latestRow.BATCH ?? '');

  // Use up to 6 prior batches for rolling average (minimum 2)
  const priorRows = sorted.slice(
    Math.max(0, sorted.length - 7),
    sorted.length - 1,
  );

  if (priorRows.length < 2) {
    return { trends: [], insufficientHistory: true };
  }

  const trends: BatchTrend[] = [];

  for (const metric of TRENDING_METRICS) {
    const value = Number(latestRow[metric]) || 0;

    // Compute rolling average from prior batches
    const priorValues = priorRows
      .map((r) => Number(r[metric]) || 0)
      .filter((v) => !Number.isNaN(v));

    if (priorValues.length === 0) continue;

    const rollingAvg =
      priorValues.reduce((a, b) => a + b, 0) / priorValues.length;

    // Determine direction using 5% threshold
    let direction: 'up' | 'down' | 'flat';
    if (rollingAvg === 0) {
      direction = value > 0 ? 'up' : 'flat';
    } else if (value > rollingAvg * (1 + THRESHOLD)) {
      direction = 'up';
    } else if (value < rollingAvg * (1 - THRESHOLD)) {
      direction = 'down';
    } else {
      direction = 'flat';
    }

    trends.push({ batchName: latestBatch, metric, value, rollingAvg, direction });
  }

  return { trends, insufficientHistory: false };
}
