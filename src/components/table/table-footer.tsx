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
          const pinningStyles = getCommonPinningStyles(column, { isHeader: true });
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
