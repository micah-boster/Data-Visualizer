import type {
  MetricNorm,
  MetricAnomaly,
  AnomalyGroup,
  BatchAnomaly,
  PartnerAnomaly,
  AnomalyReport,
} from '@/types/partner-stats';
import { computeNorms } from './compute-norms';
import { getPolarity } from './metric-polarity';
import { getPartnerName, getBatchName, getStringField } from '@/lib/utils';
import {
  pairKey,
  displayNameForPair,
  type PartnerProductPair,
} from '@/lib/partner-config/pair';

/**
 * Curated metrics for anomaly detection.
 *
 * 5 performance metrics (from v2 trending) + 6 diagnostic metrics
 * that explain WHY performance may be off.
 */
export const ANOMALY_METRICS = [
  // Performance metrics
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
  'TOTAL_COLLECTED_LIFE_TIME',
  'COLLECTION_AFTER_6_MONTH',
  'COLLECTION_AFTER_12_MONTH',
  // Diagnostic metrics
  'TOTAL_ACCOUNTS_WITH_PAYMENT',
  'TOTAL_ACCOUNTS_WITH_PLANS',
  'AVG_AMOUNT_PLACED',
  'AVG_EXPERIAN_CA_SCORE',
  'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
  'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
] as const;

/** Correlated metric groups — multiple flags in the same group are presented as one anomaly. */
export const METRIC_GROUPS: Record<
  string,
  { label: string; metrics: string[] }
> = {
  funnel: {
    label: 'Funnel Degradation',
    metrics: [
      'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
      'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
      'TOTAL_ACCOUNTS_WITH_PLANS',
    ],
  },
  collection: {
    label: 'Collection Underperformance',
    metrics: [
      'TOTAL_COLLECTED_LIFE_TIME',
      'COLLECTION_AFTER_6_MONTH',
      'COLLECTION_AFTER_12_MONTH',
      'TOTAL_ACCOUNTS_WITH_PAYMENT',
    ],
  },
  portfolio_quality: {
    label: 'Portfolio Quality Shift',
    metrics: ['AVG_AMOUNT_PLACED', 'AVG_EXPERIAN_CA_SCORE'],
  },
  engagement: {
    label: 'Engagement Drop',
    metrics: [
      'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
      'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
    ],
  },
};

/** Z-score threshold: flag only when abs(z) exceeds this. */
const Z_THRESHOLD = 2;

/** Minimum flagged metrics per batch to mark it anomalous. */
const MIN_FLAGS = 2;

/**
 * Compute z-score anomaly flags for a single metric value.
 * Returns a MetricAnomaly if the metric deviates in the bad direction
 * beyond the threshold, or null if not flagged.
 */
function evaluateMetric(
  metric: string,
  value: unknown,
  norm: MetricNorm | undefined,
): MetricAnomaly | null {
  if (norm == null || norm.count < 2 || norm.stddev === 0) return null;

  if (value == null) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;

  const zScore = (num - norm.mean) / norm.stddev;
  const polarity = getPolarity(metric);

  // Flag only deviations in the "bad" direction
  const isBad =
    (polarity === 'higher_is_better' && zScore < -Z_THRESHOLD) ||
    (polarity === 'lower_is_better' && zScore > Z_THRESHOLD);

  if (!isBad) return null;

  return {
    metric,
    value: num,
    zScore,
    direction: num > norm.mean ? 'above' : 'below',
  };
}

/**
 * Group flagged metrics into correlated anomaly groups.
 * Flags not matching any predefined group go into an "other" group.
 */
function groupFlags(flags: MetricAnomaly[]): AnomalyGroup[] {
  if (flags.length === 0) return [];

  const groups: AnomalyGroup[] = [];
  const claimed = new Set<string>();

  for (const [groupKey, groupDef] of Object.entries(METRIC_GROUPS)) {
    const matching = flags.filter((f) => groupDef.metrics.includes(f.metric));
    if (matching.length === 0) continue;

    for (const f of matching) claimed.add(f.metric);

    const avgDeviation =
      matching.reduce((sum, f) => sum + Math.abs(f.zScore), 0) /
      matching.length;

    groups.push({
      groupKey,
      label: groupDef.label,
      flags: matching,
      avgDeviation,
    });
  }

  // Collect unclaimed flags into "other" group
  const unclaimed = flags.filter((f) => !claimed.has(f.metric));
  if (unclaimed.length > 0) {
    const avgDeviation =
      unclaimed.reduce((sum, f) => sum + Math.abs(f.zScore), 0) /
      unclaimed.length;
    groups.push({
      groupKey: 'other',
      label: 'Other',
      flags: unclaimed,
      avgDeviation,
    });
  }

  return groups;
}

