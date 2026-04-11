'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useTransition } from 'react';

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

  const [isPending, startTransition] = useTransition();
  const navigatingRef = useRef(false);

  // Use searchParams.toString() as dependency to avoid reference-change re-renders
  const paramsString = searchParams.toString();

  // Reset navigation guard when params actually change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { navigatingRef.current = false; }, [paramsString]);

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get('drillPartner');
    const batch = searchParams.get('drillBatch');
    if (batch && partner) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  /** Navigate with dedup guard + React transition for smooth updates */
  const navigate = useCallback(
    (url: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [router, startTransition],
  );

  const drillToPartner = useCallback(
    (partnerName: string) => {
      // Read fresh params from URL to avoid stale closure
      const freshParams = new URLSearchParams(window.location.search);
      const currentFilters: Record<string, string> = {};
      freshParams.forEach((value, key) => {
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

      navigate(`${pathname}?${params.toString()}`);
    },
    [pathname, navigate],
  );

  const drillToBatch = useCallback(
    (batchName: string) => {
      const freshParams = new URLSearchParams(window.location.search);
      freshParams.set('drillBatch', batchName);
      navigate(`${pathname}?${freshParams.toString()}`);
    },
    [pathname, navigate],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      if (level === 'root') {
        const freshParams = new URLSearchParams(window.location.search);
        const drillFrom = freshParams.get('drillFrom');
        if (drillFrom) {
          try {
            const restored = JSON.parse(atob(drillFrom)) as Record<
              string,
              string
            >;
            const params = new URLSearchParams(restored);
            navigate(`${pathname}?${params.toString()}`);
            return;
          } catch {
            // Malformed drillFrom -- fall through to bare pathname
          }
        }
        navigate(pathname);
      } else if (level === 'partner') {
        const freshParams = new URLSearchParams(window.location.search);
        const params = new URLSearchParams();
        params.set('drillPartner', freshParams.get('drillPartner') ?? state.partner!);
        const drillFrom = freshParams.get('drillFrom');
        if (drillFrom) params.set('drillFrom', drillFrom);
        navigate(`${pathname}?${params.toString()}`);
      }
    },
    [pathname, navigate, state.partner],
  );

  return { state, drillToPartner, drillToBatch, navigateToLevel, isPending };
}
