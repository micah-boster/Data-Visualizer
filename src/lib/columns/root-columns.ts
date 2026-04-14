'use client';

/**
 * Root-level column definitions for the partner-summary table.
 *
 * At root level the table shows one row per partner with aggregated metrics.
 * These columns replace the batch-level columns (BATCH, BATCH_AGE, ACCOUNT_TYPE).
 */

import type { ColumnDef, CellContext } from '@tanstack/react-table';
import { createElement } from 'react';
import { DrillableCell } from '@/components/navigation/drillable-cell';
import { getCellRenderer } from '@/components/table/formatted-cell';
import type { TableDrillMeta } from './definitions';
import { anomalyStatusColumn } from './anomaly-column';

interface RootColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'currency' | 'percentage' | 'count' | 'number';
  size: number;
}

const ROOT_COLUMNS: RootColumnConfig[] = [
  { key: 'PARTNER_NAME', label: 'Partner', type: 'text', size: 180 },
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

      // PARTNER_NAME: drillable
      if (col.key === 'PARTNER_NAME') {
        const meta = ctx.table.options.meta as TableDrillMeta | undefined;
        if (meta?.onDrillToPartner) {
          return createElement(DrillableCell, {
            value: String(value),
            onDrill: () => meta.onDrillToPartner!(String(value)),
          });
        }
      }

      return getCellRenderer(col.type, col.key, value);
    },
  }));
  return [anomalyStatusColumn, ...dataColumns];
}

/**
 * Build partner-summary rows from raw batch data for root-level display.
 * One row per unique PARTNER_NAME with aggregated metrics.
 */
export function buildPartnerSummaryRows(
  batchRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of batchRows) {
    const name = String(row.PARTNER_NAME ?? '');
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(row);
  }

  const summaryRows: Record<string, unknown>[] = [];
  for (const [name, rows] of groups) {
    const sum = (key: string) =>
      rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const weightedAvg = (key: string) => {
      const total = rows.length;
      if (total === 0) return 0;
      return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0) / total;
    };

    summaryRows.push({
      PARTNER_NAME: name,
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

  // Sort alphabetically by partner name
  return summaryRows.sort((a, b) =>
    String(a.PARTNER_NAME).localeCompare(String(b.PARTNER_NAME)),
  );
}
