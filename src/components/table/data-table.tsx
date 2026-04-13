'use client';

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Columns3, BookmarkCheck, Save } from 'lucide-react';
import { toast } from 'sonner';
/** Move item from oldIndex to newIndex in array (immutable) */
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = arr.slice();
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
import { useDataTable } from '@/lib/table/hooks';
import type { UseDataTableOptions } from '@/lib/table/hooks';
import { useFilterState } from '@/hooks/use-filter-state';
import { useColumnManagement } from '@/hooks/use-column-management';
import { useColumnFilters } from '@/hooks/use-column-filters';
import { useSavedViews } from '@/hooks/use-saved-views';
import type { SavedView, ViewSnapshot } from '@/lib/views/types';
import { ViewsSidebar } from '@/components/views/views-sidebar';
import { SaveViewInput } from '@/components/views/save-view-input';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { usePartnerNorms } from '@/contexts/partner-norms';
import { ColumnPresetTabs } from './column-preset-tabs';
import { HeatmapToggle } from './heatmap-toggle';
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
import type { TrendingData } from '@/types/partner-stats';
import { useAnomalyContext } from '@/contexts/anomaly-provider';

interface DataTableProps {
  data: Record<string, unknown>[];
  isFetching?: boolean;
  /** Drill-down state from useDrillDown */
  drillState?: DrillState;
  /** Drill-down callbacks */
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string, partnerName?: string) => void;
  onNavigateToLevel?: (level: DrillLevel) => void;
  /** Total row count at root level (for breadcrumb when drilled in) */
  totalRowCount?: number;
  /** Override column definitions (for account-level view) */
  columnDefs?: ColumnDef<Record<string, unknown>>[];
  /** Row count for the partner level when at batch level (for breadcrumb) */
  partnerRowCount?: number;
  /** Trending data for partner-level batch table */
  trendingData?: TrendingData | null;
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
  trendingData,
}: DataTableProps) {
  // DEBUG: detect what's causing infinite re-render loop
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef<Record<string, unknown>>({});
  renderCountRef.current++;
  if (renderCountRef.current > 50) {
    throw new Error(`DataTable infinite render loop detected (${renderCountRef.current} renders)`);
  }
  setTimeout(() => { renderCountRef.current = 0; }, 2000);
  // Log which props changed
  const currentProps: Record<string, unknown> = { data, isFetching, drillState, onDrillToPartner, onDrillToBatch, onNavigateToLevel, totalRowCount, columnDefsOverride, partnerRowCount, trendingData };
  const changed: string[] = [];
  for (const [k, v] of Object.entries(currentProps)) {
    if (prevPropsRef.current[k] !== v) changed.push(k);
  }
  prevPropsRef.current = currentProps;
  console.log(`[DataTable] render #${renderCountRef.current}${changed.length ? ' changed: ' + changed.join(', ') : ' (no prop changes)'}`);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [viewsSidebarOpen, setViewsSidebarOpen] = useState(false);
  const [saveInputOpen, setSaveInputOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const filterState = useFilterState(data);
  const { columnFilters: dimensionFilters, setFilter, clearAll: clearAllDimension, activeFilters, searchParams } = filterState;

  // DEBUG: track filter state changes
  const prevFilterStateRef = useRef(dimensionFilters);
  if (prevFilterStateRef.current !== dimensionFilters) { console.log('[DataTable] HOOK CHANGED: dimensionFilters'); prevFilterStateRef.current = dimensionFilters; }

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

  // Partner norms for heatmap deviation formatting
  const { norms, heatmapEnabled } = usePartnerNorms();

  // Anomaly data for Status column badges
  const { partnerAnomalies } = useAnomalyContext();

  // DEBUG: track context value changes
  const prevNormsRef = useRef(norms);
  const prevHeatmapRef = useRef(heatmapEnabled);
  const prevAnomalyRef = useRef(partnerAnomalies);
  if (prevNormsRef.current !== norms) { console.log('[DataTable] CONTEXT CHANGED: norms'); prevNormsRef.current = norms; }
  if (prevHeatmapRef.current !== heatmapEnabled) { console.log('[DataTable] CONTEXT CHANGED: heatmapEnabled'); prevHeatmapRef.current = heatmapEnabled; }
  if (prevAnomalyRef.current !== partnerAnomalies) { console.log('[DataTable] CONTEXT CHANGED: partnerAnomalies'); prevAnomalyRef.current = partnerAnomalies; }

  // Hoist setActivePreset reference for the column management hook
  // We need to create a stable reference that can be passed before table init
  const setActivePresetRef = useRef<((preset: string) => void) | undefined>(undefined);
  const columnManagement = useColumnManagement(
    (preset: string) => setActivePresetRef.current?.(preset),
  );

  // DEBUG: track column management changes
  const prevVisRef = useRef(columnManagement.columnVisibility);
  const prevOrderRef = useRef(columnManagement.columnOrder);
  if (prevVisRef.current !== columnManagement.columnVisibility) { console.log('[DataTable] HOOK CHANGED: columnVisibility'); prevVisRef.current = columnManagement.columnVisibility; }
  if (prevOrderRef.current !== columnManagement.columnOrder) { console.log('[DataTable] HOOK CHANGED: columnOrder'); prevOrderRef.current = columnManagement.columnOrder; }

  const tableOptions: UseDataTableOptions = {
    onDrillToPartner,
    onDrillToBatch,
    drillLevel,
    columns: columnDefsOverride,
    columnVisibility: columnManagement.columnVisibility,
    onColumnVisibilityChange: columnManagement.setColumnVisibility,
    columnOrder: columnManagement.columnOrder,
    onColumnOrderChange: columnManagement.setColumnOrder,
    trendingData,
    norms,
    heatmapEnabled,
    anomalyMap: partnerAnomalies,
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
    // Guard: only apply state for columns that exist in the current table
    const validIds = new Set(table.getAllColumns().map((c) => c.id));
    // 1. Restore sorting — filter to valid columns
    setSorting((snapshot.sorting ?? []).filter((s) => validIds.has(s.id)));
    // 2. Restore column visibility — filter to valid columns
    columnManagement.setColumnVisibility(
      Object.fromEntries(
        Object.entries(snapshot.columnVisibility).filter(([k]) => validIds.has(k)),
      ),
    );
    // 3. Restore column order — filter to valid columns
    columnManagement.setColumnOrder(
      snapshot.columnOrder.filter((k) => validIds.has(k)),
    );
    // 4. Restore in-column filters — clear all first, then set only valid
    clearAllColumnFilters();
    for (const [colId, value] of Object.entries(snapshot.columnFilters ?? {})) {
      if (validIds.has(colId)) {
        setColumnFilter(colId, value);
      }
    }
    // 5. Restore dimension filters via URL (single router.replace)
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(snapshot.dimensionFilters)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // 6. Restore column sizing — filter to valid columns
    const validSizing = Object.fromEntries(
      Object.entries(snapshot.columnSizing ?? {}).filter(([k]) => validIds.has(k)),
    );
    if (Object.keys(validSizing).length > 0) {
      table.setColumnSizing(validSizing);
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

  const captureSnapshot = useCallback((): ViewSnapshot => {
    return {
      sorting,
      columnVisibility: columnManagement.columnVisibility,
      columnOrder: columnManagement.columnOrder,
      columnFilters: { ...columnFilterState },
      dimensionFilters: {
        partner: searchParams.get('partner') ?? '',
        type: searchParams.get('type') ?? '',
        batch: searchParams.get('batch') ?? '',
      },
      columnSizing: table.getState().columnSizing,
    };
  }, [sorting, columnManagement.columnVisibility, columnManagement.columnOrder, columnFilterState, searchParams, table]);

  const handleSaveView = useCallback((name: string) => {
    const snapshot = captureSnapshot();
    saveView(name, snapshot);
    setSaveInputOpen(false);
    toast('View saved', {
      description: `"${name}" has been saved`,
      duration: 3000,
    });
  }, [captureSnapshot, saveView]);

  const handleReplaceView = useCallback((name: string) => {
    const snapshot = captureSnapshot();
    replaceView(name, snapshot);
    setSaveInputOpen(false);
    toast('View updated', {
      description: `"${name}" has been updated`,
      duration: 3000,
    });
  }, [captureSnapshot, replaceView]);

  const totalColumns = COLUMN_CONFIGS.length;

  // Native drag-to-reorder state (no @dnd-kit — incompatible with React 19)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleHeaderDragStart = useCallback((columnId: string) => {
    setDragColumnId(columnId);
  }, []);

  const handleHeaderDragOver = useCallback((_e: DragEvent, columnId: string) => {
    setDragOverColumnId(columnId);
  }, []);

  const handleHeaderDrop = useCallback(
    (targetColumnId: string) => {
      if (!dragColumnId || dragColumnId === targetColumnId) return;
      const currentOrder = columnManagement.columnOrder;
      const oldIndex = currentOrder.indexOf(dragColumnId);
      const newIndex = currentOrder.indexOf(targetColumnId);
      if (oldIndex === -1 || newIndex === -1) return;
      columnManagement.setColumnOrder(arrayMove(currentOrder, oldIndex, newIndex));
      setDragColumnId(null);
      setDragOverColumnId(null);
    },
    [dragColumnId, columnManagement],
  );

  const handleHeaderDragEnd = useCallback(() => {
    setDragColumnId(null);
    setDragOverColumnId(null);
  }, []);

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
          <HeatmapToggle />
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
          {saveInputOpen ? (
            <SaveViewInput
              isOpen={saveInputOpen}
              onSave={handleSaveView}
              onReplace={handleReplaceView}
              onCancel={() => setSaveInputOpen(false)}
              hasViewWithName={hasViewWithName}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveInputOpen(true)}
              className="h-8 gap-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              Save View
            </Button>
          )}
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
        <div
          ref={tableContainerRef}
          className="relative z-0 flex-1 overflow-auto"
          style={{ minHeight: 0 }}
        >
          <table
            className="w-full border-separate border-spacing-0"
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
              dragColumnId={dragColumnId}
              dragOverColumnId={dragOverColumnId}
              onDragStart={handleHeaderDragStart}
              onDragOver={handleHeaderDragOver}
              onDrop={handleHeaderDrop}
              onDragEnd={handleHeaderDragEnd}
            />
            <TableBody table={table} tableContainerRef={tableContainerRef} />
            <TableFooter table={table} />
          </table>
        </div>
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
