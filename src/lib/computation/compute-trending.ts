import type { BatchTrend, TrendingData } from '@/types/partner-stats';

/** Metrics to compute trending for. */
export const TRENDING_METRICS = [
  'PENETRATION_RATE',
  'CONVERSION_RATE',
  'TOTAL_COLLECTED',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
] as const;

/** 5% relative threshold for determining trend direction. */
const THRESHOLD = 0.05;

/**
 * Compute batch-over-batch trending for the latest batch.
 *
 * Compares each metric's current value to the rolling average of
 * the previous 2-4 batches (fixed 4-batch window, uses fewer if
 * partner has < 5 total batches). Returns up/down/flat based on
 * a 5% relative threshold.
 */
export function computeTrending(
  rows: Record<string, unknown>[],
): TrendingData {
  // Need at least 3 batches to compute meaningful trends (2 baseline + 1 current)
  if (rows.length < 3) {
    return { trends: [], insufficientHistory: true, batchCount: rows.length };
  }

  // Sort by BATCH name (string sort is fine -- batch names contain dates like MAR_26)
  const sorted = [...rows].sort((a, b) =>
    String(a.BATCH ?? '').localeCompare(String(b.BATCH ?? '')),
  );

  const latestRow = sorted[sorted.length - 1];
  const latestBatch = String(latestRow.BATCH ?? '');

  // Use up to 4 prior batches for rolling average (minimum 2)
  const priorRows = sorted.slice(
    Math.max(0, sorted.length - 5),
    sorted.length - 1,
  );

  if (priorRows.length < 2) {
    return { trends: [], insufficientHistory: true, batchCount: rows.length };
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

    // Determine direction using 5% relative threshold
    let direction: 'up' | 'down' | 'flat';
    let deltaPercent: number;

    if (rollingAvg === 0) {
      direction = value > 0 ? 'up' : 'flat';
      deltaPercent = value > 0 ? 100 : 0;
    } else {
      deltaPercent = ((value - rollingAvg) / rollingAvg) * 100;

      if (value > rollingAvg * (1 + THRESHOLD)) {
        direction = 'up';
      } else if (value < rollingAvg * (1 - THRESHOLD)) {
        direction = 'down';
      } else {
        direction = 'flat';
      }
    }

    trends.push({
      batchName: latestBatch,
      metric,
      value,
      rollingAvg,
      direction,
      deltaPercent,
      baselineCount: priorValues.length,
    });
  }

  return { trends, insufficientHistory: false, batchCount: rows.length };
}
