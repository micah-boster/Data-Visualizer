'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Database } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getPolarity } from '@/lib/computation/metric-polarity';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

/**
 * StatCard — canonical stat display (Phase 29 / DS-18).
 *
 * Single size, one canonical chassis. Renders value + trend on separate lines
 * with an explanatory phrase on the trend line ("↑ +2.1% vs rolling avg of
 * prior batches") that previously lived in a tooltip-only affordance on
 * KpiCard. Replaces the legacy KpiCard across the app.
 *
 * Prop surface (states, first-match wins):
 *   1. loading → skeleton shell
 *   2. error → AlertTriangle + short message
 *   3. noData → em-dash recipe (whole-card tooltip wrapped)
 *   4. comparison → two-column grid (partner vs benchmark)
 *   5. default → single-column value + optional trend line
 *      • stale badge appears inline on the label row when stale===true
 *      • insufficient-data renders em-dash trend with tooltip copy
 *
 * Deferred-plumbing notes:
 *   • `stale` (Pitfall 1, 29-RESEARCH): prop surface only — no upstream signal
 *     today. DataResponse.meta lacks a `source: 'cache' | 'snowflake'` field;
 *     consumers pass `stale={false}` until that plumbing lands in a future
 *     phase. /tokens demo exercises the true branch for visual QA only.
 *   • `comparison` (Pitfall 2, 29-RESEARCH): prop surface only — no current
 *     consumer renders the two-value drill-in. Shape is string-biased to
 *     match StatCard's `value: string` convention; extension to n values is
 *     a deliberate future refactor, not pre-baked here.
 *
 * Token discipline (Phase 27/28):
 *   • Only semantic tokens — no raw `text-*` / `shadow-*` utilities.
 *   • No paired font-weight utilities on type tokens. Weight is baked into
 *     `.text-label` / `.text-display-numeric`; `.text-label-numeric` carries
 *     mono family + tabular-nums for digit alignment.
 */

export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  /** Snowflake metric name for polarity lookup via getPolarity(). */
  metric: string;
}

export interface StatCardProps {
  /** Overline label (e.g. "Penetration"). Always rendered uppercase. */
  label: string;
  /** Pre-formatted headline value (e.g. "42.3%"). Caller owns formatting. */
  value: string;
  /** Optional trend with direction + delta; null/undefined hides the trend line. */
  trend?: StatCardTrend | null;
  /** Optional Lucide icon (or any ReactNode) rendered left of the label text. */
  icon?: ReactNode;
  /** Renders a skeleton shell that preserves card dimensions during first load. */
  loading?: boolean;
  /** Error branch — shows AlertTriangle + message. Pass `true` for default copy. */
  error?: { message?: string } | boolean;
  /** Em-dash no-data branch with whole-card tooltip. */
  noData?: boolean;
  /** Tooltip copy for the noData branch. Defaults to "No data available". */
  noDataReason?: string;
  /** Insufficient-history branch — renders em-dash trend with explanatory tooltip. */
  insufficientData?: boolean;
  /** Batch count used to pick the insufficient-data tooltip copy variant. */
  batchCount?: number;
  /**
   * Stale/cached indicator.
   *
   * PROP SURFACE ONLY in Phase 29 — awaits `DataResponse.meta.source` wiring
   * in a future phase. See Pitfall 1 in 29-RESEARCH.md.
   */
  stale?: boolean;
  /**
   * Comparison mode — renders two values side-by-side (partner vs benchmark).
   *
   * PROP SURFACE ONLY in Phase 29 — no current consumer. See Pitfall 2 in
   * 29-RESEARCH.md.
   */
  comparison?: {
    label: string;
    value: string;
    trend?: StatCardTrend;
  };
  /** Escape hatch for callers that need to nudge chassis classes. */
  className?: string;
}

// Canonical chassis — Phase 28 locked recipe, preserved verbatim from KpiCard.
const CARD_CLASSES =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';

const TREND_EXPLANATION = 'vs rolling avg of prior batches';

function trendColorClass(trend: StatCardTrend): string {
  if (trend.direction === 'flat') return 'text-muted-foreground';
  const polarity = getPolarity(trend.metric);
  const isPositive =
    (trend.direction === 'up' && polarity === 'higher_is_better') ||
    (trend.direction === 'down' && polarity === 'lower_is_better');
  return isPositive ? 'text-success-fg' : 'text-error-fg';
}

