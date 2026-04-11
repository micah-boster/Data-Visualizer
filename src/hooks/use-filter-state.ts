'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';

/**
 * Mapping from URL query param names to TanStack Table column IDs.
 */
export const FILTER_PARAMS = {
  partner: 'PARTNER_NAME',
  type: 'ACCOUNT_TYPE',
  batch: 'BATCH',
} as const;

type FilterParam = keyof typeof FILTER_PARAMS;

const PARAM_LABELS: Record<FilterParam, string> = {
  partner: 'Partner',
  type: 'Account Type',
  batch: 'Batch',
};

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
 * When partner changes and the current batch is invalid for the new partner,
 * the batch param is auto-cleared in the same URL update.
 */
export function useFilterState(data?: Record<string, unknown>[]) {
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

      // Auto-clear cascading batch: when partner changes and current batch
      // is invalid for the new partner, remove batch in the same URL update.
      if (param === 'partner' && data) {
        const currentBatch = params.get('batch');
        if (currentBatch) {
          if (value) {
            // Check if any row with the new partner has the current batch
            const batchValid = data.some(
              (row) =>
                String(row.PARTNER_NAME ?? '') === value &&
                String(row.BATCH ?? '') === currentBatch
            );
            if (!batchValid) {
              params.delete('batch');
            }
          }
          // If partner is cleared (value === null), keep batch as-is —
          // batch is valid against the full dataset
        }
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router, data]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { columnFilters, setFilter, clearAll, activeFilters, searchParams };
}
