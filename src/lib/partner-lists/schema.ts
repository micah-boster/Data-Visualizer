/**
 * Zod validation schemas for partner lists.
 *
 * Used to safely parse localStorage data — corrupt or stale entries
 * are gracefully rejected via safeParse rather than crashing the app.
 *
 * attributeFiltersSchema is marked `.strict()` so unknown attribute keys
 * fail at parse time. Adding a new attribute requires a schema update,
 * which is the right surface to think about migration and additive-optional
 * evolution. Phase 39 added PRODUCT_TYPE + SEGMENT as `.optional()` fields;
 * legacy payloads with only ACCOUNT_TYPE (or no filters) still parse.
 */

import { z } from 'zod';

/**
 * Attribute-driven filter shape.
 *
 * - ACCOUNT_TYPE: legacy raw partner classification (pre-Phase-39).
 * - PRODUCT_TYPE: Phase 39 display alias of ACCOUNT_TYPE.
 * - SEGMENT:      Phase 39 reference to SegmentRule.name from usePartnerConfig.
 *
 * All fields are `.optional()` for additive evolution — legacy lists missing
 * the new keys parse cleanly.
 */
const attributeFiltersSchema = z
  .object({
    ACCOUNT_TYPE: z.array(z.string()).optional(),
    PRODUCT_TYPE: z.array(z.string()).optional(),
    SEGMENT: z.array(z.string()).optional(),
    // Future attributes append here as `.optional()` fields for additive evolution.
  })
  .strict();

/**
 * Validates a single PartnerList entry.
 *
 * `source` accepts 'attribute' | 'manual' | 'derived'. Phase 39 adds
 * 'derived' for auto-maintained lists. Legacy payloads with 'attribute' or
 * 'manual' continue to parse unchanged.
 */
export const partnerListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  partnerIds: z.array(z.string()),
  filters: attributeFiltersSchema,
  source: z.enum(['attribute', 'manual', 'derived']),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/** Validates the full partner lists array stored in localStorage. */
export const partnerListsArraySchema = z.array(partnerListSchema);
