'use client';

import { useState, useCallback } from 'react';
import type { BaselineMode } from '@/components/kpi/baseline-selector';

const STORAGE_KEY = 'gsd:baselineMode';
const DEFAULT_MODE: BaselineMode = 'rolling';

/** Type guard — accept only the exact strings of the BaselineMode union. */
function isValid(v: unknown): v is BaselineMode {
  return v === 'rolling' || v === 'modeled';
}

/**
 * Manages the panel-level BaselineMode preference, persisted to
 * `localStorage` under the key `gsd:baselineMode`.
 *
 * Default value is `'rolling'` (zero regression for users who have never
 * seen the toggle — Phase 40.1 CONTEXT § Persistence). Returned tuple
 * shape mirrors `useHeatmapPreference` exactly, since both are persisted
 * UI preferences with the same SSR + private-browsing concerns.
 *
 * SSR-safe: returns `'rolling'` when `window` is undefined (during the
 * Next.js server render). Wraps both reads and writes in try/catch to
 * survive private-browsing / quota-exceeded environments.
 *
 * Phase 40.1 NOTE — the previous reset-to-rolling effect at
 * `data-display.tsx:298-306` is being removed in Plan 02 per the
 * persistence decision. This hook intentionally has no reset behavior;
 * `data-display` reads the persisted value once on mount and trusts it.
 *
 * Corrupt or unrecognized stored values fall back to the default
 * (defensive against hand-edited localStorage payloads).
 */
export function useBaselineMode(): [BaselineMode, (next: BaselineMode) => void] {
  const [mode, setModeState] = useState<BaselineMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_MODE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return DEFAULT_MODE;
      return isValid(stored) ? stored : DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  });

  const setMode = useCallback((next: BaselineMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-browsing / quota-exceeded — silent failure is acceptable.
      // The in-memory state is still updated; persistence just won't survive
      // a reload. Matches `useHeatmapPreference` failure behavior.
    }
  }, []);

  return [mode, setMode];
}
