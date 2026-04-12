import type { Column } from '@tanstack/react-table';
import type { CSSProperties } from 'react';

/**
 * Sticky column pinning styles — matches the official TanStack Table
 * column-pinning-sticky example pattern.
 *
 * REQUIRES: the <table> must use border-collapse: separate (not collapse),
 * otherwise browsers break z-index stacking for sticky cells.
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

  return {
    boxShadow: isLastLeftPinnedColumn
      ? '-4px 0 4px -4px gray inset'
      : isFirstRightPinnedColumn
        ? '4px 0 4px -4px gray inset'
        : undefined,
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    // Pinned cells need opaque backgrounds so content doesn't show through
    backgroundColor: isPinned
      ? (opts?.isHeader || opts?.isEvenRow)
        ? 'var(--color-muted)'
        : 'var(--color-background)'
      : undefined,
  };
}
