'use client';

/**
 * PartnerListsProvider — single upstream site for the usePartnerLists() hook.
 *
 * `AppSidebar` (which renders the Partner Lists sidebar group) and
 * `DataDisplay` (which consumes `activeList.partnerIds` in filteredRawData
 * and threads it into SidebarDataPopulator) are siblings under
 * `SidebarProvider` in `src/app/layout.tsx`. To keep a single source of
 * truth for the persisted lists collection, the hook is called ONCE here
 * and distributed via context. The output `lists` is also forwarded into
 * `ActivePartnerListProvider` so its stale-ID sanitizer (and active-list
 * memo) read from the same array.
 *
 * Phase 39 — derived auto-lists (PCFG-06):
 *   The provider reads dataset rows via `useData()` (TanStack Query
 *   dedupes the fetch — same queryKey shared with all other consumers,
 *   no extra request) and passes them to `usePartnerLists(rows)`. The
 *   hook computes derived lists from the rows and merges them with the
 *   user-stored lists. Pre-data render (rows undefined / empty) returns
 *   only user-stored lists; derived lists materialize when the query
 *   resolves.
 *
 * This replaces the plan's option-(a) "thread CRUD as props from AppSidebar"
 * approach because AppSidebar does NOT encompass DataDisplay in this tree.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  usePartnerLists,
  type UsePartnerListsResult,
} from '@/hooks/use-partner-lists';
import { useData } from '@/hooks/use-data';
import { ActivePartnerListProvider } from '@/contexts/active-partner-list';

const PartnerListsContext = createContext<UsePartnerListsResult | null>(null);

export function PartnerListsProvider({ children }: { children: ReactNode }) {
  // Phase 39 — derived auto-lists are computed from the same dataset rows
  // every other surface reads. TanStack Query dedupes by queryKey so this
  // call shares the cached fetch with use-data consumers (no extra request).
  const { data: queryData } = useData();
  const rows = queryData?.data;

  const value = usePartnerLists(rows);

  // Memoize the context value so unrelated parent re-renders don't invalidate
  // every downstream memo keyed on this value. `value` is itself already a
  // stable object shape from the hook, but wrapping defensively avoids
  // accidental identity churn if the hook gains a non-memoized field.
  const memo = useMemo(() => value, [value]);

  return (
    <PartnerListsContext.Provider value={memo}>
      <ActivePartnerListProvider lists={memo.lists}>
        {children}
      </ActivePartnerListProvider>
    </PartnerListsContext.Provider>
  );
}

export function usePartnerListsContext(): UsePartnerListsResult {
  const ctx = useContext(PartnerListsContext);
  if (!ctx) {
    throw new Error(
      'usePartnerListsContext must be used within a PartnerListsProvider',
    );
  }
  return ctx;
}
