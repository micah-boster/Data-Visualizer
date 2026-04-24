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
  partnerOptions: string[];
  typeOptions: string[];
  selectedPartner: string | null;
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
 * Popover containing the Partner + Account Type filter comboboxes, the Phase
 * 38 FLT-01 date-range preset chip group, and active-filter chips.
 *
 * Phase 38 FLT-01: the batch combobox is gone — it was structurally broken
 * (pre-aggregated rows rarely matched a specific batch cleanly) and replaced
 * by a 4-chip preset group that caps BATCH_AGE_IN_MONTHS (All / Last 3mo /
 * Last 6mo / Last 12mo). The predicate runs upstream of aggregation in
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
  partnerOptions,
  typeOptions,
  selectedPartner,
  selectedType,
  age,
  onAgeChange,
  onFilterChange,
  activeFilters,
  onClearAll,
}: FilterPopoverProps) {
  // Phase 38 FLT-01: active-filters count includes the age chip when any bucket
  // other than 'All' is selected. FLT-01 age is NOT in ActiveFilter[] (it's a
  // value-range predicate, not column-equality) so we add it here manually for
  // the popover's chip counter and the toolbar badge.
  const activeCount = activeFilters.length + (age !== null ? 1 : 0);

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
                  // Phase 38 FLT-01: onClearAll only clears dimensionFilters
                  // (partner / type). Reset the age bucket to All as well so
                  // the "Clear all" affordance actually does.
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
          {/* Phase 38 FLT-02: Partner label wrapped in a Tooltip explaining the
              filter's effect + how it composes with the sidebar partner list. */}
          <div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <label className="mb-1 block text-label uppercase text-muted-foreground cursor-help">
                    Partner
                  </label>
                }
              />
              <TooltipContent>
                Filter the table and charts to one partner. Stacks with the sidebar partner list.
              </TooltipContent>
            </Tooltip>
            <FilterCombobox
              label="Partner"
              placeholder="All partners"
              options={partnerOptions}
              value={selectedPartner}
              onValueChange={(val) => onFilterChange('partner', val)}
            />
          </div>
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
            {activeFilters.map((f) => (
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
