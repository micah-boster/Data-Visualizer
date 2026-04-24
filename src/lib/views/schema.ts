/**
 * Zod validation schemas for saved views.
 *
 * Used to safely parse localStorage data — corrupt or stale entries
 * are gracefully rejected via safeParse rather than crashing the app.
 */

import { z } from 'zod';

/** Validates a single sorting entry (matches TanStack SortingState items). */
const sortingItemSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

/**
 * Phase 35 — `chartDefinitionSchema` is a discriminated-union of chart variants
 * keyed on the literal `type` field. Each variant carries its own `version`
 * literal so the shape can evolve without schema-level breakage.
 *
 * First variant: `collection-curve`, version 2. Phase 36 adds `line`, `scatter`,
 * and `bar` variants (each version 1) to the union.
 */
const collectionCurveVariantSchema = z.object({
  type: z.literal('collection-curve'),
  version: z.literal(2),
  metric: z.enum(['recoveryRate', 'amount']),
  hiddenBatches: z.array(z.string()),
  showAverage: z.boolean(),
  showAllBatches: z.boolean(),
});

/**
 * Phase 36 — axis reference used by the three generic chart variants.
 * `column` is a Snowflake column name (uppercase) from COLUMN_CONFIGS. No
 * regex constraint: saved views may legitimately carry stale keys after a
 * column rename, and those are handled at the UI layer by Plan 03's
 * StaleColumnWarning, not at the schema layer.
 */
const axisRefSchema = z.object({
  column: z.string(),
});

/**
 * Phase 36 — `line` chart variant. X axis accepts time / numeric / identity-
 * categorical columns (see axis-eligibility.ts). Y axis is numeric-only.
 * Literal discriminator `type: z.literal('line')` is critical — any drift to
 * `z.string()` would break discriminatedUnion narrowing (36-RESEARCH Pitfall 1).
 *
 * Phase 36.x — optional `series` field groups rows by a categorical column
 * (e.g. BATCH) and renders one line per series value, color-coded. When
 * null/undefined the chart renders a single line through all rows. Additive-
 * optional evolution: pre-series saved views parse cleanly.
 */
const lineChartVariantSchema = z.object({
  type: z.literal('line'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),
  y: axisRefSchema.nullable(),
  series: axisRefSchema.nullable().optional(),
});

/**
 * Phase 36 — `scatter` chart variant. Both axes numeric-only.
 * Phase 36.x — optional `series` groups points into color-coded clusters with
 * a legend, AND drives per-point labels (below each dot) when the point count
 * is low enough to render them without overlap.
 */
const scatterChartVariantSchema = z.object({
  type: z.literal('scatter'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),
  y: axisRefSchema.nullable(),
  series: axisRefSchema.nullable().optional(),
});

/**
 * Phase 36 — `bar` chart variant. X categorical-only; Y numeric-only.
 * Phase 36.x — optional `series` field groups rows by a second categorical
 * column and renders grouped bars (one per series value per X tick).
 */
const barChartVariantSchema = z.object({
  type: z.literal('bar'),
  version: z.literal(1),
  x: axisRefSchema.nullable(),
  y: axisRefSchema.nullable(),
  series: axisRefSchema.nullable().optional(),
});

export const chartDefinitionSchema = z.discriminatedUnion('type', [
  collectionCurveVariantSchema,
  lineChartVariantSchema,
  scatterChartVariantSchema,
  barChartVariantSchema,
]);

/** Validates the complete ViewSnapshot shape. */
export const viewSnapshotSchema = z.object({
  sorting: z.array(sortingItemSchema),
  columnVisibility: z.record(z.string(), z.boolean()),
  columnOrder: z.array(z.string()),
  columnFilters: z.record(z.string(), z.unknown()),
  dimensionFilters: z.record(z.string(), z.string()),
  columnSizing: z.record(z.string(), z.number()).optional().default({}),
  chartsExpanded: z.boolean().optional(),
  comparisonVisible: z.boolean().optional(),
  activePreset: z.string().optional(),
  // Pitfall-1 guard: permissive at parse time; migrateChartState +
  // chartDefinitionSchema validate in sanitizeSnapshot. See 35-RESEARCH §Pitfall 1.
  chartState: z.unknown().optional(),
  drill: z
    .object({
      partner: z.string().optional(),
      batch: z.string().optional(),
    })
    .optional(),
  // Phase 34 — optional partner-list reference. Mirrors the additive-optional
  // evolution used for `drill` in Phase 32-02: legacy saved views load with
  // listId: undefined and safeParse succeeds.
  listId: z.string().nullable().optional(),
  /**
   * Phase 37 — optional audit field. Captures the original Metabase SQL
   * that produced this snapshot. Additive-optional evolution: legacy
   * saved views parse with sourceQuery: undefined. Mirrors Phase 32-02
   * drill + Phase 34-04 listId precedents (NO schema version bump).
   */
  sourceQuery: z
    .object({
      sql: z.string(),
      importedAt: z.number(),
    })
    .optional(),
  /**
   * Phase 38 FLT-01 — date-range preset bucket ('Last 3mo' / 'Last 6mo' /
   * 'Last 12mo' / 'All'). z.union over literal numbers + null matches the
   * TypeScript type `3 | 6 | 12 | null` precisely — a permissive z.number()
   * would let '5' through and break the chip-pressed state. Additive-
   * optional evolution: pre-Phase-38 saved views safeParse with
   * `batchAgeFilter: undefined`.
   */
  batchAgeFilter: z
    .union([z.literal(3), z.literal(6), z.literal(12), z.null()])
    .optional(),
});

/** Validates a single SavedView entry. */
export const savedViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  snapshot: viewSnapshotSchema,
  createdAt: z.number(),
  isDefault: z.boolean().optional(),
});

/** Validates the full saved views array stored in localStorage. */
export const savedViewsArraySchema = z.array(savedViewSchema);
