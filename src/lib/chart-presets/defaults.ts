/**
 * Built-in chart presets shipped with the app.
 *
 * Claude may add a second built-in ONLY if a concrete second one falls
 * out of implementation — CONTEXT.md caps the catalog at one unless a
 * natural second arises. Plans 36-04/05 should NOT add a second built-in
 * speculatively. v1 intentionally ships a single preset (Collection
 * Curves) to match the "preset is a reusable shortcut, not the canonical
 * storage" CONTEXT lock.
 *
 * Built-ins reference DEFAULT_COLLECTION_CURVE from migrate-chart.ts as
 * the single source of truth for the collection-curve definition shape
 * (36-RESEARCH Open Q #2: reference it directly, don't duplicate the
 * literal). Reference equality is asserted in the smoke test.
 */

import { DEFAULT_COLLECTION_CURVE } from '../views/migrate-chart.ts';
import type { ChartPreset } from './types.ts';

/**
 * Code-defined preset catalog. NEVER persisted — rebuilt on every
 * hook hydration so a user can't inadvertently delete a built-in via
 * a manual localStorage edit.
 */
export const BUILTIN_PRESETS: ChartPreset[] = [
  {
    id: 'builtin:collection-curves',
    name: 'Collection Curves',
    locked: true,
    createdAt: 0,
    definition: DEFAULT_COLLECTION_CURVE,
  },
];
