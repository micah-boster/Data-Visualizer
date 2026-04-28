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
import type { AggregationStrategy } from '@/lib/table/aggregations';

/**
 * Phase 41-01 (DCR-01 / DCR-06) — Canonical shape for `meta` on a ColumnDef.
 *
 * `aggregation` drives the footer aggregate AND any downstream rollup
 * (root-columns summary rows). When omitted, falls back to legacy
 * `meta.type`-derived dispatch (currency/count/number → sum,
 * percentage → avgWeighted with no weight = arithmetic mean,
 * text/date → none/count). New columns SHOULD declare this explicitly per
 * `docs/AGGREGATION-CONTRACT.md`.
 *
 * `aggregationWeight` is the Snowflake column key whose value is the per-row
 * weight (required when `aggregation === 'avgWeighted'` for rate metrics
 * with a natural dollar denominator — e.g. `'TOTAL_AMOUNT_PLACED'` for
 * penetration rate).
 *
 * `footerFormatter` is the Phase 40.1 Plan 04 escape hatch — overrides
 * footer display when the aggregate value is correct but the display unit
 * doesn't match the body cell (e.g. modeled cols on 0..100 scale, delta
 * cols emitting "pp" not "%"). Wins downstream of `computeAggregates`.
 *
 * `identity` flags the column as appearing in every preset.
 */
export interface ColumnMeta {
  type?: 'text' | 'currency' | 'percentage' | 'count' | 'number' | 'date';
  identity?: boolean;
  aggregation?: AggregationStrategy;
  aggregationWeight?: string;
  footerFormatter?: (avg: number | null, label: string) => string;
}

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
        meta: {
          type: 'percentage',
          // Phase 41-01 DCR-01 — modeled rate at the horizon. avgWeighted
          // arithmetic mean (no weight) is the closest match to the existing
          // footerFormatter intent — these are projected rates per batch, and
          // the raw projected number is on 0..100 scale. footerFormatter wins
          // downstream regardless; this declaration keeps the math story
          // consistent with the AGGREGATION-CONTRACT.
          aggregation: 'avgWeighted',
          // Phase 40.1 Plan 04 — Gap 1 (footer-aggregate-unit-mismatch).
          // The generic TableFooter path routes percentage cols through
          // formatPercentage (×100), but our modeled values are already on
          // the 0..100 scale (Pitfall 5). Format the aggregate directly so
          // the footer "Avg" magnitude matches the body cells (e.g. ~42.3%,
          // NOT ~4230%).
          footerFormatter: (avg: number | null, label: string) => {
            if (avg == null) return '\u2014';
            return `${label}: ${avg.toFixed(1)}%`;
          },
        },
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
        meta: {
          type: 'percentage',
          // Phase 41-01 DCR-01 — delta cells store signed pp values on the
          // 0..100 scale. avgWeighted arithmetic mean (no weight) matches
          // the existing footerFormatter intent for an "average delta"
          // summary across visible batches.
          aggregation: 'avgWeighted',
          // Phase 40.1 Plan 04 — Gap 1 (footer-aggregate-unit-mismatch).
          // Δ values are signed and on the 0..100 scale (Plan 01 contract;
          // ModeledDeltaCell does NOT divide). Footer must match body unit
          // convention: signed "pp" suffix, NOT "%". Without this override the
          // generic formatPercentage path would emit "+0.05%" for an avg of
          // 5pp — both wrong magnitude and wrong unit.
          footerFormatter: (avg: number | null, label: string) => {
            if (avg == null) return '\u2014';
            const sign = avg > 0 ? '+' : '';
            return `${label}: ${sign}${avg.toFixed(1)}pp`;
          },
        },
      } satisfies ColumnDef<Record<string, unknown>>,
    ];
  });
}

/**
 * Phase 41-01 DCR-01 — Per-column aggregation strategy resolver. Maps a
 * Snowflake column config to its declared strategy + optional weight.
 *
 * Decision rules (mirrored in docs/AGGREGATION-CONTRACT.md):
 *   - LENDER_ID is an identifier — never sum (CONTEXT § "no more Lender ID
 *     summing"). Returns 'none' to render em-dash.
 *   - BATCH_AGE_IN_MONTHS is a bounded scalar where range (max−min) is the
 *     interesting quantity across a portfolio; arithmetic mean of ages is
 *     uninformative.
 *   - All `*_RATE_*` percentage columns (penetration / collection / SMS /
 *     email / phone / conversion) are dollar-weighted by TOTAL_AMOUNT_PLACED
 *     by default. The dollar denominator is the volume that gives each rate
 *     its meaning at portfolio scale. Channel rates (SMS/email/phone) are a
 *     softer fit — a per-channel volume column would be more correct, but
 *     none exists in the warehouse today; TOTAL_AMOUNT_PLACED weights by
 *     batch size which is still better than equal-weighting batches of
 *     wildly different sizes. Plan 05 metric audit will revisit per-rate
 *     denominators.
 *   - Identity / text / date cols → 'none' (Count: N preserved by aggregation
 *     dispatch when meta.type is 'text' or 'date').
 *   - Everything else (currency, count, additive numerics) → 'sum'.
 */
function aggregationFor(config: typeof COLUMN_CONFIGS[number]): {
  aggregation: AggregationStrategy;
  aggregationWeight?: string;
} {
  // Identity / label cols — never aggregate. PARTNER_NAME, BATCH, ACCOUNT_TYPE
  // fall through to text/date branch below; LENDER_ID is also typed 'text' in
  // config.ts, so the text fallback already covers it. Keeping explicit case
  // here documents the CONTEXT lock inline.
  if (config.key === 'LENDER_ID') {
    return { aggregation: 'none' }; // no more Lender ID summing
  }

  // BATCH_AGE_IN_MONTHS — range across visible batches is the meaningful
  // summary. Mean batch age is rarely useful at portfolio scope.
  if (config.key === 'BATCH_AGE_IN_MONTHS') {
    return { aggregation: 'range' };
  }

  // Rate / percentage cols — dollar-weighted by TOTAL_AMOUNT_PLACED. See
  // function-level JSDoc above for the per-channel caveat.
  if (config.type === 'percentage') {
    return {
      aggregation: 'avgWeighted',
      aggregationWeight: 'TOTAL_AMOUNT_PLACED',
    };
  }

  // Currency / count / additive numerics — sum.
  if (
    config.type === 'currency' ||
    config.type === 'count' ||
    config.type === 'number'
  ) {
    return { aggregation: 'sum' };
  }

  // text / date — none (text/date branch in computeAggregates renders
  // "Count: N" when meta.type is set; the explicit 'none' here pins the
  // strategy so future contributors don't need to re-derive from type).
  return { aggregation: 'none' };
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

    const aggMeta = aggregationFor(config);

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
      // Phase 41-01 DCR-01 — per-column aggregation strategy. See
      // aggregationFor() above for the decision rules and
      // docs/AGGREGATION-CONTRACT.md for the contract.
      aggregation: aggMeta.aggregation,
      aggregationWeight: aggMeta.aggregationWeight,
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
