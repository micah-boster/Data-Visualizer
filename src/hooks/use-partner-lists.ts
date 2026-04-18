'use client';

/**
 * Hook managing partner lists with localStorage persistence.
 *
 * Hydration-safe: initializes with empty array in useState, then
 * applies localStorage values in useEffect to avoid Next.js hydration mismatch.
 * Mirrors the structural pattern of useSavedViews.
 *
 * Contract (UsePartnerListsResult):
 * - `lists`           current list state
 * - `createList`      insert + return the created list (so callers can immediately activate)
 * - `deleteList`      remove + return the deleted list (for undo toast)
 * - `restoreList`     append-only undo restore
 * - `renameList`      trimmed-name rename + bumped updatedAt (no-op on empty trim)
 * - `updateList`      bulk edit-mode patch over { name, filters, partnerIds }; source is locked
 * - `refreshList`     re-evaluate filters against rows; ONLY for source === 'attribute' (Pitfall 7)
 * - `getList`         read by id
 * - `hasListWithName` case-insensitive trimmed uniqueness check
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PartnerList, PartnerListFilters } from '@/lib/partner-lists/types';
import {
  loadPartnerLists,
  persistPartnerLists,
} from '@/lib/partner-lists/storage';
import { evaluateFilters } from '@/lib/partner-lists/filter-evaluator';

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

export function usePartnerLists(): UsePartnerListsResult {
  // Initialize empty for SSR/hydration safety
  const [lists, setLists] = useState<PartnerList[]>([]);
  const hasHydrated = useRef(false);

  // Hydration-safe: initializes with an empty array in useState, then applies
  // localStorage values in useEffect to avoid Next.js hydration mismatch.
  // Do NOT convert to derived state — reading localStorage during render
  // breaks SSR. (KI-13 deferred: see Phase 25 Plan D.)
  useEffect(() => {
    setLists(loadPartnerLists());
    hasHydrated.current = true;
  }, []);

  // Persist to localStorage after hydration on every change
  useEffect(() => {
    if (!hasHydrated.current) return;
    persistPartnerLists(lists);
  }, [lists]);

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
      setLists((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const deleteList = useCallback((id: string): PartnerList | undefined => {
    let removed: PartnerList | undefined;
    setLists((prev) => {
      removed = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });
    return removed;
  }, []);

  const restoreList = useCallback((list: PartnerList): void => {
    setLists((prev) => [...prev, list]);
  }, []);

  const renameList = useCallback((id: string, name: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLists((prev) =>
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
      setLists((prev) =>
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
      let diff: { added: number; removed: number } | undefined;
      setLists((prev) =>
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