function trendArrow(direction: StatCardTrend['direction']): string {
  if (direction === 'up') return '\u2191';
  if (direction === 'down') return '\u2193';
  return '\u2014';
}

function formatDelta(trend: StatCardTrend): string {
  if (trend.direction === 'flat') return '';
  const sign = trend.deltaPercent >= 0 ? '+' : '';
  return `${sign}${trend.deltaPercent.toFixed(1)}%`;
}

function LabelRow({
  label,
  icon,
  stale,
}: {
  label: string;
  icon?: ReactNode;
  stale?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon ? (
        <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <span className="text-label uppercase text-muted-foreground">
        {label}
      </span>
      {stale ? (
        <span className="text-caption text-muted-foreground inline-flex items-center gap-1">
          <Database className="h-3 w-3" />
          Cached
        </span>
      ) : null}
    </div>
  );
}

function TrendLine({ trend }: { trend: StatCardTrend }) {
  const colorClass = trendColorClass(trend);
  const arrow = trendArrow(trend.direction);
  const delta = formatDelta(trend);

  return (
    <div
      className={cn(
        'text-label-numeric mt-1 flex items-center gap-1',
        colorClass,
      )}
    >
      <span aria-hidden>{arrow}</span>
      {delta ? <span>{delta}</span> : null}
      <span className="text-caption text-muted-foreground ml-1">
        {TREND_EXPLANATION}
      </span>
    </div>
  );
}

function InsufficientTrendLine({ batchCount }: { batchCount?: number }) {
  const tooltipText =
    batchCount === 1
      ? '1 batch \u2014 no trend yet'
      : 'Need 3+ batches for trending';

  return (
    <Tooltip>
      <TooltipTrigger className="mt-1 inline-flex items-center">
        <span className="text-caption text-muted-foreground">{'\u2014'}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

export function StatCard(props: StatCardProps) {
  const {
    label,
    value,
    trend,
    icon,
    loading,
    error,
    noData,
    noDataReason,
    insufficientData,
    batchCount,
    stale,
    comparison,
    className,
  } = props;

  // 1. Loading — skeleton shell. Runs first so all other props are ignored
  //    until data resolves.
  if (loading) {
    return (
      <div className={cn(CARD_CLASSES, className)}>
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-4 w-14" />
      </div>
    );
  }

  // 2. Error — AlertTriangle + short message inside the chassis.
  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error.message ?? 'Failed to load')
        : 'Failed to load';

    return (
      <div className={cn(CARD_CLASSES, className)}>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-error-fg" />
          <span className="text-label uppercase text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="text-caption text-error-fg mt-2">{message}</div>
      </div>
    );
  }

  // 3. No-data — em-dash recipe, whole-card tooltip wrapped (verbatim
  //    preservation of KpiCard behavior).
  if (noData) {
    return (
      <div className={cn(CARD_CLASSES, className)}>
        <Tooltip>
          <TooltipTrigger className="block w-full text-left">
            <div className="text-display-numeric text-muted-foreground">
              {'\u2014'}
            </div>
            <div className="text-label uppercase text-muted-foreground">
              {label}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {noDataReason ?? 'No data available'}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // 4. Comparison — two-column grid sharing the label overline. Prop-surface
  //    only per Pitfall 2; no live consumer in Phase 29.
  if (comparison) {
    return (
      <div className={cn(CARD_CLASSES, className)}>
        <LabelRow label={label} icon={icon} stale={stale} />
        <div className="mt-2 grid grid-cols-2 divide-x divide-border">
          <div className="pr-3">
            <div className="text-display-numeric">{value}</div>
            {trend ? <TrendLine trend={trend} /> : null}
          </div>
          <div className="pl-3">
            <div className="text-display-numeric">{comparison.value}</div>
            <div className="text-caption text-muted-foreground mt-1">
              {comparison.label}
            </div>
            {comparison.trend ? <TrendLine trend={comparison.trend} /> : null}
          </div>
        </div>
      </div>
    );
  }

  // 5. Default — single-column: label row, value line, optional trend line.
  return (
    <div className={cn(CARD_CLASSES, className)}>
      <LabelRow label={label} icon={icon} stale={stale} />
      <div className="text-display-numeric">
        <span>{value}</span>
      </div>
      {insufficientData ? (
        <InsufficientTrendLine batchCount={batchCount} />
      ) : trend ? (
        <TrendLine trend={trend} />
      ) : null}
    </div>
  );
}
