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
 *
 * Styling: Phase 26 token pilot — consumes --color-surface-raised,
 * --spacing-card-padding, --shadow-sm, --radius-lg, and the type scale
 * (text-label, text-display-numeric, text-label-numeric, text-caption).
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
  // Token-migrated container classes shared across all render states.
  const cardClasses =
    'rounded-lg border border-border bg-surface-raised p-card-padding shadow-sm transition-colors duration-quick ease-default';

  // No data state: show em-dash
  if (noData) {
    return (
      <div className={cardClasses}>
        <Tooltip>
          <TooltipTrigger className="block w-full text-left">
            <div className="text-display-numeric text-muted-foreground">
              {'\u2014'}
            </div>
            <div className="text-label uppercase text-muted-foreground">
              {label}
            </div>
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
        <TooltipTrigger className="ml-1.5 inline-flex items-center">
          <span className="text-caption text-muted-foreground">{'\u2014'}</span>
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
      colorClass = 'text-success-fg';
    } else {
      colorClass = 'text-error-fg';
    }

    const sign = trend.deltaPercent >= 0 ? '+' : '';
    const deltaText =
      trend.direction === 'flat'
        ? ''
        : `${sign}${trend.deltaPercent.toFixed(1)}%`;

    trendElement = (
      <Tooltip>
        <TooltipTrigger
          className={`ml-1.5 inline-flex items-center gap-0.5 text-label-numeric font-medium ${colorClass}`}
        >
          {arrow}
          {deltaText && <span>{deltaText}</span>}
        </TooltipTrigger>
        <TooltipContent>vs rolling avg of prior batches</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cardClasses}>
      <div className="flex items-baseline">
        <span className="text-display-numeric">{value}</span>
        {trendElement}
      </div>
      <div className="text-label uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
