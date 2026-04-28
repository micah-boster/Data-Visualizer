'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MatrixViewProps } from './matrix-types';
import {
  formatValue,
  getTierClass,
  polarityAwarePercentile,
  polarityForMatrixMetric,
} from './matrix-types';

export function MatrixHeatmap({
  partners,
  metrics,
  orientation,
  sortMetric,
  sortDirection,
  onSort,
}: MatrixViewProps) {
  if (orientation === 'partners-as-rows') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-label uppercase text-muted-foreground">
                Pair
              </th>
              {metrics.map((m) => (
                <th
                  key={m.key}
                  className="cursor-pointer px-3 py-2 text-right text-label uppercase text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => onSort(m.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {m.label}
                    {sortMetric === m.key && (
                      sortDirection === 'desc'
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronUp className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Phase 39 PCFG-04: each row is a (partner, product) pair —
                displayName is suffixed for multi-product partners.
                Phase 41-03 (DCR-09): cell tier color routes through
                polarityAwarePercentile so lower_is_better metrics flip the
                heatmap (lowest value = best/green) and neutral metrics
                flatten to the mid tier. */}
            {partners.map((p) => {
              const key = `${p.partnerName}::${p.product}`;
              return (
                <tr key={key} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-body whitespace-nowrap">
                    {p.displayName}
                  </td>
                  {metrics.map((m) => {
                    const pctile = m.getPercentile(p);
                    const polarity = polarityForMatrixMetric(m);
                    const adjusted = polarityAwarePercentile(pctile, polarity);
                    return (
                      <td
                        key={m.key}
                        className={`px-3 py-1.5 text-right text-body-numeric ${getTierClass(adjusted)}`}
                      >
                        {formatValue(m.getValue(p), m.format)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // metrics-as-rows orientation
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-label uppercase text-muted-foreground">
              Metric
            </th>
            {partners.map((p) => {
              const key = `${p.partnerName}::${p.product}`;
              return (
                <th
                  key={key}
                  className="px-3 py-2 text-right text-label uppercase text-muted-foreground whitespace-nowrap"
                >
                  {p.displayName}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr
              key={m.key}
              className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                sortMetric === m.key ? 'bg-muted/30' : ''
              }`}
              onClick={() => onSort(m.key)}
            >
              <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-body whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  {m.label}
                  {sortMetric === m.key && (
                    sortDirection === 'desc'
                      ? <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className="h-3 w-3" />
                  )}
                </span>
              </td>
              {partners.map((p) => {
                const pctile = m.getPercentile(p);
                // Phase 41-03 (DCR-09): mirror the partners-as-rows orientation
                // — polarity-aware percentile so the diverging palette
                // inverts for lower_is_better metrics and flattens to the mid
                // tier for neutral metrics.
                const polarity = polarityForMatrixMetric(m);
                const adjusted = polarityAwarePercentile(pctile, polarity);
                const key = `${p.partnerName}::${p.product}`;
                return (
                  <td
                    key={key}
                    className={`px-3 py-1.5 text-right text-body-numeric ${getTierClass(adjusted)}`}
                  >
                    {formatValue(m.getValue(p), m.format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
