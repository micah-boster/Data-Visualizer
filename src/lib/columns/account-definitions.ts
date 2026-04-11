/**
 * TanStack Table ColumnDef builder for master_accounts.
 *
 * Follows the same pattern as definitions.ts but uses ACCOUNT_COLUMN_CONFIGS.
 * No drill-down behavior on account columns (deepest level).
 */

import type { ColumnDef, CellContext } from '@tanstack/react-table';
import { ACCOUNT_COLUMN_CONFIGS } from './account-config';
import { WIDTH_BY_TYPE, IDENTITY_WIDTH } from './widths';
import { getCellRenderer } from '@/components/table/formatted-cell';

// At batch drill-down level, PARTNER_NAME and BATCH are the same for every row
// (shown in breadcrumb) — hide them and lead with more useful columns
const HIDDEN_AT_BATCH_LEVEL = new Set(['PARTNER_NAME', 'BATCH']);

export function buildAccountColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  // Row number column for identification
  const rowNumCol: ColumnDef<Record<string, unknown>> = {
    id: '_row_num',
    header: '#',
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableSorting: false,
    cell: ({ row }) => row.index + 1,
    meta: { type: 'text', identity: true },
  };

  const dataCols = ACCOUNT_COLUMN_CONFIGS
    .filter((config) => !HIDDEN_AT_BATCH_LEVEL.has(config.key))
    .map((config) => ({
      id: config.key,
      accessorKey: config.key,
      header: config.label,
      size: config.identity ? IDENTITY_WIDTH : (WIDTH_BY_TYPE[config.type] ?? 110),
      minSize: 60,
      maxSize: 400,
      enableSorting: true,
      cell: ({ getValue }: CellContext<Record<string, unknown>, unknown>) => {
        const value = getValue();
        if (value == null) return null;
        return getCellRenderer(config.type, config.key, value);
      },
      meta: {
        type: config.type,
        identity: config.identity,
      },
    }));

  return [rowNumCol, ...dataCols];
}

/** Pre-built account column definitions ready for table consumption */
export const accountColumnDefs = buildAccountColumnDefs();
