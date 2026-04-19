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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { NumericTick } from './numeric-tick';
import { StaleColumnWarning } from './stale-column-warning';
import { EmptyState } from '@/components/patterns/empty-state';
import { resolveColumnWithFallback } from '@/lib/charts/stale-column';
import type { ColumnConfig } from '@/lib/columns/config';
import type {
  ChartDefinition,
  GenericChartDefinition,
} from '@/lib/views/types';
import { isNumericType } from '@/lib/formatting/numbers';

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
  // Collected into an array so a plan with BOTH axes stale renders two banners,
  // stacked, above the chart. `requested` is guaranteed non-null on stale === true
  // because null-requested returns resolved === null above and is handled above.
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

  // --- ChartConfig (single series keyed on Y) ---------------------------------
  const chartConfig: ChartConfig = {
    [yCol.key]: {
      label: yCol.label,
      color: 'var(--chart-1)',
    },
  };

  const xType = rechartsAxisType(xCol);
  const chartClassName = 'h-[40vh] w-full';
  const chartMargin = { top: 5, right: 10, bottom: 5, left: 10 };

  // --- Variant dispatch (Pitfall 6 — one primitive per ChartContainer) --------
  if (definition.type === 'line') {
    return (
      <>
        {banners}
        <ChartContainer config={chartConfig} className={chartClassName}>
          <LineChart data={rows} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type={xType}
              dataKey={xCol.key}
              tick={xType === 'number' ? <NumericTick /> : undefined}
            />
            <YAxis
              type="number"
              dataKey={yCol.key}
              tick={<NumericTick anchor="end" dy={4} />}
              width={55}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey={yCol.key}
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </>
    );
  }

  if (definition.type === 'scatter') {
    // Scatter's own convention in Recharts 3.x: data bound on the <Scatter>
    // primitive (not the <ScatterChart>). Both axes numeric for this variant;
    // `xType` should resolve to 'number' because axis-eligibility restricts
    // scatter-X to numeric columns, but we still derive it through the helper
    // so a future ordinal extension passes through without a second edit.
    return (
      <>
        {banners}
        <ChartContainer config={chartConfig} className={chartClassName}>
          <ScatterChart margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type={xType}
              dataKey={xCol.key}
              tick={xType === 'number' ? <NumericTick /> : undefined}
            />
            <YAxis
              type="number"
              dataKey={yCol.key}
              tick={<NumericTick anchor="end" dy={4} />}
              width={55}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Scatter data={rows} dataKey={yCol.key} fill="var(--chart-1)" />
          </ScatterChart>
        </ChartContainer>
      </>
    );
  }

  // definition.type === 'bar' — X is always categorical for bar charts by
  // axis-eligibility rule, so `xType` should be 'category' and the tick prop
  // is omitted (Recharts default renders cleanly for categorical labels).
  return (
    <>
      {banners}
      <ChartContainer config={chartConfig} className={chartClassName}>
        <BarChart data={rows} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type={xType}
            dataKey={xCol.key}
            tick={xType === 'number' ? <NumericTick /> : undefined}
          />
          <YAxis
            type="number"
            dataKey={yCol.key}
            tick={<NumericTick anchor="end" dy={4} />}
            width={55}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey={yCol.key} fill="var(--chart-1)" />
        </BarChart>
      </ChartContainer>
    </>
  );
}
