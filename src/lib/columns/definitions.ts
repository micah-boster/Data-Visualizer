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
 *
 * Phase 40.1 PRJ-11 — appends four virtual modeled+delta columns
 * (`__MODELED_AFTER_{6,12}_MONTH`, `__DELTA_VS_MODELED_{6,12}_MONTH`) at the
 * end via `buildModeledColumns()`. These are NOT in COLUMN_CONFIGS (no
 * Snowflake mapping) — they are derived from BatchCurve.projection by
 * data-display.tsx, which stamps the raw numeric values onto each row before
 * passing to DataTable. Visibility is gated by `baselineMode` via a one-shot
 * visibility effect in data-table.tsx (see PRJ-13 — BaselineSelector
 * unification, table half).
 */

import type { ColumnDef, CellContext, FilterFn } from '@tanstack/react-table';
import { createElement } from 'react';
import { COLUMN_CONFIGS } from './config';
import { WIDTH_BY_TYPE, IDENTITY_WIDTH } from './widths';
import { checklistFilter, rangeFilter } from './filter-functions';
import { getCellRenderer } from '@/components/table/formatted-cell';
import { DrillableCell } from '@/components/navigation/drillable-cell';
import { TrendIndicator, InsufficientTrendIndicator } from '@/components/table/trend-indicator';
import { ModeledDeltaCell } from '@/components/table/modeled-delta-cell';
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

/**
 * Phase 40.1 PRJ-11 — horizons for modeled + delta virtual columns. Kept
 * as a separate const so adding a future horizon (3mo, 24mo) is one-line.
 *
 * Resulting column ids (template-built in `buildModeledColumns()` below):
 *   __MODELED_AFTER_6_MONTH, __DELTA_VS_MODELED_6_MONTH,
 *   __MODELED_AFTER_12_MONTH, __DELTA_VS_MODELED_12_MONTH
 */
const MODELED_HORIZONS = [6, 12] as const;

/**
 * Phase 40.1 PRJ-11 — builds the four virtual modeled/delta column defs
 * appended to `buildColumnDefs()` output. These columns:
 *
 *   - Have NO Snowflake mapping (NOT in COLUMN_CONFIGS / ALLOWED_COLUMNS).
 *   - Read from row-stamped numeric fields via `accessorKey` so the existing
 *     CSV export path (`row.getValue(col.id)` in `csv.ts:95`) Just Works
 *     (RESEARCH § Pattern 4 + § Pitfall 4).
 *   - Default to hidden — `data-table.tsx` flips them visible when
 *     `baselineMode === 'modeled'` via a one-shot visibility effect.
 *   - Render percentage values dividing by 100 (Pitfall 5: recoveryRate is
 *     0..100 throughout the app; `formatPercentage` assumes 0..1).
 *   - Δ cells render via `ModeledDeltaCell` which expects 0..100 scale and
 *     does NOT divide by 100 (Plan 01 contract).
 */
function buildModeledColumns(): ColumnDef<Record<string, unknown>>[] {
  return MODELED_HORIZONS.flatMap((month) => {
    const modeledKey = `__MODELED_AFTER_${month}_MONTH`;
    const deltaKey = `__DELTA_VS_MODELED_${month}_MONTH`;
    const metricKey = `COLLECTION_AFTER_${month}_MONTH`;
    return [
      {
        id: modeledKey,
        accessorKey: modeledKey, // CSV export reads via row.getValue(col.id)
        header: `Modeled ${month}mo`,
        size: 110,
        minSize: 60,
        maxSize: 400,
        enableSorting: true,
        // CONTEXT lock: derived cols ship without column-filter UI in v1.
        enableColumnFilter: false,
        cell: (ctx: CellContext<Record<string, unknown>, unknown>) => {
          const value = ctx.getValue();
          if (value == null) return null; // table-body emits em-dash on null
          // Pitfall 5: recoveryRate is 0..100; formatPercentage assumes 0..1.
          return getCellRenderer('percentage', modeledKey, (value as number) / 100);
        },
        meta: { type: 'percentage' },
      } satisfies ColumnDef<Record<string, unknown>>,
      {
        id: deltaKey,
        accessorKey: deltaKey, // CSV export reads via row.getValue(col.id)
        header: `Δ vs Modeled ${month}mo`,
        size: 130,
        minSize: 60,
        maxSize: 400,
        enableSorting: true,
        enableColumnFilter: false,
        cell: (ctx: CellContext<Record<string, unknown>, unknown>) => {
          const value = ctx.getValue();
          if (value == null) return null;
          // ModeledDeltaCell expects 0..100 scale (Plan 01 contract — no division).
          return createElement(ModeledDeltaCell, {
            deltaPercent: value as number,
            metricKey,
          });
        },
        // Accepted v1 limitation: CSV will show "5.30%" for delta columns where
        // the UI shows "+5.3pp". The unit mismatch is NOT explicitly listed in
        // CONTEXT § Out-of-scope — accepted as v1 minor inconsistency because:
        //   (a) the modeled+delta CSV columns are for spreadsheet analysis,
        //       not WYSIWYG, and "5.30%" is unambiguous as a magnitude;
        //   (b) implementing a custom CSV formatter for a delta-pp type adds
        //       a new meta.type entry + formatter registry change for one
        //       cell type — disproportionate to v1 scope.
        // FLAG FOR v4.2 follow-up if user feedback requests WYSIWYG delta format.
        meta: { type: 'percentage' },
      } satisfies ColumnDef<Record<string, unknown>>,
    ];
  });
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

  // Prepend anomaly status column as leftmost column. Phase 40.1 PRJ-11 —
  // append modeled+delta virtual columns at the end (default-hidden; flipped
  // visible by data-table.tsx when baselineMode === 'modeled').
  return [anomalyStatusColumn, ...dataColumns, ...buildModeledColumns()];
}

/** Pre-built column definitions ready for table consumption */
export const columnDefs = buildColumnDefs();
