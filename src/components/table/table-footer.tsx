'use client';

import { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { computeAggregates } from '@/lib/table/aggregations';
import { getCommonPinningStyles } from './pinning-styles';

interface TableFooterProps {
  table: Table<Record<string, unknown>>;
}

function formatAggregate(value: number | null, type: string, label: string): string {
  if (value == null) return '\u2014';

  if (type === 'currency') {
    return `${label}: $${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (type === 'percentage') {
    return `${label}: ${value.toFixed(1)}%`;
  }
  if (type === 'count') {
    return `${label}: ${value.toLocaleString()}`;
  }
  return `${label}: ${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export function TableFooter({ table }: TableFooterProps) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  const aggregates = useMemo(
    () => computeAggregates(rows, visibleColumns),
    [rows, visibleColumns]
  );

  const rowCount = rows.length;
  let isFirstVisibleColumn = true;

  return (
    <tfoot className="sticky bottom-0 z-20">
      <tr>
        {visibleColumns.map((column) => {
          const pinningStyles = getCommonPinningStyles(column);
          const meta = column.columnDef.meta as { type?: string; identity?: boolean } | undefined;
          const colType = meta?.type ?? 'text';
          const agg = aggregates[column.id];

          let displayValue = '';
          if (isFirstVisibleColumn) {
            displayValue = `${rowCount.toLocaleString()} rows`;
            isFirstVisibleColumn = false;
          } else if (colType === 'text' || colType === 'date') {
            // Skip text/date columns in footer (except first for row count)
            displayValue = '';
          } else if (agg) {
            displayValue = formatAggregate(agg.primary, colType, agg.label);
          }

          return (
            <td
              key={column.id}
              style={{
                ...pinningStyles,
                width: column.getSize(),
              }}
              className="whitespace-nowrap bg-muted/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm"
            >
              {displayValue}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
