'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { FilterCombobox } from '@/components/filters/filter-combobox';
import type { ActiveFilter } from '@/hooks/use-filter-state';

interface FilterPopoverProps {
  data: Record<string, unknown>[];
  partnerOptions: string[];
  typeOptions: string[];
  batchOptions: string[];
  selectedPartner: string | null;
  selectedType: string | null;
  selectedBatch: string | null;
  onFilterChange: (param: string, value: string | null) => void;
  activeFilters: ActiveFilter[];
  onClearAll: () => void;
}

/**
 * Popover containing the 3 dimension filter comboboxes + active chips.
 * Replaces the full-width filter bar and filter chips rows.
 */
export function FilterPopover({
  partnerOptions,
  typeOptions,
  batchOptions,
  selectedPartner,
  selectedType,
  selectedBatch,
  onFilterChange,
  activeFilters,
  onClearAll,
}: FilterPopoverProps) {
  const activeCount = activeFilters.length;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Filter className="h-4 w-4" />
                {activeCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Filters{activeCount > 0 ? ` (${activeCount} active)` : ''}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64" align="end">
        <PopoverHeader>
          <div className="flex items-center justify-between">
            <PopoverTitle>Filters</PopoverTitle>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
        </PopoverHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Partner</label>
            <FilterCombobox
              label="Partner"
              placeholder="All partners"
              options={partnerOptions}
              value={selectedPartner}
              onValueChange={(val) => onFilterChange('partner', val)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Account Type</label>
            <FilterCombobox
              label="Account Type"
              placeholder="All types"
              options={typeOptions}
              value={selectedType}
              onValueChange={(val) => onFilterChange('type', val)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Batch</label>
            <FilterCombobox
              label="Batch"
              placeholder="All batches"
              options={batchOptions}
              value={selectedBatch}
              onValueChange={(val) => onFilterChange('batch', val)}
            />
          </div>
        </div>
        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            {activeFilters.map((f) => (
              <span
                key={f.param}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span className="font-medium">{f.value}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange(f.param, null)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
