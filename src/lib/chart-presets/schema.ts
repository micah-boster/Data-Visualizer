/**
 * Zod validation schemas for chart presets.
 *
 * Used to safely parse localStorage data — corrupt or stale entries
 * are gracefully rejected via safeParse rather than crashing the app.
 *
 * Intentionally NOT `.strict()` — future additive fields on ChartPreset
 * (e.g. updatedAt, description) should land without bumping a schema
 * version. Mirrors the additive-optional evolution used by ViewSnapshot
 * (Phase 32-02 drill, Phase 34 listId).
 */

import { z } from 'zod';
import { chartDefinitionSchema } from '../views/schema.ts';

/** Validates a single ChartPreset entry. */
export const chartPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  locked: z.boolean(),
  createdAt: z.number(),
  definition: chartDefinitionSchema,
});

/** Validates the full chart presets array stored in localStorage. */
export const chartPresetsArraySchema = z.array(chartPresetSchema);
