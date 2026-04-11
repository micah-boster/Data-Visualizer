'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

/**
 * Drill-down state management hook. State lives in URL search params
 * (`drillPartner`, `drillBatch`). Uses router.push (NOT router.replace)
 * so the browser back button navigates up the drill hierarchy.
 *
 * Before drilling, the current non-drill search params are captured and
 * encoded as base64 JSON in a `drillFrom` param. Navigating back to root
 * via breadcrumb decodes and restores those params.
 */
export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Use searchParams.toString() as dependency to avoid reference-change re-renders
  const paramsString = searchParams.toString();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get('drillPartner');
    const batch = searchParams.get('drillBatch');
    if (batch && partner) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const drillToPartner = useCallback(
    (partnerName: string) => {
      // Save current filter state for restoration when returning to root
      const currentFilters: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (!key.startsWith('drill')) {
          currentFilters[key] = value;
        }
      });
      const drillFrom =
        Object.keys(currentFilters).length > 0
          ? btoa(JSON.stringify(currentFilters))
          : undefined;

      const params = new URLSearchParams();
      params.set('drillPartner', partnerName);
      if (drillFrom) params.set('drillFrom', drillFrom);

      // router.push creates a history entry -- back button works
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router],
  );

  const drillToBatch = useCallback(
    (batchName: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('drillBatch', batchName);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      if (level === 'root') {
        // Restore pre-drill filters if available
        const drillFrom = searchParams.get('drillFrom');
        if (drillFrom) {
          try {
            const restored = JSON.parse(atob(drillFrom)) as Record<
              string,
              string
            >;
            const params = new URLSearchParams(restored);
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
            return;
          } catch {
            // Malformed drillFrom -- fall through to bare pathname
          }
        }
        router.push(pathname, { scroll: false });
      } else if (level === 'partner') {
        // Remove batch but keep partner and drillFrom
        const params = new URLSearchParams();
        params.set('drillPartner', state.partner!);
        const drillFrom = searchParams.get('drillFrom');
        if (drillFrom) params.set('drillFrom', drillFrom);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
      // 'batch' level: no-op (already at deepest level)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsString, pathname, router, state.partner],
  );

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
