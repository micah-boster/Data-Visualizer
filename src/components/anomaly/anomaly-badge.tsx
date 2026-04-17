'use client';

import { cn } from '@/lib/utils';
import { SEVERITY_BG_COLORS, SEVERITY_LABELS } from '@/lib/formatting/anomaly-labels';

interface AnomalyBadgeProps {
  severity: 'warning' | 'critical';
}

/**
 * Colored dot indicator for anomaly status.
 *
 * Warning fg (amber) for warning, error fg (red) for critical.
 * Critical dots pulse subtly to draw attention.
 *
 * Renders as a <span> so it can be placed inside PopoverTrigger's <button>
 * without nesting buttons (invalid HTML that causes hydration errors).
 */
export function AnomalyBadge({ severity }: AnomalyBadgeProps) {
  return (
    <span
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
    </span>
  );
}
