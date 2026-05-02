'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { useDataFreshness } from '@/contexts/data-freshness';
import { useHealthProbe } from './degraded-banner';
import { RefreshButton } from './refresh-button';

/** Format ISO timestamp to local time like "2:30 PM" */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Check if data is stale (more than 5 minutes old) */
function isStale(isoString: string): boolean {
  const age = Date.now() - new Date(isoString).getTime();
  return age > 5 * 60 * 1000;
}

export function Header() {
  const { fetchedAt, isFetching } = useDataFreshness();
  // Phase 43 BND-04 — reads the shared health probe so the "(stale)" badge
  // lights up when the circuit breaker is open. Same TanStack Query entry as
  // <DegradedBanner>; TanStack dedupes the fetch.
  const { data: health } = useHealthProbe();
  const sourceDegraded = health ? !health.ok || health.circuitOpen : false;

  // Phase 43 BND-06 — quiet "Data updated." toast on background refetch.
  // Fires when `fetchedAt` advances WHILE not user-initiated. The simple
  // change-detection here is fetchedAt advancing on a transition where
  // isFetching went true → false — i.e. a refetch landed. We track the
  // last-toasted timestamp to dedupe the very-first paint (when fetchedAt
  // first lands) and to avoid re-firing on hover-induced renders that
  // don't actually change the timestamp.
  const lastToastedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!fetchedAt) return;
    if (lastToastedAtRef.current === null) {
      // First-paint baseline — record but don't toast on initial load.
      lastToastedAtRef.current = fetchedAt;
      return;
    }
    if (fetchedAt !== lastToastedAtRef.current && !isFetching) {
      // A new fetch landed while the user was looking at the app — quiet
      // ambient toast so they notice but aren't interrupted.
      toast('Data updated.', { duration: 2000 });
      lastToastedAtRef.current = fetchedAt;
    }
  }, [fetchedAt, isFetching]);

  const stale = useMemo(() => {
    return fetchedAt ? isStale(fetchedAt) : false;
  }, [fetchedAt]);

  // The "(stale)" badge surfaces whenever the source is degraded, regardless
  // of the locally-perceived 5-minute timestamp staleness — circuit-open
  // means cached data is being shown even if fetchedAt is fresh.
  const showStaleBadge = sourceDegraded || stale;

  return (
    <header className="sticky top-0 z-20 flex h-10 shrink-0 items-center gap-inline bg-surface-translucent backdrop-blur-md shadow-elevation-chrome px-page-gutter">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex flex-1 items-center justify-end">
        <div className="flex items-center gap-stack">
          {/* Data freshness indicator */}
          {fetchedAt && (
            <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
              {isFetching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      showStaleBadge
                        ? 'bg-warning-fg animate-pulse'
                        : 'bg-success-fg'
                    }`}
                  />
                  {/* Phase 43 gap-closure: prefix label per BND-06 spec —
                      bare timestamp is ambiguous to first-time readers.
                      See 43-UAT.md Test 4. */}
                  <span className={showStaleBadge ? 'text-warning-fg' : ''}>
                    Last updated {formatTime(fetchedAt)}
                  </span>
                  {sourceDegraded && (
                    <span className="rounded bg-warning-bg px-1 text-caption text-warning-fg">
                      (stale)
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {/* Phase 43 BND-06 — Manual Refresh affordance. Mounts AFTER the
              freshness indicator so the indicator stays the leftmost
              cluster element (visual hierarchy: freshness state, then
              manual control, then theme toggle). */}
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
