'use client';

/**
 * Phase 43 BND-06 — Manual Refresh affordance.
 *
 * Locked implementation path (per .planning/adr/009-caching-layers.md):
 *   onClick → `queryClient.invalidateQueries({ queryKey: ['data'] })`
 *   That is the ONLY action this button takes. No `/api/revalidate` fetch.
 *   No `NEXT_PUBLIC_REVALIDATE_SECRET` (the secret never leaves the server).
 *   The next render after the React-Query bust triggers a refetch through
 *   `/api/data`; if Layer 1 (Next route cache) is fresh, the response is
 *   served from cache, otherwise the handler runs and Layer 1 repopulates.
 *
 * Keyboard shortcut: ⌘R (Mac) / Ctrl+R (Windows/Linux) intercepted
 * in-app. Per the CONTEXT lock — daily-driver app feel beats the browser's
 * page reload for our users (the page reload would tear React state and
 * lose drill-down position). Edge case: when the user is in an input
 * (or a textarea / contentEditable element), the interceptor steps aside
 * so the browser's reload escape hatch remains available.
 *
 * Tooltip surfaces "Last updated {relative time}" using the data-freshness
 * context's `fetchedAt` timestamp — date-fns is NOT in package.json, so
 * the relative-time formatter is hand-rolled below.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDataFreshness } from '@/contexts/data-freshness';
import { cn } from '@/lib/utils';

/**
 * Hand-rolled "X minutes ago" formatter. Single-use; if a third callsite
 * surfaces, lift to src/lib/format/ as a shared helper.
 */
function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now'; // clock skew safety
  const sec = Math.floor(ms / 1000);
  if (sec < 30) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/** True if the current `event.target` is an editable text surface — input,
 *  textarea, or contentEditable. Used to step aside from the ⌘R interceptor
 *  so the browser's reload escape hatch is preserved when the user might be
 *  typing. */
function isInputContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function RefreshButton() {
  const queryClient = useQueryClient();
  const { fetchedAt } = useDataFreshness();
  const isFetchingCount = useIsFetching({ queryKey: ['data'] });

  /** The single locked cache-bust path. Invalidates the React Query
   *  `['data']` entry — the next render triggers a refetch through
   *  `/api/data`. The Next route cache (Layer 1) is independent and only
   *  invalidates via `/api/revalidate` (ETL hook); this button does NOT
   *  bypass Layer 1. The 1h Layer-1 stale window is acceptable per ADR 009. */
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['data'] });
  }, [queryClient]);

  // ⌘R / Ctrl+R interceptor. Window-level keydown listener; preventDefault
  // overrides the browser's reload. Intentional per CONTEXT lock.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isReloadShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r';
      if (!isReloadShortcut) return;
      // Edge-case escape hatch: if the user is in an input, do NOT intercept.
      // They might be typing and a real browser reload is the right move.
      if (isInputContext(event.target)) return;
      // Don't intercept Cmd+Shift+R / Ctrl+Shift+R (hard reload — power
      // users use this to bypass app-level caches; respect that).
      if (event.shiftKey) return;
      event.preventDefault();
      handleRefresh();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRefresh]);

  const tooltipText = useMemo(() => {
    const rel = formatRelative(fetchedAt);
    return `Refresh data (last updated ${rel}). ⌘R / Ctrl+R`;
  }, [fetchedAt]);

  const spinning = isFetchingCount > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleRefresh}
              aria-label="Refresh data"
            >
              <RefreshCw
                className={cn(
                  'h-3.5 w-3.5',
                  spinning && 'animate-spin',
                )}
                aria-hidden="true"
              />
            </Button>
          }
        />
        <TooltipContent side="bottom">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
