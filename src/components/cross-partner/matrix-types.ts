import type { CrossPartnerEntry, PercentileRanks } from '@/types/partner-stats';

export interface MatrixMetric {
  key: keyof PercentileRanks;
  label: string;
  format: 'percentage' | 'currency';
  getValue: (e: CrossPartnerEntry) => number;
  getPercentile: (e: CrossPartnerEntry) => number;
}

export const MATRIX_METRICS: MatrixMetric[] = [
  {
    key: 'penetrationRate',
    label: 'Penetration Rate',
    format: 'percentage',
    getValue: (e) => e.kpis.weightedPenetrationRate,
    getPercentile: (e) => e.percentileRanks?.penetrationRate ?? 0,
  },
  {
    key: 'collectionRate6mo',
    label: '6mo Collection',
    format: 'percentage',
    getValue: (e) => e.kpis.collectionRate6mo,
    getPercentile: (e) => e.percentileRanks?.collectionRate6mo ?? 0,
  },
  {
    key: 'collectionRate12mo',
    label: '12mo Collection',
    format: 'percentage',
    getValue: (e) => e.kpis.collectionRate12mo,
    getPercentile: (e) => e.percentileRanks?.collectionRate12mo ?? 0,
  },
  {
    key: 'totalCollected',
    label: 'Total Collected',
    format: 'currency',
    getValue: (e) => e.kpis.totalCollected,
    getPercentile: (e) => e.percentileRanks?.totalCollected ?? 0,
  },
  {
    key: 'perDollarPlacedRate',
    label: 'Per-Dollar Rate',
    format: 'percentage',
    getValue: (e) => e.perDollarPlacedRate,
    getPercentile: (e) => e.percentileRanks?.perDollarPlacedRate ?? 0,
  },
];

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
