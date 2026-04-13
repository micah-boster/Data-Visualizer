'use client';

import { cn } from '@/lib/utils';
import { SEVERITY_BG_COLORS, SEVERITY_LABELS } from '@/lib/formatting/anomaly-labels';

interface AnomalyBadgeProps {
  severity: 'warning' | 'critical';
  onClick: () => void;
}

/**
 * Colored dot indicator for anomaly status.
 *
 * Yellow (amber-500) for warning, red (red-500) for critical.
 * Critical dots pulse subtly to draw attention.
 * Click handler opens the detail popover.
 */
export function AnomalyBadge({ severity, onClick }: AnomalyBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center p-1"
      aria-label={`${SEVERITY_LABELS[severity]}: anomaly detected`}
    >
      <span
        className={cn(
          'h-3 w-3 rounded-full',
          SEVERITY_BG_COLORS[severity],
          severity === 'critical' && 'animate-pulse',
        )}
      />
    </button>
  );
}
