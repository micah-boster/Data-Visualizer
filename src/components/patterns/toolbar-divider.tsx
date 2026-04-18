import { cn } from '@/lib/utils';

interface ToolbarDividerProps {
  className?: string;
}

/**
 * Thin vertical divider for separating button clusters inside toolbars.
 * Canonical recipe: mx-0.5 h-4 w-px bg-border (aria-hidden).
 *
 * Sibling-pattern per resolved decision #5: place between cluster siblings
 * rather than wrapping clusters in a group. Keeps conditional rendering shape
 * intact (see 29-RESEARCH Pitfall 5).
 */
export function ToolbarDivider({ className }: ToolbarDividerProps = {}) {
  return <div aria-hidden className={cn('mx-0.5 h-4 w-px bg-border', className)} />;
}
