'use client';

import { type DragEvent } from 'react';
import { type Table } from '@tanstack/react-table';
import { DraggableHeader } from './draggable-header';

interface TableHeaderProps {
  table: Table<Record<string, unknown>>;
  filterState?: Record<string, unknown>;
  setColumnFilter?: (columnId: string, value: unknown) => void;
  clearColumnFilter?: (columnId: string) => void;
  dragColumnId?: string | null;
  dragOverColumnId?: string | null;
  onDragStart?: (columnId: string) => void;
  onDragOver?: (e: DragEvent, columnId: string) => void;
  onDrop?: (columnId: string) => void;
  onDragEnd?: () => void;
}

export function TableHeader({
  table,
  filterState,
  setColumnFilter,
  clearColumnFilter,
  dragColumnId,
  dragOverColumnId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TableHeaderProps) {
  return (
    <thead className="sticky top-0 z-20">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <DraggableHeader
              key={header.id}
              header={header}
              filterState={filterState}
              setColumnFilter={setColumnFilter}
              clearColumnFilter={clearColumnFilter}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              isDragging={dragColumnId === header.id}
              isDragOver={dragOverColumnId === header.id}
            />
          ))}
        </tr>
      ))}
    </thead>
  );
}
