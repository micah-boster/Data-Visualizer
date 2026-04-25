'use client';

/**
 * Root-level column definitions for the partner-summary table.
 *
 * Phase 39 PCFG-02..04: at root level the table shows ONE ROW PER
 * `(PARTNER_NAME, ACCOUNT_TYPE)` PAIR — not one row per partner. Multi-product
 * partners (Happy Money, Zable) render as N rows. The drillable PARTNER_NAME
 * cell renders a `__DISPLAY_NAME` (suffixed for multi-product partners, bare
 * for single-product partners) but passes the raw pair to `onDrillToPair`.
 *
 * These columns replace the batch-level columns (BATCH, BATCH_AGE,
 * ACCOUNT_TYPE) at root drill level.
 */

import type { ColumnDef, CellContext } from '@tanstack/react-table';
import { createElement } from 'react';
import { DrillableCell } from '@/components/navigation/drillable-cell';
import { getCellRenderer } from '@/components/table/formatted-cell';
import type { TableDrillMeta } from './definitions';
import { anomalyStatusColumn } from './anomaly-column';
import { getPartnerName, getStringField } from '@/lib/utils';
import {
  pairKey,
  sortPairs,
  displayNameForPair,
  PRODUCT_TYPE_LABELS,
  type PartnerProductPair,
} from '@/lib/partner-config/pair';

interface RootColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'currency' | 'percentage' | 'count' | 'number';
  size: number;
}

const ROOT_COLUMNS: RootColumnConfig[] = [
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', size: 180 },
  // Phase 39 PCFG-02: Product column distinguishes pair rows for multi-product
  // partners. Positioned right after PARTNER_NAME so visual scan reads
  // "Partner | Product | metrics".
  { key: 'ACCOUNT_TYPE', label: 'Product', type: 'text', size: 110 },
  { key: '__BATCH_COUNT', label: '# Batches', type: 'count', size: 90 },
  { key: 'TOTAL_ACCOUNTS', label: 'Total Accounts', type: 'count', size: 120 },
  { key: 'TOTAL_AMOUNT_PLACED', label: 'Total Placed', type: 'currency', size: 130 },
  { key: 'TOTAL_COLLECTED_LIFE_TIME', label: 'Total Collected', type: 'currency', size: 130 },
  { key: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED', label: 'Penetration Rate', type: 'percentage', size: 130 },
  { key: 'COLLECTION_AFTER_6_MONTH', label: '6mo Collection', type: 'currency', size: 130 },
  { key: 'COLLECTION_AFTER_12_MONTH', label: '12mo Collection', type: 'currency', size: 130 },
];

export function buildRootColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  const dataColumns = ROOT_COLUMNS.map((col) => ({
    id: col.key,
    accessorKey: col.key,
    header: col.label,
    size: col.size,
    minSize: 60,
    maxSize: 400,
    enableSorting: true,
    enableColumnFilter: false,
    cell: (ctx: CellContext<Record<string, unknown>, unknown>) => {
      const value = ctx.getValue();
      if (value == null) return null;

      // PARTNER_NAME: drillable, shows __DISPLAY_NAME (suffixed for
      // multi-product partners) but drills to the raw pair.
      if (col.key === 'PARTNER_NAME') {
        const meta = ctx.table.options.meta as TableDrillMeta | undefined;
        if (meta?.onDrillToPair) {
          const row = ctx.row.original;
          const partner = getPartnerName(row);
          const product = getStringField(row, 'ACCOUNT_TYPE');
          // __DISPLAY_NAME was stamped on the row by buildPairSummaryRows.
          const displayName =
            (row['__DISPLAY_NAME'] as string | undefined) ?? partner;
          return createElement(DrillableCell, {
            value: displayName,
            onDrill: () => meta.onDrillToPair!({ partner, product }),
          });
        }
      }

      // ACCOUNT_TYPE: human-friendly label rather than the raw enum value.
      if (col.key === 'ACCOUNT_TYPE') {
        const raw = String(value);
        return PRODUCT_TYPE_LABELS[raw] ?? raw;
      }

      return getCellRenderer(col.type, col.key, value);
    },
    meta: {
      type: col.type,
    },
  }));
  return [anomalyStatusColumn, ...dataColumns];
}

