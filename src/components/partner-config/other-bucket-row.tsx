'use client';

/**
 * OtherBucketRow — locked read-only summary row at the bottom of the
 * segment editor table.
 *
 * Renders live row-count coverage for rows that match zero configured
 * segments ("Other"), plus an inline overlap indicator when the staged
 * draft has overlapping value-sets between segments. Both numbers come
 * from `evaluateSegments` so they reconcile with whatever Plan 39-04's
 * segment-split charts/KPIs show downstream (Pitfall 7 — single source
 * of truth for the evaluator output).
 *
 * Auto-bucket semantics: "Other" is computed at query time from the
 * pair-scoped rows; not user-editable, not stored. The row visually
 * communicates this via muted styling + "Auto" pill + disabled-shape
 * controls.
 */

import { useMemo } from 'react';
import { Lock } from 'lucide-react';

import { evaluateSegments } from '@/lib/partner-config/segment-evaluator';
import type { SegmentRule } from '@/lib/partner-config/types';

export interface OtherBucketRowProps {
  /**
   * Pair-scoped + filter-applied rows. MUST match the row set the
   * downstream chart/KPI segment-split logic operates on so the coverage
   * counter and the rendered split agree.
   */
  pairScopedRows: Array<Record<string, unknown>>;
  /** Currently-staged segments (draft state). */
  segments: SegmentRule[];
}

export function OtherBucketRow({
  pairScopedRows,
  segments,
}: OtherBucketRowProps) {
  const { other, overlapRowCount } = useMemo(
    () => evaluateSegments(pairScopedRows, segments),
    [pairScopedRows, segments],
  );

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-inline px-card-padding py-stack bg-muted/40 border-t">
      {/* Name + Auto pill */}
      <div className="flex items-center gap-inline">
        <Lock
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span className="text-body text-muted-foreground truncate">
          Other (auto)
        </span>
      </div>

      {/* Column placeholder */}
      <span className="text-body text-muted-foreground">—</span>

      {/* Coverage count + overlap pill */}
      <div className="flex items-center gap-inline flex-wrap">
        <span className="text-body-numeric text-muted-foreground">
          {other.length} uncovered row{other.length === 1 ? '' : 's'}
        </span>
        {overlapRowCount > 0 && (
          <span className="text-label text-warning-fg">
            {overlapRowCount} overlap
          </span>
        )}
      </div>

      {/* Empty action cells — visually balanced with editable rows */}
      <span className="text-caption text-muted-foreground">Auto</span>
      <span aria-hidden="true" />
    </div>
  );
}
