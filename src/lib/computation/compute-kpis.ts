import type { KpiAggregates } from '@/types/partner-stats';

/** Cascade-tier keys the KPI strip selects from (Phase 38 KPI-01). */
export type CascadeRateKey =
  | 'rate3mo'
  | 'rate6mo'
  | 'rate12mo'
  | 'rateSinceInception';

/**
 * Legacy-days → months age coercion.
 *
 * Snowflake live rows return batch age in actual months (e.g. 7, 33). Static
 * cache rows may carry the pre-coercion days value (>365). Mirrors the rule
 * in `reshape-curves.ts:23` so cascade selection is correct regardless of
 * data source.
 *
 * TODO(Phase 38 Plan 05): extract a shared age-coercion helper and consume
 * it from both this file and `reshape-curves.ts`.
 */
function coerceAgeMonths(raw: unknown): number {
  const n = Number(raw) || 0;
  return n > 365 ? Math.floor(n / 30) : n;
}

/**
 * Graduated KPI-card cascade selector (Phase 38 KPI-01).
 *
 * Rules (per v4.1-REQUIREMENTS.md):
 *   - maxBatchAgeMonths < 3      → ['rateSinceInception']
 *   - 3 ≤ maxBatchAgeMonths < 6  → ['rate3mo', 'rateSinceInception']
 *   - 6 ≤ maxBatchAgeMonths < 12 → ['rate3mo', 'rate6mo']
 *   - maxBatchAgeMonths ≥ 12     → ['rate6mo', 'rate12mo']
 */
export function selectCascadeTier(
  maxBatchAgeMonths: number,
): CascadeRateKey[] {
  if (maxBatchAgeMonths < 3) return ['rateSinceInception'];
  if (maxBatchAgeMonths < 6) return ['rate3mo', 'rateSinceInception'];
  if (maxBatchAgeMonths < 12) return ['rate3mo', 'rate6mo'];
  return ['rate6mo', 'rate12mo'];
}

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
  let sumCollection3 = 0;
  let placed3mo = 0;
  let sumCollection6 = 0;
  let sumCollection12 = 0;
  let maxBatchAgeMonths = 0;

  // For weighted penetration rate
  let weightedPenSum = 0;
  let weightDenominator = 0;

  for (const row of rows) {
    const accounts = Number(row.TOTAL_ACCOUNTS) || 0;
    const placed = Number(row.TOTAL_AMOUNT_PLACED) || 0;
    const collected = Number(row.TOTAL_COLLECTED_LIFE_TIME) || 0;
    const pen = Number(row.PENETRATION_RATE_POSSIBLE_AND_CONFIRMED) || 0;
    const col3 = Number(row.COLLECTION_AFTER_3_MONTH) || 0;
    const col6 = Number(row.COLLECTION_AFTER_6_MONTH) || 0;
    const col12 = Number(row.COLLECTION_AFTER_12_MONTH) || 0;
    const ageMonths = coerceAgeMonths(row.BATCH_AGE_IN_MONTHS);

    totalAccounts += accounts;
    totalPlaced += placed;
    totalCollected += collected;
    sumCollection6 += col6;
    sumCollection12 += col12;

    // 3-month horizon: only include batches that have reached the horizon.
    // Placed denominator must match numerator eligibility so the rate is
    // comparable to the 6mo/12mo definitions.
    if (ageMonths >= 3) {
      sumCollection3 += col3;
      placed3mo += placed;
    }

    if (ageMonths > maxBatchAgeMonths) {
      maxBatchAgeMonths = ageMonths;
    }

    // Weighted penetration: weight by account count
    weightedPenSum += pen * accounts;
    weightDenominator += accounts;
  }

  // Weighted average penetration rate (not simple average)
  const weightedPenetrationRate =
    weightDenominator > 0 ? weightedPenSum / weightDenominator : 0;

  // Collection rates as ratio of total placed (0-1 range, formatter handles * 100)
  const collectionRate3mo =
    placed3mo > 0 ? sumCollection3 / placed3mo : 0;
  const collectionRate6mo =
    totalPlaced > 0 ? sumCollection6 / totalPlaced : 0;
  const collectionRate12mo =
    totalPlaced > 0 ? sumCollection12 / totalPlaced : 0;
  // Lifetime collected rate (age-agnostic) — shown for young cohorts per KPI-01.
  const collectionRateSinceInception =
    totalPlaced > 0 ? totalCollected / totalPlaced : 0;

  return {
    totalBatches,
    totalAccounts,
    weightedPenetrationRate,
    maxBatchAgeMonths,
    collectionRate3mo,
    collectionRate6mo,
    collectionRate12mo,
    collectionRateSinceInception,
    totalCollected,
    totalPlaced,
  };
}
