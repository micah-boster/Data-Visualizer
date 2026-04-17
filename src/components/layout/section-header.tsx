import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared section header for consistent title / eyebrow / description / actions
 * rhythm across panels, drawers, and page-level section anchors (DS-10).
 *
 * Prop contract locked in Phase 27 CONTEXT.md:
 *   - title: always rendered as <h2> via `text-heading`.
 *   - eyebrow: optional overline (`.text-label uppercase text-muted-foreground`).
 *   - description: optional caption (`text-caption text-muted-foreground`).
 *   - actions: optional right-aligned ReactNode slot (button, button-group, dropdown).
 *
 * Server-renderable — no hooks, no event handlers, no state. Do not add 'use client'.
 */
interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-stack', className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-label uppercase text-muted-foreground">{eyebrow}</span>
        )}
        <h2 className="text-heading text-foreground">{title}</h2>
        {description && (
          <p className="text-caption text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-inline">{actions}</div>}
    </div>
  );
}
