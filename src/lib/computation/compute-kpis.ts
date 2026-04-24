import type { KpiAggregates } from '@/types/partner-stats';

/**
 * Compute aggregate KPI metrics across all partner rows.
 *
 * All row values are strings from Snowflake -- Number() conversion on every read.
 */
export function computeKpis(
  rows: Record<string, unknown>[],
): KpiAggregates {
  const totalBatches = rows.length;

  let totalAccounts = 0;
  let totalPlaced = 0;
  let totalCollected = 0;
  let sumCollection6 = 0;
  let sumCollection12 = 0;

  // For weighted penetration rate
  let weightedPenSum = 0;
  let weightDenominator = 0;

  for (const row of rows) {
    const accounts = Number(row.TOTAL_ACCOUNTS) || 0;
    const placed = Number(row.TOTAL_AMOUNT_PLACED) || 0;
    const collected = Number(row.TOTAL_COLLECTED_LIFE_TIME) || 0;
    const pen = Number(row.PENETRATION_RATE_POSSIBLE_AND_CONFIRMED) || 0;
    const col6 = Number(row.COLLECTION_AFTER_6_MONTH) || 0;
    const col12 = Number(row.COLLECTION_AFTER_12_MONTH) || 0;

    totalAccounts += accounts;
    totalPlaced += placed;
    totalCollected += collected;
    sumCollection6 += col6;
    sumCollection12 += col12;

    // Weighted penetration: weight by account count
    weightedPenSum += pen * accounts;
    weightDenominator += accounts;
  }

  // Weighted average penetration rate (not simple average)
  const weightedPenetrationRate =
    weightDenominator > 0 ? weightedPenSum / weightDenominator : 0;

  // Collection rates as ratio of total placed (0-1 range, formatter handles * 100)
  const collectionRate6mo =
    totalPlaced > 0 ? sumCollection6 / totalPlaced : 0;
  const collectionRate12mo =
    totalPlaced > 0 ? sumCollection12 / totalPlaced : 0;

  return {
    totalBatches,
    totalAccounts,
    weightedPenetrationRate,
    collectionRate6mo,
    collectionRate12mo,
    totalCollected,
    totalPlaced,
  };
}
