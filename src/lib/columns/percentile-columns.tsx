'use client';

import { createElement } from 'react';
import type { ColumnDef, CellContext } from '@tanstack/react-table';
import type { CrossPartnerData, PercentileRanks } from '@/types/partner-stats';
import { PercentileCell } from '@/components/cross-partner/percentile-cell';
import { pairKey } from '@/lib/partner-config/pair';
import { getPartnerName, getStringField } from '@/lib/utils';

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
 * Compute positional rank for a (partner, product) pair on a given metric.
 * Sorts all ranked pairs by the metric descending, returns 1-based position.
 */
function computePositionalRank(
  data: CrossPartnerData,
  key: string,
  metricKey: keyof PercentileRanks,
): number | null {
  const sorted = [...data.rankedPartners].sort((a, b) => {
    const aVal = a.percentileRanks?.[metricKey] ?? 0;
    const bVal = b.percentileRanks?.[metricKey] ?? 0;
    return bVal - aVal; // descending
  });
  const idx = sorted.findIndex(
    (e) => pairKey({ partner: e.partnerName, product: e.product }) === key,
  );
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Build percentile rank column definitions for root-level partner table.
 * These are virtual columns that read from CrossPartnerData in table meta.
 *
 * Phase 41.2: lookup is keyed by `pairKey({ partner, product })` since
 * `cpData.partners` is a pair-keyed map (PCFG-04). The previous partner-only
 * lookup returned undefined for every row, rendering "—" everywhere. The
 * `meta.type: 'count'` declaration makes the footer render "—" rather than
 * a blank cell — these columns have no aggregable value, so the dash is the
 * existing null-aggregate convention.
 *
 * Phase 41-01 DCR-01: declare `aggregation: 'none'` explicitly so the footer
 * is em-dash rather than a Sum across percentile rank cells (which would be
 * meaningless — ranks aren't additive).
 */
export function buildPercentileColumns(): ColumnDef<Record<string, unknown>>[] {
  return PERCENTILE_METRICS.map((metric) => ({
    id: `__rank_${metric.key}`,
    header: metric.label,
    size: 110,
    enableSorting: false,
    enableColumnFilter: false,
    meta: { type: 'count', aggregation: 'none' as const },
    cell: (ctx: CellContext<Record<string, unknown>, unknown>) => {
      const meta = ctx.table.options.meta as CrossPartnerTableMeta | undefined;
      const cpData = meta?.crossPartnerData;
      if (!cpData) return null;

      const partner = getPartnerName(ctx.row.original);
      const product = getStringField(ctx.row.original, 'ACCOUNT_TYPE');
      if (!partner || !product) {
        return createElement(PercentileCell, {
          percentile: null,
          rank: null,
          total: cpData.rankedPartners.length,
        });
      }
      const key = pairKey({ partner, product });
      const entry = cpData.partners.get(key);
      if (!entry || !entry.percentileRanks) {
        return createElement(PercentileCell, {
          percentile: null,
          rank: null,
          total: cpData.rankedPartners.length,
        });
      }

      const percentile = entry.percentileRanks[metric.key];
      const rank = computePositionalRank(cpData, key, metric.key);

      return createElement(PercentileCell, {
        percentile,
        rank,
        total: cpData.rankedPartners.length,
      });
    },
  }));
}
