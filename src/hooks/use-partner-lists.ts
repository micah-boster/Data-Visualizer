'use client';

/**
 * Hook managing partner lists with localStorage persistence.
 *
 * Hydration-safe: initializes with empty array in useState, then
 * applies localStorage values in useEffect to avoid Next.js hydration mismatch.
 * Mirrors the structural pattern of useSavedViews.
 *
 * Phase 39 — derived auto-lists merge (PCFG-06):
 *   When `rows` is supplied, `computeDerivedLists(rows)` produces one
 *   PartnerList per distinct ACCOUNT_TYPE value present in the dataset.
 *   These derived lists merge with the user-stored lists from localStorage:
 *
 *     - Derived lists are NEVER persisted to localStorage. Persistence
 *       filters them out via DERIVED_LIST_ID_PREFIX so the stored array
 *       only ever contains user-created lists.
 *     - Derived lists win on id collision (the prefix is reserved, but
 *       the merge is defensive: a localStorage entry with a derived-id
 *       prefix is overridden by the freshly-computed list).
 *     - Mutating ops on derived lists are no-ops with dev warnings:
 *       updateList, renameList, refreshList. deleteList removes the
 *       in-memory entry but the next render re-derives it (this is the
 *       "reappears on refresh" semantic; the sidebar fires a sonner toast
 *       to communicate this).
 *
 * Contract (UsePartnerListsResult):
 * - `lists`           merged effective list state (user + derived)
 * - `createList`      insert + return the created list
 * - `deleteList`      remove + return the deleted list (for undo toast)
 * - `restoreList`     append-only undo restore
 * - `renameList`      trimmed-name rename + bumped updatedAt (no-op on empty trim or derived)
 * - `updateList`      bulk edit-mode patch over { name, filters, partnerIds }
 * - `refreshList`     re-evaluate filters; ONLY for source === 'attribute' (Pitfall 7)
 * - `getList`         read by id
 * - `hasListWithName` case-insensitive trimmed uniqueness check
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PartnerList, PartnerListFilters } from '@/lib/partner-lists/types';
import {
  loadPartnerLists,
  persistPartnerLists,
  subscribePartnerLists,
} from '@/lib/partner-lists/storage';
import { evaluateFilters } from '@/lib/partner-lists/filter-evaluator';
import {
  computeDerivedLists,
  DERIVED_LIST_ID_PREFIX,
} from '@/lib/partner-lists/derived-lists';

export interface UsePartnerListsResult {
  lists: PartnerList[];
  createList: (input: {
    name: string;
    partnerIds: string[];
    filters: PartnerListFilters;
    source: 'attribute' | 'manual';
  }) => PartnerList;
  deleteList: (id: string) => PartnerList | undefined;
  restoreList: (list: PartnerList) => void;
  renameList: (id: string, name: string) => void;
  updateList: (
    id: string,
    patch: Partial<Pick<PartnerList, 'name' | 'filters' | 'partnerIds'>>,
  ) => void;
  refreshList: (
    id: string,
    rows: Array<Record<string, unknown>>,
  ) => { added: number; removed: number } | undefined;
  getList: (id: string) => PartnerList | undefined;
  hasListWithName: (name: string) => boolean;
}

/**
 * @param rows  Optional dataset rows. When provided, derived auto-lists are
 *              computed and merged into the returned `lists`. When omitted
 *              (or empty), only user-created lists are returned.
 */
