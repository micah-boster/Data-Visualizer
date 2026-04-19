'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Phase 37 Plan 02 — single icon + label + optional reason row.
 *
 * Accessibility lock (CONTEXT): color is never the only signal. The icon
 * carries the signal in-place of color; its `aria-hidden` keeps screen
 * readers focused on the label + reason (which ARE the signal for AT).
 *
 * Type-token discipline:
 *   - `text-body` for primary label
 *   - `text-caption` for secondary reason
 *   - NO font-weight utility pairings (tokens own weight)
 *
 * Semantic state-color tokens only (never raw Tailwind green/amber/red):
 *   - matched → text-success-fg
 *   - skipped → text-warning-fg
 *   - error   → text-error-fg
 */
export interface PreviewRowProps {
  variant: 'matched' | 'skipped' | 'error';
  /** Primary text — e.g. "Partner (PARTNER_NAME)" or raw SQL fragment. */
  label: string;
  /** One-line secondary text — shown when present (typically for skipped / error). */
  reason?: string;
}

export function PreviewRow({ variant, label, reason }: PreviewRowProps) {
  const Icon =
    variant === 'matched'
      ? CheckCircle2
      : variant === 'skipped'
        ? AlertTriangle
        : XCircle;
  const iconColor =
    variant === 'matched'
      ? 'text-success-fg'
      : variant === 'skipped'
        ? 'text-warning-fg'
        : 'text-error-fg';
  return (
    <li className="flex items-start gap-2 py-1">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-body truncate">{label}</div>
        {reason && (
          <div className="text-caption text-muted-foreground">{reason}</div>
        )}
      </div>
    </li>
  );
}
