'use client';

/**
 * Phase 40 PRJ-04 — Panel-level baseline selector for the KPI row.
 *
 * Switches the comparison baseline used by every applicable rate card between
 * the existing 3-batch rolling average ('rolling') and the modeled curve
 * sourced from `BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL` ('modeled').
 *
 * CONTEXT lock: panel-level, not per-card. Default is 'rolling' on load (zero
 * regression for existing users). When `modeledAvailable` is false (no batch
 * in the current scope has projection coverage at any KPI horizon), the
 * "Modeled curve" option is disabled with an explanatory tooltip.
 *
 * Persistence is intentionally out of scope for v1 — parent owns state via
 * useState (CONTEXT Deferred Idea: localStorage/URL-sync deferred).
 *
 * Implementation note: this codebase has no `@base-ui/react/toggle-group`
 * primitive (PLAN's suggested import does not resolve). The established
 * pattern for segmented controls in this app is `ChartTypeSegmentedControl`,
 * which uses `<Button>` + `aria-pressed` from `@/components/ui/button`. We
 * mirror that pattern here for consistency and a11y.
 */

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

export type BaselineMode = 'rolling' | 'modeled';

interface BaselineSelectorProps {
  value: BaselineMode;
  onChange: (next: BaselineMode) => void;
  /**
   * When false, the "Modeled curve" option is disabled with a tooltip
   * ("No modeled data in this scope"). Caller derives this from the visible
   * batches' projection coverage at any KPI horizon.
   */
  modeledAvailable: boolean;
}

export function BaselineSelector({
  value,
  onChange,
  modeledAvailable,
}: BaselineSelectorProps) {
  const isRollingActive = value === 'rolling';
  const isModeledActive = value === 'modeled';

  const modeledButton = (
    <Button
      type="button"
      variant={isModeledActive ? 'default' : 'ghost'}
      size="sm"
      aria-pressed={isModeledActive}
      aria-label="Compare vs modeled curve"
      disabled={!modeledAvailable}
      onClick={() => onChange('modeled')}
    >
      Modeled curve
    </Button>
  );

  return (
    <div
      className="flex items-center gap-inline"
      role="group"
      aria-label="KPI comparison baseline"
    >
      <span className="text-caption text-muted-foreground">Compare vs:</span>
      <Button
        type="button"
        variant={isRollingActive ? 'default' : 'ghost'}
        size="sm"
        aria-pressed={isRollingActive}
        aria-label="Compare vs 3-batch rolling average"
        onClick={() => onChange('rolling')}
      >
        Rolling avg
      </Button>
      {modeledAvailable ? (
        modeledButton
      ) : (
        <Tooltip>
          <TooltipTrigger render={<span />}>{modeledButton}</TooltipTrigger>
          <TooltipContent>No modeled data in this scope</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
