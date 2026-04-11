'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import { SortIndicator } from './sort-indicator';
import { getCommonPinningStyles } from './pinning-styles';
import { isNumericType } from '@/lib/formatting';

interface TableHeaderProps {
  table: Table<Record<string, unknown>>;
}

export function TableHeader({ table }: TableHeaderProps) {
  return (
    <thead className="sticky top-0 z-20">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const pinningStyles = getCommonPinningStyles(header.column);
            const meta = header.column.columnDef.meta as { type?: string } | undefined;
            const isNumeric = meta?.type ? isNumericType(meta.type) : false;
            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                style={{
                  ...pinningStyles,
                  width: header.getSize(),
                }}
                className={`relative select-none whitespace-nowrap bg-muted/80 px-3 py-2 text-xs font-bold text-foreground backdrop-blur-sm${isNumeric ? ' text-right' : ' text-left'}`}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={
                      header.column.getCanSort()
                        ? `flex cursor-pointer items-center${isNumeric ? ' justify-end' : ''}`
                        : `flex items-center${isNumeric ? ' justify-end' : ''}`
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <SortIndicator column={header.column} />
                    )}
                  </div>
                )}
                {/* Resize handle */}
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  onDoubleClick={() => header.column.resetSize()}
                  className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                    header.column.getIsResizing()
                      ? 'bg-primary opacity-100'
                      : 'opacity-0 hover:opacity-100 bg-border'
                  }`}
                />
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
