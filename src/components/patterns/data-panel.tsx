import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/layout/section-header';

/**
 * DataPanel — composed wrapper for chart / table / data sections (DS-19).
 *
 * Purpose: Normalize the chart-and-matrix shell recipe into a single composed
 * component. Combines the Phase 28 surface recipe
 * (rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding)
 * with the Phase 27 SectionHeader (title + eyebrow + description + actions).
 *
 * Slot contract (locked in 29-CONTEXT.md):
 *   - header: REQUIRED — title prop flows to SectionHeader.title; eyebrow,
 *     description, and actions flow through. Every DataPanel has a title.
 *   - content: REQUIRED — provided via `children`. Consumer owns sizing,
 *     overflow, and scroll behavior. DataPanel does NOT manage content height.
 *   - footer: OPTIONAL — when undefined, no footer chrome is rendered
 *     (no border-top, no mt/pt padding). Typical uses: metadata caption,
 *     right-aligned action cluster, or aggregate/totals row.
 *
 * Composes the existing `SectionHeader` — do not fork its logic. When a
 * concrete header gap surfaces during migration, extend SectionHeader in place
 * rather than introducing a parallel implementation here.
 *
 * Server-renderable — no 'use client', no hooks, no handlers. Usable in RSC
 * contexts unless a consumer imports it from a client component (which is
 * allowed and automatic).
 */

export interface DataPanelProps {
  /** Required title — flows to SectionHeader.title */
  title: string;
  /** Optional overline above the title */
  eyebrow?: string;
  /** Optional description rendered under the title */
  description?: string;
  /** Optional right-aligned action slot (button cluster, dropdown, etc.) */
  actions?: ReactNode;
  /** Required content slot (chart / table / body) */
  children: ReactNode;
  /** Optional footer slot — renders a bordered metadata/action/totals row */
  footer?: ReactNode;
  /** Merged onto the outer wrapper */
  className?: string;
  /** Merged onto the content wrapper (between header and footer) */
  contentClassName?: string;
}

export function DataPanel({
  title,
  eyebrow,
  description,
  actions,
  children,
  footer,
  className,
  contentClassName,
}: DataPanelProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised',
        className,
      )}
    >
      <SectionHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        actions={actions}
      />
      <div className={cn('mt-stack', contentClassName)}>{children}</div>
      {footer ? (
        <div className="mt-stack pt-stack border-t border-border">{footer}</div>
      ) : null}
    </div>
  );
}
