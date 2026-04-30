'use client';

/**
 * Minimal sparkline preview shown when charts are collapsed.
 * Renders only Line components — no axes, grids, tooltips, or legends.
 * Purely visual; no interactivity.
 *
 * Phase 41-03 (DCR-09) — polarity prop scaffold:
 *   The current implementation uses a ROTATIONAL palette (CHART_COLORS) — each
 *   line gets a different hue based on its position in `lineKeys`. This is
 *   *series-distinguishing* color, not *value-direction* color, so polarity
 *   does not currently apply. The `metric` prop is accepted to surface the
 *   metric key for forward compatibility with Phase 43 BND-05 `<ChartFrame>`,
 *   which will introduce a polarity-aware single-line trend tint mode (delta
 *   between first and last point, colored by `getPolarity(metric)`).
 *
 *   Until BND-05 lands, passing `metric` runs the dev-mode audit warning
 *   (via `getPolarityWithAuditWarning`) so unregistered metrics surface
 *   immediately rather than at ChartFrame migration time. Production behavior
 *   is unchanged.
 */

import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { CHART_COLORS } from '@/components/charts/curve-tooltip';
import { getPolarityWithAuditWarning } from '@/lib/computation/metric-polarity';

interface SparklineProps {
  /** Pivoted data rows with { month, key1: value, key2: value, ... } format */
  data: Record<string, number | undefined>[];
  /** Data keys to render as lines (e.g., partner names or batch_0, batch_1) */
  lineKeys: string[];
  /**
   * Phase 41-03 (DCR-09) — Snowflake metric key for polarity lookup. Optional
   * because the current rotational-palette implementation does not consume
   * polarity; once BND-05 ChartFrame lands the prop will drive the
   * value-direction tint on single-line variants. Passing it now triggers the
   * dev-only audit warning for unregistered metrics.
   */
  metric?: string;
}

export function ChartSparkline({ data, lineKeys, metric }: SparklineProps) {
  if (data.length === 0 || lineKeys.length === 0) return null;

  // Phase 41-03 (DCR-09) — surface unregistered metrics in dev. Polarity
  // value is not yet consumed by the rotational palette below; deferred to
  // Phase 43 BND-05 ChartFrame's single-line trend-tint mode.
  if (metric) {
    getPolarityWithAuditWarning(metric);
  }

  return (
    <div className="mt-1 opacity-60">
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data}>
          {lineKeys.map((key, i) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
