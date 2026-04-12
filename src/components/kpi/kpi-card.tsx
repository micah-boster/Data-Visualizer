'use client';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { getPolarity } from '@/lib/computation/metric-polarity';

interface KpiTrend {
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  /** Snowflake metric name for polarity lookup */
  metric: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  trend?: KpiTrend | null;
  insufficientData?: boolean;
  batchCount?: number;
  noData?: boolean;
  noDataReason?: string;
}

/**
 * Single KPI card displaying a headline metric with optional trend indicator.
 *
 * Trend arrow color is context-aware using metric polarity:
 * green = good direction, red = bad direction, gray = flat.
 */
export function KpiCard({
  label,
  value,
  trend,
  insufficientData,
  batchCount,
  noData,
  noDataReason,
}: KpiCardProps) {
  // No data state: show em-dash
  if (noData) {
    return (
      <div className="rounded-xl border border-border/50 bg-transparent p-4">
        <Tooltip>
          <TooltipTrigger className="block w-full text-left">
            <div className="text-2xl font-semibold tabular-nums text-muted-foreground">
              {'\u2014'}
            </div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </TooltipTrigger>
          <TooltipContent>{noDataReason ?? 'No data available'}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Determine trend display
  let trendElement: React.ReactNode = null;

  if (insufficientData) {
    const tooltipText =
      batchCount === 1
        ? '1 batch \u2014 no trend yet'
        : 'Need 3+ batches for trending';

    trendElement = (
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center">
          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  } else if (trend) {
    const arrow =
      trend.direction === 'up'
        ? '\u2191'
        : trend.direction === 'down'
          ? '\u2193'
          : '\u2014';

    const polarity = getPolarity(trend.metric);
    const isPositive =
      (trend.direction === 'up' && polarity === 'higher_is_better') ||
      (trend.direction === 'down' && polarity === 'lower_is_better');

    let colorClass: string;
    if (trend.direction === 'flat') {
      colorClass = 'text-muted-foreground';
    } else if (isPositive) {
      colorClass = 'text-emerald-600 dark:text-emerald-400';
    } else {
      colorClass = 'text-red-500 dark:text-red-400';
    }

    const sign = trend.deltaPercent >= 0 ? '+' : '';
    const deltaText =
      trend.direction === 'flat'
        ? ''
        : `${sign}${trend.deltaPercent.toFixed(1)}%`;

    trendElement = (
      <Tooltip>
        <TooltipTrigger className={`ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
          {arrow}
          {deltaText && <span>{deltaText}</span>}
        </TooltipTrigger>
        <TooltipContent>vs rolling avg of prior batches</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-transparent p-4">
      <div className="flex items-baseline">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {trendElement}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
