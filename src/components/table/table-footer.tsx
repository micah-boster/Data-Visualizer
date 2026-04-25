'use client';

import { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { computeAggregates } from '@/lib/table/aggregations';
import { getCommonPinningStyles } from './pinning-styles';
import {
  formatCurrency,
  formatPercentage,
  formatCount,
  formatNumber,
  isNumericType,
} from '@/lib/formatting';

interface TableFooterProps {
  table: Table<Record<string, unknown>>;
}

function formatAggregate(value: number | null, type: string, label: string): string {
  if (value == null) return '\u2014';

  let formatted: string;
  switch (type) {
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'percentage':
      formatted = formatPercentage(value);
      break;
    case 'count':
      formatted = formatCount(value);
      break;
    default:
      formatted = formatNumber(value);
      break;
  }
  return `${label}: ${formatted}`;
}

export function TableFooter({ table }: TableFooterProps) {
  const rows = table.getRowModel().rows;
  // Iterate in header order so pinning offsets line up with thead/tbody.
  // `getVisibleLeafColumns()` returns columns in definition order, which
  // does NOT match the visual order produced by `getHeaderGroups()` when
  // column pinning is active — the `__anomaly_status` pinned column would
  // land at its definition index instead of leftmost, shifting every
  // footer cell's pinning offset by one.
  const headerGroups = table.getHeaderGroups();
  const lastHeaderGroup = headerGroups[headerGroups.length - 1];
  const visibleColumns = (lastHeaderGroup?.headers ?? []).map((h) => h.column);

  const aggregates = useMemo(
    () => computeAggregates(rows, visibleColumns),
    [rows, visibleColumns]
  );

  const rowCount = rows.length;

  // The row-count label goes in the first column with a non-empty header
  // string — e.g. "Partner". Special no-header columns (like the 40px-wide
  // `__anomaly_status`) get skipped, otherwise their overflow gets painted
  // over by the adjacent sticky column's background.
  const rowCountColumnId = visibleColumns.find((c) => {
    const hdr = c.columnDef.header;
    return typeof hdr === 'string' && hdr.trim().length > 0;
  })?.id;

  return (
    <tfoot className="sticky bottom-0 z-20">
      <tr>
        {visibleColumns.map((column) => {
          const pinningStyles = getCommonPinningStyles(column, { isHeader: true });
          const meta = column.columnDef.meta as { type?: string; identity?: boolean } | undefined;
          const colType = meta?.type ?? 'text';
          const agg = aggregates[column.id];

          let displayValue = '';
          if (column.id === rowCountColumnId) {
            displayValue = `${rowCount.toLocaleString()} rows`;
          } else if (colType === 'text' || colType === 'date') {
            // Skip text/date columns in footer (row count already placed above)
            displayValue = '';
          } else if (agg) {
            displayValue = formatAggregate(agg.primary, colType, agg.label);
          }

          const isNumeric = isNumericType(colType);

          return (
            <td
              key={column.id}
              style={{
                ...pinningStyles,
                width: column.getSize(),
                minWidth: column.getSize(),
              }}
              className={`whitespace-nowrap bg-muted px-3 py-2 text-muted-foreground ${isNumeric ? 'text-label-numeric text-right' : 'text-caption'}`}
            >
              {displayValue}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
