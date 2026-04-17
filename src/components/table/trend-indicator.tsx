'use client';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { getPolarity } from '@/lib/computation/metric-polarity';
import { getFormatter, isNumericType } from '@/lib/formatting';
import type { BatchTrend } from '@/types/partner-stats';
import type { DeviationResult } from '@/lib/formatting/deviation';

interface TrendIndicatorProps {
  trend: BatchTrend;
  formattedValue: string;
  columnType: string;
  lowConfidence: boolean;
  /** Deviation info for heatmap background tint */
  deviation?: DeviationResult | null;
}

/**
 * Renders a metric value with a colored trend arrow and tooltip.
 *
 * Arrow color is context-aware: green = good direction for this metric,
 * red = bad direction, gray = flat.
 *
 * Low-confidence state (3-4 batches) renders a faded arrow with reduced opacity.
 */
export function TrendIndicator({
  trend,
  formattedValue,
  columnType,
  lowConfidence,
  deviation,
}: TrendIndicatorProps) {
  const arrow = trend.direction === 'up' ? '\u2191' : trend.direction === 'down' ? '\u2193' : '\u2014';
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

  const opacityClass = lowConfidence ? 'opacity-50' : '';

  // Format rolling average using the column's formatter
  const formatter = isNumericType(columnType) ? getFormatter(columnType) : null;
  const formattedAvg = formatter ? formatter(trend.rollingAvg) : String(trend.rollingAvg);

  // Build tooltip text
  let tooltipText: string;
  if (trend.direction === 'flat') {
    tooltipText = `Flat vs ${trend.baselineCount}-batch avg (${formattedAvg})`;
  } else {
    const directionLabel = trend.direction === 'up' ? 'Up' : 'Down';
    tooltipText = `${directionLabel} ${Math.abs(trend.deltaPercent).toFixed(1)}% vs ${trend.baselineCount}-batch avg (${formattedAvg})`;
  }

  // Heatmap background tint from deviation data
  const bgStyle: React.CSSProperties | undefined =
    deviation && deviation.direction !== 'neutral'
      ? {
          backgroundColor: `oklch(0.55 0.15 ${deviation.direction === 'above' ? 145 : 25} / ${deviation.opacity})`,
        }
      : undefined;

  return (
    <Tooltip>
      <TooltipTrigger
        className={`inline-flex items-center gap-1${bgStyle ? ' rounded px-1 -mx-1 transition-colors duration-150' : ''}`}
        style={bgStyle}
      >
        {formattedValue}
        <span className={`text-label ${colorClass} ${opacityClass}`}>
          {arrow}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Renders a metric value with a gray dash for partners with insufficient
 * batch history (fewer than 3 batches).
 */
export function InsufficientTrendIndicator({
  formattedValue,
}: {
  formattedValue: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1">
        {formattedValue}
        <span className="text-caption text-muted-foreground">{'\u2014'}</span>
      </TooltipTrigger>
      <TooltipContent>Need 3+ batches for trending</TooltipContent>
    </Tooltip>
  );
}
