/**
 * Zod validation schemas for partner lists.
 *
 * Used to safely parse localStorage data — corrupt or stale entries
 * are gracefully rejected via safeParse rather than crashing the app.
 *
 * attributeFiltersSchema is marked `.strict()` so unknown attribute keys
 * fail at parse time. This is intentional: adding a new attribute later
 * forces a schema update, which is the right surface to think about
 * migration and additive-optional evolution.
 */

import { z } from 'zod';

/** Attribute-driven filter shape (v1: ACCOUNT_TYPE only). */
const attributeFiltersSchema = z
  .object({
    ACCOUNT_TYPE: z.array(z.string()).optional(),
    // Future attributes append here as `.optional()` fields for additive evolution.
  })
  .strict();

/** Validates a single PartnerList entry. */
export const partnerListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  partnerIds: z.array(z.string()),
  filters: attributeFiltersSchema,
  source: z.enum(['attribute', 'manual']),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/** Validates the full partner lists array stored in localStorage. */
export const partnerListsArraySchema = z.array(partnerListSchema);