export function usePartnerLists(
  rows?: Array<Record<string, unknown>>,
): UsePartnerListsResult {
  // Initialize empty for SSR/hydration safety
  const [storedLists, setStoredLists] = useState<PartnerList[]>([]);
  const hasHydrated = useRef(false);
  // Phase 43 gap-closure: skip the next persist round when the state change
  // came from cross-tab subscribe — prevents the ping-pong loop between tabs.
  // See 43-UAT.md Test 5/6 for diagnosis.
  const externalUpdateRef = useRef(false);

  // Hydration-safe: initializes with an empty array in useState, then applies
  // localStorage values in useEffect to avoid Next.js hydration mismatch.
  // Do NOT convert to derived state — reading localStorage during render
  // breaks SSR. (KI-13 deferred: see Phase 25 Plan D.)
  useEffect(() => {
    setStoredLists(loadPartnerLists());
    hasHydrated.current = true;
  }, []);

  // Persist to localStorage after hydration on every change. Filter out any
  // derived lists defensively — they should never be in storedLists, but if a
  // future code path accidentally shovels one into setStoredLists, this strips
  // it before it lands on disk. The externalUpdateRef guard short-circuits
  // when the change came from the cross-tab listener.
  useEffect(() => {
    if (!hasHydrated.current) return;
    if (externalUpdateRef.current) {
      externalUpdateRef.current = false;
      return;
    }
    persistPartnerLists(
      storedLists.filter((l) => !l.id.startsWith(DERIVED_LIST_ID_PREFIX)),
    );
  }, [storedLists]);

  // Phase 43 BND-03 — cross-tab sync. When another tab writes the same key,
  // mirror the user-stored lists locally. Derived lists are recomputed from
  // `rows` in the useMemo above, so we only need to sync the stored slice.
  // Mark the update as external so persist skips one round (no echo).
  useEffect(() => {
    const unsub = subscribePartnerLists((next) => {
      externalUpdateRef.current = true;
      setStoredLists(
        next.filter((l) => !l.id.startsWith(DERIVED_LIST_ID_PREFIX)),
      );
    });
    return unsub;
  }, []);

  // Phase 39 — derived auto-lists. Recomputed on every rows change. Stable
  // IDs (DERIVED_LIST_ID_PREFIX + ACCOUNT_TYPE_VALUE) ensure that subsequent
  // derivations reuse the same identity, so consumers keying on `list.id`
  // don't re-render when nothing meaningful changed.
  const derivedLists = useMemo(
    () => (rows && rows.length > 0 ? computeDerivedLists(rows) : []),
    [rows],
  );

  // Effective lists: user-stored first, then derived appended. De-dup by id;
  // derived entries WIN on collision (defensive against a stray localStorage
  // entry that smuggles a __derived__ prefix past validation).
  const lists = useMemo<PartnerList[]>(() => {
    if (derivedLists.length === 0) return storedLists;
    const derivedIds = new Set(derivedLists.map((l) => l.id));
    const userLists = storedLists.filter((l) => !derivedIds.has(l.id));
    return [...userLists, ...derivedLists];
  }, [storedLists, derivedLists]);

  const createList = useCallback(
    (input: {
      name: string;
      partnerIds: string[];
      filters: PartnerListFilters;
      source: 'attribute' | 'manual';
    }): PartnerList => {
      const now = Date.now();
      const created: PartnerList = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        partnerIds: input.partnerIds,
        filters: input.filters,
        source: input.source,
        createdAt: now,
        updatedAt: now,
      };
      setStoredLists((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const deleteList = useCallback((id: string): PartnerList | undefined => {
    // Phase 39 — derived lists are not in storedLists; deletion is a transient
    // in-memory removal that re-materializes on the next render. The sidebar
    // fires a "reappears on refresh" sonner toast to communicate this.
    if (id.startsWith(DERIVED_LIST_ID_PREFIX)) {
      // Return the synthesized (currently-rendered) list shape so callers can
      // still wire the toast description, but don't mutate storedLists.
      // Lookup happens via the merged `lists` array — which the caller already
      // had access to when invoking deleteList; here we just return undefined
      // because the underlying storage didn't change.
      return undefined;
    }
    let removed: PartnerList | undefined;
    setStoredLists((prev) => {
      removed = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });
    return removed;
  }, []);

  const restoreList = useCallback((list: PartnerList): void => {
    // Defensive — never restore a derived list into storedLists.
    if (list.id.startsWith(DERIVED_LIST_ID_PREFIX)) return;
    setStoredLists((prev) => [...prev, list]);
  }, []);

  const renameList = useCallback((id: string, name: string): void => {
    if (id.startsWith(DERIVED_LIST_ID_PREFIX)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[partner-lists] renameList called on derived list — noop',
        );
      }
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredLists((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, name: trimmed, updatedAt: Date.now() } : l,
      ),
    );
  }, []);

  const updateList = useCallback(
    (
      id: string,
      patch: Partial<Pick<PartnerList, 'name' | 'filters' | 'partnerIds'>>,
    ): void => {
      if (id.startsWith(DERIVED_LIST_ID_PREFIX)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[partner-lists] updateList called on derived list — noop',
          );
        }
        return;
      }
      setStoredLists((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          // Trim name if supplied; skip patch entirely when trimmed name is empty.
          let nextPatch = patch;
          if (patch.name !== undefined) {
            const trimmed = patch.name.trim();
            if (!trimmed) return l;
            nextPatch = { ...patch, name: trimmed };
          }
          // `source` is locked at creation (Pitfall 7) — the Pick<> type already
          // excludes it, so nothing to strip at runtime.
          return { ...l, ...nextPatch, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const refreshList = useCallback(
    (
      id: string,
      rows: Array<Record<string, unknown>>,
    ): { added: number; removed: number } | undefined => {
      // Phase 39 — derived lists re-derive on hydration; manual refresh is a
      // noop. Logging makes accidental call sites visible during dev.
      if (id.startsWith(DERIVED_LIST_ID_PREFIX)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[partner-lists] refreshList called on derived list — noop',
          );
        }
        return undefined;
      }
      let diff: { added: number; removed: number } | undefined;
      setStoredLists((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          // Pitfall 7 — hand-picked lists do not get Refresh.
          if (l.source !== 'attribute') return l;
          const matching = evaluateFilters(rows, l.filters);
          const nextIds = Array.from(matching);
          const prevSet = new Set(l.partnerIds);
          const nextSet = matching;
          let added = 0;
          for (const name of nextSet) {
            if (!prevSet.has(name)) added++;
          }
          let removed = 0;
          for (const name of prevSet) {
            if (!nextSet.has(name)) removed++;
          }
          diff = { added, removed };
          return { ...l, partnerIds: nextIds, updatedAt: Date.now() };
        }),
      );
      return diff;
    },
    [],
  );

  const getList = useCallback(
    (id: string): PartnerList | undefined => {
      return lists.find((l) => l.id === id);
    },
    [lists],
  );

  const hasListWithName = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim().toLowerCase();
      return lists.some((l) => l.name.toLowerCase() === trimmed);
    },
    [lists],
  );

  return {
    lists,
    createList,
    deleteList,
    restoreList,
    renameList,
    updateList,
    refreshList,
    getList,
    hasListWithName,
  };
}
