'use client';

import { useRef } from 'react';
import { flexRender, type Table } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getCommonPinningStyles } from './pinning-styles';
import { isNumericType } from '@/lib/formatting';

interface TableBodyProps {
  table: Table<Record<string, unknown>>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function TableBody({ table, tableContainerRef }: TableBodyProps) {
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr>
          <td style={{ height: paddingTop }} />
        </tr>
      )}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        const isEvenRow = virtualRow.index % 2 === 0;

        return (
          <tr
            key={row.id}
            className={`transition-colors hover:bg-muted/50 ${
              isEvenRow ? 'bg-muted/30' : ''
            }`}
          >
            {row.getVisibleCells().map((cell) => {
              const pinningStyles = getCommonPinningStyles(cell.column, { isEvenRow });
              const meta = cell.column.columnDef.meta as { type?: string } | undefined;
              const isNumeric = meta?.type ? isNumericType(meta.type) : false;
              return (
                <td
                  key={cell.id}
                  style={{
                    ...pinningStyles,
                    width: cell.column.getSize(),
                    minWidth: cell.column.getSize(),
                  }}
                  className={`overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-sm${isNumeric ? ' text-right tabular-nums' : ''}`}
                >
                  {cell.getValue() != null
                    ? flexRender(cell.column.columnDef.cell, cell.getContext())
                    : '\u2014'}
                </td>
              );
            })}
          </tr>
        );
      })}
      {paddingBottom > 0 && (
        <tr>
          <td style={{ height: paddingBottom }} />
        </tr>
      )}
    </tbody>
  );
}
