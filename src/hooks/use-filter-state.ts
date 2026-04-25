'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';

/**
 * Mapping from URL query param names to TanStack Table column IDs.
 *
 * Phase 38 FLT-01: `batch` removed — the batch combobox was replaced by a
 * date-range preset chip group. Date range is a value-range predicate
 * (BATCH_AGE_IN_MONTHS <= cap), NOT a column-equality filter, so it lives
 * on a standalone `?age=` URL param and is NOT registered in FILTER_PARAMS.
 *
 * Phase 39 PCFG-04: `partner` removed — selection is owned by the drill
 * state (`?p=&pr=`). The standalone partner combobox in the filter popover
 * was removed in this same plan; legacy `?partner=` URL params are simply
 * ignored at runtime (filter-state never reads them) and saved-view
 * snapshots that carried `dimensionFilters.partner` are stripped on load
 * by `useSavedViews.sanitizeSnapshot`. `type: 'ACCOUNT_TYPE'` stays — still
 * useful for cross-partner filtering at root (e.g. "show only 1st-party
 * pairs" across the comparison matrix).
 */
export const FILTER_PARAMS = {
  type: 'ACCOUNT_TYPE',
} as const;

type FilterParam = keyof typeof FILTER_PARAMS;

const PARAM_LABELS: Record<FilterParam, string> = {
  type: 'Account Type',
};

/**
 * Phase 38 FLT-01 — preset age-bucket values. `null` represents "All"
 * (no `?age=` param in the URL).
 */
export type AgeBucket = 3 | 6 | 12 | null;

export interface ActiveFilter {
  param: FilterParam;
  columnId: string;
  label: string;
  value: string;
}

/**
 * URL-backed filter state hook. URL search params are the single source of truth —
 * no React state is used for filter values. Updates use router.replace() to avoid
 * history pollution.
 *
 * Phase 39 PCFG-04: `partner` is no longer a filter — it lives in drill state
 * (`?p=&pr=`). The legacy partner→batch cascading logic is gone (batch combobox
 * removed in 38 FLT-01 + partner combobox removed here). `data` arg retained
 * (existing callers pass it) for future cascade hooks but not used currently.
 */
export function useFilterState(_data?: Record<string, unknown>[]) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Use searchParams.toString() as dependency to avoid reference-change re-renders
  const paramsString = searchParams.toString();

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];
    for (const [param, columnId] of Object.entries(FILTER_PARAMS)) {
      const value = searchParams.get(param);
      if (value) {
        filters.push({ id: columnId, value });
      }
    }
    return filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const filters: ActiveFilter[] = [];
    for (const [param, columnId] of Object.entries(FILTER_PARAMS)) {
      const value = searchParams.get(param);
      if (value) {
        filters.push({
          param: param as FilterParam,
          columnId,
          label: PARAM_LABELS[param as FilterParam],
          value,
        });
      }
    }
    return filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const setFilter = useCallback(
    (param: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(param, value);
      } else {
        params.delete(param);
      }

      // Phase 39 PCFG-04: partner→batch cascade removed (partner no longer a
      // filter; batch combobox removed in Phase 38 FLT-01). Filter setter is
      // now a pure URL-param mutator.

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  // Phase 38 FLT-01 — standalone `?age=3|6|12` param for the date-range
  // preset chip group. NOT registered in FILTER_PARAMS because it's a
  // value-range predicate (BATCH_AGE_IN_MONTHS <= cap), not column-equality.
  // The predicate itself lives in data-display.tsx#filteredRawData so the
  // filter-before-aggregate contract (Phase 25) continues to hold.
  const ageParam = searchParams.get('age');
  const age: AgeBucket = useMemo(() => parseAgeParam(ageParam), [ageParam]);

  const setAge = useCallback(
    (value: AgeBucket) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete('age');
      } else {
        params.set('age', String(value));
      }
      // history.replaceState matches the rest of the filter-URL pattern:
      // filter changes are NOT history-worthy (users don't want back-button
      // to cycle filter permutations). Matches Phase 32 precedent for
      // non-history filter updates.
      const qs = params.toString();
      if (typeof window !== 'undefined') {
        window.history.replaceState(
          {},
          '',
          qs ? `${pathname}?${qs}` : pathname,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname],
  );

  return { columnFilters, setFilter, clearAll, activeFilters, searchParams, age, setAge };
}

/**
 * Pure helper — parse a raw `?age=` URL param into an AgeBucket. Invalid or
 * missing values yield `null` ("All"). Exported for the FLT-01 smoke test.
 */
export function parseAgeParam(raw: string | null | undefined): AgeBucket {
  if (raw === '3') return 3;
  if (raw === '6') return 6;
  if (raw === '12') return 12;
  return null;
}
