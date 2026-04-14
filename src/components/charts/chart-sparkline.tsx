'use client';

/**
 * Minimal sparkline preview shown when charts are collapsed.
 * Renders only Line components — no axes, grids, tooltips, or legends.
 * Purely visual; no interactivity.
 */

import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { CHART_COLORS } from '@/components/charts/curve-tooltip';

interface SparklineProps {
  /** Pivoted data rows with { month, key1: value, key2: value, ... } format */
  data: Record<string, number | undefined>[];
  /** Data keys to render as lines (e.g., partner names or batch_0, batch_1) */
  lineKeys: string[];
}

export function ChartSparkline({ data, lineKeys }: SparklineProps) {
  if (data.length === 0 || lineKeys.length === 0) return null;

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
