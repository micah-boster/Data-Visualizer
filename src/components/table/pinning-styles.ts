import type { Column } from '@tanstack/react-table';
import type { CSSProperties } from 'react';

/**
 * Get CSS styles for sticky column pinning.
 *
 * Pinned cells MUST have fully opaque backgrounds so scrolling content
 * doesn't show through. The background color depends on context:
 * - Headers/footers: always use --color-muted (matches bg-muted class)
 * - Body even rows: use --color-muted
 * - Body odd rows: use --color-background
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
    if (opts?.isHeader || opts?.isEvenRow) {
      backgroundColor = 'var(--color-muted)';
    } else {
      backgroundColor = 'var(--color-background)';
    }
  }

  return {
    boxShadow: isLastLeftPinnedColumn
      ? '-4px 0 4px -4px var(--color-border) inset'
      : isFirstRightPinnedColumn
        ? '4px 0 4px -4px var(--color-border) inset'
        : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : undefined,
    width: column.getSize(),
    zIndex: isPinned ? 10 : undefined,
    backgroundColor,
  };
}
