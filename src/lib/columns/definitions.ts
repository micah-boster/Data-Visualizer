/**
 * TanStack Table ColumnDef builder.
 *
 * Converts COLUMN_CONFIGS into ColumnDef[] for TanStack Table consumption.
 * Cell renderers are NOT added here (Phase 3 handles formatting).
 */

import type { ColumnDef } from '@tanstack/react-table';
import { COLUMN_CONFIGS } from './config';
import { WIDTH_BY_TYPE, IDENTITY_WIDTH } from './widths';

export function buildColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  return COLUMN_CONFIGS.map((config) => ({
    id: config.key,
    accessorKey: config.key,
    header: config.label,
    size: config.identity ? IDENTITY_WIDTH : (WIDTH_BY_TYPE[config.type] ?? 110),
    minSize: 60,
    maxSize: 400,
    enableSorting: true,
    meta: {
      type: config.type,
      identity: config.identity,
    },
  }));
}

/** Pre-built column definitions ready for table consumption */
export const columnDefs = buildColumnDefs();
