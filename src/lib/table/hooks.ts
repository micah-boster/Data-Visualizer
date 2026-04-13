'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  createTable,
  type Table,
  type TableOptionsResolved,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  type SortingState,
  type ColumnPinningState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnDef,
  type OnChangeFn,
  type Updater,
  type TableState,
} from '@tanstack/react-table';
import { columnDefs } from '@/lib/columns/definitions';
import type { TableDrillMeta } from '@/lib/columns/definitions';
import { PRESETS, DEFAULT_PRESET } from '@/lib/columns/presets';
import type { DrillLevel } from '@/hooks/use-drill-down';
import type { TrendingData, MetricNorm, PartnerAnomaly } from '@/types/partner-stats';

export interface UseDataTableOptions {
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string, partnerName?: string) => void;
  drillLevel?: DrillLevel;
  columns?: ColumnDef<Record<string, unknown>>[];
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  columnOrder?: string[];
  onColumnOrderChange?: OnChangeFn<string[]>;
  trendingData?: TrendingData | null;
  norms?: Record<string, MetricNorm> | null;
  heatmapEnabled?: boolean;
  anomalyMap?: Map<string, PartnerAnomaly>;
}

// Memoize row model factories at module level
const coreRowModel = getCoreRowModel<Record<string, unknown>>();
const filteredRowModel = getFilteredRowModel<Record<string, unknown>>();
const sortedRowModel = getSortedRowModel<Record<string, unknown>>();
const facetedRowModel = getFacetedRowModel<Record<string, unknown>>();
const facetedUniqueValues = getFacetedUniqueValues<Record<string, unknown>>();
const facetedMinMaxValues = getFacetedMinMaxValues<Record<string, unknown>>();

const EMPTY_FILTERS: ColumnFiltersState = [];
const isMultiSortEvent = (e: unknown) => (e as MouseEvent).shiftKey;

/**
 * React 19-safe wrapper around useReactTable.
 *
 * TanStack Table v8's useReactTable calls setOptions() during render, which
 * merges internal + external state into a new object. In React 19, this
 * triggers setState during render → infinite loop.
 *
 * This wrapper uses createTable() directly with ref-based state management
 * to avoid the loop.
 */
function useStableReactTable(
  options: Parameters<typeof import('@tanstack/react-table').useReactTable<Record<string, unknown>>>[0],
): Table<Record<string, unknown>> {
  // Force-update mechanism
  const rerender = useReducerCompat();

  // Create table once, update options via ref
  const [tableRef] = useState(() => ({
    current: createTable<Record<string, unknown>>({
      state: {},
      onStateChange: () => {},
      renderFallbackValue: null,
      ...options,
    } as TableOptionsResolved<Record<string, unknown>>),
  }));

  // Update table options without triggering React state loop
  tableRef.current.setOptions((prev) => ({
    ...prev,
    ...options,
    state: {
      ...tableRef.current.initialState,
      ...options.state,
    },
    onStateChange: (updater: Updater<TableState>) => {
      // Just notify — our controlled state handles the actual updates
      options.onStateChange?.(updater);
      rerender();
    },
  }));

  return tableRef.current;
}

/** Simple force-update hook */
function useReducerCompat() {
  const [, setState] = useState(0);
  return useCallback(() => setState((n) => n + 1), []);
}

export function useDataTable(
  data: Record<string, unknown>[],
  columnFilters?: ColumnFiltersState,
  options?: UseDataTableOptions,
) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'PARTNER_NAME', desc: false },
  ]);

  const [activePreset, setActivePresetState] = useState(DEFAULT_PRESET);

  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>(
    () => PRESETS[DEFAULT_PRESET]
  );
  const columnVisibility = options?.columnVisibility ?? internalVisibility;
  const setColumnVisibility = options?.onColumnVisibilityChange ?? setInternalVisibility;

  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([]);
  const columnOrder = options?.columnOrder ?? internalColumnOrder;
  const setColumnOrder = options?.onColumnOrderChange ?? setInternalColumnOrder;

  const columnPinning = useMemo<ColumnPinningState>(() => ({
    left: ['__anomaly_status', 'PARTNER_NAME', 'BATCH'],
    right: [],
  }), []);

  const columns = useMemo(
    () => options?.columns ?? columnDefs,
    [options?.columns],
  );

  // Reset sorting when column definitions change
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setSorting([]);
    }
  }, [columns]);

  const meta: TableDrillMeta | undefined = useMemo(() => {
    if (!options?.onDrillToPartner && !options?.onDrillToBatch && !options?.trendingData && !options?.norms && !options?.anomalyMap) return undefined;
    return {
      onDrillToPartner: options?.onDrillToPartner,
      onDrillToBatch: options?.onDrillToBatch,
      drillLevel: options?.drillLevel,
      trending: options?.trendingData ?? undefined,
      norms: options?.norms ?? undefined,
      heatmapEnabled: options?.heatmapEnabled ?? false,
      anomalyMap: options?.anomalyMap,
    };
  }, [options?.onDrillToPartner, options?.onDrillToBatch, options?.drillLevel, options?.trendingData, options?.norms, options?.heatmapEnabled, options?.anomalyMap]);

  const stableFilters = columnFilters ?? EMPTY_FILTERS;

  const table = useStableReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnFilters: stableFilters,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: coreRowModel,
    getFilteredRowModel: filteredRowModel,
    getSortedRowModel: sortedRowModel,
    getFacetedRowModel: facetedRowModel,
    getFacetedUniqueValues: facetedUniqueValues,
    getFacetedMinMaxValues: facetedMinMaxValues,
    enableMultiSort: true,
    isMultiSortEvent,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange' as const,
    meta,
  });

  const setActivePreset = useCallback((preset: string) => {
    setActivePresetState(preset);
    if (PRESETS[preset]) {
      setColumnVisibility(PRESETS[preset]);
    }
  }, [setColumnVisibility]);

  return {
    table,
    sorting,
    setSorting,
    activePreset,
    setActivePreset,
    columnOrder,
    setColumnOrder,
  };
}
