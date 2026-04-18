'use client';

/**
 * Active-partner-list context.
 *
 * Tracks which PartnerList (if any) is currently applied as a cross-app
 * filter. State is in-memory only — a page reload returns to "no list
 * active" per CONTEXT Open Q #3 (active list persists across view switches,
 * NOT across page reloads; consistent with a non-modal, opt-in filter).
 *
 * The provider consumes `lists` as a prop rather than owning storage, so
 * the sibling sidebar and dialog surfaces can share a single source of
 * truth held by usePartnerLists() higher up in the tree.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import type { PartnerList } from '@/lib/partner-lists/types';

export interface ActivePartnerListValue {
  activeListId: string | null;
  activeList: PartnerList | null;
  setActiveListId: (id: string | null) => void;
  /** Clicking the currently-active list deactivates it (CONTEXT lock). */
  toggleList: (id: string) => void;
}

const ActivePartnerListContext = createContext<ActivePartnerListValue | null>(
  null,
);

export function ActivePartnerListProvider(props: {
  lists: PartnerList[];
  children: ReactNode;
}): JSX.Element {
  const { lists, children } = props;
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // Sanitize stale activeListId: if the active list gets deleted (or is
  // otherwise missing from the provided `lists` array), reset to null.
  // Non-destructive recovery — sidebar simply reverts to "no list active".
  useEffect(() => {
    if (activeListId !== null && !lists.some((l) => l.id === activeListId)) {
      setActiveListId(null);
    }
  }, [lists, activeListId]);

  const activeList = useMemo<PartnerList | null>(
    () => lists.find((l) => l.id === activeListId) ?? null,
    [lists, activeListId],
  );

  const toggleList = useCallback((id: string): void => {
    setActiveListId((prev) => (prev === id ? null : id));
  }, []);

  const value = useMemo<ActivePartnerListValue>(
    () => ({
      activeListId,
      activeList,
      setActiveListId,
      toggleList,
    }),
    [activeListId, activeList, toggleList],
  );

  return (
    <ActivePartnerListContext.Provider value={value}>
      {children}
    </ActivePartnerListContext.Provider>
  );
}

export function useActivePartnerList(): ActivePartnerListValue {
  const context = useContext(ActivePartnerListContext);
  if (!context) {
    throw new Error(
      'useActivePartnerList must be used within an ActivePartnerListProvider',
    );
  }
  return context;
}
