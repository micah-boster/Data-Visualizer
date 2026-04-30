import type {
  BatchTrend,
  SuppressDeltaFlags,
  TrendingData,
} from '@/types/partner-stats';
import type { BatchRow } from '@/lib/data/types';

/** Metrics to compute trending for. */
export const TRENDING_METRICS = [
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
  'TOTAL_COLLECTED_LIFE_TIME',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
] as const;

/** 5% relative threshold for determining trend direction. */
// ADR: .planning/adr/003-trending-pct.md
const THRESHOLD = 0.05;

/*
 * Phase 43 BND-02: the local `coerceAgeMonths` helper that previously
 * lived here was deleted. The branded `BatchRow.batchAgeMonths` from the
 * parser is now the single source of truth — see
 * `asBatchAgeMonths` in `@/lib/data/types`.
 */

/** Minimal shape `computeSuppression` needs from each batch. */
export interface SuppressionInput {
  ageInMonths: number;
}

/**
 * Per-horizon rolling-avg suppression (Phase 38 KPI-04).
 *
 * Rule per CONTEXT lock: rolling-avg delta for an Xmo rate card requires ≥3
 * PRIOR batches (all batches except the latest, sorted by age descending) that
 * have reached X months of age. `rateSinceInception` suppresses only when
 * there are zero prior batches.
 *
 * Pure function over a minimal `{ ageInMonths: number }` shape — decoupled
 * from Snowflake row keys so unit tests can synthesise inputs cheaply.
 */
export function computeSuppression(
  batches: SuppressionInput[],
): SuppressDeltaFlags {
  // Sort by age descending — latest (youngest) batch is the smallest age.
  // "Prior" per compute-trending.ts:40 precedent = all except the latest.
  const sorted = [...batches].sort((a, b) => b.ageInMonths - a.ageInMonths);
  // Latest batch = youngest age ⇒ last entry after descending sort.
  const priorBatches = sorted.slice(0, -1);

  const reached = (h: number) =>
    priorBatches.filter((b) => b.ageInMonths >= h).length;

  return {
    rate3mo: reached(3) < 3,
    rate6mo: reached(6) < 3,
    rate12mo: reached(12) < 3,
    rateSinceInception: priorBatches.length === 0,
  };
}

/**
 * Compute batch-over-batch trending for the latest batch.
 *
 * Compares each metric's current value to the rolling average of
 * the previous 2-4 batches (fixed 4-batch window, uses fewer if
 * partner has < 5 total batches). Returns up/down/flat based on
 * a 5% relative threshold.
 *
 * Phase 43 BND-02: accepts typed `BatchRow[]`. Age reads off the branded
 * `row.batchAgeMonths`; metric reads use `row.raw[metric]` because
 * TRENDING_METRICS keys are Snowflake column names not all promoted to
 * the typed surface.
 */
export function computeTrending(
  rows: BatchRow[],
): TrendingData {
  // Per-horizon suppression computed once from raw rows; reused on every
  // return path (including early-returns) so KpiSummaryCards can make
  // per-card decisions regardless of legacy insufficientHistory shortcuts.
  const suppressDelta = computeSuppression(
    rows.map((r) => ({ ageInMonths: r.batchAgeMonths })),
  );

  // Need at least 3 batches to compute meaningful trends (2 baseline + 1 current)
  if (rows.length < 3) {
    return {
      trends: [],
      insufficientHistory: true,
      suppressDelta,
      batchCount: rows.length,
    };
  }

  // Sort by BATCH name (string sort is fine -- batch names contain dates like MAR_26)
  const sorted = [...rows].sort((a, b) =>
    a.batchName.localeCompare(b.batchName),
  );

  const latestRow = sorted[sorted.length - 1];
  const latestBatch = latestRow.batchName;

  // Use up to 4 prior batches for rolling average (minimum 2)
  // ADR: .planning/adr/004-baseline-window.md
  const priorRows = sorted.slice(
    Math.max(0, sorted.length - 5),
    sorted.length - 1,
  );

  if (priorRows.length < 2) {
    return {
      trends: [],
      insufficientHistory: true,
      suppressDelta,
      batchCount: rows.length,
    };
  }

  const trends: BatchTrend[] = [];

  for (const metric of TRENDING_METRICS) {
    const value = Number(latestRow.raw[metric]) || 0;

    // Compute rolling average from prior batches
    const priorValues = priorRows
      .map((r) => Number(r.raw[metric]) || 0)
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

  return {
    trends,
    insufficientHistory: false,
    suppressDelta,
    batchCount: rows.length,
  };
}
