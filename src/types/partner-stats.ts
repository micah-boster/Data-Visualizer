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

export interface PartnerStats {
  kpis: KpiAggregates;
  norms: Record<string, MetricNorm>;
  curves: BatchCurve[];
  trending: TrendingData;
}
