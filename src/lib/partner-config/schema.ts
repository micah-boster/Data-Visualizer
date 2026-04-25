/**
 * Zod validation schemas for partner config entries.
 *
 * Used to safely parse localStorage data — corrupt or stale entries are
 * gracefully rejected via safeParse rather than crashing the app. Mirrors the
 * shape of `src/lib/partner-lists/schema.ts`.
 *
 * `segmentRuleSchema` enforces:
 *   - id, name, column non-empty
 *   - values: at least one entry (empty rules are blocked at save time)
 *   - name !== 'Other' (case-insensitive trim) — the literal is reserved for
 *     the auto-bucket; user-defined segments must pick a different label.
 *
 * `partnerConfigEntrySchema` is `.strict()` so unknown keys fail at parse
 * time. Future fields (e.g. `disabled?: boolean`, color overrides) land here
 * as additive `.optional()` extensions.
 */

import { z } from 'zod';

/** Validates a single segment rule. */
export const segmentRuleSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1)
    .refine((n) => n.trim().toLowerCase() !== 'other', {
      message: "Segment name 'Other' is reserved",
    }),
  column: z.string().min(1),
  values: z.array(z.string()).min(1),
});

/** Validates one `(partner, product)` config entry. */
export const partnerConfigEntrySchema = z
  .object({
    partner: z.string().min(1),
    product: z.string().min(1),
    segments: z.array(segmentRuleSchema),
    updatedAt: z.number(),
  })
  .strict();

/** Validates the full partner config array stored in localStorage. */
export const partnerConfigArraySchema = z.array(partnerConfigEntrySchema);
