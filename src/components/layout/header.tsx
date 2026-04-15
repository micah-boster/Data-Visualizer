'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { useDataFreshness } from '@/contexts/data-freshness';

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

  const stale = useMemo(() => {
    return fetchedAt ? isStale(fetchedAt) : false;
  }, [fetchedAt]);

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex flex-1 items-center justify-end">
        <div className="flex items-center gap-3">
          {/* Data freshness indicator */}
          {fetchedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isFetching ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      stale
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className={stale ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {formatTime(fetchedAt)}
                  </span>
                </>
              )}
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