/**
 * Compute anomaly detection for a single partner's batch rows.
 *
 * @param rows - All batch rows for one partner
 * @param norms - Partner-specific norms (or portfolio norms for fallback)
 * @returns AnomalyReport with batch-level flags, groups, and severity
 */
export function computeAnomalies(
  rows: Record<string, unknown>[],
  norms: Record<string, MetricNorm>,
): AnomalyReport {
  // Sort batches by BATCH string (chronological, same as compute-trending.ts)
  const sorted = [...rows].sort((a, b) =>
    getBatchName(a).localeCompare(getBatchName(b)),
  );

  const batches: BatchAnomaly[] = sorted.map((row) => {
    const batchName = getBatchName(row);

    // Evaluate each curated metric
    const flags: MetricAnomaly[] = [];
    for (const metric of ANOMALY_METRICS) {
      const anomaly = evaluateMetric(metric, row[metric], norms[metric]);
      if (anomaly) flags.push(anomaly);
    }

    const isFlagged = flags.length >= MIN_FLAGS;
    const groups = isFlagged ? groupFlags(flags) : [];

    // Severity: flagCount * avgDeviation * log(placementVolume)
    let severityScore = 0;
    if (isFlagged && flags.length > 0) {
      const avgDeviation =
        flags.reduce((sum, f) => sum + Math.abs(f.zScore), 0) / flags.length;
      const totalPlaced = Number(row.TOTAL_AMOUNT_PLACED) || 0;
      severityScore =
        flags.length * avgDeviation * Math.log(Math.max(totalPlaced, 1));
    }

    return { batchName, isFlagged, flags, groups, severityScore };
  });

  const latestBatch = batches.length > 0 ? batches[batches.length - 1] : null;
  const flaggedBatchCount = batches.filter((b) => b.isFlagged).length;

  const partner: PartnerAnomaly = {
    isFlagged: latestBatch?.isFlagged ?? false,
    severityScore: latestBatch?.severityScore ?? 0,
    flaggedBatchCount,
    totalBatchCount: batches.length,
    latestBatch,
    batches,
    usedPortfolioFallback: false, // Caller sets this
  };

  return { partner };
}

/**
 * Compute anomaly detection for ALL `(partner, product)` PAIRS from the full
 * dataset (Phase 39 PCFG-03..04).
 *
 * Pairs with <3 batches use portfolio-average norms (computed from
 * all rows) as fallback since they lack sufficient history for
 * meaningful pair-specific norms.
 *
 * @param allRows - All rows from the dataset (all pairs combined)
 * @returns Map keyed by `pairKey({ partner, product })` with PartnerAnomaly
 *   for each pair. Each entry carries a `displayName` (suffixed for
 *   multi-product partners) so UI consumers don't have to recompute it.
 */
export function computeAllPartnerAnomalies(
  allRows: Record<string, unknown>[],
): Map<string, PartnerAnomaly> {
  const result = new Map<string, PartnerAnomaly>();

  // Group rows by (partner, product) pair (PCFG-04 — no cross-product blending).
  const byPair = new Map<
    string,
    { pair: PartnerProductPair; rows: Record<string, unknown>[] }
  >();
  for (const row of allRows) {
    const partner = getPartnerName(row);
    const product = getStringField(row, 'ACCOUNT_TYPE');
    if (!partner || !product) continue;
    const pair: PartnerProductPair = { partner, product };
    const key = pairKey(pair);
    const existing = byPair.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      byPair.set(key, { pair, rows: [row] });
    }
  }

  // Count products per partner so displayName logic knows whether to suffix.
  const productsPerPartner = new Map<string, number>();
  for (const { pair } of byPair.values()) {
    productsPerPartner.set(
      pair.partner,
      (productsPerPartner.get(pair.partner) ?? 0) + 1,
    );
  }

  // Compute portfolio-wide norms once for fallback
  const portfolioNorms = computeNorms(allRows);

  for (const [key, { pair, rows: pairRows }] of byPair) {
    const usePortfolioFallback = pairRows.length < 3;
    const norms = usePortfolioFallback
      ? portfolioNorms
      : computeNorms(pairRows);

    const report = computeAnomalies(pairRows, norms);
    report.partner.usedPortfolioFallback = usePortfolioFallback;
    report.partner.displayName = displayNameForPair(
      pair,
      productsPerPartner.get(pair.partner) ?? 1,
    );

    result.set(key, report.partner);
  }

  return result;
}
