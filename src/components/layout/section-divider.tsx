import { cn } from '@/lib/utils';

interface SectionDividerProps {
  className?: string;
}

/**
 * Phase 31 DS-29 horizontal section divider.
 *
 * Renders the gradient-fade utility — center-solid var(--border), transparent
 * at both ends. Use at section boundaries in data-display.tsx (KPI ↔ charts
 * ↔ table). For card-internal or panel-internal separators, keep the existing
 * border-t / border-b hard borders (31-CONTEXT lock).
 *
 * Server-renderable — no 'use client', no hooks, no handlers. Mirrors the
 * SectionHeader (src/components/layout/section-header.tsx) precedent.
 */
export function SectionDivider({ className }: SectionDividerProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn('divider-horizontal-fade my-section', className)}
    />
  );
}
