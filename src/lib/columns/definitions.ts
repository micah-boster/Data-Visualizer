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
import type { DrillLevel } from '@/hooks/use-drill-down';

/** Drill-down callbacks passed through TanStack Table meta */
export interface TableDrillMeta {
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string) => void;
  drillLevel?: DrillLevel;
}

function renderDrillableCell(
  ctx: CellContext<Record<string, unknown>, unknown>,
  config: { type: string; key: string },
): React.ReactNode {
  const value = ctx.getValue();
  if (value == null) return null;

  const meta = ctx.table.options.meta as TableDrillMeta | undefined;
  if (config.key === 'PARTNER_NAME') {
    console.log('[drill-debug] PARTNER_NAME cell:', { hasMeta: !!meta, onDrill: !!meta?.onDrillToPartner, level: meta?.drillLevel });
  }

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

  // BATCH: drillable at partner level
  if (
    config.key === 'BATCH' &&
    meta?.onDrillToBatch &&
    meta.drillLevel === 'partner'
  ) {
    return createElement(DrillableCell, {
      value: String(value),
      onDrill: () => meta.onDrillToBatch!(String(value)),
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
        : ({ getValue }: CellContext<Record<string, unknown>, unknown>) => {
            const value = getValue();
            if (value == null) return null; // table-body handles null display (em dash)
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
