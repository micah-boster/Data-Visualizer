'use client';

import type { ReactNode } from 'react';

/**
 * Phase 37 Plan 02 — named preview section wrapper.
 *
 * Renders one of the four fixed-order sections (Columns / Filters / Sort /
 * Chart) with a title, a matched / skipped count summary, and a slot for
 * an ordered list of PreviewRow children.
 *
 * Type-token discipline:
 *   - `text-title` for the section heading (popover/non-anchor tier per
 *     Phase 27 precedent — section headers inside overlays use text-title,
 *     not text-heading)
 *   - `text-label-numeric` for the count summary (mono + tabular + 0.04em
 *     tracking, matches sidebar pill counts from Phase 27-05)
 *   - `text-caption` for the empty-state note
 */
export interface PreviewSectionProps {
  /** Section title — "Columns", "Filters", "Sort", or "Chart". */
  title: string;
  /** Number of matched rows in this section. */
  matchedCount: number;
  /** Number of skipped rows in this section. */
  skippedCount: number;
  /** Fallback text when both counts are zero. Defaults to "None detected". */
  emptyLabel?: string;
  /** Ordered list of PreviewRow children; rendered only when total > 0. */
  children: ReactNode;
}

export function PreviewSection({
  title,
  matchedCount,
  skippedCount,
  emptyLabel = 'None detected',
  children,
}: PreviewSectionProps) {
  const total = matchedCount + skippedCount;
  return (
    <section className="border-t first:border-t-0 py-4">
      <header className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-title">{title}</h3>
        <span className="text-label-numeric text-muted-foreground">
          {matchedCount} matched{skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
        </span>
      </header>
      {total === 0 ? (
        <p className="text-caption text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col">{children}</ul>
      )}
    </section>
  );
}
