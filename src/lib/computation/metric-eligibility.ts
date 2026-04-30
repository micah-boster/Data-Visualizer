/**
 * DCR-07 — young-batch censoring fix.
 *
 * ADR: .planning/adr/008-young-batch-censoring.md
 *
 * A batch is eligible for evaluation against a metric only when its age
 * has reached the metric's lookback horizon. A 4-month-old batch's
 * `COLLECTION_AFTER_12_MONTH` is structurally near-zero — not because
 * the batch is anomalous, but because there has been no time for late-stage
 * collection to populate. Comparing it against a norm computed from
 * 24-month-old batches' fully-populated 12mo metrics produces systematic
 * false-positive flags.
 *
 * Architecture (CONTEXT lock): metric-age-eligibility filter, NOT
 * per-age-bucket norms. Per-bucket norms would introduce a new dimension
 * to anomaly logic with small-cohort statistical risk; the eligibility
 * filter matches how a human reads the metric ("12-month collection on
 * a 4-month batch is meaningless to compare").
 *
 * Rule (CONTEXT lock): strict — `batchAgeMonths >= metricHorizonMonths`.
 * No safety margin.
 *
 * UI behavior (CONTEXT lock): an ineligible metric on a young batch is
 * suppressed (em-dash) with a tooltip explaining the batch isn't old
 * enough yet. NO anomaly badge. Mirrors the Wave-0 KPI suppression
 * pattern for `MIN_PLACED_DENOMINATOR_DOLLARS`.
 */

const METRIC_HORIZON_MONTHS: Record<string, number> = {
  COLLECTION_AFTER_3_MONTH: 3,
  COLLECTION_AFTER_6_MONTH: 6,
  COLLECTION_AFTER_12_MONTH: 12,
  // PENETRATION_RATE_POSSIBLE_AND_CONFIRMED, RECOVERY_RATE_*, etc — no
  // lookback horizon required (always evaluable). Default to 0.
};

import type { BatchAgeMonths } from '@/lib/data/types';

/** Months a batch must have aged before this metric is comparable. */
export function metricHorizonMonths(metric: string): number {
  return METRIC_HORIZON_MONTHS[metric] ?? 0;
}

/**
 * Strict eligibility — `batchAgeMonths >= metricHorizonMonths(metric)`.
 * Returns false when batchAgeMonths is NaN or negative.
 *
 * Phase 43 BND-02: accepts the branded `BatchAgeMonths` type so callers
 * cannot accidentally pass an un-branded number (would surface a TS error
 * if they tried). Plain `number` continues to flow through at runtime;
 * the brand is type-level only. Construct via `asBatchAgeMonths` in
 * `@/lib/data/types`.
 */
export function isMetricEligible(
  batchAgeMonths: BatchAgeMonths,
  metric: string,
): boolean {
  if (!Number.isFinite(batchAgeMonths) || batchAgeMonths < 0) return false;
  return batchAgeMonths >= metricHorizonMonths(metric);
}
