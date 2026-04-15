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
