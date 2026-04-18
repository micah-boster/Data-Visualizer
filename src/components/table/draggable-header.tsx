'use client';

import { type CSSProperties, type DragEvent } from 'react';
import { GripVertical } from 'lucide-react';
import { flexRender, type Header } from '@tanstack/react-table';
import { SortIndicator } from './sort-indicator';
import { ColumnHeaderFilter } from './column-header-filter';
import { getCommonPinningStyles } from './pinning-styles';
import { isNumericType } from '@/lib/formatting';

interface DraggableHeaderProps {
  header: Header<Record<string, unknown>, unknown>;
  filterState?: Record<string, unknown>;
  setColumnFilter?: (columnId: string, value: unknown) => void;
  clearColumnFilter?: (columnId: string) => void;
  onDragStart?: (columnId: string) => void;
  onDragOver?: (e: DragEvent, columnId: string) => void;
  onDrop?: (columnId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function DraggableHeader({
  header,
  filterState,
  setColumnFilter,
  clearColumnFilter,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
}: DraggableHeaderProps) {
  const isPinned = header.column.getIsPinned();
  const meta = header.column.columnDef.meta as { type?: string } | undefined;
  const isNumeric = meta?.type ? isNumericType(meta.type) : false;
  const pinningStyles = getCommonPinningStyles(header.column, { isHeader: true });

  const style: CSSProperties = {
    ...pinningStyles,
    width: header.getSize(),
    minWidth: header.getSize(),
    opacity: isDragging ? 0.4 : 1,
    ...(isDragOver ? { borderLeft: '2px solid hsl(var(--primary))' } : {}),
  };

  return (
    <th
      colSpan={header.colSpan}
      style={style}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.(e, header.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(header.id);
      }}
      className={`group/header relative select-none overflow-hidden bg-surface-base px-3 py-2 text-label text-foreground${isNumeric ? ' text-right' : ' text-left'}`}
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
          {/* Drag grip — only this element is draggable, not the whole th */}
          {!isPinned && (
            <span
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', header.id);
                onDragStart?.(header.id);
                e.stopPropagation();
              }}
              onDragEnd={() => onDragEnd?.()}
              className="mr-1 shrink-0 cursor-grab opacity-0 group-hover/header:opacity-100 transition-opacity text-muted-foreground hover:text-foreground active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="line-clamp-2 break-words leading-tight">
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {header.column.getCanSort() && (
            <SortIndicator column={header.column} />
          )}
          {setColumnFilter && clearColumnFilter && (
            <ColumnHeaderFilter
              column={header.column}
              currentFilterValue={filterState?.[header.column.id]}
              setColumnFilter={setColumnFilter}
              clearColumnFilter={clearColumnFilter}
            />
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
}
