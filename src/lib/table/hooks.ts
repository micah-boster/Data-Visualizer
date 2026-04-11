'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnPinningState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnDef,
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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => PRESETS[DEFAULT_PRESET]
  );

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
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
  };
}
