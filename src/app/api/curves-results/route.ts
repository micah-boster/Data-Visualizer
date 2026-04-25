import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import { isStaticMode } from '@/lib/static-cache/fallback';
import type { CurvesResultsWireRow } from '@/types/curves-results';

export const dynamic = 'force-dynamic'; // Never cache API responses

/**
 * SQL pinned to the latest VERSION per (LENDER_ID, BATCH_, PRICING_TYPE) and then
 * deduped to a single row per (LENDER_ID, BATCH_, COLLECTION_MONTH) via
 * ROW_NUMBER. This handles two warehouse facts simultaneously (per CONFIRM.md):
 *   1. Each batch may have multiple VERSION rows from re-pricing — pin to MAX.
 *   2. Each batch may have multiple PRICING_TYPE rows (AF vs CCB variants) —
 *      ROW_NUMBER over (lender, batch, month) ORDER BY VERSION DESC keeps a
 *      single deterministic curve per batch (multi-pricing overlay deferred to v5.0).
 *
 * `PROJECTED_FRACTIONAL * 100` converts the warehouse's 0..1 fractional scale to
 * the app's 0..100 percentage scale (matches `CurvePoint.recoveryRate` from
 * `reshape-curves.ts:44`). If a live probe ever shows already-percentage units,
 * drop the `* 100` — see CONFIRM.md Probe 1 for the verification recipe.
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
  )
  SELECT
    LENDER_ID,
    BATCH_,
    COLLECTION_MONTH,
    PROJECTED_FRACTIONAL * 100 AS PROJECTED_RATE
  FROM deduped
  WHERE rn = 1
  ORDER BY LENDER_ID, BATCH_, COLLECTION_MONTH
`;

export async function GET() {
  // Static-mode graceful degradation: chart renders actuals only when there
  // are no Snowflake creds (per CONTEXT lock + Pitfall 4 — absent projection
  // is always a valid state on the consumer side).
  if (isStaticMode()) {
    return NextResponse.json({
      data: [],
      meta: { rowCount: 0, fetchedAt: new Date().toISOString() },
    });
  }

  try {
    const rows = await executeQuery<CurvesResultsWireRow>(CURVES_SQL);
    return NextResponse.json({
      data: rows,
      meta: {
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Curves results query error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to fetch projections' },
      { status: 500 }
    );
  }
}
