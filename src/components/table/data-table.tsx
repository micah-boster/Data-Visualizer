'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Columns3, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
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
import { useColumnFilters } from '@/hooks/use-column-filters';
import { useSavedViews } from '@/hooks/use-saved-views';
import type { SavedView } from '@/lib/views/types';
import { ViewsSidebar } from '@/components/views/views-sidebar';
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
  const [viewsSidebarOpen, setViewsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const { columnFilters: dimensionFilters, setFilter, clearAll: clearAllDimension, activeFilters, searchParams } =
    useFilterState(data);

  const {
    views,
    saveView,
    deleteView,
    restoreView,
    hasViewWithName,
    replaceView,
    restoreDefaults,
  } = useSavedViews();

  const {
    filterState: columnFilterState,
    setColumnFilter,
    clearColumnFilter,
    clearAllColumnFilters,
    activeColumnFilters,
    mergedColumnFilters,
  } = useColumnFilters();

  // Merge dimension filters with in-column filters
  const columnFilters = mergedColumnFilters(dimensionFilters);

  // Clear all filters (both dimension and in-column)
  const clearAll = () => {
    clearAllDimension();
    clearAllColumnFilters();
  };

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

  // --- Saved views callbacks ---

  const handleLoadView = useCallback((view: SavedView) => {
    const { snapshot } = view;
    // 1. Restore sorting
    setSorting(snapshot.sorting);
    // 2. Restore column visibility
    columnManagement.setColumnVisibility(snapshot.columnVisibility);
    // 3. Restore column order
    columnManagement.setColumnOrder(snapshot.columnOrder);
    // 4. Restore in-column filters — clear all first, then set each
    clearAllColumnFilters();
    for (const [colId, value] of Object.entries(snapshot.columnFilters)) {
      setColumnFilter(colId, value);
    }
    // 5. Restore dimension filters via URL (single router.replace)
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(snapshot.dimensionFilters)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // 6. Restore column sizing
    if (snapshot.columnSizing && Object.keys(snapshot.columnSizing).length > 0) {
      table.setColumnSizing(snapshot.columnSizing);
    }
    // Close sidebar after loading
    setViewsSidebarOpen(false);
  }, [setSorting, columnManagement, clearAllColumnFilters, setColumnFilter, router, pathname, table]);

  const handleDeleteView = useCallback((id: string) => {
    const { deleted } = deleteView(id);
    if (deleted) {
      toast('View deleted', {
        description: `"${deleted.name}" was removed`,
        action: {
          label: 'Undo',
          onClick: () => restoreView(deleted),
        },
        duration: 5000,
      });
    }
  }, [deleteView, restoreView]);

  const handleResetView = useCallback(() => {
    // Clear sorting to default
    setSorting([{ id: 'PARTNER_NAME', desc: false }]);
    // Reset column visibility and order to defaults
    columnManagement.resetToDefaults();
    // Clear all filters
    clearAll();
    clearAllColumnFilters();
    // Clear column sizing
    table.setColumnSizing({});
    setViewsSidebarOpen(false);
  }, [setSorting, columnManagement, clearAll, clearAllColumnFilters, table]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewsSidebarOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Views ({views.length})
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
          columnFilterChips={activeColumnFilters}
          onRemoveColumnFilter={clearColumnFilter}
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
            <TableHeader
              table={table}
              filterState={columnFilterState}
              setColumnFilter={setColumnFilter}
              clearColumnFilter={clearColumnFilter}
            />
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
        columnOrder={columnManagement.columnOrder}
        setColumnOrder={columnManagement.setColumnOrder}
        toggleColumn={columnManagement.toggleColumn}
        toggleGroup={columnManagement.toggleGroup}
        showAll={columnManagement.showAll}
        hideAll={columnManagement.hideAll}
        resetToDefaults={columnManagement.resetToDefaults}
      />
      {/* Views sidebar */}
      <ViewsSidebar
        open={viewsSidebarOpen}
        onOpenChange={setViewsSidebarOpen}
        views={views}
        onLoad={handleLoadView}
        onDelete={handleDeleteView}
        onReset={handleResetView}
        onRestoreDefaults={restoreDefaults}
      />
    </div>
  );
}
