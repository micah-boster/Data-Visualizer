'use client';

import { useMemo, useState } from 'react';
import { CHART_COLORS } from '@/components/charts/curve-tooltip';
import type { MatrixViewProps } from './matrix-types';
import { formatValue, MATRIX_METRICS } from './matrix-types';
import type { PercentileRanks } from '@/types/partner-stats';

export function MatrixBarRanking({ partners, metrics }: MatrixViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<keyof PercentileRanks>(
    metrics[0]?.key ?? 'penetrationRate',
  );

  const metric = useMemo(
    () => MATRIX_METRICS.find((m) => m.key === selectedMetric) ?? MATRIX_METRICS[0],
    [selectedMetric],
  );

  const sortedPartners = useMemo(
    () => [...partners].sort((a, b) => metric.getValue(b) - metric.getValue(a)),
    [partners, metric],
  );

  const maxValue = useMemo(
    () => Math.max(...sortedPartners.map((p) => metric.getValue(p)), 0.001),
    [sortedPartners, metric],
  );

  return (
    <div className="space-y-3">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`rounded px-2 py-1 text-caption transition-colors ${
              selectedMetric === m.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            onClick={() => setSelectedMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Bars */}
      <div className="space-y-1.5">
        {sortedPartners.map((p, i) => {
          const value = metric.getValue(p);
          const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={p.partnerName} className="flex items-center gap-2">
              <span className="w-4 text-right text-label-numeric text-muted-foreground">
                {i + 1}.
              </span>
              <span className="w-28 truncate text-body">
                {p.partnerName}
              </span>
              <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{
                    width: `${Math.max(pct, 1)}%`,
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="w-16 text-right text-label-numeric">
                {formatValue(value, metric.format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
