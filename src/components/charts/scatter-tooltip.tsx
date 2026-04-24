'use client';

/**
 * Phase 36.x — custom tooltip for scatter variant of GenericChart.
 *
 * Recharts' ScatterChart hands the Tooltip a payload with TWO items per point
 * (one for each axis). shadcn's <ChartTooltipContent> iterates payload rows
 * one-at-a-time with a single formatter, which can't distinguish X vs Y —
 * the result is the Y formatter applied to the X value (currency-as-percent)
 * plus a NaN in the label header (because labelFormatter receives the Y
 * column's label string, not the X value).
 *
 * This component bypasses that by reading the hovered row directly from
 * `payload[0].payload` and rendering one line per axis with its own
 * type-aware formatter. Style matches ChartTooltipContent's shell.
 */
import type { ColumnConfig } from '@/lib/columns/config';

interface ScatterTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
  xCol: ColumnConfig;
  yCol: ColumnConfig;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  /** Optional categorical column used for per-point coloring / labeling. */
  seriesCol?: ColumnConfig | null;
}

export function ScatterTooltip({
  active,
  payload,
  xCol,
  yCol,
  xFormat,
  yFormat,
  seriesCol,
}: ScatterTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const xRaw = row[xCol.key];
  const yRaw = row[yCol.key];
  const xDisplay =
    xRaw === null || xRaw === undefined || Number.isNaN(Number(xRaw))
      ? '—'
      : xFormat(Number(xRaw));
  const yDisplay =
    yRaw === null || yRaw === undefined || Number.isNaN(Number(yRaw))
      ? '—'
      : yFormat(Number(yRaw));

  const seriesRaw = seriesCol ? row[seriesCol.key] : undefined;
  const seriesDisplay =
    seriesCol && seriesRaw !== null && seriesRaw !== undefined
      ? String(seriesRaw)
      : null;

  return (
    <div className="grid min-w-32 items-start gap-1 rounded-lg bg-surface-overlay px-2.5 py-1.5 shadow-elevation-overlay">
      {seriesDisplay !== null && (
        <div className="flex items-center justify-between gap-3 border-b pb-1">
          <span className="text-caption text-muted-foreground">
            {seriesCol?.label}
          </span>
          <span className="text-label">{seriesDisplay}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-muted-foreground">{xCol.label}</span>
        <span className="text-label-numeric">{xDisplay}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-muted-foreground">{yCol.label}</span>
        <span className="text-label-numeric">{yDisplay}</span>
      </div>
    </div>
  );
}
