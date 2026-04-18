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
  opts?: { isHeader?: boolean }
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
    // Pinned cells need opaque backgrounds so content doesn't show through.
    // Phase 28-04: zebra removed; pinned body cells match the inset pane,
    // pinned header cells match the header lift (surface-base).
    backgroundColor: isPinned
      ? opts?.isHeader
        ? 'var(--color-surface-base)'
        : 'var(--color-surface-inset)'
      : undefined,
  };
}
