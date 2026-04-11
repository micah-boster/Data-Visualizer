'use client';

/**
 * Hook managing per-column filter state (session-only, not URL-backed).
 *
 * Provides filter state for in-column filters (text checklist, numeric range)
 * and a merge function to combine with URL-backed dimension filters.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { COLUMN_CONFIGS } from '@/lib/columns/config';

const labelMap = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

export interface ColumnFilterChip {
  columnId: string;
  label: string;
  displayValue: string;
}

export function useColumnFilters() {
  // Map of column ID to filter value (string[] for text, {min?, max?} for numeric)
  const [filterState, setFilterState] = useState<Record<string, unknown>>({});

  const setColumnFilter = useCallback(
    (columnId: string, value: unknown) => {
      setFilterState((prev) => {
        const next = { ...prev };
        if (value == null) {
          delete next[columnId];
        } else {
          next[columnId] = value;
        }
        return next;
      });
    },
    [],
  );

  const clearColumnFilter = useCallback(
    (columnId: string) => {
      setFilterState((prev) => {
        const next = { ...prev };
        delete next[columnId];
        return next;
      });
    },
    [],
  );

  const clearAllColumnFilters = useCallback(() => {
    setFilterState({});
  }, []);

  /** Active column filter chips for display */
  const activeColumnFilters: ColumnFilterChip[] = useMemo(() => {
    const chips: ColumnFilterChip[] = [];
    for (const [columnId, value] of Object.entries(filterState)) {
      if (value == null) continue;
      const label = labelMap.get(columnId) ?? columnId;

      if (Array.isArray(value)) {
        // Text checklist
        if (value.length > 0) {
          chips.push({
            columnId,
            label,
            displayValue: value.length === 1 ? String(value[0]) : `${value.length} values`,
          });
        }
      } else if (typeof value === 'object') {
        // Numeric range
        const range = value as { min?: number; max?: number };
        if (range.min != null || range.max != null) {
          let display: string;
          if (range.min != null && range.max != null) {
            display = `${range.min}–${range.max}`;
          } else if (range.min != null) {
            display = `>${range.min}`;
          } else {
            display = `<${range.max}`;
          }
          chips.push({ columnId, label, displayValue: display });
        }
      }
    }
    return chips;
  }, [filterState]);

  /**
   * Merge in-column filters with URL-backed dimension filters
   * into a single ColumnFiltersState for TanStack Table.
   * Both sets AND together (TanStack applies all filters).
   */
  const mergedColumnFilters = useCallback(
    (dimensionFilters: ColumnFiltersState): ColumnFiltersState => {
      const columnFilterEntries: ColumnFiltersState = Object.entries(filterState)
        .filter(([, v]) => v != null)
        .map(([id, value]) => ({ id, value }));

      return [...dimensionFilters, ...columnFilterEntries];
    },
    [filterState],
  );

  return {
    filterState,
    setColumnFilter,
    clearColumnFilter,
    clearAllColumnFilters,
    activeColumnFilters,
    mergedColumnFilters,
  };
}
