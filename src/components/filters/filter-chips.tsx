'use client';

import { X } from 'lucide-react';
import type { ActiveFilter } from '@/hooks/use-filter-state';

interface FilterChipsProps {
  activeFilters: ActiveFilter[];
  onRemove: (param: string) => void;
  onClearAll: () => void;
}

/**
 * Active filter chip row with Clear all link.
 * Renders nothing when no filters are active.
 */
export function FilterChips({ activeFilters, onRemove, onClearAll }: FilterChipsProps) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap px-2">
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
