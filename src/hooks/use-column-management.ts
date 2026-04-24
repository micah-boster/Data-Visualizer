'use client';

/**
 * Hook managing column visibility and order with localStorage persistence.
 *
 * Hydration-safe: initializes with defaults in useState, then applies
 * localStorage values in useEffect to avoid Next.js hydration mismatch.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { IDENTITY_COLUMNS } from '@/lib/columns/config';
import {
  COLUMN_GROUPS,
  getDefaultVisibility,
  getDefaultColumnOrder,
} from '@/lib/columns/groups';
import { loadColumnState, saveColumnState } from '@/lib/columns/persistence';

const identitySet = new Set(IDENTITY_COLUMNS);

export function useColumnManagement(
  setActivePreset?: (preset: string) => void,
) {
  // Initialize with defaults for SSR/hydration safety
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getDefaultVisibility,
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    getDefaultColumnOrder,
  );

  // Track whether we've loaded from localStorage yet
  const hasHydrated = useRef(false);

  // Hydration-safe: initializes with defaults in useState, then applies
  // localStorage values in useEffect to avoid Next.js hydration mismatch.
  // Do NOT convert to derived state — reading localStorage during render
  // breaks SSR. (KI-13 deferred: see Phase 25 Plan D.)
  useEffect(() => {
    const saved = loadColumnState();
    if (saved) {
      setColumnVisibility(saved.visibility);
      setColumnOrder(saved.order);
    }
    hasHydrated.current = true;
  }, []);

  // Persist to localStorage when state changes (after hydration)
  useEffect(() => {
    if (!hasHydrated.current) return;
    saveColumnState({ visibility: columnVisibility, order: columnOrder });
  }, [columnVisibility, columnOrder]);

  const visibleCount = useMemo(() => {
    return Object.values(columnVisibility).filter(Boolean).length;
  }, [columnVisibility]);

  const markCustomPreset = useCallback(() => {
    setActivePreset?.('custom');
  }, [setActivePreset]);

  const toggleColumn = useCallback(
    (key: string) => {
      // POL-03 (Phase 38): identity-column toggle lock removed. Identity
      // columns retain their role elsewhere (preset defaults, widths, filter
      // enable) but are now user-hideable from the column picker.
      setColumnVisibility((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
      markCustomPreset();
    },
    [markCustomPreset],
  );

  const toggleGroup = useCallback(
    (groupKey: string, visible: boolean) => {
      const group = COLUMN_GROUPS.find((g) => g.key === groupKey);
      if (!group) return;
      setColumnVisibility((prev) => {
        const next = { ...prev };
        // POL-03 (Phase 38): group toggle now applies uniformly to all
        // columns in the group, including identity columns.
        for (const col of group.columns) {
          next[col] = visible;
        }
        return next;
      });
      markCustomPreset();
    },
    [markCustomPreset],
  );

  const showAll = useCallback(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = true;
      }
      return next;
    });
    markCustomPreset();
  }, [markCustomPreset]);

  const hideAll = useCallback(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        // Keep identity columns visible
        next[key] = identitySet.has(key);
      }
      return next;
    });
    markCustomPreset();
  }, [markCustomPreset]);

  const resetToDefaults = useCallback(() => {
    setColumnVisibility(getDefaultVisibility());
    setColumnOrder(getDefaultColumnOrder());
    setActivePreset?.('finance');
  }, [setActivePreset]);

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    resetToDefaults,
    visibleCount,
    toggleColumn,
    toggleGroup,
    showAll,
    hideAll,
  };
}
