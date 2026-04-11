/**
 * Type definitions for saved views.
 *
 * A SavedView captures a named snapshot of all table state slices
 * (sorting, column visibility, column order, column filters,
 * dimension filters, and column sizing) so users can switch between
 * curated table configurations with one click.
 */

import type {
  SortingState,
  VisibilityState,
  ColumnSizingState,
} from '@tanstack/react-table';

/** All table state slices captured in a single snapshot. */
export interface ViewSnapshot {
  /** TanStack sorting state — array of { id, desc } */
  sorting: SortingState;
  /** Column visibility map — key: column ID, value: visible */
  columnVisibility: VisibilityState;
  /** Ordered column IDs controlling display order */
  columnOrder: string[];
  /** In-column filter state — string[] for text checklists, {min?, max?} for numeric */
  columnFilters: Record<string, unknown>;
  /** Dimension filters from URL params (partner, type, batch) */
  dimensionFilters: Record<string, string>;
  /** Column width overrides from manual resizing */
  columnSizing: ColumnSizingState;
}

/** A named, persisted view configuration. */
export interface SavedView {
  /** Unique identifier (crypto.randomUUID()) */
  id: string;
  /** User-assigned name */
  name: string;
  /** Complete table state snapshot */
  snapshot: ViewSnapshot;
  /** Timestamp when the view was created/updated (Date.now()) */
  createdAt: number;
  /** True for the 3 starter views seeded on first load */
  isDefault?: boolean;
}
