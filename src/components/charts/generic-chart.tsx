'use client';

/**
 * Phase 36 Plan 03 — GenericChart
 *
 * Variant-dispatch renderer for the three Phase 36 chart shapes: `line`,
 * `scatter`, and `bar`. Wraps each Recharts primitive in shadcn's
 * `ChartContainer` (Pitfall 6 — one primitive per container; never a branching
 * switch inside a single container).
 *
 * Pure props-in / JSX-out: no internal state, no side effects, no write-backs
 * to the parent. Pitfall 3 is enforced here — the renderer NEVER invokes
 * `onDefinitionChange`. Stale column refs are surfaced visually (above the
 * chart) via <StaleColumnWarning>, and the axes render against the first
 * eligible fallback column from `resolveColumnWithFallback`. The user's
 * explicit column pick (via Plan 36-04's toolbar) is the only thing that
 * overwrites the stored ref.
 *
 * Pitfall 5 is handled by the local `rechartsAxisType` helper: the Recharts
 * `<XAxis type>` attribute is derived from the resolved column's
 * `ColumnConfig.type`, not hardcoded per variant. Scatter/line numeric X use
 * `type="number"`; bar X (categorical) uses `type="category"`. Y is always
 * numeric.
 *
 * Type-token discipline (Phase 27 / AGENTS.md): this file sticks to the 6
 * named type tokens only (no ad-hoc Tailwind text-size utilities; no ad-hoc
 * font-weight utilities). The only text surface here is `<EmptyState>`,
 * which owns its own token-correct recipe.
 *
 * Fixed sizing: every variant uses `h-[40vh] w-full` to match the rhythm set
 * by CollectionCurveChart. Integration callers (Plan 36-05's ChartPanel) can
 * wrap this in their own layout container if they want a different height.
 *
 * Explicit non-goals here: forking `CollectionCurveChart`. The preset renders
 * through its existing component; this dispatcher is line/scatter/bar only.
 */

import type { ReactElement } from 'react';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';

import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { NumericTick } from './numeric-tick';
import { StaleColumnWarning } from './stale-column-warning';
import { CHART_COLORS } from './curve-tooltip';
import { GenericChartLegend } from './generic-chart-legend';
import { ScatterTooltip } from './scatter-tooltip';
import { EmptyState } from '@/components/patterns/empty-state';
import { resolveColumnWithFallback } from '@/lib/charts/stale-column';
import type { ColumnConfig } from '@/lib/columns/config';
import type {
  ChartDefinition,
  GenericChartDefinition,
} from '@/lib/views/types';
import {
  isNumericType,
  getFormatter,
  formatAbbreviatedCurrency,
  formatPercentage,
  formatCount,
  formatNumber,
} from '@/lib/formatting/numbers';

export interface GenericChartProps {
  definition: GenericChartDefinition;
  rows: Array<Record<string, unknown>>;
  /**
   * Passed through so integration callers can wire toolbar-side healing of
   * stale refs. Pitfall 3 lock: this renderer NEVER invokes it. Deliberately
   * kept in the props surface to match the interfaces contract published by
   * 36-03-PLAN.md and to signal intent to readers.
   */
  onDefinitionChange: (next: ChartDefinition) => void;
}

/**
 * Pitfall 5 — map a ColumnConfig.type to the Recharts XAxis `type` discriminator.
 * Numeric-family types (number, currency, percentage, count, date) all render
 * as continuous numeric axes; `text` is categorical. Date rendering as number
 * is acceptable for v1 — richer date-axis support can land in a later plan.
 */
function rechartsAxisType(col: ColumnConfig): 'category' | 'number' {
  if (col.type === 'text') return 'category';
  if (isNumericType(col.type)) return 'number';
  // `date` and any future additive type fall through to number (continuous axis).
  return 'number';
}

/**
 * Phase 36.x — axis tick formatter (compact). Currency uses abbreviated
 * $1.2M / $450K form; percentage shows whole numbers (55%); count/number
 * use comma-separated integers. Text columns return identity (Recharts'
 * default category tick handles strings).
 */
function axisFormatter(col: ColumnConfig): ((v: number) => string) | undefined {
  switch (col.type) {
    case 'currency':
      return formatAbbreviatedCurrency;
    case 'percentage':
      return (v) => formatPercentage(v, 0);
    case 'count':
      return formatCount;
    case 'number':
      return formatNumber;
    default:
      return undefined;
  }
}

