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
import type { ActiveFilter, AgeBucket } from '@/hooks/use-filter-state';
import { cn } from '@/lib/utils';

interface FilterPopoverProps {
  data: Record<string, unknown>[];
  typeOptions: string[];
  selectedType: string | null;
  /** Phase 38 FLT-01 — current date-range bucket; null = 'All'. */
  age: AgeBucket;
  /** Phase 38 FLT-01 — setter for the ?age= URL param. */
  onAgeChange: (value: AgeBucket) => void;
  onFilterChange: (param: string, value: string | null) => void;
  activeFilters: ActiveFilter[];
  onClearAll: () => void;
}

/**
 * Popover containing the Account Type filter combobox, the Phase 38 FLT-01
 * date-range preset chip group, and active-filter chips.
 *
 * Phase 39 PCFG-04 — the Partner combobox was REMOVED. Selection is owned by
 * drill state (`?p=&pr=`); the sidebar pair rows are the canonical selection
 * surface. Open Q #2 deprecation: legacy `?partner=` URL params are silently
 * ignored at runtime (use-filter-state no longer reads them) and saved-view
 * snapshots that carried `dimensionFilters.partner` are stripped on load.
 *
 * Phase 38 FLT-01: the batch combobox is gone — replaced by the 4-chip
 * preset group capping BATCH_AGE_IN_MONTHS (All / Last 3mo / Last 6mo /
 * Last 12mo). The predicate runs upstream of aggregation in
 * data-display.tsx#filteredRawData (Phase 25 filter-before-aggregate).
 *
 * Phase 38 FLT-02: each filter label carries a Tooltip explaining what the
 * filter does and how it composes with the sidebar / other filters.
 */
const AGE_PRESETS: ReadonlyArray<{ value: AgeBucket; label: string }> = [
  { value: null, label: 'All' },
  { value: 3, label: 'Last 3mo' },
  { value: 6, label: 'Last 6mo' },
  { value: 12, label: 'Last 12mo' },
];

export function FilterPopover({
  typeOptions,
  selectedType,
  age,
  onAgeChange,
  onFilterChange,
  activeFilters,
  onClearAll,
}: FilterPopoverProps) {
  // Defensive: drop any stray `partner` entries that legacy callers may pass
  // through `activeFilters` (Phase 39 PCFG-04 — partner is no longer a filter
  // in FILTER_PARAMS, but the type system doesn't catch a hand-edited URL or
  // legacy snapshot that smuggled one in). Cast through string for the runtime
  // check since `f.param` is type-narrowed to the current FILTER_PARAMS keys.
  const visibleActiveFilters = activeFilters.filter(
    (f) => (f.param as string) !== 'partner',
  );

  // Phase 38 FLT-01: active-filters count includes the age chip when any bucket
  // other than 'All' is selected. FLT-01 age is NOT in ActiveFilter[] (it's a
  // value-range predicate, not column-equality) so we add it here manually for
  // the popover's chip counter and the toolbar badge.
  const activeCount = visibleActiveFilters.length + (age !== null ? 1 : 0);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                aria-label={
                  activeCount > 0
                    ? `Manage filters (${activeCount} active)`
                    : 'Manage filters'
                }
              >
                <Filter className="h-4 w-4" />
                {activeCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-label-numeric text-primary-foreground"
                  >
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
            <PopoverTitle className="text-heading">Filters</PopoverTitle>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  // Phase 38 FLT-01: onClearAll only clears dimensionFilters.
                  // Reset the age bucket to All as well so the "Clear all"
                  // affordance actually does.
                  if (age !== null) onAgeChange(null);
                }}
                className="text-caption text-muted-foreground hover:text-foreground"
                aria-label="Clear all filters"
              >
                Clear all
              </button>
            )}
          </div>
        </PopoverHeader>
        <div className="space-y-3">
          {/* Phase 39 PCFG-04: Partner combobox removed (selection is owned by
              drill state). Account Type stays — useful for cross-partner
              filtering at root (e.g. show only 1st-party pairs). */}
          <div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <label className="mb-1 block text-label uppercase text-muted-foreground cursor-help">
                    Account Type
                  </label>
                }
              />
              <TooltipContent>
                Filter by account type to separate first-party from third-party products.
              </TooltipContent>
            </Tooltip>
            <FilterCombobox
              label="Account Type"
              placeholder="All types"
              options={typeOptions}
              value={selectedType}
              onValueChange={(val) => onFilterChange('type', val)}
            />
          </div>
          {/* Phase 38 FLT-01: date-range preset chip group. 4 buttons, single
              pressed at a time (radio-like). Caps BATCH_AGE_IN_MONTHS upstream
              of aggregation in data-display.tsx#filteredRawData. */}
          <div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <label className="mb-1 block text-label uppercase text-muted-foreground cursor-help">
                    Date Range
                  </label>
                }
              />
              <TooltipContent>
                Filter by batch age — &quot;Last 3mo&quot; keeps only batches younger than 3 months.
              </TooltipContent>
            </Tooltip>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Date range"
            >
              {AGE_PRESETS.map((opt) => {
                const pressed = age === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => onAgeChange(opt.value)}
                    className={cn(
                      'rounded-md px-2 py-1 text-caption transition-colors',
                      pressed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Active filter chips — dimension filters + Phase 38 FLT-01 age chip. */}
        {activeCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            {visibleActiveFilters.map((f) => (
              <span
                key={f.param}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption"
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span>{f.value}</span>
                <button
                  type="button"
                  onClick={() => onFilterChange(f.param, null)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${f.label} filter`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {age !== null && (
              <span
                key="age"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption"
              >
                <span className="text-muted-foreground">Date Range:</span>
                <span>Last {age}mo</span>
                <button
                  type="button"
                  onClick={() => onAgeChange(null)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Remove Date Range filter"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
