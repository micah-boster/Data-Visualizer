'use client';

import { useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { FilterCombobox } from './filter-combobox';
import { FILTER_PARAMS } from '@/hooks/use-filter-state';

interface FilterBarProps {
  data: Record<string, unknown>[];
  columnFilters: ColumnFiltersState;
  onFilterChange: (param: string, value: string | null) => void;
}

/**
 * Horizontal bar rendering the account-type filter combobox.
 *
 * Phase 39 PCFG-04: the partner combobox was removed — selection is owned by
 * drill state (`?p=&pr=`). This standalone FilterBar has been unused since the
 * Phase 27 toolbar-unification but is retained as a reference. Account Type
 * stays useful for cross-partner filtering at root.
 *
 * Phase 38 FLT-01: the batch combobox was previously removed; the toolbar's
 * FilterPopover now owns a date-range preset chip group (BATCH_AGE_IN_MONTHS
 * <= cap) that replaced the structurally-broken batch combobox.
 */
export function FilterBar({ data, columnFilters, onFilterChange }: FilterBarProps) {
  const selectedType = useMemo(() => {
    const f = columnFilters.find((cf) => cf.id === FILTER_PARAMS.type);
    return f ? String(f.value) : null;
  }, [columnFilters]);

  // Unique sorted account types from full dataset
  const typeOptions = useMemo(
    () =>
      [...new Set(data.map((r) => String(r.ACCOUNT_TYPE ?? '')))]
        .filter(Boolean)
        .sort(),
    [data]
  );

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <FilterCombobox
        label="Account Type"
        placeholder="All account types"
        options={typeOptions}
        value={selectedType}
        onValueChange={(val) => onFilterChange('type', val)}
      />
    </div>
  );
}
