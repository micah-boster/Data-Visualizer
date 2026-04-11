'use client';

import { useRef } from 'react';
import { useDataTable } from '@/lib/table/hooks';
import { useFilterState } from '@/hooks/use-filter-state';
import { ColumnPresetTabs } from './column-preset-tabs';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { TableFooter } from './table-footer';
import { SortDialog } from './sort-dialog';
import { FilterBar } from '@/components/filters/filter-bar';
import { FilterChips } from '@/components/filters/filter-chips';
import { FilterEmptyState } from '@/components/filters/filter-empty-state';

interface DataTableProps {
  data: Record<string, unknown>[];
}

export function DataTable({ data }: DataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { columnFilters, setFilter, clearAll, activeFilters } =
    useFilterState(data);
  const { table, sorting, setSorting, activePreset, setActivePreset } =
    useDataTable(data, columnFilters);

  const hasFilteredRows = table.getRowModel().rows.length > 0;
  const hasActiveFilters = columnFilters.length > 0;

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

      {/* Filter bar: three combobox dropdowns */}
      <FilterBar
        data={data}
        columnFilters={columnFilters}
        onFilterChange={(param, value) => setFilter(param, value)}
      />

      {/* Active filter chips */}
      <FilterChips
        activeFilters={activeFilters}
        onRemove={(param) => setFilter(param, null)}
        onClearAll={clearAll}
      />

      {/* Scrollable table container or empty state */}
      {!hasFilteredRows && hasActiveFilters ? (
        <FilterEmptyState onClearFilters={clearAll} />
      ) : (
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
      )}
    </div>
  );
}
