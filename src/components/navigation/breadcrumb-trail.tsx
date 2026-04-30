'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Term } from '@/components/ui/term';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';

interface BreadcrumbTrailProps {
  state: DrillState;
  rowCounts: { root?: number; partner?: number; batch?: number };
  onNavigate: (level: DrillLevel) => void;
}

/**
 * Breadcrumb trail for drill-down navigation. Always renders at least the
 * root segment ("All Partners"). Adds segments for partner and batch levels.
 *
 * Active (current) segment: bold, not clickable.
 * Non-active segments: muted text, clickable, hover:underline.
 *
 * Phase 44 VOC-03 — first-instance-per-surface rule: the literal-prefix words
 * "Partners" (in "All Partners"), "Partner" (in "Partner: …"), and "Batch"
 * (in "Batch: …") are wrapped in `<Term>` so a hover/focus surfaces the
 * registry definition. The drill VALUES (state.partner, state.batch) stay
 * plain text — they're data, not vocabulary.
 */
export function BreadcrumbTrail({
  state,
  rowCounts,
  onNavigate,
}: BreadcrumbTrailProps) {
  const segments: {
    /** Visual breadcrumb body — JSX so first-instance terms can be wrapped. */
    label: ReactNode;
    /** ARIA-friendly plain-string variant for keys + non-visual contexts. */
    labelText: string;
    level: DrillLevel;
    count?: number;
    active: boolean;
  }[] = [
    {
      label: (
        <>
          All <Term name="partner">Partners</Term>
        </>
      ),
      labelText: 'All Partners',
      level: 'root',
      count: rowCounts.root,
      active: state.level === 'root',
    },
  ];

  if (state.partner) {
    segments.push({
      label: (
        <>
          <Term name="partner">Partner</Term>: {state.partner}
        </>
      ),
      labelText: `Partner: ${state.partner}`,
      level: 'partner',
      count: rowCounts.partner,
      active: state.level === 'partner',
    });
  }

  if (state.batch) {
    segments.push({
      label: (
        <>
          <Term name="batch">Batch</Term>: {state.batch}
        </>
      ),
      labelText: `Batch: ${state.batch}`,
      level: 'batch',
      count: rowCounts.batch,
      active: state.level === 'batch',
    });
  }

  return (
    <nav
      aria-label="Drill-down breadcrumb"
      className="flex items-center gap-1 px-2 py-1.5"
    >
      {segments.map((seg, i) => (
        <span key={seg.level} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
            />
          )}
          {seg.active ? (
            <span
              aria-current="page"
              data-breadcrumb-current
              className="text-title text-foreground"
            >
              {seg.label}
              {seg.count != null ? ` (${seg.count.toLocaleString()})` : ''}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(seg.level)}
              aria-label={seg.labelText}
              className="text-body text-muted-foreground hover:text-foreground hover:underline"
            >
              {seg.label}
              {seg.count != null ? ` (${seg.count.toLocaleString()})` : ''}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
