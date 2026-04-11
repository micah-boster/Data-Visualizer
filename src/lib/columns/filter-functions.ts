/**
 * Custom TanStack Table filter functions for per-column filtering.
 *
 * checklistFilter: for text columns — matches rows where the cell value
 * is included in a list of selected values.
 *
 * rangeFilter: for numeric columns — matches rows where the cell value
 * falls within a min/max range.
 */

import type { FilterFn } from '@tanstack/react-table';

/**
 * Checklist filter for text columns.
 * filterValue: string[] — list of selected values.
 * Returns true if the array is empty (no filter) or if the cell value is in the array.
 */
export const checklistFilter: FilterFn<Record<string, unknown>> = (
  row,
  columnId,
  filterValue: string[],
) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  const cellValue = String(row.getValue(columnId) ?? '');
  return filterValue.includes(cellValue);
};

// Required for TanStack Table to recognize this as a custom filter
checklistFilter.autoRemove = (val: unknown) =>
  !Array.isArray(val) || val.length === 0;

/**
 * Range filter for numeric columns.
 * filterValue: { min?: number; max?: number }
 * Returns true if both min and max are undefined, or if the cell value falls within bounds.
 * Null/undefined cell values are treated as non-matching.
 */
export const rangeFilter: FilterFn<Record<string, unknown>> = (
  row,
  columnId,
  filterValue: { min?: number; max?: number },
) => {
  if (!filterValue || (filterValue.min == null && filterValue.max == null)) {
    return true;
  }

  const raw = row.getValue(columnId);
  if (raw == null) return false;

  const cellValue = typeof raw === 'number' ? raw : Number(raw);
  if (isNaN(cellValue)) return false;

  if (filterValue.min != null && cellValue < filterValue.min) return false;
  if (filterValue.max != null && cellValue > filterValue.max) return false;

  return true;
};

rangeFilter.autoRemove = (val: unknown) => {
  const v = val as { min?: number; max?: number } | undefined;
  return !v || (v.min == null && v.max == null);
};
