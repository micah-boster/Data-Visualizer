'use client';

/**
 * Phase 43 BND-05 — `<ChartFrame>` primitive.
 *
 * Unified shell for every chart in the app. Owns:
 *   - title / subtitle / actions slot
 *   - legend slot (rendered below the body)
 *   - state-driven render: ready / loading (skeleton) / fetching (overlay) /
 *     empty (centered text + suggestion) / error (sanitized message + request id)
 *   - stale-column warning chip in the title row (absorbs the standalone
 *     <StaleColumnWarning> component this plan deletes)
 *   - polarity prop (defaults via `getPolarity(metric)` per DCR-09); exposed via
 *     React context so chart bodies can read direction-aware coloring without
 *     prop-threading
 *   - density-aware padding via the `data-density` attribute and the
 *     `--chart-pad` CSS variable declared in globals.css
 *
 * What ChartFrame does NOT render:
 *   - Recharts trees, custom SVG, matrix grids — those stay in their own
 *     consumer components and are passed in as `children`.
 *   - Tooltips — the existing chart bodies already wire tooltips via Recharts
 *     `<Tooltip>` primitives. ChartFrame's tooltip "slot" is conceptual: the
 *     chart body owns the tooltip primitive; ChartFrame owns the surrounding
 *     panel state.
 *
 * Forward-compat: v5.0 triangulation visualizations (scorecard-vs-internal-vs-target)
 * inherit this shell instead of re-deriving title / loading / empty / polarity.
 *
 * Sibling docs:
 *   - .planning/phases/43-boundary-hardening/43-CONTEXT.md (decisions)
 *   - .planning/phases/43-boundary-hardening/43-03-PLAN.md (BND-05 spec)
 *   - docs/POLARITY-AUDIT.md (DCR-09 polarity registry)
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getPolarity,
  type MetricPolarity,
} from '@/lib/computation/metric-polarity';

/**
 * Discriminated render-state union. Maps directly to TanStack Query's
 * isLoading / isFetching / data?.length === 0 / error surfaces.
 */
export type ChartFrameState =
  | { kind: 'ready' }
  | { kind: 'loading' } // first load — show chart-shaped skeleton
  | { kind: 'fetching' } // background refetch — overlay + spinner; children stay visible
  | { kind: 'empty'; message?: string; suggestion?: string }
  | { kind: 'error'; message: string; requestId?: string };

export interface ChartFrameProps {
  /** Chart title. Pass empty string ('') to suppress the title row entirely
   *  (used by sparklines and inline previews where the surrounding card owns
   *  the title). */
  title: string;
  /** Subtitle / context line — optional muted text under the title. */
  subtitle?: string;
  /** Stale columns flagged by the existing stale-column detector. Renders an
   *  amber chip in the title row per CONTEXT lock. The chart body still
   *  renders; the chip is informational. */
  staleColumns?: string[];
  /** Optional metric key — drives the polarity context default via
   *  `getPolarity()`. Pass when the chart's primary channel encodes a metric. */
  metric?: string;
  /** Explicit polarity override — supersedes the `getPolarity(metric)` default. */
  polarity?: MetricPolarity;
  /** Render state. Drives skeleton / overlay / empty / error UX. */
  state: ChartFrameState;
  /** Density mode — drives internal padding via the `data-density` attribute
   *  and the `--chart-pad` CSS variable. Defaults to `'comfortable'`. */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Chart body — Recharts tree, custom SVG, matrix grid, sparkline path.
   *  ChartFrame does NOT render Recharts itself. */
  children: ReactNode;
  /** Slot for legend — rendered below the chart body. */
  legend?: ReactNode;
  /** Slot for actions (buttons, switches, toolbars) on the right side of the
   *  title row. */
  actions?: ReactNode;
  /** Test id passthrough — applied to the root frame element. */
  'data-testid'?: string;
  /** Optional className merged onto the root frame wrapper. */
  className?: string;
}

/**
 * Polarity context — published by every ChartFrame. Chart bodies that want
 * direction-aware coloring (diverging palettes, delta arrows) read this
 * without prop-threading. Falls back to `'neutral'` when no provider exists,
 * which is the safe default for charts rendered outside a ChartFrame.
 */
const ChartFrameContext = createContext<MetricPolarity>('neutral');

/** Read the active polarity from the surrounding `<ChartFrame>`. Returns
 *  `'neutral'` when called outside a ChartFrame. */
export function useChartFramePolarity(): MetricPolarity {
  return useContext(ChartFrameContext);
}

/** Resolve the effective polarity — explicit prop wins; otherwise look up via
 *  `getPolarity(metric)`; otherwise fall back to neutral. */
function resolvePolarity(
  polarity: MetricPolarity | undefined,
  metric: string | undefined,
): MetricPolarity {
  if (polarity !== undefined) return polarity;
  if (metric) return getPolarity(metric);
  return 'neutral';
}

