'use client';

/**
 * Hook managing chart presets with localStorage persistence.
 *
 * Hydration-safe: initializes with an empty array in useState, then
 * loads user presets + merges BUILTIN_PRESETS in useEffect to avoid
 * Next.js hydration mismatch. Mirrors useSavedViews 1:1 for structure.
 *
 * Built-ins are NEVER persisted — the second effect strips locked
 * entries before writing. A manually-edited localStorage carrying a
 * fake "locked: true" entry is also filtered via sanitizeUserPresets
 * (defense in depth — built-ins are rebuilt from code on every mount).
 *
 * PITFALL — hydration vs seed (Phase 35-02 Pitfall 2): a downstream
 * human-verify that seeds localStorage and reloads the page CANNOT
 * observe the seeded payload because this same hydration-then-persist
 * shape will overwrite the seed on the next render cycle. Downstream
 * Plan 36-03 handles the stale-column path via unit assertion instead
 * of a browser scenario.
 *
 * Do NOT read localStorage during render (KI-13 deferred — see Phase 25
 * Plan D). The first effect handles all storage reads.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChartDefinition } from '@/lib/views/types';
import type { ChartPreset } from '@/lib/chart-presets/types';
import { chartPresetSchema } from '@/lib/chart-presets/schema';
import {
  loadChartPresets,
  persistChartPresets,
} from '@/lib/chart-presets/storage';
import { BUILTIN_PRESETS } from '@/lib/chart-presets/defaults';

/**
 * Sanitize user presets loaded from localStorage.
 *
 * Two-layer defense:
 * 1. Any preset whose full shape (including `definition`) fails
 *    `chartPresetSchema.safeParse` is dropped (mirrors Phase 34
 *    sanitizeSnapshot drop-unknown-listIds pattern).
 * 2. Any preset with `locked: true` is dropped — built-ins are
 *    rebuilt from code on every hydration, so a poisoned
 *    localStorage carrying a fake built-in cannot leak through.
 */
function sanitizeUserPresets(raw: ChartPreset[]): ChartPreset[] {
  return raw.filter((preset) => {
    if (preset.locked === true) return false;
    return chartPresetSchema.safeParse(preset).success;
  });
}

export function useChartPresets() {
  // Initialize empty for SSR/hydration safety. NEVER read localStorage
  // during render.
  const [presets, setPresets] = useState<ChartPreset[]>([]);
  const hasHydrated = useRef(false);

  // Hydration: load user presets, sanitize, merge ahead-of-user-presets
  // with BUILTIN_PRESETS. Built-ins are NEVER persisted, so they're
  // always authored by code at mount time.
  useEffect(() => {
    const rawUser = loadChartPresets();
    const sanitizedUser = sanitizeUserPresets(rawUser);
    setPresets([...BUILTIN_PRESETS, ...sanitizedUser]);
    hasHydrated.current = true;
  }, []);

  // Persist after hydration. Strip locked built-ins so localStorage
  // only ever carries user presets.
  useEffect(() => {
    if (!hasHydrated.current) return;
    persistChartPresets(presets.filter((p) => !p.locked));
  }, [presets]);

  const savePreset = useCallback(
    (name: string, definition: ChartDefinition): ChartPreset => {
      // Deep-copy the definition to prevent a reference leak into
      // caller state (36-RESEARCH Pitfall 4). structuredClone is native
      // in all targeted browsers.
      const next: ChartPreset = {
        id: crypto.randomUUID(),
        name: name.trim(),
        locked: false,
        createdAt: Date.now(),
        definition: structuredClone(definition),
      };
      setPresets((prev) => [...prev, next]);
      return next;
    },
    [],
  );

  const deletePreset = useCallback(
    (id: string): ChartPreset | undefined => {
      let deleted: ChartPreset | undefined;
      setPresets((prev) => {
        const target = prev.find((p) => p.id === id);
        // Refuse to delete if missing or locked — built-in protection.
        if (!target || target.locked) {
          deleted = undefined;
          return prev;
        }
        deleted = target;
        return prev.filter((p) => p.id !== id);
      });
      return deleted;
    },
    [],
  );

  const restorePreset = useCallback((preset: ChartPreset): void => {
    // Used by undo-toast. Append as-is; caller owns the shape.
    setPresets((prev) => [...prev, preset]);
  }, []);

  const hasPresetWithName = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim().toLowerCase();
      return presets.some((p) => p.name.trim().toLowerCase() === trimmed);
    },
    [presets],
  );

  const renamePreset = useCallback((id: string, name: string): void => {
    setPresets((prev) =>
      prev.map((p) => {
        // No-op on locked ids (built-in protection).
        if (p.id !== id || p.locked) return p;
        return { ...p, name: name.trim() };
      }),
    );
  }, []);

  const getPreset = useCallback(
    (id: string): ChartPreset | undefined => {
      return presets.find((p) => p.id === id);
    },
    [presets],
  );

  return {
    presets,
    savePreset,
    deletePreset,
    restorePreset,
    hasPresetWithName,
    renamePreset,
    getPreset,
  };
}
