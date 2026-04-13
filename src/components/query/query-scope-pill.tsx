'use client';

import { X } from 'lucide-react';
import type { DrillLevel } from '@/hooks/use-drill-down';

interface QueryScopePillProps {
  drillState: {
    level: DrillLevel;
    partner: string | null;
    batch: string | null;
  };
  onRemoveScope: () => void;
}

/**
 * Removable pill/badge showing the current drill scope inside the search bar.
 * Only renders at partner or batch level — root has no scope to display.
 */
export function QueryScopePill({ drillState, onRemoveScope }: QueryScopePillProps) {
  if (drillState.level === 'root') return null;

  const label =
    drillState.level === 'batch' && drillState.batch
      ? `${drillState.partner} > ${drillState.batch}`
      : drillState.partner ?? '';

  if (!label) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
      <button
        type="button"
        onClick={onRemoveScope}
        className="ml-0.5 rounded-full p-0.5 hover:bg-accent hover:text-accent-foreground"
        aria-label="Remove scope"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
