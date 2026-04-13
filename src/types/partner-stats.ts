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
  collectionRate6mo: number;
  collectionRate12mo: number;
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

export interface TrendingData {
  trends: BatchTrend[];
  insufficientHistory: boolean;
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
