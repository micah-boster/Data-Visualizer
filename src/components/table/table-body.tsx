'use client';

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
    // Dense default — matches --table-row-height-dense (32px). Sparse (40px)
    // would need dynamic estimate wired to the container's data-density attr;
    // deferred to the density-toggle UI phase (see 26-CONTEXT Deferred Ideas).
    estimateSize: () => 32,
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

        return (
          <tr
            key={row.id}
            className="h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg"
          >
            {row.getVisibleCells().map((cell) => {
              const pinningStyles = getCommonPinningStyles(cell.column);
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
                  className={`overflow-hidden text-ellipsis whitespace-nowrap px-[var(--row-padding-x)] py-[var(--row-padding-y)] ${isNumeric ? 'text-body-numeric text-right' : 'text-body'}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? '\u2014'}
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
