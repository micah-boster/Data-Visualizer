'use client';

/**
 * Phase 36 Plan 04 — axis picker for the chart builder toolbar.
 *
 * Renders a compact Popover+list of eligible columns for a (chartType, axis)
 * pair. Options are sourced purely from `getEligibleColumns` — never a hand-
 * rolled list (36-CONTEXT registry-derivation lock).
 *
 * Pure props-in / onChange-out: no state beyond the popover's own open flag
 * and no knowledge of ChartDefinition. Plan 36-05's ChartPanel owns the
 * `{ ...definition, x/y: next }` merge at the call site.
 *
 * Power-user density (CONTEXT.md:26): each option shows the human label
 * (`.text-body`) plus the raw Snowflake key underneath (`.text-caption`) so
 * the team can see which column is being picked without hovering.
 */

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { getEligibleColumns } from '@/lib/columns/axis-eligibility';
import type { ColumnConfig } from '@/lib/columns/config';

interface AxisPickerProps {
  chartType: 'line' | 'scatter' | 'bar';
  axis: 'x' | 'y' | 'series';
  value: { column: string } | null;
  onChange: (next: { column: string } | null) => void;
  placeholder?: string;
}

export function AxisPicker({
  chartType,
  axis,
  value,
  onChange,
  placeholder = 'Pick column',
}: AxisPickerProps) {
  const [open, setOpen] = useState(false);
  const options = getEligibleColumns(chartType, axis);
  const current: ColumnConfig | undefined = value
    ? options.find((c) => c.key === value.column)
    : undefined;

  function handlePick(col: ColumnConfig) {
    onChange({ column: col.key });
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  // Label for the trigger. When the saved value is no longer eligible (stale
  // key after a chart-type switch), show the raw key so the user can tell
  // something's off — Plan 03's StaleColumnWarning renders the full banner.
  const triggerLabel = value
    ? current?.label ?? value.column
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
          >
            <span className="text-body">{triggerLabel}</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
          </Button>
        }
      />
      <PopoverContent className="w-64 p-1" align="start">
        <div className="thin-scrollbar max-h-72 overflow-y-auto">
          {value !== null && (
            <button
              type="button"
              onClick={handleClear}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-body transition-colors hover:bg-muted focus:outline-none focus-glow"
            >
              <X className="h-3.5 w-3.5 opacity-70" />
              <span>Clear</span>
            </button>
          )}
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-caption text-muted-foreground">
              No eligible columns for this chart type.
            </div>
          ) : (
            options.map((col) => {
              const isActive = value?.column === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => handlePick(col)}
                  className={
                    'flex w-full flex-col items-start gap-0 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus:outline-none focus-glow ' +
                    (isActive ? 'bg-muted' : '')
                  }
                >
                  <span className="text-body">{col.label}</span>
                  <span className="text-caption text-muted-foreground">
                    {col.key}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
