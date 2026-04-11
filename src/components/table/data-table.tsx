'use client';

import { useRef } from 'react';
import { useDataTable } from '@/lib/table/hooks';
import type { UseDataTableOptions } from '@/lib/table/hooks';
import { useFilterState } from '@/hooks/use-filter-state';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import { ColumnPresetTabs } from './column-preset-tabs';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { TableFooter } from './table-footer';
import { SortDialog } from './sort-dialog';
import { ExportButton } from './export-button';
import { FilterBar } from '@/components/filters/filter-bar';
import { FilterChips } from '@/components/filters/filter-chips';
import { FilterEmptyState } from '@/components/filters/filter-empty-state';
import { BreadcrumbTrail } from '@/components/navigation/breadcrumb-trail';
import type { ColumnDef } from '@tanstack/react-table';

interface DataTableProps {
  data: Record<string, unknown>[];
  isFetching?: boolean;
  /** Drill-down state from useDrillDown */
  drillState?: DrillState;
  /** Drill-down callbacks */
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string) => void;
  onNavigateToLevel?: (level: DrillLevel) => void;
  /** Total row count at root level (for breadcrumb when drilled in) */
  totalRowCount?: number;
  /** Override column definitions (for account-level view) */
  columnDefs?: ColumnDef<Record<string, unknown>>[];
  /** Row count for the partner level when at batch level (for breadcrumb) */
  partnerRowCount?: number;
}

export function DataTable({
  data,
  isFetching = false,
  drillState,
  onDrillToPartner,
  onDrillToBatch,
  onNavigateToLevel,
  totalRowCount,
  columnDefs: columnDefsOverride,
  partnerRowCount,
}: DataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { columnFilters, setFilter, clearAll, activeFilters } =
    useFilterState(data);

  const drillLevel = drillState?.level ?? 'root';
  const isRoot = drillLevel === 'root';

  const tableOptions: UseDataTableOptions = {
    onDrillToPartner,
    onDrillToBatch,
    drillLevel,
    columns: columnDefsOverride,
  };

  const { table, sorting, setSorting, activePreset, setActivePreset } =
    useDataTable(data, isRoot ? columnFilters : undefined, tableOptions);

  const hasFilteredRows = table.getRowModel().rows.length > 0;
  const hasActiveFilters = columnFilters.length > 0;

  // Compute breadcrumb row counts
  const breadcrumbRowCounts = {
    root: totalRowCount ?? data.length,
    partner: drillLevel === 'partner'
      ? table.getRowModel().rows.length
      : drillLevel === 'batch'
        ? partnerRowCount
        : undefined,
    batch: drillLevel === 'batch'
      ? table.getRowModel().rows.length
      : undefined,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar: preset tabs + sort dialog */}
      <div className="flex items-center justify-between gap-4">
        {isRoot && (
          <ColumnPresetTabs
            activePreset={activePreset}
            onPresetChange={setActivePreset}
          />
        )}
        {!isRoot && <div />}
        <div className="flex items-center gap-2 shrink-0 pr-2">
          <SortDialog sorting={sorting} onSortingChange={setSorting} />
          <ExportButton
            table={table}
            activeFilters={activeFilters}
            isFetching={isFetching}
            disabled={isFetching || table.getRowModel().rows.length === 0}
          />
        </div>
      </div>

      {/* Filter bar: only shown at root level */}
      {isRoot && (
        <FilterBar
          data={data}
          columnFilters={columnFilters}
          onFilterChange={(param, value) => setFilter(param, value)}
        />
      )}

      {/* Active filter chips: only shown at root level */}
      {isRoot && (
        <FilterChips
          activeFilters={activeFilters}
          onRemove={(param) => setFilter(param, null)}
          onClearAll={clearAll}
        />
      )}

      {/* Breadcrumb trail */}
      {drillState && onNavigateToLevel && (
        <BreadcrumbTrail
          state={drillState}
          rowCounts={breadcrumbRowCounts}
          onNavigate={onNavigateToLevel}
        />
      )}

      {/* Scrollable table container or empty state */}
      {!hasFilteredRows && hasActiveFilters && isRoot ? (
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