export function ChartFrame({
  title,
  subtitle,
  staleColumns,
  metric,
  polarity,
  state,
  density = 'comfortable',
  children,
  legend,
  actions,
  className,
  ...rest
}: ChartFrameProps) {
  const resolvedPolarity = useMemo(
    () => resolvePolarity(polarity, metric),
    [polarity, metric],
  );

  const showTitleRow =
    title.length > 0 ||
    subtitle !== undefined ||
    (staleColumns && staleColumns.length > 0) ||
    actions !== undefined;

  const testId = rest['data-testid'];

  return (
    <ChartFrameContext.Provider value={resolvedPolarity}>
      <div
        data-density={density}
        data-testid={testId}
        data-polarity={resolvedPolarity}
        className={cn('flex flex-col', className)}
      >
        {showTitleRow && (
          <header className="flex items-start justify-between gap-stack pb-stack">
            <div className="flex flex-col gap-1">
              {title.length > 0 && (
                <div className="flex items-center gap-2">
                  <h3 className="text-title text-foreground" data-slot="chart-frame-title">
                    {title}
                  </h3>
                  {staleColumns && staleColumns.length > 0 && (
                    <StaleColumnsChip columns={staleColumns} />
                  )}
                </div>
              )}
              {subtitle && (
                <p className="text-caption text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div
                className="shrink-0 flex items-center gap-inline"
                data-slot="chart-frame-actions"
              >
                {actions}
              </div>
            )}
          </header>
        )}

        <div
          className="relative"
          style={{ padding: 'var(--chart-pad, 0px)' }}
          data-slot="chart-frame-body"
        >
          {state.kind === 'loading' ? (
            <ChartSkeleton />
          ) : state.kind === 'empty' ? (
            <ChartEmpty
              message={state.message ?? 'No data matches these filters.'}
              suggestion={state.suggestion}
            />
          ) : state.kind === 'error' ? (
            <ChartError message={state.message} requestId={state.requestId} />
          ) : (
            <>
              <div
                data-slot="chart-frame-children"
                aria-busy={state.kind === 'fetching' ? true : undefined}
              >
                {children}
              </div>
              {state.kind === 'fetching' && <ChartFetchingOverlay />}
            </>
          )}
        </div>

        {legend && (
          <footer className="pt-stack" data-slot="chart-frame-legend">
            {legend}
          </footer>
        )}
      </div>
    </ChartFrameContext.Provider>
  );
}

/* ---------------------------------------------------------------------------
 * Internal sub-components — kept in this file so the props contract stays
 * self-contained.
 * ------------------------------------------------------------------------ */

function StaleColumnsChip({ columns }: { columns: string[] }) {
  const first = columns[0];
  const extra = columns.length - 1;
  const tooltipText =
    columns.length === 1
      ? `Column "${first}" is missing or unavailable.`
      : `Missing columns: ${columns.join(', ')}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              role="status"
              aria-label={tooltipText}
              className="inline-flex items-center gap-1 rounded bg-warning-bg px-1.5 py-0.5 text-caption text-warning-fg border border-warning-border"
              data-slot="chart-frame-stale-chip"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              <span>
                {first}
                {extra > 0 ? ` +${extra}` : ''}
              </span>
            </span>
          }
        />
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Chart-shaped skeleton — basic horizontal axis stub + faded bar/line silhouette.
 * Geometry intentionally generic per CONTEXT § "Claude's discretion": skeleton
 * geometry per chart type isn't worth N variants; one shape covers all.
 */
function ChartSkeleton() {
  return (
    <div
      className="flex h-[clamp(180px,24vh,280px)] w-full flex-col gap-2"
      data-slot="chart-frame-skeleton"
      role="status"
      aria-label="Loading chart"
    >
      <div className="flex flex-1 items-end gap-2 px-3">
        <Skeleton className="h-3/5 w-full" />
        <Skeleton className="h-4/5 w-full" />
        <Skeleton className="h-2/5 w-full" />
        <Skeleton className="h-3/4 w-full" />
        <Skeleton className="h-1/2 w-full" />
        <Skeleton className="h-2/3 w-full" />
      </div>
      <Skeleton className="h-px w-full" />
    </div>
  );
}

function ChartEmpty({
  message,
  suggestion,
}: {
  message: string;
  suggestion?: string;
}) {
  return (
    <div
      className="flex h-[clamp(180px,24vh,280px)] w-full flex-col items-center justify-center gap-1 text-center"
      data-slot="chart-frame-empty"
    >
      <p className="text-body text-muted-foreground">{message}</p>
      {suggestion && (
        <p className="text-caption text-muted-foreground/80">{suggestion}</p>
      )}
    </div>
  );
}

function ChartError({
  message,
  requestId,
}: {
  message: string;
  requestId?: string;
}) {
  return (
    <div
      role="alert"
      className="flex h-[clamp(180px,24vh,280px)] w-full flex-col items-center justify-center gap-1 text-center"
      data-slot="chart-frame-error"
    >
      <p className="text-body text-foreground">{message}</p>
      {requestId && (
        <p className="text-caption text-muted-foreground">
          Reference: <span className="text-label-numeric">{requestId}</span>
        </p>
      )}
    </div>
  );
}

function ChartFetchingOverlay() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] pointer-events-none"
      data-slot="chart-frame-fetching-overlay"
      aria-hidden="true"
    >
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}
