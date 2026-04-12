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

export function buildAccountColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  return ACCOUNT_COLUMN_CONFIGS.map((config) => ({
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
}

/** Pre-built account column definitions ready for table consumption */
export const accountColumnDefs = buildAccountColumnDefs();
