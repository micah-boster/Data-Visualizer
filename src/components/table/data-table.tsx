'use client';

import { useRef } from 'react';
import { useDataTable } from '@/lib/table/hooks';
import { ColumnPresetTabs } from './column-preset-tabs';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { TableFooter } from './table-footer';
import { SortDialog } from './sort-dialog';

interface DataTableProps {
  data: Record<string, unknown>[];
}

export function DataTable({ data }: DataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { table, sorting, setSorting, activePreset, setActivePreset } =
    useDataTable(data);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar: preset tabs + sort dialog */}
      <div className="flex items-center justify-between gap-4">
        <ColumnPresetTabs
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />
        <div className="shrink-0 pr-2">
          <SortDialog sorting={sorting} onSortingChange={setSorting} />
        </div>
      </div>

      {/* Scrollable table container */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto"
        style={{ minHeight: 0 }}
      >
        <table
          className="w-full border-collapse"
          style={{
            tableLayout: 'fixed',
            width: table.getTotalSize(),
          }}
        >
          <TableHeader table={table} />
          <TableBody table={table} tableContainerRef={tableContainerRef} />
          <TableFooter table={table} />
        </table>
      </div>
    </div>
  );
}
