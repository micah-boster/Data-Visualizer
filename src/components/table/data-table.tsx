'use client';

import { useRef, useState, useCallback, useMemo, useEffect, type DragEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
import { useColumnManagement } from '@/hooks/use-column-management';
import { useColumnFilters } from '@/hooks/use-column-filters';
import type { SavedView, ViewSnapshot } from '@/lib/views/types';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { usePartnerNorms } from '@/contexts/partner-norms';
import { UnifiedToolbar } from '@/components/toolbar/unified-toolbar';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { TableFooter } from './table-footer';
import { EmptyState } from '@/components/patterns/empty-state';
import { ColumnPickerSidebar } from '@/components/columns/column-picker-sidebar';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import type { TrendingData, CrossPartnerData } from '@/types/partner-stats';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import { buildPercentileColumns } from '@/lib/columns/percentile-columns';
import type { ActiveFilter, AgeBucket } from '@/hooks/use-filter-state';

interface DataTableProps {
  data: Record<string, unknown>[];
  isFetching?: boolean;
  drillState?: DrillState;
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string, partnerName?: string) => void;
  onNavigateToLevel?: (level: DrillLevel) => void;
  totalRowCount?: number;
  columnDefs?: ColumnDef<Record<string, unknown>>[];
  partnerRowCount?: number;
  trendingData?: TrendingData | null;
  crossPartnerData?: CrossPartnerData | null;
  // Lifted state from parent
  dimensionFilters: ColumnFiltersState;
  setFilter: (param: string, value: string | null) => void;
  clearAllDimension: () => void;
  activeFilters: ActiveFilter[];
  searchParams: URLSearchParams;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string, options?: { includeDrill?: boolean }) => void;
  onReplaceView: (name: string, options?: { includeDrill?: boolean }) => void;
  hasViewWithName: (name: string) => boolean;
  restoreDefaults: () => void;
  chartsExpanded: boolean;
  onToggleCharts: () => void;
  comparisonVisible: boolean;
  onOpenQuery: () => void;
  partnerOptions: string[];
  typeOptions: string[];
  selectedPartner: string | null;
  selectedType: string | null;
  /** Phase 38 FLT-01 — date-range bucket for the preset chip group. */
  age: AgeBucket;
  onAgeChange: (value: AgeBucket) => void;
  canIncludeDrill?: boolean;
  snapshotRef: React.MutableRefObject<(() => ViewSnapshot) | null>;
  loadViewRef: React.MutableRefObject<((view: SavedView) => void) | null>;
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
  crossPartnerData,
  // Lifted state
  dimensionFilters,
  setFilter,
  clearAllDimension,
  activeFilters,
  searchParams,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
  onReplaceView,
  hasViewWithName,
  restoreDefaults,
  chartsExpanded,
  onToggleCharts,
  comparisonVisible,
  onOpenQuery,
  partnerOptions,
  typeOptions,
  selectedPartner,
  selectedType,
  age,
  onAgeChange,
  canIncludeDrill,
  snapshotRef,
  loadViewRef,
}: DataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  // Hoist setActivePreset reference for the column management hook
  const setActivePresetRef = useRef<((preset: string) => void) | undefined>(undefined);
  const columnManagement = useColumnManagement(
    (preset: string) => setActivePresetRef.current?.(preset),
  );

  // Build percentile columns for root-level table
  const percentileColumns = useMemo(
    () => (isRoot && crossPartnerData ? buildPercentileColumns() : []),
    [isRoot, crossPartnerData],
  );

  const tableOptions: UseDataTableOptions = {
    onDrillToPartner,
    onDrillToBatch,
    drillLevel,
    columns: columnDefsOverride,
    extraColumns: percentileColumns.length > 0 ? percentileColumns : undefined,
    crossPartnerData: isRoot ? crossPartnerData : undefined,
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

  // Wire up the ref so columnManagement can call setActivePreset.
  // Ref assignment is deferred to useEffect (runs after commit) rather than
  // written during render. Safe because markCustomPreset is only invoked
  // from user-initiated handlers (toggleColumn, toggleGroup, etc.) which
  // always fire after the initial commit — no synchronous render→ref path.
  // Resolves KI-14 site 3.
  useEffect(() => {
    setActivePresetRef.current = setActivePreset;
  });

  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
  };

  // --- Expose snapshot capture and view loading via refs ---

  const captureSnapshot = useCallback((): ViewSnapshot => {
    return {
      sorting,
      columnVisibility: columnManagement.columnVisibility,
      columnOrder: columnManagement.columnOrder,
      columnFilters: { ...columnFilterState },
      // Phase 38 FLT-01: `batch` removed from dimensionFilters (the combobox
      // was replaced by a date-range preset chip group). Saved views that were
      // captured before FLT-01 may still carry a `batch` field in storage;
      // those are stripped on load by sanitizeSnapshot + a sonner toast.
      dimensionFilters: {
        partner: searchParams.get('partner') ?? '',
        type: searchParams.get('type') ?? '',
      },
      columnSizing: table.getState().columnSizing,
      activePreset,
      // Phase 38 FLT-01 — persist the active age bucket alongside the view
      // so load can restore the preset selection.
      batchAgeFilter: age,
    };
  }, [sorting, columnManagement.columnVisibility, columnManagement.columnOrder, columnFilterState, searchParams, table, activePreset, age]);

  const handleLoadViewInternal = useCallback((view: SavedView) => {
    const { snapshot } = view;
    const validIds = new Set(table.getAllColumns().map((c) => c.id));

    // Restore sorting
    setSorting((snapshot.sorting ?? []).filter((s) => validIds.has(s.id)));
    // Restore column visibility.
    //
    // Defect fix (2026-04-19, Phase 37-03): imported views (discriminated by
    // `snapshot.sourceQuery` — only Metabase SQL Import stamps that field)
    // carry an EXHAUSTIVE-HIDE intent: any column not listed as `true` in the
    // snapshot must be hidden, including drill-level-specific columns like
    // `__BATCH_COUNT` that aren't tracked in DEFAULT_COLUMNS and therefore
    // aren't present in the imported snapshot at all. TanStack Table defaults
    // unlisted columns to visible, so without this expansion the root-level
    // `__BATCH_COUNT` (and any future root-only column) slips through visible
    // after an import — producing the "showing all columns" bug the user
    // reported.
    //
    // Saved-view semantics are unchanged: without `sourceQuery`, we filter to
    // the snapshot's keys only (root-only columns like `__BATCH_COUNT` stay
    // at their TanStack default of visible, which is the existing contract —
    // save-view capture never touched those keys, so restoring should not
    // either).
    const visibilityEntries = Object.entries(snapshot.columnVisibility).filter(
      ([k]) => validIds.has(k),
    );
    if (snapshot.sourceQuery) {
      // Exhaustive expansion: every currently-valid column id gets an explicit
      // entry. Start from the filtered snapshot keys (so matched columns keep
      // their `true`), then fill in missing validIds with `false`.
      const map: Record<string, boolean> = Object.fromEntries(visibilityEntries);
      for (const id of validIds) {
        if (!(id in map)) map[id] = false;
      }
      columnManagement.setColumnVisibility(map);
    } else {
      columnManagement.setColumnVisibility(Object.fromEntries(visibilityEntries));
    }
    // Restore column order
    columnManagement.setColumnOrder(
      snapshot.columnOrder.filter((k) => validIds.has(k)),
    );
    // Restore in-column filters
    clearAllColumnFilters();
    for (const [colId, value] of Object.entries(snapshot.columnFilters ?? {})) {
      if (validIds.has(colId)) {
        setColumnFilter(colId, value);
      }
    }
    // Restore column sizing
    const validSizing = Object.fromEntries(
      Object.entries(snapshot.columnSizing ?? {}).filter(([k]) => validIds.has(k)),
    );
    if (Object.keys(validSizing).length > 0) {
      table.setColumnSizing(validSizing);
    }
    // Restore preset
    if (snapshot.activePreset) {
      setActivePreset(snapshot.activePreset);
    }
  }, [setSorting, columnManagement, clearAllColumnFilters, setColumnFilter, table, setActivePreset]);

  // Wire refs so parent can call these
  useEffect(() => {
    snapshotRef.current = captureSnapshot;
    loadViewRef.current = handleLoadViewInternal;
  }, [captureSnapshot, handleLoadViewInternal, snapshotRef, loadViewRef]);

  const totalColumns = COLUMN_CONFIGS.length;

  // Native drag-to-reorder state
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
  const hasActiveFilters = columnFilters.length > 0 || dimensionFilters.length > 0;
  // HEALTH-01: with upstream filtering (filteredRawData), `data` can be
  // empty directly when the root filter matches zero rows. Trigger the
  // empty state in that case too, not only when TanStack's filtered row
  // model is empty.
  const rootFilterEmpty = isRoot && data.length === 0 && dimensionFilters.length > 0;

  // Breadcrumb row counts
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
      {/* Unified toolbar — single row replacing old toolbar + filters + breadcrumb */}
      <UnifiedToolbar
        drillState={drillState ?? { level: 'root', partner: null, batch: null }}
        onNavigateToLevel={onNavigateToLevel ?? (() => {})}
        onDrillToPartner={onDrillToPartner ?? (() => {})}
        breadcrumbRowCounts={breadcrumbRowCounts}
        chartsExpanded={chartsExpanded}
        onToggleCharts={onToggleCharts}
        onOpenQuery={onOpenQuery}
        activePreset={activePreset}
        onPresetChange={handlePresetChange}
        filterData={data}
        partnerOptions={partnerOptions}
        typeOptions={typeOptions}
        selectedPartner={selectedPartner}
        selectedType={selectedType}
        age={age}
        onAgeChange={onAgeChange}
        onFilterChange={(param, value) => setFilter(param, value)}
        activeFilters={activeFilters}
        onClearAllFilters={clearAll}
        onOpenColumnPicker={() => setColumnPickerOpen(true)}
        visibleColumnCount={columnManagement.visibleCount}
        totalColumnCount={totalColumns}
        sorting={sorting}
        onSortingChange={setSorting}
        table={table}
        isFetching={isFetching}
        onSaveView={onSaveView}
        onReplaceView={onReplaceView}
        hasViewWithName={hasViewWithName}
        canIncludeDrill={canIncludeDrill}
      />

      {/* Scrollable table container or empty state */}
      {(rootFilterEmpty || (!hasFilteredRows && hasActiveFilters && isRoot)) ? (
        <EmptyState variant="no-results" onAction={clearAll} />
      ) : (
        <div
          ref={tableContainerRef}
          data-density="dense"
          // A11Y-01 (Phase 33-05 close-out): tabIndex=0 makes the scroll
          // wrapper a keyboard-reachable region so axe-core's
          // `scrollable-region-focusable` rule passes. Virtualized rows
          // inside carry their own tabIndex=0 (Plan 33-03), but TanStack
          // Virtual only mounts the visible window — axe can't always see
          // focusable descendants, so the wrapper itself must be focusable.
          // Pre-existing Plan 03 debt flagged in
          // .planning/phases/33-accessibility-audit/deferred-items.md.
          tabIndex={0}
          className="thin-scrollbar relative z-0 flex-1 overflow-auto rounded-lg bg-surface-inset"
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
    </div>
  );
}
