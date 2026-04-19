import { cn } from '@/lib/utils';

interface ToolbarDividerProps {
  className?: string;
}

/**
 * Thin vertical divider for separating button clusters inside toolbars.
 * Canonical recipe: mx-0.5 h-4 w-px divider-vertical-fade (aria-hidden).
 *
 * Phase 31 DS-29: background swapped from solid bg-border to the
 * center-solid / transparent-ends gradient utility (.divider-vertical-fade).
 * Consumers (unified-toolbar ×2, comparison-matrix ×1) pick up the change
 * transparently — no import or prop changes.
 *
 * Sibling-pattern per resolved decision #5: place between cluster siblings
 * rather than wrapping clusters in a group. Keeps conditional rendering shape
 * intact (see 29-RESEARCH Pitfall 5).
 */
export function ToolbarDivider({ className }: ToolbarDividerProps = {}) {
  return <div aria-hidden className={cn('mx-0.5 h-4 w-px divider-vertical-fade', className)} />;
}
