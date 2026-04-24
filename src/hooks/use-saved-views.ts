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
 * Phase 38 FLT-01 — detect a legacy batch-equality filter on a raw snapshot.
 *
 * Legacy snapshots (saved before the date-range preset shipped) stamped the
 * batch combobox value onto `dimensionFilters.batch` (URL-param channel). The
 * combobox was structurally broken — pre-aggregated rows never matched a
 * specific batch name cleanly — and the new date-range preset replaces it.
 *
 * This is a PURE DETECTION helper (exported for the FLT-01 smoke test). The
 * mutation that actually strips the field lives in `sanitizeSnapshot` below;
 * the migration toast fires only when detection returns true AND the caller
 * is on a user-initiated load path (handleLoadView), not hydration.
 */
export function hasLegacyBatchFilter(snapshot: ViewSnapshot): boolean {
  const dim = snapshot.dimensionFilters;
  if (dim && typeof dim === 'object' && 'batch' in dim && dim.batch) {
    return true;
  }
  // Column-equality on the BATCH column id was never written by the app, but
  // a manually-edited localStorage payload could carry one — strip defensively.
  const col = snapshot.columnFilters;
  if (col && typeof col === 'object' && 'BATCH' in col && col.BATCH != null) {
    return true;
  }
  return false;
}

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
 *
 * Phase 38 FLT-01: also strips the legacy `dimensionFilters.batch` entry
 * (and any defensive `columnFilters.BATCH` entry). The toast notifying the
 * user is emitted by `handleLoadView` in data-display.tsx via
 * `hasLegacyBatchFilter(snapshot)` BEFORE calling this sanitizer, so the
 * signature of `sanitizeSnapshot` stays stable (same ViewSnapshot->ViewSnapshot)
 * and the toast only fires on user-initiated loads (not hydration).
 */
export function sanitizeSnapshot(
  snapshot: ViewSnapshot,
  knownListIds: Set<string>,
): ViewSnapshot {
  // Phase 38 FLT-01: prune legacy batch dimension/column filters.
  const dim = snapshot.dimensionFilters;
  const prunedDimensionFilters =
    dim && typeof dim === 'object' && 'batch' in dim
      ? Object.fromEntries(Object.entries(dim).filter(([k]) => k !== 'batch'))
      : (dim ?? {});
  const col = snapshot.columnFilters ?? {};
  const prunedColumnFiltersBase = Object.fromEntries(
    Object.entries(col).filter(([k]) => k !== 'BATCH'),
  );

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
      Object.entries(prunedColumnFiltersBase).filter(([k]) =>
        KNOWN_COLUMNS.has(k),
      ),
    ),
    dimensionFilters: prunedDimensionFilters as Record<string, string>,
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
