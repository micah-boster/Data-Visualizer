'use client';

import { type Table } from '@tanstack/react-table';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableHeader } from './draggable-header';

interface TableHeaderProps {
  table: Table<Record<string, unknown>>;
}

export function TableHeader({ table }: TableHeaderProps) {
  return (
    <thead className="sticky top-0 z-20">
      {table.getHeaderGroups().map((headerGroup) => {
        // Separate pinned and non-pinned headers for SortableContext
        const sortableIds = headerGroup.headers
          .filter((h) => !h.column.getIsPinned())
          .map((h) => h.id);

        return (
          <tr key={headerGroup.id}>
            <SortableContext
              items={sortableIds}
              strategy={horizontalListSortingStrategy}
            >
              {headerGroup.headers.map((header) => (
                <DraggableHeader key={header.id} header={header} />
              ))}
            </SortableContext>
          </tr>
        );
      })}
    </thead>
  );
}
