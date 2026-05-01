import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { executeQuery } from '@/lib/snowflake/queries';
import {
  executeWithReliability,
  generateRequestId,
  CircuitBreakerOpenError,
} from '@/lib/snowflake/reliability';
import { ALLOWED_COLUMNS } from '@/lib/columns/config';
import { validateSchema } from '@/lib/columns/schema-validator';
import { isStaticMode, getStaticBatchData } from '@/lib/static-cache/fallback';
import type { DataResponse } from '@/types/data';

// Phase 43 BND-06 — cache tuning. The previous always-dynamic declaration
// is removed: every page-load was triggering a fresh Snowflake query and
// that's not necessary because the upstream ETL writes daily.
//
// Layer 1: Next.js route segment cache. `revalidate: 3600` caches the route
//   response for 60 minutes; the daily ETL hits `/api/revalidate` to bust
//   the tag-keyed cache on completion (BND-06 daily-refresh hook). The
//   `unstable_cache` wrapper around the Snowflake query inside this handler
//   provides the same revalidate window keyed by selected columns so the
//   reliability wrapper (Plan 02b) only fires on cache misses — cache hits
//   skip retry + circuit-breaker work.
//
// Layer 2: React Query (client) — staleTime 5min, refetchOnWindowFocus: false.
//   See src/lib/query-client.ts.
//
// Layer 3: Snowflake warehouse cache — automatic, identity-of-query keyed.
//
// ADR: .planning/adr/009-caching-layers.md
export const revalidate = 3600;

// Per Next 16 docs/01-app/03-api-reference/04-functions/unstable_cache.md:
//   `unstable_cache(fetchData, keyParts, options)` — keyParts disambiguates
//   per-arg variants; `options.tags` enables on-demand invalidation via
//   `revalidateTag('batch-data', 'max')` from the daily ETL POST handler.
//
// Why `unstable_cache` over `'use cache'` directive (the Next 16 successor):
//   `'use cache'` requires the `cacheComponents` flag in next.config.ts which
//   we have NOT enabled (see next.config.ts) — the docs explicitly call
//   `unstable_cache` the right surface for "projects not using Cache
//   Components" (docs/01-app/02-guides/caching-without-cache-components.md).
//   When v6+ enables Cache Components we'll migrate the wrapper.
const CACHE_TAG = 'batch-data';
const CACHE_KEY_PREFIX = 'batch-summary';

function fetchBatchSummary(
  selectedColumns: string[],
  requestId: string,
): Promise<{ rows: Array<Record<string, unknown>>; queueWaitMs: number; executeMs: number }> {
  const columnList = selectedColumns.join(', ');
  const cached = unstable_cache(
    async () => {
      const result = await executeWithReliability(
        () => executeQuery(`SELECT ${columnList} FROM agg_batch_performance_summary`),
        { requestId, queryDescription: 'data:batch-summary' },
      );
      return {
        rows: result.rows,
        queueWaitMs: result.queueWaitMs,
        executeMs: result.executeMs,
      };
    },
    [CACHE_KEY_PREFIX, ...selectedColumns],
    { revalidate: 3600, tags: [CACHE_TAG] },
  );
  return cached();
}

export async function GET(request: NextRequest) {
  // Phase 43 BND-04: every response carries a request-id so a sanitized
  // client error correlates back to a server log line.
  const requestId = generateRequestId();

  // Serve cached data when Snowflake credentials are not configured. The
  // reliability wrapper deliberately does NOT fire in static mode — there's
  // no Snowflake call to retry/circuit-break against.
  if (isStaticMode()) {
    return NextResponse.json(getStaticBatchData(), {
      headers: { 'X-Request-Id': requestId },
    });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const columnsParam = searchParams.get('columns');

    // Determine which columns to select
    let selectedColumns: string[];
    if (!columnsParam || columnsParam === '*') {
      selectedColumns = Array.from(ALLOWED_COLUMNS);
    } else {
      // Validate requested columns against allow-list (SQL injection prevention)
      selectedColumns = columnsParam
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => ALLOWED_COLUMNS.has(c));

      if (selectedColumns.length === 0) {
        return NextResponse.json(
          { error: 'No valid columns specified', details: 'None of the requested columns matched the allowed column list.', requestId },
          { status: 400, headers: { 'X-Request-Id': requestId } }
        );
      }
    }

    // Run schema validation (cached after first call)
    const schemaResult = await validateSchema();

    // Build safe SQL -- column names are validated against the allow-list.
    // Phase 43 BND-06: the Snowflake query goes through the `unstable_cache`
    // wrapper so cache hits skip retry + circuit-breaker entirely (cache
    // miss = wrapper fires + executeWithReliability + retries; cache hit =
    // pure memory read). The `selectedColumns` array participates in the
    // cache key so different column subsets get distinct entries.
    const result = await fetchBatchSummary(selectedColumns, requestId);
    const rows = result.rows;

    const response: DataResponse = {
      data: rows,
      meta: {
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
        columns: selectedColumns,
      },
    };

    // Include schema warnings if there are any mismatches
    if (schemaResult.missing.length > 0 || schemaResult.unexpected.length > 0) {
      response.schemaWarnings = {
        missing: schemaResult.missing,
        unexpected: schemaResult.unexpected,
      };
    }

    return NextResponse.json(response, {
      headers: {
        'X-Request-Id': requestId,
        'Server-Timing': `queue;dur=${result.queueWaitMs}, execute;dur=${result.executeMs}`,
      },
    });
  } catch (error) {
    // Server-side log carries full detail and the requestId; the client
    // response stays sanitized.
    console.error('[api/data] Snowflake query error:', {
      requestId,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof CircuitBreakerOpenError) {
      return NextResponse.json(
        { error: 'Source temporarily unavailable. Showing cached data while we reconnect.', requestId },
        {
          status: 503,
          headers: {
            'X-Request-Id': requestId,
            'X-Circuit-Breaker': 'open',
          },
        }
      );
    }

    // Sanitized — never expose internal Snowflake table/column names.
    return NextResponse.json(
      { error: 'Failed to load data. Try again or refresh.', requestId },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}
