'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnPinningState,
  type VisibilityState,
} from '@tanstack/react-table';
import { columnDefs } from '@/lib/columns/definitions';
import { PRESETS, DEFAULT_PRESET } from '@/lib/columns/presets';
import { IDENTITY_COLUMNS } from '@/lib/columns/config';

export function useDataTable(data: Record<string, unknown>[]) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'PARTNER_NAME', desc: false },
  ]);

  const [activePreset, setActivePresetState] = useState(DEFAULT_PRESET);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => PRESETS[DEFAULT_PRESET]
  );

  const [columnPinning] = useState<ColumnPinningState>({
    left: IDENTITY_COLUMNS.filter((k) => k === 'PARTNER_NAME' || k === 'BATCH'),
    right: [],
  });

  const columns = useMemo(() => columnDefs, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnPinning,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
    isMultiSortEvent: (e: unknown) => (e as MouseEvent).shiftKey,
    enableSortingRemoval: false,
    columnResizeMode: 'onChange' as const,
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
