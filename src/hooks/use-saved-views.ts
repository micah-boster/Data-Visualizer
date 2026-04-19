'use client';

/**
 * Hook managing saved views with localStorage persistence.
 *
 * Hydration-safe: initializes with empty array in useState, then
 * applies localStorage values in useEffect to avoid Next.js hydration mismatch.
 * Follows the same pattern as useColumnManagement.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SavedView, ViewSnapshot } from '@/lib/views/types';
import { loadSavedViews, persistSavedViews } from '@/lib/views/storage';
import { getDefaultViews } from '@/lib/views/defaults';
import { migrateChartState } from '@/lib/views/migrate-chart';
import { COLUMN_CONFIGS } from '@/lib/columns/config';

/** Set of all known column keys for schema evolution filtering. */
const KNOWN_COLUMNS = new Set(COLUMN_CONFIGS.map((c) => c.key));

/**
 * Strip unknown column keys from a view snapshot.
 * Handles schema evolution when columns are added or removed.
 *
 * Phase 34: also non-destructively strips snapshot.listId when the referenced
 * partner list is unknown. A saved view whose list was deleted still loads
 * cleanly — it just does not activate any list on load. Callers that don't
 * need list-awareness can pass an empty set (conservative default — strips
 * all listIds), but the default caller passes the real known-list-ids from
 * usePartnerLists.
 */
function sanitizeSnapshot(
  snapshot: ViewSnapshot,
  knownListIds: Set<string>,
): ViewSnapshot {
  return {
    ...snapshot,
    sorting: (snapshot.sorting ?? []).filter((s) => KNOWN_COLUMNS.has(s.id)),
    columnVisibility: Object.fromEntries(
      Object.entries(snapshot.columnVisibility).filter(([k]) =>
        KNOWN_COLUMNS.has(k),
      ),
    ),
    columnOrder: snapshot.columnOrder.filter((k) => KNOWN_COLUMNS.has(k)),
    columnFilters: Object.fromEntries(
      Object.entries(snapshot.columnFilters ?? {}).filter(([k]) =>
        KNOWN_COLUMNS.has(k),
      ),
    ),
    columnSizing: Object.fromEntries(
      Object.entries(snapshot.columnSizing ?? {}).filter(([k]) =>
        KNOWN_COLUMNS.has(k),
      ),
    ),
    // Phase 35 — migrate legacy ChartViewState → ChartDefinition (idempotent).
    // viewSnapshotSchema.chartState is z.unknown().optional() at parse time, so
    // legacy records reach here untyped; migrateChartState is the single site
    // that validates against chartDefinitionSchema.
    chartState: migrateChartState(snapshot.chartState),
    // Phase 34 — strip unknown listId. Preserves loading behavior for views
    // that reference deleted lists (no crash, no toast, no list activation).
    listId:
      snapshot.listId && knownListIds.has(snapshot.listId)
        ? snapshot.listId
        : undefined,
  };
}

/**
 * Sanitize all views in a list, stripping unknown column keys and unknown listIds.
 */
function sanitizeViews(
  views: SavedView[],
  knownListIds: Set<string>,
): SavedView[] {
  return views.map((v) => ({
    ...v,
    snapshot: sanitizeSnapshot(v.snapshot, knownListIds),
  }));
}

export function useSavedViews(knownListIds?: Set<string>) {
  // Initialize empty for SSR/hydration safety
  const [views, setViews] = useState<SavedView[]>([]);
  const hasHydrated = useRef(false);

  // Hydration-safe: initializes with an empty array in useState, then applies
  // localStorage values in useEffect to avoid Next.js hydration mismatch.
  // Do NOT convert to derived state — reading localStorage during render
  // breaks SSR. (KI-13 deferred: see Phase 25 Plan D.)
  //
  // Phase 34: re-runs when knownListIds changes (e.g. a partner list is
  // created/deleted), so stale listIds get sanitized without a page reload.
  useEffect(() => {
    let loaded = loadSavedViews();
    if (loaded.length === 0) {
      loaded = getDefaultViews();
    }
    const ids = knownListIds ?? new Set<string>();
    setViews(sanitizeViews(loaded, ids));
    hasHydrated.current = true;
  }, [knownListIds]);

  // Persist to localStorage after hydration on every change
  useEffect(() => {
    if (!hasHydrated.current) return;
    persistSavedViews(views);
  }, [views]);

  const saveView = useCallback(
    (name: string, snapshot: ViewSnapshot): void => {
      setViews((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          snapshot,
          createdAt: Date.now(),
        },
      ]);
    },
    [],
  );

  const deleteView = useCallback(
    (id: string): { deleted: SavedView | undefined } => {
      let deleted: SavedView | undefined;
      setViews((prev) => {
        deleted = prev.find((v) => v.id === id);
        return prev.filter((v) => v.id !== id);
      });
      return { deleted };
    },
    [],
  );

  const restoreView = useCallback((view: SavedView): void => {
    setViews((prev) => [...prev, view]);
  }, []);

  const getView = useCallback(
    (id: string): SavedView | undefined => {
      return views.find((v) => v.id === id);
    },
    [views],
  );

  const hasViewWithName = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim().toLowerCase();
      return views.some((v) => v.name.toLowerCase() === trimmed);
    },
    [views],
  );

  const replaceView = useCallback(
    (name: string, snapshot: ViewSnapshot): void => {
      const trimmed = name.trim().toLowerCase();
      setViews((prev) =>
        prev.map((v) =>
          v.name.toLowerCase() === trimmed
            ? { ...v, snapshot, createdAt: Date.now() }
            : v,
        ),
      );
    },
    [],
  );

  const restoreDefaults = useCallback((): void => {
    setViews(getDefaultViews());
  }, []);

  return {
    views,
    saveView,
    deleteView,
    restoreView,
    getView,
    hasViewWithName,
    replaceView,
    restoreDefaults,
  };
}
