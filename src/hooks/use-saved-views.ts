'use client';

/**
 * Hook managing saved views with localStorage persistence.
 *
 * Hydration-safe: initializes with empty array in useState, then
 * applies localStorage values in useEffect to avoid Next.js hydration mismatch.
 * Follows the same pattern as useColumnManagement.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SavedView, ViewSnapshot } from '@/lib/views/types';
import {
  loadSavedViews,
  persistSavedViews,
  subscribeSavedViews,
} from '@/lib/views/storage';
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
 * Phase 39 PCFG-04 — detect legacy `dimensionFilters.partner` entry on a raw
 * snapshot.
 *
 * Pre-Phase-39 saved views could carry a column-equality filter on
 * PARTNER_NAME (`?partner=Acme`) — Phase 39 deprecated that filter (selection
 * is owned by drill state). Detector exposed for tests + the data-display
 * toast path.
 */
export function hasLegacyPartnerFilter(snapshot: ViewSnapshot): boolean {
  const dim = snapshot.dimensionFilters;
  if (dim && typeof dim === 'object' && 'partner' in dim && dim.partner) {
    return true;
  }
  return false;
}

/**
 * Phase 39 PCFG-03 — extra metadata stamped on a sanitized snapshot when the
 * legacy `drill.partner` field couldn't be migrated unambiguously to a pair
 * (multi-product partner with no `drill.product`).
 *
 * `data-display.tsx#handleLoadView` reads this flag, fires a sonner toast
 * explaining the step-up, and clears the flag before persisting. NOT a
 * persisted field on ViewSnapshot — it lives only on the in-memory snapshot
 * during the load handoff.
 */
export interface SanitizedSnapshotMeta {
  legacyDrillStrippedReason?: 'multi-product-ambiguous';
  hasLegacyPartnerFilter?: boolean;
}

export type SnapshotWithMeta = ViewSnapshot & SanitizedSnapshotMeta;

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
  /**
   * Phase 39 PCFG-03 — caller-supplied "products available per partner" map.
   * Used to migrate legacy drill state: a snapshot with `drill.partner` but
   * no `drill.product` is ambiguous for multi-product partners. When the
   * partner has exactly ONE product in the map, we synthesize that product
   * onto the migrated drill. Otherwise the entire `drill` block is stripped
   * AND `legacyDrillStrippedReason` is stamped on the returned snapshot so
   * `handleLoadView` can fire a step-up toast.
   *
   * Defaults to an empty map (= conservative: legacy `drill.partner` always
   * stripped for hydration callers that don't yet have data loaded). The
   * runtime data-display caller passes the real map.
   */
  knownPairs: Map<string, string[]> = new Map(),
): SnapshotWithMeta {
  // Phase 38 FLT-01 + Phase 39 PCFG-04 — prune legacy batch + partner
  // dimension filters.
  const dim = snapshot.dimensionFilters;
  const hasLegacyPartner = !!(
    dim &&
    typeof dim === 'object' &&
    'partner' in dim &&
    dim.partner
  );
  const prunedDimensionFilters =
    dim && typeof dim === 'object'
      ? Object.fromEntries(
          Object.entries(dim).filter(([k]) => k !== 'batch' && k !== 'partner'),
        )
      : {};
  const col = snapshot.columnFilters ?? {};
  const prunedColumnFiltersBase = Object.fromEntries(
    Object.entries(col).filter(([k]) => k !== 'BATCH'),
  );

  // Phase 39 PCFG-03 — legacy drill migration.
  let migratedDrill: ViewSnapshot['drill'] = snapshot.drill;
  let legacyDrillStrippedReason: 'multi-product-ambiguous' | undefined;
  if (snapshot.drill?.partner && !snapshot.drill.product) {
    const products = knownPairs.get(snapshot.drill.partner);
    if (products && products.length === 1) {
      // Single-product partner → synthesize the product onto the migrated drill.
      migratedDrill = { ...snapshot.drill, product: products[0] };
    } else if (products && products.length > 1) {
      // Multi-product partner → can't disambiguate; strip the drill and flag
      // for a step-up toast.
      migratedDrill = undefined;
      legacyDrillStrippedReason = 'multi-product-ambiguous';
    } else {
      // Partner not present in current data — leave drill as-is; the existing
      // stale-deep-link guard in data-display.tsx will step up on its own.
      migratedDrill = snapshot.drill;
    }
  }

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
    drill: migratedDrill,
    legacyDrillStrippedReason,
    hasLegacyPartnerFilter: hasLegacyPartner ? true : undefined,
  };
}