/**
 * Build pair-summary rows from raw batch data for root-level display.
 *
 * Phase 39 PCFG-02..04: ONE ROW PER `(PARTNER_NAME, ACCOUNT_TYPE)` PAIR — not
 * one row per partner. Each row carries:
 *   - `PARTNER_NAME` (verbatim)
 *   - `ACCOUNT_TYPE` (verbatim — raw enum, displayed via PRODUCT_TYPE_LABELS)
 *   - `__DISPLAY_NAME` (suffixed for multi-product partners, bare otherwise)
 *   - aggregate metrics
 *
 * Sorted by partner alphabetical, then within-partner by PRODUCT_TYPE_ORDER
 * (1st Party → 3rd Party → Pre-Chargeoff 3rd Party → unknown alpha).
 */
export function buildPairSummaryRows(
  batchRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  // Group rows by pair key.
  const groups = new Map<
    string,
    { pair: PartnerProductPair; rows: Record<string, unknown>[] }
  >();
  for (const row of batchRows) {
    const partner = getPartnerName(row);
    const product = getStringField(row, 'ACCOUNT_TYPE');
    if (!partner || !product) continue;
    const pair: PartnerProductPair = { partner, product };
    const key = pairKey(pair);
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { pair, rows: [row] });
  }

  // Count products per partner so __DISPLAY_NAME knows whether to suffix.
  const productsPerPartner = new Map<string, number>();
  for (const { pair } of groups.values()) {
    productsPerPartner.set(
      pair.partner,
      (productsPerPartner.get(pair.partner) ?? 0) + 1,
    );
  }

  // Build summary rows.
  const summaryRows: Record<string, unknown>[] = [];
  for (const { pair, rows } of groups.values()) {
    const sum = (key: string) =>
      rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const weightedAvg = (key: string) => {
      const total = rows.length;
      if (total === 0) return 0;
      return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0) / total;
    };

    const count = productsPerPartner.get(pair.partner) ?? 1;
    summaryRows.push({
      PARTNER_NAME: pair.partner,
      ACCOUNT_TYPE: pair.product,
      __DISPLAY_NAME: displayNameForPair(pair, count),
      LENDER_ID: rows[0].LENDER_ID,
      __BATCH_COUNT: rows.length,
      TOTAL_ACCOUNTS: sum('TOTAL_ACCOUNTS'),
      TOTAL_AMOUNT_PLACED: sum('TOTAL_AMOUNT_PLACED'),
      TOTAL_COLLECTED_LIFE_TIME: sum('TOTAL_COLLECTED_LIFE_TIME'),
      PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: weightedAvg('PENETRATION_RATE_POSSIBLE_AND_CONFIRMED'),
      COLLECTION_AFTER_6_MONTH: sum('COLLECTION_AFTER_6_MONTH'),
      COLLECTION_AFTER_12_MONTH: sum('COLLECTION_AFTER_12_MONTH'),
    });
  }

  // Sort by canonical pair order (partner alpha, then product order).
  const sortedPairs = sortPairs([...groups.values()].map(({ pair }) => pair));
  const orderIx = new Map<string, number>();
  sortedPairs.forEach((p, i) => orderIx.set(pairKey(p), i));
  return summaryRows.sort((a, b) => {
    const ka = pairKey({
      partner: String(a.PARTNER_NAME),
      product: String(a.ACCOUNT_TYPE),
    });
    const kb = pairKey({
      partner: String(b.PARTNER_NAME),
      product: String(b.ACCOUNT_TYPE),
    });
    return (orderIx.get(ka) ?? 0) - (orderIx.get(kb) ?? 0);
  });
}

/**
 * Phase 39 deprecation alias — keeps grep lookups working through the
 * migration window. Same shape, same return; consumers should migrate to
 * `buildPairSummaryRows`.
 */
export const buildPartnerSummaryRows = buildPairSummaryRows;
