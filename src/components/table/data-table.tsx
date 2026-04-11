'use client';

import { useRef, useState, useCallback } from 'react';
import { Columns3 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useDataTable } from '@/lib/table/hooks';
import type { UseDataTableOptions } from '@/lib/table/hooks';
import { useFilterState } from '@/hooks/use-filter-state';
import { useColumnManagement } from '@/hooks/use-column-management';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
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
import { ColumnPickerSidebar } from '@/components/columns/column-picker-sidebar';
import { Button } from '@/components/ui/button';
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
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  const { columnFilters, setFilter, clearAll, activeFilters } =
    useFilterState(data);

  const drillLevel = drillState?.level ?? 'root';
  const isRoot = drillLevel === 'root';

  // Hoist setActivePreset reference for the column management hook
  // We need to create a stable reference that can be passed before table init
  const setActivePresetRef = useRef<((preset: string) => void) | undefined>(undefined);
  const columnManagement = useColumnManagement(
    (preset: string) => setActivePresetRef.current?.(preset),
  );

  const tableOptions: UseDataTableOptions = {
    onDrillToPartner,
    onDrillToBatch,
    drillLevel,
    columns: columnDefsOverride,
    columnVisibility: columnManagement.columnVisibility,
    onColumnVisibilityChange: columnManagement.setColumnVisibility,
    columnOrder: columnManagement.columnOrder,
    onColumnOrderChange: columnManagement.setColumnOrder,
  };

  const { table, sorting, setSorting, activePreset, setActivePreset } =
    useDataTable(data, isRoot ? columnFilters : undefined, tableOptions);

  // Wire up the ref so columnManagement can call setActivePreset
  setActivePresetRef.current = setActivePreset;

  // When a preset tab is clicked, also update the column management visibility
  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    // setActivePreset internally calls setColumnVisibility with PRESETS[preset]
    // which is wired to columnManagement.setColumnVisibility via options
  };

  const totalColumns = COLUMN_CONFIGS.length;

  // Drag-to-reorder state
  const [activeHeaderId, setActiveHeaderId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveHeaderId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveHeaderId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const currentOrder = columnManagement.columnOrder;
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      columnManagement.setColumnOrder(arrayMove(currentOrder, oldIndex, newIndex));
    },
    [columnManagement],
  );

  // Get the label for the currently dragged column (for DragOverlay)
  const activeColumnLabel = activeHeaderId
    ? COLUMN_CONFIGS.find((c) => c.key === activeHeaderId)?.label ?? activeHeaderId
    : null;

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
            onPresetChange={handlePresetChange}
          />
        )}
        {!isRoot && <div />}
        <div className="flex items-center gap-2 shrink-0 pr-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnPickerOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns ({columnManagement.visibleCount}/{totalColumns})
          </Button>
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
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
        <DragOverlay>
          {activeColumnLabel ? (
            <div className="rounded bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold shadow-md">
              {activeColumnLabel}
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}
      {/* Column picker sidebar */}
      <ColumnPickerSidebar
        open={columnPickerOpen}
        onOpenChange={setColumnPickerOpen}
        columnVisibility={columnManagement.columnVisibility}
        toggleColumn={columnManagement.toggleColumn}
        toggleGroup={columnManagement.toggleGroup}
        showAll={columnManagement.showAll}
        hideAll={columnManagement.hideAll}
        resetToDefaults={columnManagement.resetToDefaults}
      />
    </div>
  );
}
