'use client';

import { ChevronRight } from 'lucide-react';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';

interface BreadcrumbTrailProps {
  state: DrillState;
  rowCounts: { root?: number; partner?: number; batch?: number };
  onNavigate: (level: DrillLevel) => void;
}

/**
 * Breadcrumb trail for drill-down navigation. Always renders at least the
 * root segment ("All Batches"). Adds segments for partner and batch levels.
 *
 * Active (current) segment: bold, not clickable.
 * Non-active segments: muted text, clickable, hover:underline.
 */
export function BreadcrumbTrail({
  state,
  rowCounts,
  onNavigate,
}: BreadcrumbTrailProps) {
  const segments: {
    label: string;
    level: DrillLevel;
    count?: number;
    active: boolean;
  }[] = [
    {
      label: 'All Partners',
      level: 'root',
      count: rowCounts.root,
      active: state.level === 'root',
    },
  ];

  if (state.partner) {
    segments.push({
      label: `Partner: ${state.partner}`,
      level: 'partner',
      count: rowCounts.partner,
      active: state.level === 'partner',
    });
  }

  if (state.batch) {
    segments.push({
      label: `Batch: ${state.batch}`,
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
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {seg.active ? (
            <span className="text-title text-foreground">
              {seg.label}
              {seg.count != null ? ` (${seg.count.toLocaleString()})` : ''}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(seg.level)}
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
