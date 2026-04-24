'use client';

/**
 * Phase 36.x — sidebar legend for GenericChart multi-series (line + bar).
 *
 * Replaces Recharts' built-in <Legend/>, which wraps inline and overflows
 * the chart area when series count is high (Affirm drill-down has 200+
 * batches). Renders a fixed-width scrollable list on the right of the chart
 * with one row per series value:
 *   [color swatch]  [truncated label]
 *
 * Pure presentation — no hooks, no handlers. Hovering the row shows the full
 * label via the `title` attribute.
 *
 * Colors cycle through CHART_COLORS by index, same as the <Line>/<Bar>
 * primitives in GenericChart so swatches line up with rendered lines.
 */
interface GenericChartLegendProps {
  seriesKeys: ReadonlyArray<string>;
  colors: ReadonlyArray<string>;
}

export function GenericChartLegend({
  seriesKeys,
  colors,
}: GenericChartLegendProps) {
  if (seriesKeys.length === 0) return null;
  return (
    <div
      className="thin-scrollbar flex w-40 shrink-0 flex-col gap-0.5 overflow-y-auto pl-2"
      style={{ maxHeight: '40vh' }}
      aria-label={`Series legend — ${seriesKeys.length} entries`}
    >
      {seriesKeys.map((key, i) => (
        <div
          key={key}
          className="flex items-center gap-1.5 py-0.5"
          title={key}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
          <span className="text-caption truncate">{key}</span>
        </div>
      ))}
    </div>
  );
}
