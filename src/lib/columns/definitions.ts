/**
 * TanStack Table ColumnDef builder.
 *
 * Converts COLUMN_CONFIGS into ColumnDef[] for TanStack Table consumption.
 * Cell renderers are NOT added here (Phase 3 handles formatting).
 *
 * Drill-down support: PARTNER_NAME and BATCH cells check table.options.meta
 * for onDrillToPartner / onDrillToBatch callbacks. When present, the cell
 * wraps its value in a DrillableCell (clickable link).
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
import type { TrendingData, MetricNorm } from '@/types/partner-stats';

/** Drill-down callbacks and trending data passed through TanStack Table meta */
export interface TableDrillMeta {
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string, partnerName?: string) => void;
  drillLevel?: DrillLevel;
  trending?: TrendingData;
  /** Partner norms for heatmap deviation formatting */
  norms?: Record<string, MetricNorm> | null;
  /** Whether heatmap is enabled (user toggle) */
  heatmapEnabled?: boolean;
}

function renderDrillableCell(
  ctx: CellContext<Record<string, unknown>, unknown>,
  config: { type: string; key: string },
): React.ReactNode {
  const value = ctx.getValue();
  if (value == null) return null;

  const meta = ctx.table.options.meta as TableDrillMeta | undefined;

  // PARTNER_NAME: drillable at root level
  if (
    config.key === 'PARTNER_NAME' &&
    meta?.onDrillToPartner &&
    (!meta.drillLevel || meta.drillLevel === 'root')
  ) {
    return createElement(DrillableCell, {
      value: String(value),
      onDrill: () => meta.onDrillToPartner!(String(value)),
    });
  }

  // BATCH: drillable at root and partner levels
  if (
    config.key === 'BATCH' &&
    meta?.onDrillToBatch &&
    meta.drillLevel !== 'batch'
  ) {
    const row = ctx.row.original;
    const partner = row.PARTNER_NAME ? String(row.PARTNER_NAME) : undefined;
    return createElement(DrillableCell, {
      value: String(value),
      onDrill: () => meta.onDrillToBatch!(String(value), partner),
    });
  }

  return getCellRenderer(config.type, config.key, value);
}

export function buildColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  return COLUMN_CONFIGS.map((config) => {
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
}

/** Pre-built column definitions ready for table consumption */
export const columnDefs = buildColumnDefs();
