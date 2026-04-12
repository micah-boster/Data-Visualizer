'use client';

import { KpiCard } from '@/components/kpi/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount, formatPercentage, formatAbbreviatedCurrency } from '@/lib/formatting';
import type { KpiAggregates, TrendingData } from '@/types/partner-stats';

interface CardSpec {
  key: keyof KpiAggregates;
  label: string;
  format: (v: number) => string;
  /** Snowflake column name for trend lookup. Omit for cards with no trend. */
  trendMetric?: string;
}

const CARD_SPECS: CardSpec[] = [
  { key: 'totalBatches', label: 'Batches', format: formatCount },
  { key: 'totalAccounts', label: 'Accounts', format: formatCount },
  {
    key: 'weightedPenetrationRate',
    label: 'Penetration',
    format: (v) => formatPercentage(v, 1),
    trendMetric: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
  },
  {
    key: 'collectionRate6mo',
    label: '6mo Rate',
    format: (v) => formatPercentage(v, 1),
    trendMetric: 'COLLECTION_AFTER_6_MONTH',
  },
  {
    key: 'collectionRate12mo',
    label: '12mo Rate',
    format: (v) => formatPercentage(v, 1),
    trendMetric: 'COLLECTION_AFTER_12_MONTH',
  },
  { key: 'totalCollected', label: 'Total Collected', format: formatAbbreviatedCurrency },
];

interface KpiSummaryCardsProps {
  kpis: KpiAggregates | null;
  trending: TrendingData | null;
}

/**
 * 6-card KPI summary grid displayed above the batch table at partner drill-down.
 *
 * Handles three states:
 * - Loading (kpis null): skeleton placeholders
 * - Zero batches: centered "no data" message
 * - Normal: formatted values with trend arrows on rate cards
 */
export function KpiSummaryCards({ kpis, trending }: KpiSummaryCardsProps) {
  // Loading state: skeleton cards
  if (kpis === null) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-transparent p-4">
            <Skeleton className="mb-2 h-7 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    );
  }

  // Zero-batch partner: no data message
  if (kpis.totalBatches === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-border/50 bg-transparent">
        <span className="text-sm text-muted-foreground">
          No batch data available for this partner
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {CARD_SPECS.map((spec) => {
        const value = kpis[spec.key];
        const formattedValue = spec.format(value);

        // No trend metric: render plain card
        if (!spec.trendMetric) {
          return (
            <KpiCard
              key={spec.key}
              label={spec.label}
              value={formattedValue}
            />
          );
        }

        // Special case: 12mo rate with zero value may mean no batches old enough
        if (spec.key === 'collectionRate12mo' && value === 0) {
          // Check if there are any batches with 12mo data
          const has12moTrend = trending?.trends.some(
            (t) => t.metric === spec.trendMetric && t.value > 0,
          );
          if (!has12moTrend) {
            return (
              <KpiCard
                key={spec.key}
                label={spec.label}
                value={formattedValue}
                noData
                noDataReason="No batches at 12mo yet"
              />
            );
          }
        }

        // Insufficient history: gray dash
        if (trending?.insufficientHistory) {
          return (
            <KpiCard
              key={spec.key}
              label={spec.label}
              value={formattedValue}
              insufficientData
              batchCount={trending.batchCount}
            />
          );
        }

        // Find trend for this metric (latest batch)
        const trend = trending?.trends.find(
          (t) => t.metric === spec.trendMetric,
        );

        return (
          <KpiCard
            key={spec.key}
            label={spec.label}
            value={formattedValue}
            trend={
              trend
                ? {
                    direction: trend.direction,
                    deltaPercent: trend.deltaPercent,
                    metric: trend.metric,
                  }
                : null
            }
          />
        );
      })}
    </div>
  );
}
