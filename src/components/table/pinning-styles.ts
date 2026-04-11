import type { Column } from '@tanstack/react-table';
import type { CSSProperties } from 'react';

/**
 * Get CSS styles for sticky column pinning.
 * Based on the TanStack Table official sticky column pinning example.
 *
 * @param column - The TanStack Table column
 * @param isEvenRow - Whether this is an even row (for zebra stripe background on pinned cells)
 */
export function getCommonPinningStyles<T>(
  column: Column<T>,
  isEvenRow?: boolean
): CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn =
    isPinned === 'right' && column.getIsFirstColumn('right');

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
    // Pinned cells must be fully opaque to hide content scrolling behind them
    backgroundColor: isPinned
      ? isEvenRow
        ? 'hsl(var(--muted))'
        : 'hsl(var(--background))'
      : undefined,
    opacity: isPinned ? 1 : undefined,
  };
}
