'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useReactTable,
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
import type { TrendingData, MetricNorm, PartnerAnomaly } from '@/types/partner-stats';

export interface UseDataTableOptions {
  /** Optional drill-down callbacks passed to column cell renderers via table meta */
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string, partnerName?: string) => void;
  drillLevel?: DrillLevel;
  /** Optional override column definitions (used for account-level view) */
  columns?: ColumnDef<Record<string, unknown>>[];
  /** External column visibility state (from useColumnManagement) */
  columnVisibility?: VisibilityState;
  /** External column visibility setter (from useColumnManagement) */
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  /** External column order (from useColumnManagement) */
  columnOrder?: string[];
  /** External column order setter (from useColumnManagement) */
  onColumnOrderChange?: OnChangeFn<string[]>;
  /** Trending data for partner-level batch table */
  trendingData?: TrendingData | null;
  /** Partner norms for heatmap deviation formatting */
  norms?: Record<string, MetricNorm> | null;
  /** Whether heatmap is enabled */
  heatmapEnabled?: boolean;
  /** Root-level anomaly map for Status column badges */
  anomalyMap?: Map<string, PartnerAnomaly>;
}

// Memoize row model factories at module level — they never change
const coreRowModel = getCoreRowModel<Record<string, unknown>>();
const filteredRowModel = getFilteredRowModel<Record<string, unknown>>();
const sortedRowModel = getSortedRowModel<Record<string, unknown>>();
const facetedRowModel = getFacetedRowModel<Record<string, unknown>>();
const facetedUniqueValues = getFacetedUniqueValues<Record<string, unknown>>();
const facetedMinMaxValues = getFacetedMinMaxValues<Record<string, unknown>>();

const EMPTY_FILTERS: ColumnFiltersState = [];
const isMultiSortEvent = (e: unknown) => (e as MouseEvent).shiftKey;

export function useDataTable(
  data: Record<string, unknown>[],
  columnFilters?: ColumnFiltersState,
  options?: UseDataTableOptions,
) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'PARTNER_NAME', desc: false },
  ]);

  const [activePreset, setActivePresetState] = useState(DEFAULT_PRESET);

  // Use external visibility state if provided, otherwise fall back to internal preset-based state
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>(
    () => PRESETS[DEFAULT_PRESET]
  );
  const columnVisibility = options?.columnVisibility ?? internalVisibility;
  const setColumnVisibility = options?.onColumnVisibilityChange ?? setInternalVisibility;

  // Column order: external or undefined (TanStack default)
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

  // Reset sorting when column definitions change (e.g., switching to account columns)
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setSorting([]);
    }
  }, [columns]);

  // Build meta object for drill-down callbacks, trending data, norms, and anomalies
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

  // Stable column filters ref — avoid creating new [] on every render
  const stableFilters = columnFilters ?? EMPTY_FILTERS;

  // Memoize the state object to prevent unnecessary TanStack reconciliation
  const state = useMemo(() => ({
    sorting,
    columnVisibility,
    columnPinning,
    columnFilters: stableFilters,
    columnOrder,
  }), [sorting, columnVisibility, columnPinning, stableFilters, columnOrder]);

  const table = useReactTable({
    data,
    columns,
    state,
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