/**
 * Phase 36.x — full-precision formatter used in the tooltip where space is
 * plentiful. Currency becomes "$1,234.56", percentage "55.0%", etc.
 */
function tooltipFormatter(col: ColumnConfig): (v: number) => string {
  return getFormatter(col.type);
}

const AXIS_LABEL_STYLE = {
  fill: 'var(--muted-foreground)',
  fontSize: 11,
  fontFamily: 'var(--font-sans), ui-sans-serif, system-ui',
} as const;

export function GenericChart({
  definition,
  rows,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDefinitionChange: _onDefinitionChange,
}: GenericChartProps) {
  // --- Resolve axes (Pitfall 3: read-only; never writes back) --------------
  const xResolved = resolveColumnWithFallback(
    definition.type,
    'x',
    definition.x,
  );
  const yResolved = resolveColumnWithFallback(
    definition.type,
    'y',
    definition.y,
  );

  // --- Guard: axes not picked yet → EmptyState --------------------------------
  if (xResolved === null || yResolved === null) {
    return (
      <div className="h-[40vh] w-full">
        <EmptyState
          variant="no-data"
          title="Pick axes to render"
          description="Select an X and Y column from the toolbar."
        />
      </div>
    );
  }

  // --- Guard: empty dataset ---------------------------------------------------
  if (rows.length === 0) {
    return (
      <div className="h-[40vh] w-full">
        <EmptyState
          variant="no-data"
          title="No data for current filters"
          description="Adjust filters or load a dataset with matching rows."
        />
      </div>
    );
  }

  const xCol = xResolved.config;
  const yCol = yResolved.config;

  // --- Stale-column banners ---------------------------------------------------
  const banners: ReactElement[] = [];
  if (xResolved.stale && xResolved.requested) {
    banners.push(
      <StaleColumnWarning
        key="x-stale"
        axis="X"
        missing={xResolved.requested}
        fallback={xCol.key}
      />,
    );
  }
  if (yResolved.stale && yResolved.requested) {
    banners.push(
      <StaleColumnWarning
        key="y-stale"
        axis="Y"
        missing={yResolved.requested}
        fallback={yCol.key}
      />,
    );
  }

  // --- Series / color (Phase 36.x) -------------------------------------------
  // All three generic variants accept an optional `series` ref. Semantics:
  //   - line + bar: pivot rows by the series column → one wide record per X,
  //     one Y key per distinct series value. Renders one <Line>/<Bar> each.
  //   - scatter:    groups rows by series for per-point coloring + labeling.
  //     No wide pivot — each group keeps its own row subset (scatter variant
  //     consumes scatterGroups below).
  const seriesRef =
    'series' in definition ? definition.series ?? null : null;
  const seriesResolved =
    seriesRef !== null
      ? resolveColumnWithFallback(definition.type, 'series', seriesRef)
      : null;
  const seriesCol = seriesResolved?.config ?? null;
  if (seriesResolved?.stale && seriesResolved.requested) {
    banners.push(
      <StaleColumnWarning
        key="series-stale"
        axis="Series"
        missing={seriesResolved.requested}
        fallback={seriesResolved.config.key}
      />,
    );
  }

  const { pivoted, seriesKeys } = pivotForSeries(rows, xCol.key, yCol.key, seriesCol?.key ?? null);

  // --- ChartConfig — single entry (no series) or N entries (one per series) --
  const chartConfig: ChartConfig = {};
  if (seriesCol && seriesKeys.length > 0) {
    seriesKeys.forEach((key, i) => {
      chartConfig[key] = {
        label: key,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  } else {
    chartConfig[yCol.key] = {
      label: yCol.label,
      color: 'var(--chart-1)',
    };
  }

  const xType = rechartsAxisType(xCol);
  const chartClassName = 'h-[40vh] min-w-0 flex-1';
  // Extra bottom/left room for axis titles; top for Y title above.
  const chartMargin = { top: 10, right: 10, bottom: 30, left: 20 };
  const hasMultiSeries = seriesCol !== null && seriesKeys.length > 0;
  const xFormat = axisFormatter(xCol);
  const yFormat = axisFormatter(yCol);
  const xTooltipFmt = tooltipFormatter(xCol);
  const yTooltipFmt = tooltipFormatter(yCol);
  const xAxisLabel = {
    value: xCol.label,
    position: 'insideBottom' as const,
    offset: -15,
    style: AXIS_LABEL_STYLE,
  };
  const yAxisLabel = {
    value: yCol.label,
    angle: -90,
    position: 'insideLeft' as const,
    offset: 5,
    style: { ...AXIS_LABEL_STYLE, textAnchor: 'middle' as const },
  };

  // --- Variant dispatch (Pitfall 6 — one primitive per ChartContainer) --------
  if (definition.type === 'line') {
    return (
      <>
        {banners}
        <div className="flex gap-2">
          <ChartContainer config={chartConfig} className={chartClassName}>
            <LineChart data={pivoted} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type={xType}
                dataKey={xCol.key}
                tick={
                  xType === 'number' ? <NumericTick format={xFormat} /> : undefined
                }
                label={xAxisLabel}
              />
              <YAxis
                type="number"
                tick={<NumericTick anchor="end" dy={4} format={yFormat} />}
                width={65}
                label={yAxisLabel}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      xType === 'number'
                        ? `${xCol.label}: ${xTooltipFmt(Number(value))}`
                        : `${xCol.label}: ${String(value)}`
                    }
                    formatter={(value, name, item) => (
                      <TooltipRow
                        color={
                          (item as { color?: string; fill?: string }).color ??
                          (item as { color?: string; fill?: string }).fill ??
                          'var(--chart-1)'
                        }
                        name={String(name)}
                        value={yTooltipFmt(Number(value))}
                      />
                    )}
                  />
                }
              />
              {hasMultiSeries ? (
                seriesKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    // Phase 36.x — dots stay on for multi-series so single-
                    // point series (common when the row-level data has one
                    // row per series value, e.g. agg_batch_performance_summary
                    // giving one row per batch) still render visibly.
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={yCol.key}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ChartContainer>
          {hasMultiSeries && (
            <GenericChartLegend
              seriesKeys={seriesKeys}
              colors={CHART_COLORS}
            />
          )}
        </div>
      </>
    );
  }

  if (definition.type === 'scatter') {
    // Phase 36.x — scatter groups rows by the `series` column (when set) for
    // per-point coloring + labeling. Unlike line/bar where series pivots into
    // wide rows, each scatter group keeps its own row subset and renders as a
    // separate <Scatter> primitive.
    const scatterGroups: Array<{
      key: string;
      rows: Array<Record<string, unknown>>;
    }> = [];
    if (seriesCol) {
      const groupMap = new Map<string, Array<Record<string, unknown>>>();
      for (const row of rows) {
        const raw = row[seriesCol.key];
        if (raw === null || raw === undefined) continue;
        const sv = String(raw);
        const bucket = groupMap.get(sv);
        if (bucket) {
          bucket.push(row);
        } else {
          const fresh = [row];
          groupMap.set(sv, fresh);
          scatterGroups.push({ key: sv, rows: fresh });
        }
      }
    }
    const scatterHasSeries = seriesCol !== null && scatterGroups.length > 0;

    return (
      <>
        {banners}
        <div className="flex gap-2">
          <ChartContainer config={chartConfig} className={chartClassName}>
            <ScatterChart margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type={xType}
                dataKey={xCol.key}
                tick={
                  xType === 'number' ? <NumericTick format={xFormat} /> : undefined
                }
                label={xAxisLabel}
              />
              <YAxis
                type="number"
                dataKey={yCol.key}
                tick={<NumericTick anchor="end" dy={4} format={yFormat} />}
                width={65}
                label={yAxisLabel}
              />
              <Tooltip
                content={
                  <ScatterTooltip
                    xCol={xCol}
                    yCol={yCol}
                    xFormat={xTooltipFmt}
                    yFormat={yTooltipFmt}
                    seriesCol={seriesCol}
                  />
                }
              />
              {scatterHasSeries ? (
                scatterGroups.map((group, i) => (
                  <Scatter
                    key={group.key}
                    name={group.key}
                    data={group.rows}
                    dataKey={yCol.key}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))
              ) : (
                <Scatter data={rows} dataKey={yCol.key} fill="var(--chart-1)" />
              )}
            </ScatterChart>
          </ChartContainer>
          {scatterHasSeries && (
            <GenericChartLegend
              seriesKeys={scatterGroups.map((g) => g.key)}
              colors={CHART_COLORS}
            />
          )}
        </div>
      </>
    );
  }

  // definition.type === 'bar'
  return (
    <>
      {banners}
      <div className="flex gap-2">
        <ChartContainer config={chartConfig} className={chartClassName}>
          <BarChart data={pivoted} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type={xType}
              dataKey={xCol.key}
              tick={
                xType === 'number' ? <NumericTick format={xFormat} /> : undefined
              }
              label={xAxisLabel}
            />
            <YAxis
              type="number"
              tick={<NumericTick anchor="end" dy={4} format={yFormat} />}
              width={65}
              label={yAxisLabel}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    xType === 'number'
                      ? `${xCol.label}: ${xTooltipFmt(Number(value))}`
                      : `${xCol.label}: ${String(value)}`
                  }
                  formatter={(value, name, item) => (
                    <TooltipRow
                      color={
                        (item as { color?: string; fill?: string }).color ??
                        (item as { color?: string; fill?: string }).fill ??
                        'var(--chart-1)'
                      }
                      name={String(name)}
                      value={yTooltipFmt(Number(value))}
                    />
                  )}
                />
              }
            />
            {hasMultiSeries ? (
              seriesKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))
            ) : (
              <Bar dataKey={yCol.key}>
                {/* Phase 36.x — per-bar coloring cycles CHART_COLORS so each
                    category reads distinctly instead of the whole chart
                    rendering in one flat color. */}
                {pivoted.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
                {/* Value label on top of each bar. Limited to single-series
                    because grouped-bar labels overlap badly. */}
                <LabelList
                  dataKey={yCol.key}
                  position="top"
                  formatter={(v) => {
                    if (v === undefined || v === null) return '';
                    const n = Number(v);
                    if (Number.isNaN(n)) return '';
                    return yFormat ? yFormat(n) : yTooltipFmt(n);
                  }}
                  style={{
                    fontSize: 10,
                    fontVariantNumeric: 'tabular-nums lining-nums',
                    fill: 'var(--muted-foreground)',
                  }}
                />
              </Bar>
            )}
          </BarChart>
        </ChartContainer>
        {hasMultiSeries && (
          <GenericChartLegend
            seriesKeys={seriesKeys}
            colors={CHART_COLORS}
          />
        )}
      </div>
    </>
  );
}

