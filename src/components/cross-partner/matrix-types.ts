import type { CrossPartnerEntry, PercentileRanks } from '@/types/partner-stats';
import {
  getPolarityWithAuditWarning,
  type MetricPolarity,
} from '@/lib/computation/metric-polarity';

export interface MatrixMetric {
  /** Camelcase alias used in PercentileRanks (matches CrossPartnerEntry shape). */
  key: keyof PercentileRanks;
  /**
   * Phase 41-03 (DCR-09) — canonical Snowflake column key for polarity lookup.
   * Aligns the matrix surface with `getPolarity()` registry. When a metric is
   * a derived rate without a single Snowflake column (e.g. perDollarPlacedRate
   * is computed from TOTAL_COLLECTED_LIFE_TIME / TOTAL_AMOUNT_PLACED), pick
   * the underlying Snowflake column whose business polarity governs the
   * derived rate (here: `TOTAL_COLLECTED_LIFE_TIME` is `neutral` magnitude,
   * but the per-dollar RATE is unambiguously `higher_is_better` — so
   * register the alias `perDollarPlacedRate` directly).
   */
  metricKey: string;
  label: string;
  format: 'percentage' | 'currency';
  getValue: (e: CrossPartnerEntry) => number;
  getPercentile: (e: CrossPartnerEntry) => number;
}

export const MATRIX_METRICS: MatrixMetric[] = [
  {
    key: 'penetrationRate',
    metricKey: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
    label: 'Penetration Rate',
    format: 'percentage',
    getValue: (e) => e.kpis.weightedPenetrationRate,
    getPercentile: (e) => e.percentileRanks?.penetrationRate ?? 0,
  },
  {
    key: 'collectionRate6mo',
    metricKey: 'COLLECTION_AFTER_6_MONTH',
    label: '6mo Collection',
    format: 'percentage',
    getValue: (e) => e.kpis.collectionRate6mo,
    getPercentile: (e) => e.percentileRanks?.collectionRate6mo ?? 0,
  },
  {
    key: 'collectionRate12mo',
    metricKey: 'COLLECTION_AFTER_12_MONTH',
    label: '12mo Collection',
    format: 'percentage',
    getValue: (e) => e.kpis.collectionRate12mo,
    getPercentile: (e) => e.percentileRanks?.collectionRate12mo ?? 0,
  },
  {
    key: 'totalCollected',
    // TOTAL_COLLECTED_LIFE_TIME is registered `neutral` (magnitude metric).
    // Surfaces consuming this metric receive `'neutral'` polarity and should
    // suppress directional-color encoding (or fall back to a single-hue
    // gradient). Heatmap currently uses tier classes — under neutral polarity
    // the lower-is-better inversion does not apply (see getPolarityAwarePercentile).
    metricKey: 'TOTAL_COLLECTED_LIFE_TIME',
    label: 'Total Collected',
    format: 'currency',
    getValue: (e) => e.kpis.totalCollected,
    getPercentile: (e) => e.percentileRanks?.totalCollected ?? 0,
  },
  {
    key: 'perDollarPlacedRate',
    metricKey: 'COLLECTION_AFTER_12_MONTH', // Best-fit Snowflake column governing this derived rate's polarity (higher_is_better).
    label: 'Per-Dollar Rate',
    format: 'percentage',
    getValue: (e) => e.perDollarPlacedRate,
    getPercentile: (e) => e.percentileRanks?.perDollarPlacedRate ?? 0,
  },
];

/**
 * Phase 41-03 (DCR-09) — polarity-aware percentile transform. The raw
 * percentile is computed in `compute-cross-partner.ts:computePercentileRanks`
 * by sorting values ascending and taking `quantileRank` — which means a
 * raw percentile of 1.0 = "highest value", 0 = "lowest value". For
 * `lower_is_better` metrics the color encoding must INVERT: lowest values
 * should be the "best" tier (greenest), highest values should be the "worst"
 * tier (reddest).
 *
 * For `neutral` metrics, color is suppressed (returns 0.5 — the midpoint
 * tier from `getTierClass`). Surfaces that want a single-hue gradient for
 * neutral metrics override this behavior; heatmap currently flattens to the
 * mid tier (see `getTierClass(0.5)` → yellow band).
 *
 * @param percentile  raw percentile rank in [0..1] (1 = highest raw value)
 * @param polarity    polarity for the metric (per `getPolarity(metricKey)`)
 * @returns           polarity-corrected percentile in [0..1] (1 = best for this metric)
 */
export function polarityAwarePercentile(
  percentile: number,
  polarity: MetricPolarity,
): number {
  if (polarity === 'lower_is_better') return 1 - percentile;
  if (polarity === 'neutral') return 0.5;
  return percentile;
}

/** Convenience: look up polarity for a MatrixMetric (with dev-mode audit warning). */
export function polarityForMatrixMetric(metric: MatrixMetric): MetricPolarity {
  return getPolarityWithAuditWarning(metric.metricKey);
}

export type Orientation = 'partners-as-rows' | 'metrics-as-rows';
export type SortDirection = 'asc' | 'desc';

export interface MatrixViewProps {
  partners: CrossPartnerEntry[];
  metrics: MatrixMetric[];
  orientation: Orientation;
  sortMetric: keyof PercentileRanks;
  sortDirection: SortDirection;
  onSort: (metricKey: keyof PercentileRanks) => void;
}

export function formatValue(value: number, format: 'percentage' | 'currency'): string {
  if (format === 'currency') {
    return value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `$${(value / 1_000).toFixed(0)}K`
        : `$${value.toFixed(0)}`;
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function getTierClass(percentile: number): string {
  if (percentile >= 0.75) return 'bg-green-500/15 dark:bg-green-500/20';
  if (percentile >= 0.5) return 'bg-green-500/5 dark:bg-green-500/10';
  if (percentile >= 0.25) return 'bg-yellow-500/5 dark:bg-yellow-500/10';
  return 'bg-red-500/15 dark:bg-red-500/20';
}
