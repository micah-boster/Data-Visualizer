/**
 * localStorage CRUD for chart presets.
 *
 * Reads/writes are wrapped in try-catch to handle SSR,
 * private browsing, and quota errors gracefully.
 * Mirrors the SSR-safe pattern in src/lib/views/storage.ts.
 *
 * IMPORTANT: `loadChartPresets` returns user presets ONLY. Built-in
 * presets are NEVER persisted (rebuilt from code on every hook
 * hydration — see useChartPresets + BUILTIN_PRESETS). The merge of
 * built-ins ahead of user presets happens in the hook, not here.
 */

import type { ChartPreset } from './types.ts';
import { chartPresetsArraySchema } from './schema.ts';

export const CHART_PRESETS_STORAGE_KEY = 'bounce-dv-chart-presets';

/**
 * Load user chart presets from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 * Does NOT include built-in presets — the hook merges those from code.
 */
export function loadChartPresets(): ChartPreset[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CHART_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = chartPresetsArraySchema.safeParse(parsed);
    if (result.success) {
      return result.data as ChartPreset[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Persist user chart presets to localStorage.
 * Silently fails on SSR, quota errors, or private browsing.
 * Callers MUST filter out locked built-ins before calling this —
 * the hook's persist effect handles that filter.
 */
export function persistChartPresets(presets: ChartPreset[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CHART_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Silent fail — quota exceeded, private browsing, etc.
  }
}
