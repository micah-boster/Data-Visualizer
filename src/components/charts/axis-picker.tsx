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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { getEligibleColumns } from '@/lib/columns/axis-eligibility';
import type { ColumnConfig } from '@/lib/columns/config';

/**
 * Phase 39 PCFG-07 — synthetic option entries injected ahead of the
 * registry-derived options. Used for the Chart Builder's "Segment" entry
 * (powered by `SEGMENT_VIRTUAL_COLUMN` from segment-split.ts), which is not
 * a real Snowflake column but a per-row synthetic axis derived from the
 * pair's segment config. `disabled` gates the option behind a runtime check
 * (e.g. "no segments configured") and surfaces a tooltip for the why.
 */
export interface SyntheticAxisOption {
  /** Virtual column key written into ChartDefinition.series.column. */
  column: string;
  /** User-facing label rendered in the option list and the trigger when picked. */
  label: string;
  /** Optional secondary line under the label (mirrors the column-key caption pattern). */
  caption?: string;
  /** When true, renders disabled with a hover tooltip explaining why. */
  disabled?: boolean;
  /** Tooltip copy for disabled state. */
  disabledReason?: string;
}

interface AxisPickerProps {
  chartType: 'line' | 'scatter' | 'bar';
  axis: 'x' | 'y' | 'series';
  value: { column: string } | null;
  onChange: (next: { column: string } | null) => void;
  placeholder?: string;
  /**
   * Phase 39 PCFG-07 — synthetic options prepended before registry-derived
   * options. Currently used for the "Segment (from partner config)" entry
   * on the series axis. Caller (ChartBuilderToolbar) computes the disabled
   * state from `usePartnerConfigContext().configs`.
   */
  syntheticOptions?: SyntheticAxisOption[];
}

export function AxisPicker({
  chartType,
  axis,
  value,
  onChange,
  placeholder = 'Pick column',
  syntheticOptions,
}: AxisPickerProps) {
  const [open, setOpen] = useState(false);
  const options = getEligibleColumns(chartType, axis);
  const synthetic = syntheticOptions ?? [];
  const current: ColumnConfig | undefined = value
    ? options.find((c) => c.key === value.column)
    : undefined;
  const currentSynthetic = value
    ? synthetic.find((s) => s.column === value.column)
    : undefined;

  function handlePick(col: ColumnConfig) {
    onChange({ column: col.key });
    setOpen(false);
  }

  function handlePickSynthetic(opt: SyntheticAxisOption) {
    if (opt.disabled) return;
    onChange({ column: opt.column });
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  // Label for the trigger. When the saved value is no longer eligible (stale
  // key after a chart-type switch), show the raw key so the user can tell
  // something's off — Phase 43 BND-05 ChartFrame surfaces the amber stale-
  // columns chip in the title row (replaces the prior StaleColumnWarning
  // standalone banner).
  const triggerLabel = value
    ? currentSynthetic?.label ?? current?.label ?? value.column
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
          {/* Phase 39 PCFG-07 — synthetic options (e.g. Segment) render at
              the top with the same Recipe shape (text-body label / text-caption
              caption) so the list reads visually-uniform. Disabled state is
              presented as opacity + non-interactive cursor + tooltip on hover. */}
          {synthetic.map((opt) => {
            const isActive = value?.column === opt.column;
            const baseClass =
              'flex w-full flex-col items-start gap-0 rounded-md px-2 py-1.5 text-left transition-colors focus:outline-none focus-glow ' +
              (isActive ? 'bg-muted ' : '') +
              (opt.disabled
                ? 'opacity-50 cursor-not-allowed '
                : 'hover:bg-muted ');
            const button = (
              <button
                key={opt.column}
                type="button"
                onClick={() => handlePickSynthetic(opt)}
                disabled={opt.disabled}
                className={baseClass}
              >
                <span className="text-body">{opt.label}</span>
                {opt.caption && (
                  <span className="text-caption text-muted-foreground">
                    {opt.caption}
                  </span>
                )}
              </button>
            );
            if (opt.disabled && opt.disabledReason) {
              return (
                <Tooltip key={opt.column}>
                  <TooltipTrigger render={button} />
                  <TooltipContent side="right">
                    {opt.disabledReason}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return button;
          })}
          {options.length === 0 && synthetic.length === 0 ? (
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
