import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import {
  executeWithReliability,
  generateRequestId,
  CircuitBreakerOpenError,
} from '@/lib/snowflake/reliability';
import { isStaticMode } from '@/lib/static-cache/fallback';
import type { CurvesResultsWireRow } from '@/types/curves-results';

export const dynamic = 'force-dynamic'; // Never cache API responses

/**
 * SQL pinned to the latest VERSION per (LENDER_ID, BATCH_, PRICING_TYPE), then
 * deduped to a single row per (LENDER_ID, BATCH_, COLLECTION_MONTH), then
 * cumulatively summed across months. This handles three warehouse facts
 * simultaneously (per CONFIRM.md + post-merge unit probe):
 *   1. Each batch may have multiple VERSION rows from re-pricing — pin to MAX.
 *   2. Each batch may have multiple PRICING_TYPE rows (AF vs CCB variants) —
 *      ROW_NUMBER over (lender, batch, month) ORDER BY VERSION DESC keeps a
 *      single deterministic curve per batch (multi-pricing overlay deferred to v5.0).
 *   3. PROJECTED_FRACTIONAL is a per-month rate, NOT cumulative recovery.
 *      App-side `recoveryRate` (reshape-curves.ts:44) is cumulative
 *      ((sum of collection thru month X) / placed). To compare apples-to-apples,
 *      we cumulative-sum projections via SUM(...) OVER (PARTITION BY lender,batch
 *      ORDER BY month). The * 100 converts the 0..1 fractional scale to 0..100 %.
 *
 * NOTE on alias case: column aliases are UPPERCASE to match the existing
 * `/api/data/route.ts` convention (snowflake-sdk preserves Snowflake's native
 * case). The client-side `useCurvesResultsIndex` hook renames to lowercase.
 */
const CURVES_SQL = `
  WITH latest AS (
    SELECT LENDER_ID, BATCH_, PRICING_TYPE, MAX(VERSION) AS version
    FROM BOUNCE.FINANCE.CURVES_RESULTS
    WHERE PROJECTED_FRACTIONAL IS NOT NULL
    GROUP BY LENDER_ID, BATCH_, PRICING_TYPE
  ),
  deduped AS (
    SELECT
      c.LENDER_ID,
      c.BATCH_,
      c.COLLECTION_MONTH,
      c.PROJECTED_FRACTIONAL,
      ROW_NUMBER() OVER (
        PARTITION BY c.LENDER_ID, c.BATCH_, c.COLLECTION_MONTH
        ORDER BY c.VERSION DESC
      ) AS rn
    FROM BOUNCE.FINANCE.CURVES_RESULTS c
    JOIN latest l
      ON c.LENDER_ID = l.LENDER_ID
     AND c.BATCH_ = l.BATCH_
     AND c.PRICING_TYPE = l.PRICING_TYPE
     AND c.VERSION = l.version
    WHERE c.PROJECTED_FRACTIONAL IS NOT NULL
  ),
  filtered AS (
    SELECT LENDER_ID, BATCH_, COLLECTION_MONTH, PROJECTED_FRACTIONAL
    FROM deduped
    WHERE rn = 1
  )
  SELECT
    LENDER_ID,
    BATCH_,
    COLLECTION_MONTH,
    SUM(PROJECTED_FRACTIONAL) OVER (
      PARTITION BY LENDER_ID, BATCH_
      ORDER BY COLLECTION_MONTH
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) * 100 AS PROJECTED_RATE
  FROM filtered
  ORDER BY LENDER_ID, BATCH_, COLLECTION_MONTH
`;

export async function GET() {
  // Phase 43 BND-04 — request-id stamped on every response.
  const requestId = generateRequestId();

  // Static-mode graceful degradation: chart renders actuals only when there
  // are no Snowflake creds (per CONTEXT lock + Pitfall 4 — absent projection
  // is always a valid state on the consumer side).
  if (isStaticMode()) {
    return NextResponse.json(
      {
        data: [],
        meta: { rowCount: 0, fetchedAt: new Date().toISOString() },
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  }

  try {
    const result = await executeWithReliability<CurvesResultsWireRow[]>(
      () => executeQuery<CurvesResultsWireRow>(CURVES_SQL),
      { requestId, queryDescription: 'curves-results' }
    );
    const rows = result.rows;
    return NextResponse.json(
      {
        data: rows,
        meta: {
          rowCount: rows.length,
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          'X-Request-Id': requestId,
          'Server-Timing': `queue;dur=${result.queueWaitMs}, execute;dur=${result.executeMs}`,
        },
      }
    );
  } catch (error) {
    console.error(
      `[api/curves-results] Snowflake query error: requestId=${requestId} message=${error instanceof Error ? error.message : String(error)}`
    );

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

    return NextResponse.json(
      { error: 'Failed to load projections. Try again or refresh.', requestId },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  }
}
