'use client';

import { type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
}

export function DraggableHeader({
  header,
  filterState,
  setColumnFilter,
  clearColumnFilter,
}: DraggableHeaderProps) {
  const isPinned = header.column.getIsPinned();
  const meta = header.column.columnDef.meta as { type?: string } | undefined;
  const isNumeric = meta?.type ? isNumericType(meta.type) : false;
  const pinningStyles = getCommonPinningStyles(header.column);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.id,
    disabled: !!isPinned,
  });

  const dragStyle: CSSProperties = {
    ...pinningStyles,
    width: header.getSize(),
    minWidth: header.getSize(),
    maxWidth: header.getSize(),
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <th
      ref={setNodeRef}
      colSpan={header.colSpan}
      style={dragStyle}
      className={`group/header relative select-none overflow-hidden whitespace-nowrap bg-muted/80 px-3 py-2 text-xs font-bold text-foreground backdrop-blur-sm${isNumeric ? ' text-right' : ' text-left'}`}
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
          {/* Drag grip (only for non-pinned columns) */}
          {!isPinned && (
            <button
              {...attributes}
              {...listeners}
              className="mr-1 shrink-0 cursor-grab opacity-0 group-hover/header:opacity-100 transition-opacity text-muted-foreground hover:text-foreground active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          {flexRender(header.column.columnDef.header, header.getContext())}
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
