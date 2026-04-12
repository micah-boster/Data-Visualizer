'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'bounce-heatmap-enabled';

/**
 * Manages heatmap on/off preference persisted in localStorage.
 *
 * Defaults to `true` (heatmap enabled) when no stored value exists.
 * SSR-safe: returns true default when window is unavailable.
 */
export function useHeatmapPreference(): [boolean, () => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return [enabled, toggle];
}