/**
 * Phase 36.x — structured tooltip row used inside shadcn's ChartTooltipContent
 * for line + bar charts. shadcn calls `formatter(value, name, item)` and
 * renders the return value in place of the default row content — a returned
 * tuple `[value, name]` would concatenate without spacing. This component
 * emits a proper flex row: color swatch · name · value, matching the default
 * shadcn layout (indicator dot, name left, value right) but with the type-
 * aware formatted value the default can't produce.
 */
function TooltipRow({
  color,
  name,
  value,
}: {
  color: string;
  name: string;
  value: string;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-body-numeric shrink-0">{value}</span>
      <span className="text-caption text-muted-foreground flex-1 truncate">
        {name}
      </span>
    </div>
  );
}

/**
 * Phase 36.x — pivot row-level data for multi-series rendering.
 *
 * When `seriesKey` is null, returns rows unchanged and no series keys. When
 * seriesKey is set, groups rows by X and creates one wide record per X value
 * with Y keyed by each distinct series value. Rows with null/undefined series
 * are ignored (prevents an unlabeled bucket polluting the legend).
 *
 * Order of seriesKeys is first-seen order from `rows` so the color palette is
 * stable across renders as long as the underlying dataset order is stable.
 */
function pivotForSeries(
  rows: Array<Record<string, unknown>>,
  xKey: string,
  yKey: string,
  seriesKey: string | null,
): {
  pivoted: Array<Record<string, unknown>>;
  seriesKeys: string[];
} {
  if (seriesKey === null) {
    return { pivoted: rows, seriesKeys: [] };
  }

  const buckets = new Map<unknown, Record<string, unknown>>();
  const seriesKeys: string[] = [];
  const seenSeries = new Set<string>();

  for (const row of rows) {
    const xVal = row[xKey];
    const sRaw = row[seriesKey];
    if (sRaw === null || sRaw === undefined) continue;
    const sVal = String(sRaw);
    if (!seenSeries.has(sVal)) {
      seenSeries.add(sVal);
      seriesKeys.push(sVal);
    }
    let bucket = buckets.get(xVal);
    if (!bucket) {
      bucket = { [xKey]: xVal };
      buckets.set(xVal, bucket);
    }
    bucket[sVal] = row[yKey];
  }

  return {
    pivoted: Array.from(buckets.values()),
    seriesKeys,
  };
}
