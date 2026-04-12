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
}

export function useDataTable(
  data: Record<string, unknown>[],
  columnFilters?: ColumnFiltersState,
  options?: UseDataTableOptions,
) {
  const [sorting, setSorting] = useState<SortingState>(() => {
    // Only default-sort by PARTNER_NAME if it's in the column set
    const hasPartner = (options?.columns ?? columnDefs).some((c) => c.id === 'PARTNER_NAME');
    return hasPartner ? [{ id: 'PARTNER_NAME', desc: false }] : [];
  });

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

  const columns = useMemo(
    () => options?.columns ?? columnDefs,
    [options?.columns],
  );

  // Pin PARTNER_NAME and BATCH at root/partner level, nothing at batch level
  const drillLevel = options?.drillLevel ?? 'root';
  const columnPinning = useMemo<ColumnPinningState>(() => {
    if (drillLevel === 'batch') return { left: [], right: [] };
    return { left: ['PARTNER_NAME', 'BATCH'], right: [] };
  }, [drillLevel]);

  // Reset sorting when column definitions change (e.g., switching to account columns)
  const prevColumnsRef = useRef(columns);
  useEffect(() => {
    if (prevColumnsRef.current !== columns) {
      prevColumnsRef.current = columns;
      setSorting([]);
    }
  }, [columns]);

  // Build meta object for drill-down callbacks
  const meta: TableDrillMeta | undefined = useMemo(() => {
    if (!options?.onDrillToPartner && !options?.onDrillToBatch) return undefined;
    return {
      onDrillToPartner: options.onDrillToPartner,
      onDrillToBatch: options.onDrillToBatch,
      drillLevel: options.drillLevel,
    };
  }, [options?.onDrillToPartner, options?.onDrillToBatch, options?.drillLevel]);

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
