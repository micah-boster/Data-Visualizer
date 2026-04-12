'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import type { TrendingData, MetricNorm } from '@/types/partner-stats';

export interface UseDataTableOptions {
  /** Optional drill-down callbacks passed to column cell renderers via table meta */
  onDrillToPartner?: (name: string) => void;
  onDrillToBatch?: (name: string) => void;
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
    left: ['PARTNER_NAME', 'BATCH'],
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

  // Build meta object for drill-down callbacks, trending data, and norms
  const meta: TableDrillMeta | undefined = useMemo(() => {
    if (!options?.onDrillToPartner && !options?.onDrillToBatch && !options?.trendingData && !options?.norms) return undefined;
    return {
      onDrillToPartner: options?.onDrillToPartner,
      onDrillToBatch: options?.onDrillToBatch,
      drillLevel: options?.drillLevel,
      trending: options?.trendingData ?? undefined,
      norms: options?.norms ?? undefined,
      heatmapEnabled: options?.heatmapEnabled ?? false,
    };
  }, [options?.onDrillToPartner, options?.onDrillToBatch, options?.drillLevel, options?.trendingData, options?.norms, options?.heatmapEnabled]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnPinning,
      columnFilters: columnFilters ?? [],
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableMultiSort: true,
    isMultiSortEvent: (e: unknown) => (e as MouseEvent).shiftKey,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange' as const,
    meta,
  });

  function setActivePreset(preset: string) {
    setActivePresetState(preset);
    if (PRESETS[preset]) {
      setColumnVisibility(PRESETS[preset]);
    }
  }

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
