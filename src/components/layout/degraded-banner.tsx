'use client';

import { Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

/**
 * Subtle yellow banner shown when the Snowflake circuit breaker is open OR
 * the data API has thrown recent errors. Auto-dismisses on recovery.
 *
 * Phase 43 BND-04 contract:
 * - Polls /api/health every 15s (cheap SELECT 1 ping).
 * - /api/health returns 503 when Snowflake is unreachable (its own try/catch
 *   path in src/app/api/health/route.ts).
 * - Banner shows whenever the most-recent health probe failed OR the response
 *   carried `X-Circuit-Breaker: open`.
 *
 * Rationale for using /api/health rather than scanning every TanStack
 * QueryCache entry: /api/health is a single source of truth for "Snowflake
 * reachable right now?", deduped server-side, and it doesn't require coupling
 * to specific data-query keys. The data routes also surface circuit-open via
 * `X-Circuit-Breaker: open`, but plumbing that header through every consumer
 * hook would be cross-cutting; the health probe is the simpler shared signal.
 *
 * Accessibility: role="status" + aria-live="polite" so screen readers
 * announce the degraded state without interrupting the user.
 */

export interface HealthProbeResult {
  ok: boolean;
  circuitOpen: boolean;
}

async function probeHealth(): Promise<HealthProbeResult> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    return {
      ok: res.ok,
      circuitOpen: res.headers.get('X-Circuit-Breaker') === 'open',
    };
  } catch {
    // Network failure (server down, DNS, etc.) — treat as degraded.
    return { ok: false, circuitOpen: false };
  }
}

/**
 * Shared health-probe hook. Both the DegradedBanner and Header's stale
 * badge read from the same TanStack Query entry — TanStack dedupes the
 * fetch even when consumed from multiple components.
 */
export function useHealthProbe() {
  return useQuery<HealthProbeResult>({
    queryKey: ['health-probe'],
    queryFn: probeHealth,
    refetchInterval: 15_000,
    retry: false,
    gcTime: 0,
    // Only treat repeated failures as degraded; first-paint pre-data state
    // shouldn't flash the banner. `placeholderData` keeps `data` defined as
    // healthy until the first probe lands.
    placeholderData: { ok: true, circuitOpen: false },
  });
}

export function DegradedBanner() {
  const { data } = useHealthProbe();

  const degraded = data ? !data.ok || data.circuitOpen : false;
  if (!degraded) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 shrink-0 items-center gap-inline border-b border-warning-border bg-warning-bg px-page-gutter text-caption text-warning-fg"
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Showing cached data — reconnecting to source.</span>
    </div>
  );
}
