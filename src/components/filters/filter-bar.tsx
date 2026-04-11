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
 * Horizontal bar rendering three filter comboboxes: partner, account type, batch.
 * Batch options cascade based on selected partner.
 */
export function FilterBar({ data, columnFilters, onFilterChange }: FilterBarProps) {
  // Current selected values derived from columnFilters
  const selectedPartner = useMemo(() => {
    const f = columnFilters.find((cf) => cf.id === FILTER_PARAMS.partner);
    return f ? String(f.value) : null;
  }, [columnFilters]);

  const selectedType = useMemo(() => {
    const f = columnFilters.find((cf) => cf.id === FILTER_PARAMS.type);
    return f ? String(f.value) : null;
  }, [columnFilters]);

  const selectedBatch = useMemo(() => {
    const f = columnFilters.find((cf) => cf.id === FILTER_PARAMS.batch);
    return f ? String(f.value) : null;
  }, [columnFilters]);

  // Unique sorted partner names from full dataset
  const partnerOptions = useMemo(
    () =>
      [...new Set(data.map((r) => String(r.PARTNER_NAME ?? '')))]
        .filter(Boolean)
        .sort(),
    [data]
  );

  // Unique sorted account types from full dataset
  const typeOptions = useMemo(
    () =>
      [...new Set(data.map((r) => String(r.ACCOUNT_TYPE ?? '')))]
        .filter(Boolean)
        .sort(),
    [data]
  );

  // Batch options: scoped to selected partner when active (locked decision)
  const batchOptions = useMemo(() => {
    const rows = selectedPartner
      ? data.filter((r) => String(r.PARTNER_NAME ?? '') === selectedPartner)
      : data;
    return [...new Set(rows.map((r) => String(r.BATCH ?? '')))]
      .filter(Boolean)
      .sort();
  }, [data, selectedPartner]);

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <FilterCombobox
        label="Partner"
        placeholder="All partners"
        options={partnerOptions}
        value={selectedPartner}
        onValueChange={(val) => onFilterChange('partner', val)}
      />
      <FilterCombobox
        label="Account Type"
        placeholder="All account types"
        options={typeOptions}
        value={selectedType}
        onValueChange={(val) => onFilterChange('type', val)}
      />
      <FilterCombobox
        label="Batch"
        placeholder="All batches"
        options={batchOptions}
        value={selectedBatch}
        onValueChange={(val) => onFilterChange('batch', val)}
      />
    </div>
  );
}
