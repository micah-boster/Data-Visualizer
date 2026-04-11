'use client';

import { flexRender, type Table } from '@tanstack/react-table';
import { SortIndicator } from './sort-indicator';
import { getCommonPinningStyles } from './pinning-styles';

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
            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                style={{
                  ...pinningStyles,
                  width: header.getSize(),
                }}
                className="relative select-none whitespace-nowrap bg-muted/80 px-3 py-2 text-left text-xs font-bold text-foreground backdrop-blur-sm"
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={
                      header.column.getCanSort()
                        ? 'flex cursor-pointer items-center'
                        : 'flex items-center'
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
