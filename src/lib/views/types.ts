/**
 * Type definitions for saved views.
 *
 * A SavedView captures a named snapshot of all table state slices
 * (sorting, column visibility, column order, column filters,
 * dimension filters, and column sizing) so users can switch between
 * curated table configurations with one click.
 */

import type { z } from 'zod';
import type {
  SortingState,
  VisibilityState,
  ColumnSizingState,
} from '@tanstack/react-table';
import type { chartDefinitionSchema } from './schema';

/**
 * Phase 35 — `ChartDefinition` is a discriminated union inferred from
 * `chartDefinitionSchema`. The legacy `ChartViewState` interface is gone;
 * its shape now lives ONLY as a private type inside migrate-chart.ts.
 *
 * Consumers narrow with `chartState.type === 'collection-curve'`. For
 * producers/consumers that only ever operate on the collection-curve variant
 * (e.g. useCurveChartState), use `CollectionCurveDefinition`.
 *
 * Phase 36 — added the `line`, `scatter`, and `bar` variants. Narrow aliases
 * below let consumers target a single variant without repeating the Extract<>.
 * `GenericChartDefinition` is the union of the three Phase 36 variants — used
 * by the GenericChart renderer and builder toolbar, which never handle the
 * collection-curve preset.
 */
export type ChartDefinition = z.infer<typeof chartDefinitionSchema>;
export type CollectionCurveDefinition = Extract<
  ChartDefinition,
  { type: 'collection-curve' }
>;
export type LineChartDefinition = Extract<ChartDefinition, { type: 'line' }>;
export type ScatterChartDefinition = Extract<
  ChartDefinition,
  { type: 'scatter' }
>;
export type BarChartDefinition = Extract<ChartDefinition, { type: 'bar' }>;
export type GenericChartDefinition =
  | LineChartDefinition
  | ScatterChartDefinition
  | BarChartDefinition;

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
  /** Whether charts section is expanded (undefined = use default) */
  chartsExpanded?: boolean;
  /** Whether partner comparison matrix is visible (root level) */
  comparisonVisible?: boolean;
  /** Active column preset key (e.g. 'finance', 'outreach', 'all') */
  activePreset?: string;
  /** Chart configuration — discriminated union across chart variants. */
  chartState?: ChartDefinition;
  /** Optional captured drill state (NAV-04). Absent on views saved from root. */
  drill?: {
    partner?: string;
    batch?: string;
  };
  /**
   * Phase 34 — optional partner-list reference. Additive field; pre-Phase-34
   * saved views load with listId: undefined. Sanitized on load by
   * useSavedViews: if the referenced list no longer exists, the field is
   * stripped (non-destructive; view still loads with no list activation).
   */
  listId?: string | null;
  /**
   * Phase 37 — optional Metabase-import audit. Absent on hand-built
   * views; present with { sql, importedAt } after a successful import.
   */
  sourceQuery?: {
    sql: string;
    importedAt: number;
  };
  /**
   * Phase 38 FLT-01 — date-range preset bucket. `3 | 6 | 12` caps
   * BATCH_AGE_IN_MONTHS; `null | undefined` means "All" (no cap). Additive-
   * optional evolution (mirrors drill / listId / sourceQuery precedent): pre-
   * Phase-38 saved views load with `batchAgeFilter: undefined` and no schema
   * changes are required.
   *
   * Legacy saved views that carried a column-equality `batch` dimension filter
   * are migrated on load by `sanitizeSnapshot`: the stale field is stripped
   * and `legacyFiltersDropped` is flagged so the data-display toast fires on
   * user-initiated load only (not hydration).
   */
  batchAgeFilter?: 3 | 6 | 12 | null;
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
