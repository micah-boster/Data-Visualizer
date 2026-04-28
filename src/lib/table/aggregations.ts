import type { Row, Column } from '@tanstack/react-table';

/**
 * Aggregation strategy for a column's footer / rollup value.
 *
 * See `docs/AGGREGATION-CONTRACT.md` for the canonical decision flowchart and
 * per-column rationale. New columns SHOULD declare `meta.aggregation`
 * explicitly rather than rely on the legacy `meta.type` fallback below.
 *
 * Strategies:
 *   - `sum`         — Σ values (currency, count, additive numerics).
 *   - `avgWeighted` — Σ(value × weight) / Σ weight when `aggregationWeight`
 *                     is present; arithmetic mean (each row weight = 1)
 *                     when omitted. The right choice for *rates*.
 *   - `none`        — Footer renders em-dash. The right choice for IDs,
 *                     labels, and non-aggregable scalars.
 *   - `range`       — max − min over non-null numerics. The right choice
 *                     for bounded scalars where central tendency is
 *                     uninteresting (e.g. batch age across a partner).
 */
export type AggregationStrategy = 'sum' | 'avgWeighted' | 'none' | 'range';

export interface AggregateResult {
  primary: number | null;
  label: string;
}

interface ColumnAggMeta {
  type?: string;
  identity?: boolean;
  aggregation?: AggregationStrategy;
  aggregationWeight?: string;
}

/**
 * Pick a strategy: explicit `meta.aggregation` wins; otherwise fall back to
 * legacy `meta.type` dispatch so every existing call site keeps working
 * without edits. The legacy fallback maps:
 *   currency / count / number → sum
 *   percentage                → avgWeighted (no weight = arithmetic mean)
 *   text / date / unknown     → none
 */
function strategyFor(meta: ColumnAggMeta | undefined): AggregationStrategy {
  if (meta?.aggregation) return meta.aggregation;
  switch (meta?.type) {
    case 'currency':
    case 'count':
    case 'number':
      return 'sum';
    case 'percentage':
      return 'avgWeighted';
    case 'text':
    case 'date':
    default:
      return 'none';
  }
}

/**
 * Compute aggregate values for visible columns based on per-column strategy.
 *
 * The strategy is read from `meta.aggregation` on each column def. When
 * absent, falls back to legacy `meta.type` dispatch (DCR-01: see
 * `docs/AGGREGATION-CONTRACT.md`).
 *
 * Display formatting still happens downstream — `meta.footerFormatter`
 * (Phase 40.1 Plan 04 escape hatch) wins per-column in `table-footer.tsx`,
 * which means columns with non-default scale (e.g. modeled cols on 0..100)
 * or non-default unit (e.g. delta cols emit "pp") keep working unchanged.
 * This function only decides the math; the formatter decides the display.
 */
export function computeAggregates(
  rows: Row<Record<string, unknown>>[],
  visibleColumns: Column<Record<string, unknown>>[]
): Record<string, AggregateResult> {
  const result: Record<string, AggregateResult> = {};

  for (const column of visibleColumns) {
    const meta = column.columnDef.meta as ColumnAggMeta | undefined;
    const colId = column.id;
    const strategy = strategyFor(meta);

    if (strategy === 'none') {
      // Two sub-cases:
      //   (a) text/date columns → preserve current "Count: N" footer behavior
      //       (count of non-null values).
      //   (b) numeric column explicitly declared `aggregation: 'none'` →
      //       render em-dash (e.g. LENDER_ID — summing identity columns
      //       outputs garbage; see docs/AGGREGATION-CONTRACT.md).
      const colType = meta?.type ?? 'text';
      if (colType === 'text' || colType === 'date') {
        let count = 0;
        for (const row of rows) {
          if (row.getValue(colId) != null) count++;
        }
        result[colId] = { primary: count, label: 'Count' };
      } else {
        result[colId] = { primary: null, label: '\u2014' };
      }
      continue;
    }

    if (strategy === 'avgWeighted') {
      // Σ(value × weight) / Σ weight when aggregationWeight is present.
      // Falls back to arithmetic mean (each row weight = 1) when absent —
      // preserves the current percentage-column behavior for any column
      // that hasn't yet declared an explicit dollar denominator.
      //
      // Accept numeric strings: partner-level rows from Snowflake / static
      // cache arrive as strings, so `typeof === 'number'` would null-out
      // valid data. Coerce once via Number(...).
      const weightKey = meta?.aggregationWeight;
      let weightedSum = 0;
      let totalWeight = 0;
      let count = 0;
      for (const row of rows) {
        const raw = row.getValue(colId);
        if (raw == null || raw === '') continue;
        const v = Number(raw);
        if (!Number.isFinite(v)) continue;
        if (weightKey) {
          // Snowflake uppercase keys live on the row's original record;
          // TanStack's row.original carries the raw object. row.getValue
          // requires a column to exist, but the weight column may be
          // hidden — read via row.original instead.
          const wRaw = (row.original as Record<string, unknown>)[weightKey];
          const w = Number(wRaw);
          if (!Number.isFinite(w) || w <= 0) continue;
          weightedSum += v * w;
          totalWeight += w;
        } else {
          weightedSum += v;
          totalWeight += 1;
        }
        count++;
      }
      result[colId] = {
        primary: totalWeight > 0 && count > 0 ? weightedSum / totalWeight : null,
        label: 'Avg',
      };
      continue;
    }

    if (strategy === 'range') {
      // max − min over non-null numerics. For bounded scalars where the
      // span across the visible row set is more meaningful than a sum or
      // mean (e.g. batch age across a partner: "1mo–14mo span" beats
      // "Avg: 7.4mo" because the average is meaningless mid-portfolio).
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      let hasValue = false;
      for (const row of rows) {
        const raw = row.getValue(colId);
        if (raw == null || raw === '') continue;
        const num = Number(raw);
        if (!Number.isFinite(num)) continue;
        if (num < min) min = num;
        if (num > max) max = num;
        hasValue = true;
      }
      result[colId] = {
        primary: hasValue ? max - min : null,
        label: 'Range',
      };
      continue;
    }

    // strategy === 'sum' — currency, count, additive numerics. Accept
    // numeric strings (see avgWeighted branch above for rationale).
    let sum = 0;
    let hasValue = false;
    for (const row of rows) {
      const raw = row.getValue(colId);
      if (raw == null || raw === '') continue;
      const num = Number(raw);
      if (Number.isFinite(num)) {
        sum += num;
        hasValue = true;
      }
    }
    result[colId] = {
      primary: hasValue ? sum : null,
      label: 'Sum',
    };
  }

  return result;
}