/**
 * Sanitize all views in a list, stripping unknown column keys and unknown listIds.
 */
function sanitizeViews(
  views: SavedView[],
  knownListIds: Set<string>,
  knownPairs: Map<string, string[]>,
): SavedView[] {
  return views.map((v) => ({
    ...v,
    snapshot: sanitizeSnapshot(v.snapshot, knownListIds, knownPairs),
  }));
}

export function useSavedViews(
  knownListIds?: Set<string>,
  /**
   * Phase 39 PCFG-03 — products-per-partner map for legacy drill migration.
   * Defaults to undefined; data-display threads the real map in once data
   * loads. `Map<partnerName, productList>`.
   */
  knownPairs?: Map<string, string[]>,
) {
  // Initialize empty for SSR/hydration safety
  const [views, setViews] = useState<SavedView[]>([]);
  const hasHydrated = useRef(false);
  // Phase 43 gap-closure: skip the next persist round when the state change
  // came from the cross-tab subscribe handler. Without this guard, every
  // received `storage` event triggers a setState that triggers persist that
  // triggers another `storage` event in the OTHER tab — an infinite ping-pong
  // (Test 5 in 43-UAT.md).
  const externalUpdateRef = useRef(false);

  // Hydration-safe: initializes with an empty array in useState, then applies
  // localStorage values in useEffect to avoid Next.js hydration mismatch.
  // Do NOT convert to derived state — reading localStorage during render
  // breaks SSR. (KI-13 deferred: see Phase 25 Plan D.)
  //
  // Phase 39 PCFG-03 — stable empty Map sentinel so the effect doesn't re-run
  // on every render when the caller doesn't supply knownPairs.
  const stableEmptyPairs = useMemo(() => new Map<string, string[]>(), []);
  const pairs = knownPairs ?? stableEmptyPairs;

  // Phase 43 gap-closure: hydrate-once. The previous version re-ran on every
  // change to `knownListIds` or `pairs` and re-loaded from localStorage,
  // which clobbered freshly-saved in-memory state when the timing crossed a
  // React Query refetch (`pairs` rebuilds whenever `data?.data` changes).
  // Stale listIds and column keys are handled gracefully at the consumer
  // level — no need to re-sanitize the whole list every time the dataset
  // identity changes.
  useEffect(() => {
    if (hasHydrated.current) return;
    let loaded = loadSavedViews();
    if (loaded.length === 0) {
      loaded = getDefaultViews();
    }
    const ids = knownListIds ?? new Set<string>();
    setViews(sanitizeViews(loaded, ids, pairs));
    hasHydrated.current = true;
  }, [knownListIds, pairs]);

  // Persist to localStorage after hydration on every change.
  // The externalUpdateRef guard prevents the cross-tab ping-pong loop —
  // see the ref declaration above and the subscribe effect below.
  useEffect(() => {
    if (!hasHydrated.current) return;
    if (externalUpdateRef.current) {
      externalUpdateRef.current = false;
      return;
    }
    persistSavedViews(views);
  }, [views]);

  // Phase 43 BND-03 — cross-tab sync. When another tab writes the same key,
  // re-sanitize against the current dataset and replace local state. We
  // mark the update as external so the persist effect skips one round and
  // does NOT echo the value back to localStorage (which would fire a
  // storage event in the originating tab and bounce forever).
  useEffect(() => {
    const ids = knownListIds ?? new Set<string>();
    const unsub = subscribeSavedViews((next) => {
      externalUpdateRef.current = true;
      setViews(sanitizeViews(next, ids, pairs));
    });
    return unsub;
  }, [knownListIds, pairs]);

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
