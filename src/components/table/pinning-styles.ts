import type { Column } from '@tanstack/react-table';
import type { CSSProperties } from 'react';

/**
 * Get CSS styles for sticky column pinning.
 *
 * Pinned cells MUST have fully opaque backgrounds so scrolling content
 * doesn't show through. The background color depends on context:
 * - Headers/footers: always use --muted (matches bg-muted class)
 * - Body even rows: use --muted (matches bg-muted/30 but fully opaque)
 * - Body odd rows: use --background (page background, fully opaque)
 */
export function getCommonPinningStyles<T>(
  column: Column<T>,
  opts?: { isEvenRow?: boolean; isHeader?: boolean }
): CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn =
    isPinned === 'right' && column.getIsFirstColumn('right');

  let backgroundColor: string | undefined;
  if (isPinned) {
    if (opts?.isHeader) {
      backgroundColor = 'hsl(var(--muted))';
    } else if (opts?.isEvenRow) {
      backgroundColor = 'hsl(var(--muted))';
    } else {
      backgroundColor = 'hsl(var(--background))';
    }
  }

  return {
    boxShadow: isLastLeftPinnedColumn
      ? '-4px 0 4px -4px hsl(var(--border)) inset'
      : isFirstRightPinnedColumn
        ? '4px 0 4px -4px hsl(var(--border)) inset'
        : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    backgroundColor,
  };
}
