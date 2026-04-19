'use client';

/**
 * Phase 36 Plan 03 — StaleColumnWarning
 *
 * Inline Alert banner rendered above GenericChart when a stored axis column key
 * either (a) no longer exists in COLUMN_CONFIGS or (b) exists but is no longer
 * eligible under the current (chartType, axis) rules — see
 * `resolveColumnWithFallback` in `@/lib/charts/stale-column`.
 *
 * Mirrors the schema-warning Alert recipe at
 * `src/components/data-display.tsx:572-598` so the banner reads as "kin" with
 * other advisory warnings.
 *
 * Server-renderable (no hooks, no handlers) — the renderer composes the
 * stale-ness decision and simply passes strings in. Pitfall 3 is enforced at
 * the resolver layer; this component is pure presentation.
 */
import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

export interface StaleColumnWarningProps {
  axis: 'X' | 'Y';
  missing: string;
  fallback: string;
}

export function StaleColumnWarning({
  axis,
  missing,
  fallback,
}: StaleColumnWarningProps) {
  return (
    <Alert className="mb-stack">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <span className="text-title">{axis}-axis column </span>
        <code className="text-label-numeric rounded bg-muted px-1">
          {missing}
        </code>
        <span className="text-body"> not available — using </span>
        <code className="text-label-numeric rounded bg-muted px-1">
          {fallback}
        </code>
      </AlertDescription>
    </Alert>
  );
}
