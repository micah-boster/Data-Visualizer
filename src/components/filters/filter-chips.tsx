'use client';

import { X } from 'lucide-react';
import type { ActiveFilter } from '@/hooks/use-filter-state';

export interface ColumnFilterChip {
  columnId: string;
  label: string;
  displayValue: string;
}

interface FilterChipsProps {
  activeFilters: ActiveFilter[];
  onRemove: (param: string) => void;
  onClearAll: () => void;
  /** In-column filter chips from useColumnFilters */
  columnFilterChips?: ColumnFilterChip[];
  /** Callback to clear a specific in-column filter */
  onRemoveColumnFilter?: (columnId: string) => void;
}

/**
 * Active filter chip row with Clear all link.
 * Shows both dimension filter chips and in-column filter chips.
 * Renders nothing when no filters are active.
 */
export function FilterChips({
  activeFilters,
  onRemove,
  onClearAll,
  columnFilterChips,
  onRemoveColumnFilter,
}: FilterChipsProps) {
  const hasAny = activeFilters.length > 0 || (columnFilterChips?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap px-2">
      {/* Dimension filter chips */}
      {activeFilters.map((filter) => (
        <span
          key={filter.param}
          className="rounded-full bg-muted text-sm px-3 py-1 flex items-center gap-1.5"
        >
          {filter.label}: {filter.value}
          <button
            type="button"
            onClick={() => onRemove(filter.param)}
            className="hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      {/* In-column filter chips */}
      {columnFilterChips?.map((chip) => (
        <span
          key={chip.columnId}
          className="rounded-full bg-primary/10 text-sm px-3 py-1 flex items-center gap-1.5"
        >
          {chip.label}: {chip.displayValue}
          <button
            type="button"
            onClick={() => onRemoveColumnFilter?.(chip.columnId)}
            className="hover:bg-muted-foreground/20 rounded-full p-0.5"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
