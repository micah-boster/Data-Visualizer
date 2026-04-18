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
  chartState: z.object({
    metric: z.enum(['recoveryRate', 'amount']),
    hiddenBatches: z.array(z.string()),
    showAverage: z.boolean(),
    showAllBatches: z.boolean(),
  }).optional(),
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
