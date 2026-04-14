'use client';

import { createElement } from 'react';
import type { ColumnDef, CellContext } from '@tanstack/react-table';
import type { CrossPartnerData, PercentileRanks } from '@/types/partner-stats';
import { PercentileCell } from '@/components/cross-partner/percentile-cell';

/** Metric definitions for percentile columns */
const PERCENTILE_METRICS: {
  key: keyof PercentileRanks;
  label: string;
}[] = [
  { key: 'penetrationRate', label: 'Pen. Rank' },
  { key: 'collectionRate6mo', label: '6mo Rank' },
  { key: 'collectionRate12mo', label: '12mo Rank' },
  { key: 'totalCollected', label: 'Collected Rank' },
];

/** Interface for table meta that includes cross-partner data */
export interface CrossPartnerTableMeta {
  crossPartnerData?: CrossPartnerData | null;
}

/**
 * Compute positional rank for a partner on a given metric.
 * Sorts all ranked partners by the metric descending, returns 1-based position.
 */
function computePositionalRank(
  data: CrossPartnerData,
  partnerName: string,
  metricKey: keyof PercentileRanks,
): number | null {
  const sorted = [...data.rankedPartners].sort((a, b) => {
    const aVal = a.percentileRanks?.[metricKey] ?? 0;
    const bVal = b.percentileRanks?.[metricKey] ?? 0;
    return bVal - aVal; // descending
  });
  const idx = sorted.findIndex((e) => e.partnerName === partnerName);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Build percentile rank column definitions for root-level partner table.
 * These are virtual columns that read from CrossPartnerData in table meta.
 */
export function buildPercentileColumns(): ColumnDef<Record<string, unknown>>[] {
  return PERCENTILE_METRICS.map((metric) => ({
    id: `__rank_${metric.key}`,
    header: metric.label,
    size: 110,
    enableSorting: false,
    enableColumnFilter: false,
    cell: (ctx: CellContext<Record<string, unknown>, unknown>) => {
      const meta = ctx.table.options.meta as CrossPartnerTableMeta | undefined;
      const cpData = meta?.crossPartnerData;
      if (!cpData) return null;

      const partnerName = String(ctx.row.original.PARTNER_NAME ?? '');
      const entry = cpData.partners.get(partnerName);
      if (!entry || !entry.percentileRanks) {
        return createElement(PercentileCell, {
          percentile: null,
          rank: null,
          total: cpData.rankedPartners.length,
        });
      }

      const percentile = entry.percentileRanks[metric.key];
      const rank = computePositionalRank(cpData, partnerName, metric.key);

      return createElement(PercentileCell, {
        percentile,
        rank,
        total: cpData.rankedPartners.length,
      });
    },
  }));
}
