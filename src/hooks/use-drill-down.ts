'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

/**
 * Subscribe to URL search param changes via popstate + custom event.
 * This avoids Next.js useSearchParams which can go stale after router.push.
 */
function subscribeToSearch(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('pushstate', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('pushstate', callback);
  };
}

function getSearchSnapshot() {
  return window.location.search;
}

function getServerSnapshot() {
  return '';
}

/**
 * Drill-down state management hook.
 *
 * Uses window.location.search directly (via useSyncExternalStore) instead
 * of Next.js useSearchParams to avoid stale closure issues with router.push.
 */
export function useDrillDown() {
  const pathname = usePathname();
  const router = useRouter();

  const searchString = useSyncExternalStore(
    subscribeToSearch,
    getSearchSnapshot,
    getServerSnapshot,
  );

  const state: DrillState = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const partner = params.get('drillPartner');
    const batch = params.get('drillBatch');
    if (batch && partner) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
  }, [searchString]);

  /** Push URL and fire custom event so useSyncExternalStore picks it up */
  const push = useCallback(
    (url: string) => {
      router.push(url, { scroll: false });
      // Notify subscribers since router.push doesn't fire popstate
      window.dispatchEvent(new Event('pushstate'));
    },
    [router],
  );

  const drillToPartner = useCallback(
    (partnerName: string) => {
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

      push(`${pathname}?${params.toString()}`);
    },
    [pathname, push],
  );

  const drillToBatch = useCallback(
    (batchName: string) => {
      const freshParams = new URLSearchParams(window.location.search);
      freshParams.set('drillBatch', batchName);
      push(`${pathname}?${freshParams.toString()}`);
    },
    [pathname, push],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      const freshParams = new URLSearchParams(window.location.search);

      if (level === 'root') {
        const drillFrom = freshParams.get('drillFrom');
        if (drillFrom) {
          try {
            const restored = JSON.parse(atob(drillFrom)) as Record<string, string>;
            const params = new URLSearchParams(restored);
            push(`${pathname}?${params.toString()}`);
            return;
          } catch {
            // Malformed drillFrom -- fall through
          }
        }
        push(pathname);
      } else if (level === 'partner') {
        const params = new URLSearchParams();
        const partner = freshParams.get('drillPartner');
        if (partner) params.set('drillPartner', partner);
        const drillFrom = freshParams.get('drillFrom');
        if (drillFrom) params.set('drillFrom', drillFrom);
        push(`${pathname}?${params.toString()}`);
      }
    },
    [pathname, push],
  );

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
