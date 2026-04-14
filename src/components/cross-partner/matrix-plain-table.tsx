'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { MatrixViewProps } from './matrix-types';
import { formatValue } from './matrix-types';

export function MatrixPlainTable({
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
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium text-muted-foreground">
                Partner
              </th>
              {metrics.map((m) => (
                <th
                  key={m.key}
                  className="cursor-pointer px-3 py-2 text-right font-medium text-muted-foreground hover:text-foreground transition-colors"
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
            {partners.map((p) => (
              <tr key={p.partnerName} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                  {p.partnerName}
                </td>
                {metrics.map((m) => (
                  <td key={m.key} className="px-3 py-1.5 text-right tabular-nums">
                    {formatValue(m.getValue(p), m.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // metrics-as-rows
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium text-muted-foreground">
              Metric
            </th>
            {partners.map((p) => (
              <th
                key={p.partnerName}
                className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap"
              >
                {p.partnerName}
              </th>
            ))}
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
              <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-1">
                  {m.label}
                  {sortMetric === m.key && (
                    sortDirection === 'desc'
                      ? <ChevronDown className="h-3 w-3" />
                      : <ChevronUp className="h-3 w-3" />
                  )}
                </span>
              </td>
              {partners.map((p) => (
                <td key={p.partnerName} className="px-3 py-1.5 text-right tabular-nums">
                  {formatValue(m.getValue(p), m.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
