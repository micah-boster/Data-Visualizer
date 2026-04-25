/**
 * TanStack Table ColumnDef builder.
 *
 * Converts COLUMN_CONFIGS into ColumnDef[] for TanStack Table consumption.
 * Cell renderers are NOT added here (Phase 3 handles formatting).
 *
 * Drill-down support: PARTNER_NAME and BATCH cells check table.options.meta
 * for onDrillToPair / onDrillToBatch callbacks. When present, the cell
 * wraps its value in a DrillableCell (clickable link).
 *
 * Phase 39 PCFG-03: PARTNER_NAME drilling fires `onDrillToPair` with the
 * full `(partner, product)` pair derived from row.PARTNER_NAME +
 * row.ACCOUNT_TYPE. `onDrillToBatch` accepts an optional pair payload so
 * batch drills also carry product context (rather than relying on drillState).
 */

import type { ColumnDef, CellContext, FilterFn } from '@tanstack/react-table';
import { createElement } from 'react';
import { COLUMN_CONFIGS } from './config';
import { WIDTH_BY_TYPE, IDENTITY_WIDTH } from './widths';
import { checklistFilter, rangeFilter } from './filter-functions';
import { getCellRenderer } from '@/components/table/formatted-cell';
import { DrillableCell } from '@/components/navigation/drillable-cell';
import { TrendIndicator, InsufficientTrendIndicator } from '@/components/table/trend-indicator';
import { TRENDING_METRICS } from '@/lib/computation/compute-trending';
import { getFormatter, isNumericType, computeDeviation, HEATMAP_COLUMNS } from '@/lib/formatting';
import type { DrillLevel } from '@/hooks/use-drill-down';
import type { TrendingData, MetricNorm, PartnerAnomaly, CrossPartnerData } from '@/types/partner-stats';
import { anomalyStatusColumn } from './anomaly-column';
import { getPartnerName, getStringField } from '@/lib/utils';
import type { PartnerProductPair } from '@/lib/partner-config/pair';

/** Drill-down callbacks and trending data passed through TanStack Table meta */
export interface TableDrillMeta {
  /**
   * Phase 39 PCFG-03 — drill to a specific (partner, product) pair. Called
   * by the PARTNER_NAME cell at root level after extracting both PARTNER_NAME
   * and ACCOUNT_TYPE from the row.
   */
  onDrillToPair?: (pair: PartnerProductPair) => void;
  onDrillToBatch?: (name: string, pair?: PartnerProductPair) => void;
  drillLevel?: DrillLevel;
  trending?: TrendingData;
  /** Partner norms for heatmap deviation formatting */
  norms?: Record<string, MetricNorm> | null;
  /** Whether heatmap is enabled (user toggle) */
  heatmapEnabled?: boolean;
  /**
   * Phase 39 PCFG-03: anomaly map keyed by `pairKey` ("PARTNER::PRODUCT").
   * Sidebar pair rows + root summary rows look up flagged status by pair.
   */
  anomalyMap?: Map<string, PartnerAnomaly>;
  /** Cross-partner data for percentile rank columns */
  crossPartnerData?: CrossPartnerData | null;
}

function renderDrillableCell(
  ctx: CellContext<Record<string, unknown>, unknown>,
  config: { type: string; key: string },
): React.ReactNode {
  const value = ctx.getValue();
  if (value == null) return null;

  const meta = ctx.table.options.meta as TableDrillMeta | undefined;

  // PARTNER_NAME: drillable at root level. Phase 39 PCFG-03 — fires
  // onDrillToPair with the full (partner, product) pair extracted from the
  // row. Falls through to text rendering if onDrillToPair isn't wired.
  if (
    config.key === 'PARTNER_NAME' &&
    meta?.onDrillToPair &&
    (!meta.drillLevel || meta.drillLevel === 'root')
  ) {
    const row = ctx.row.original;
    const partner = String(value);
    const product = getStringField(row, 'ACCOUNT_TYPE');
    return createElement(DrillableCell, {
      value: partner,
      onDrill: () => meta.onDrillToPair!({ partner, product }),
    });
  }

  // BATCH: drillable at root and partner levels.
  if (
    config.key === 'BATCH' &&
    meta?.onDrillToBatch &&
    meta.drillLevel !== 'batch'
  ) {
    const row = ctx.row.original;
    const partner = row.PARTNER_NAME ? getPartnerName(row) : '';
    const product = getStringField(row, 'ACCOUNT_TYPE');
    const pair: PartnerProductPair | undefined =
      partner && product ? { partner, product } : undefined;
    return createElement(DrillableCell, {
      value: String(value),
      onDrill: () => meta.onDrillToBatch!(String(value), pair),
    });
  }

  return getCellRenderer(config.type, config.key, value);
}

export function buildColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  const dataColumns: ColumnDef<Record<string, unknown>>[] = COLUMN_CONFIGS.map((config) => {
    // Determine filter function based on column type
    let filterFn: FilterFn<Record<string, unknown>> | undefined;
    if (config.type === 'text') {
      filterFn = checklistFilter;
    } else if (['currency', 'percentage', 'count', 'number'].includes(config.type)) {
      filterFn = rangeFilter;
    }

    return {
    id: config.key,
    accessorKey: config.key,
    header: config.label,
    size: config.identity ? IDENTITY_WIDTH : (WIDTH_BY_TYPE[config.type] ?? 110),
    minSize: 60,
    maxSize: 400,
    enableSorting: true,
    enableColumnFilter: !config.identity,
    filterFn: filterFn as FilterFn<Record<string, unknown>> | undefined,
    cell:
      config.key === 'PARTNER_NAME' || config.key === 'BATCH'
        ? (ctx: CellContext<Record<string, unknown>, unknown>) =>
            renderDrillableCell(ctx, config)
        : (ctx: CellContext<Record<string, unknown>, unknown>) => {
            const value = ctx.getValue();
            if (value == null) return null; // table-body handles null display (em dash)

            // Trending arrows: only at partner level, only for trended metrics
            const meta = ctx.table.options.meta as TableDrillMeta | undefined;
            if (
              meta?.drillLevel === 'partner' &&
              (TRENDING_METRICS as readonly string[]).includes(config.key) &&
              meta?.trending
            ) {
              const formatter = isNumericType(config.type) ? getFormatter(config.type) : null;
              const formattedValue = formatter ? formatter(Number(value)) : String(value);

              if (meta.trending.insufficientHistory) {
                return createElement(InsufficientTrendIndicator, { formattedValue });
              }

              const trend = meta.trending.trends.find(t => t.metric === config.key);
              if (trend) {
                const lowConfidence = meta.trending.batchCount < 5;
                // Compute deviation for heatmap background on trending cells
                let deviation = null;
                if (meta.heatmapEnabled && meta.norms && HEATMAP_COLUMNS.has(config.key)) {
                  const norm = meta.norms[config.key];
                  if (norm) {
                    deviation = computeDeviation(Number(value), norm);
                  }
                }
                return createElement(TrendIndicator, {
                  trend,
                  formattedValue,
                  columnType: config.type,
                  lowConfidence,
                  deviation,
                });
              }
            }

            return getCellRenderer(config.type, config.key, value);
          },
    meta: {
      type: config.type,
      identity: config.identity,
    },
  };
  });

  // Prepend anomaly status column as leftmost column
  return [anomalyStatusColumn, ...dataColumns];
}

/** Pre-built column definitions ready for table consumption */
export const columnDefs = buildColumnDefs();
