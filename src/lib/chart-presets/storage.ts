/**
 * localStorage CRUD for chart presets — Phase 43 BND-03 wired through
 * `createVersionedStore`.
 *
 * Public API (loadChartPresets / persistChartPresets) UNCHANGED — every
 * existing consumer compiles without edits.
 *
 * IMPORTANT: `loadChartPresets` returns user presets ONLY. Built-in
 * presets are NEVER persisted (rebuilt from code on every hook
 * hydration — see useChartPresets + BUILTIN_PRESETS). The merge of
 * built-ins ahead of user presets happens in the hook, not here.
 */

import type { ChartPreset } from './types.ts';
import { chartPresetsArraySchema } from './schema.ts';
import { createVersionedStore } from '../persistence/versioned-storage.ts';
import {
  CHART_PRESETS_SCHEMA_VERSION,
  chartPresetsMigrations,
} from './migrations.ts';

export const CHART_PRESETS_STORAGE_KEY = 'bounce-dv-chart-presets';

const store = createVersionedStore<ChartPreset[]>({
  key: CHART_PRESETS_STORAGE_KEY,
  schemaVersion: CHART_PRESETS_SCHEMA_VERSION,
  migrations: chartPresetsMigrations,
  schema: chartPresetsArraySchema as unknown as import('zod').ZodType<ChartPreset[]>,
  defaultValue: [],
});

/**
 * Load user chart presets from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 * Does NOT include built-in presets — the hook merges those from code.
 */
export function loadChartPresets(): ChartPreset[] {
  return store.load();
}

/**
 * Persist user chart presets to localStorage.
 * Silently fails on SSR; surfaces a non-blocking toast on quota / verified-
 * write mismatch. Callers MUST filter out locked built-ins before calling
 * this — the hook's persist effect handles that filter.
 */
export function persistChartPresets(presets: ChartPreset[]): void {
  store.persist(presets);
}

/**
 * Cross-tab subscription. Fires when another tab writes the same key.
 * Returns an unsubscribe function. SSR-safe (no-op when window is undefined).
 */
export function subscribeChartPresets(
  listener: (presets: ChartPreset[]) => void,
): () => void {
  return store.subscribe(listener);
}
