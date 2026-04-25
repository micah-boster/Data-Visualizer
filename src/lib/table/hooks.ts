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
} from '@tanstack/react-table';
import { columnDefs } from '@/lib/columns/definitions';
import type { TableDrillMeta } from '@/lib/columns/definitions';
import { PRESETS, DEFAULT_PRESET } from '@/lib/columns/presets';
import type { DrillLevel } from '@/hooks/use-drill-down';
import type { TrendingData, MetricNorm, PartnerAnomaly, CrossPartnerData } from '@/types/partner-stats';
import type { PartnerProductPair } from '@/lib/partner-config/pair';

export interface UseDataTableOptions {
  /** Phase 39 PCFG-03 — pair-aware partner drill. */
  onDrillToPair?: (pair: PartnerProductPair) => void;
  onDrillToBatch?: (name: string, pair?: PartnerProductPair) => void;
  drillLevel?: DrillLevel;
  columns?: ColumnDef<Record<string, unknown>>[];
  /** Extra columns to append after the standard column definitions (e.g. percentile rank columns) */
  extraColumns?: ColumnDef<Record<string, unknown>>[];
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  columnOrder?: string[];
  onColumnOrderChange?: OnChangeFn<string[]>;
  trendingData?: TrendingData | null;
  norms?: Record<string, MetricNorm> | null;
  heatmapEnabled?: boolean;
  /** Phase 39 PCFG-03 — anomaly map keyed by pairKey. */
  anomalyMap?: Map<string, PartnerAnomaly>;
  /** Cross-partner data for percentile rank column cell renderers */
  crossPartnerData?: CrossPartnerData | null;
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
 *
 * KI-14 deferred (see Phase 25 Plan D): the `.setOptions` call on the ref
 * AND the final `return tableRef.current` both happen during render. This
 * is the deliberate React-19 workaround for TanStack Table v8 — v8 calls
 * setOptions() during render internally, and refactoring to effects causes
 * "Maximum update depth exceeded". Do not refactor until TanStack Table v9
 * migration. The lint errors from `react-hooks/refs-in-render` on this
 * function are expected and suppressed by this explanatory block.
 */
function useStableReactTable(
  options: Parameters<typeof import('@tanstack/react-table').useReactTable<Record<string, unknown>>>[0],
): Table<Record<string, unknown>> {
  // Create table once
  const [tableRef] = useState(() => ({
    current: createTable<Record<string, unknown>>({
      state: {},
      onStateChange: () => {},
      renderFallbackValue: null,
      ...options,
    } as TableOptionsResolved<Record<string, unknown>>),
  }));

  // Intentional ref-write-during-render: TanStack v8 expects options to be
  // merged synchronously before row-model accessors run. See block comment
  // above. (KI-14 deferred: Phase 25 Plan D.)
  tableRef.current.setOptions((prev) => ({
    ...prev,
    ...options,
    state: {
      ...tableRef.current.initialState,
      ...options.state,
    },
    onStateChange: () => {
      // No-op: controlled state handlers (setSorting etc.) handle re-renders
    },
  }));

  // Intentional ref-read-during-render: caller consumes the table instance
  // immediately for header/row rendering. (KI-14 deferred: Phase 25 Plan D.)
  return tableRef.current;
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

  // KI-12 opt-out (see Phase 25 Plan D): deps are intentionally sub-property
  // references (`options?.columns`, `options?.extraColumns`) rather than the
  // full `options` object. `options` is recreated as a new literal on every
  // render inside DataTable — depending on it would re-memoize `columns`
  // every render and defeat the memo entirely. A function-level
  // `'use no memo'` would disable Compiler optimization for the whole
  // `useDataTable` hook (including `columnPinning`, `meta`, etc.), so we
  // scope the opt-out to just this memo via an eslint-disable comment.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const columns = useMemo(() => {
    const base = options?.columns ?? columnDefs;
    if (options?.extraColumns && options.extraColumns.length > 0) {
      return [...base, ...options.extraColumns];
    }
    return base;
  }, [options?.columns, options?.extraColumns]);

  // Reset sorting when column definitions change (e.g. drill level change).
  // Intentional setState-in-effect: the sort reset must fire AFTER the new
  // `columns` reference is committed, so TanStack's `sortedRowModel` sees
  // a consistent (columns, sorting=[]) pair. Refactoring to a useMemo-based
  // guard shifts when the reset fires relative to render and risks
  // transient "sorting id not found in columns" states. (KI-13 deferred:
  // see Phase 25 Plan D.)
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setSorting([]);
    }
  }, [columns]);

  const meta: TableDrillMeta | undefined = useMemo(() => {
    if (!options?.onDrillToPair && !options?.onDrillToBatch && !options?.trendingData && !options?.norms && !options?.anomalyMap && !options?.crossPartnerData) return undefined;
    return {
      onDrillToPair: options?.onDrillToPair,
      onDrillToBatch: options?.onDrillToBatch,
      drillLevel: options?.drillLevel,
      trending: options?.trendingData ?? undefined,
      norms: options?.norms ?? undefined,
      heatmapEnabled: options?.heatmapEnabled ?? false,
      anomalyMap: options?.anomalyMap,
      crossPartnerData: options?.crossPartnerData ?? undefined,
    };
  }, [options?.onDrillToPair, options?.onDrillToBatch, options?.drillLevel, options?.trendingData, options?.norms, options?.heatmapEnabled, options?.anomalyMap, options?.crossPartnerData]);

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
