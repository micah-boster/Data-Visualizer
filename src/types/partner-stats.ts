/** Types for computed partner analytics data consumed by v2 visualization phases. */

export interface CurvePoint {
  month: number;
  amount: number;
  recoveryRate: number;
}

export interface BatchCurve {
  batchName: string;
  totalPlaced: number;
  ageInMonths: number;
  points: CurvePoint[];
  /**
   * Phase 40 PRJ-01 — optional modeled projection from
   * BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL (per-batch, latest VERSION).
   *
   * Absent when the batch has no modeled coverage (e.g., older bounce_af
   * batches like AF_AUG_23 with null PROJECTED_FRACTIONAL). Consumers must
   * treat undefined as a valid state and degrade gracefully (chart renders
   * actuals only; KPI cards render value-only without a modeled-baseline delta).
   *
   * Clipped to chart maxAge at render time (CHT-01 truncation contract).
   * `recoveryRate` is on the same 0..100 percentage scale as `points[].recoveryRate`.
   */
  projection?: CurvePoint[];
}

export interface MetricNorm {
  mean: number;
  stddev: number;
  count: number;
}

export interface KpiAggregates {
  totalBatches: number;
  totalAccounts: number;
  weightedPenetrationRate: number;
  /**
   * Max `BATCH_AGE_IN_MONTHS` across rows in the current scope (after
   * filter-before-aggregate pipeline, per Phase 25 contract). Drives the
   * KPI-01 cascade tier selection in `KpiSummaryCards`.
   */
  maxBatchAgeMonths: number;
  /**
   * Collection rate over batches with age ≥ 3 months, using the 3-month
   * collection horizon (`sum(COLLECTION_AFTER_3_MONTH) / sum(placed-3mo-eligible)`).
   * 0 when no batches have reached 3 months; cascade-tier logic hides the card
   * in that case.
   */
  collectionRate3mo: number;
  collectionRate6mo: number;
  collectionRate12mo: number;
  /**
   * Collection rate over ALL placed accounts regardless of age
   * (`sum(TOTAL_COLLECTED_LIFE_TIME) / sum(TOTAL_AMOUNT_PLACED)`).
   * Always populated; shown by cascade-tier selector for `< 6mo` cohorts.
   */
  collectionRateSinceInception: number;
  totalCollected: number;
  totalPlaced: number;
}

export interface BatchTrend {
  batchName: string;
  metric: string;
  value: number;
  rollingAvg: number;
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  baselineCount: number;
}

/**
 * Per-horizon rolling-avg suppression flags (Phase 38 KPI-04).
 *
 * `true` means the corresponding KPI card should render VALUE ONLY (no delta
 * indicator). Suppress when fewer than 3 PRIOR batches (excluding the latest)
 * have reached the card's horizon. `rateSinceInception` suppresses only when
 * there are zero prior batches.
 */
export interface SuppressDeltaFlags {
  rate3mo: boolean;
  rate6mo: boolean;
  rate12mo: boolean;
  rateSinceInception: boolean;
}

export interface TrendingData {
  trends: BatchTrend[];
  /**
   * @deprecated Use `suppressDelta.{horizon}` for per-horizon decisions (KPI-04).
   * Retained for legacy callers that still treat trending as a single boolean
   * (e.g., `definitions.ts` table-footer trend cells).
   */
  insufficientHistory: boolean;
  suppressDelta: SuppressDeltaFlags;
  batchCount: number;
}

/** Single metric flag on a batch */
export interface MetricAnomaly {
  metric: string;
  value: number;
  zScore: number;
  direction: 'above' | 'below';
}

/** Correlated anomaly group on a batch */
export interface AnomalyGroup {
  groupKey: string;
  label: string;
  flags: MetricAnomaly[];
  avgDeviation: number;
}

/** Batch-level anomaly assessment */
export interface BatchAnomaly {
  batchName: string;
  isFlagged: boolean;
  flags: MetricAnomaly[];
  groups: AnomalyGroup[];
  severityScore: number;
}

/** Partner-level anomaly roll-up */
export interface PartnerAnomaly {
  isFlagged: boolean;
  severityScore: number;
  flaggedBatchCount: number;
  totalBatchCount: number;
  latestBatch: BatchAnomaly | null;
  batches: BatchAnomaly[];
  usedPortfolioFallback: boolean;
  /** Percentile-based outlier flag from cross-partner computation (XPC-04) */
  isPercentileOutlier?: boolean;
  /** Metrics below 10th percentile */
  percentileOutlierMetrics?: string[];
}

/** Full anomaly report for a single partner */
export interface AnomalyReport {
  partner: PartnerAnomaly;
}

export interface PartnerStats {
  kpis: KpiAggregates;
  norms: Record<string, MetricNorm>;
  curves: BatchCurve[];
  trending: TrendingData;
  anomalies?: AnomalyReport;
}

/** Activity status for cross-partner ranking eligibility */
export type PartnerActivityStatus = 'active' | 'semi-inactive' | 'inactive';

/** Per-partner percentile ranks on key metrics (0-1 scale) */
export interface PercentileRanks {
  penetrationRate: number;
  collectionRate6mo: number;
  collectionRate12mo: number;
  totalCollected: number;
  perDollarPlacedRate: number;
}

/** Average collection curve for a partner (mean of all batch curves) */
export interface AverageCurve {
  /** Average curve using equal-weight averaging */
  equalWeight: CurvePoint[];
  /** Average curve using dollar-weighted averaging */
  dollarWeighted: CurvePoint[];
}

/** Cross-partner stats for a single partner */
export interface CrossPartnerEntry {
  partnerName: string;
  kpis: KpiAggregates;
  perDollarPlacedRate: number;
  percentileRanks: PercentileRanks | null;
  averageCurve: AverageCurve;
  activityStatus: PartnerActivityStatus;
  batchCount: number;
  /** Whether this partner is eligible for ranking (3+ batches, not inactive) */
  isRankEligible: boolean;
  /** Whether this partner is a percentile outlier (<10th on any metric) */
  isPercentileOutlier: boolean;
  /** Which metrics are below 10th percentile */
  outlierMetrics: (keyof PercentileRanks)[];
}

/** Full cross-partner computation result */
export interface CrossPartnerData {
  /** Map of partner name to cross-partner stats */
  partners: Map<string, CrossPartnerEntry>;
  /** Only partners eligible for ranking (3+ batches, not 12+ months inactive) */
  rankedPartners: CrossPartnerEntry[];
  /** Portfolio-wide average curve (all eligible partners combined) */
  portfolioAverageCurve: AverageCurve;
}
