import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import {
  executeWithReliability,
  generateRequestId,
  CircuitBreakerOpenError,
} from '@/lib/snowflake/reliability';
import { ACCOUNT_ALLOWED_COLUMNS } from '@/lib/columns/account-config';
import { isStaticMode, getStaticAccountData } from '@/lib/static-cache/fallback';
import type { DataResponse } from '@/types/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Phase 43 BND-04 — request-id stamped on every response (success + error).
  const requestId = generateRequestId();

  try {
    const searchParams = request.nextUrl.searchParams;
    const partner = searchParams.get('partner');
    const batch = searchParams.get('batch');

    if (!partner || !batch) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Both "partner" and "batch" query params are required.', requestId },
        { status: 400, headers: { 'X-Request-Id': requestId } },
      );
    }

    // Serve cached account data when Snowflake credentials are not configured
    if (isStaticMode()) {
      const cached = getStaticAccountData(partner, batch);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Request-Id': requestId },
        });
      }
      return NextResponse.json(
        { error: 'No cached data', details: `Drill-down for ${partner} / ${batch} is not available in static mode. Connect Snowflake credentials for full access.`, requestId },
        { status: 404, headers: { 'X-Request-Id': requestId } },
      );
    }

    const columnList = Array.from(ACCOUNT_ALLOWED_COLUMNS).join(', ');
    const result = await executeWithReliability(
      () =>
        executeQuery(
          `SELECT ${columnList} FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?`,
          [partner, batch],
        ),
      { requestId, queryDescription: 'accounts:by-partner-batch' }
    );
    const rows = result.rows;

    const response: DataResponse = {
      data: rows,
      meta: {
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
        columns: Array.from(ACCOUNT_ALLOWED_COLUMNS),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Request-Id': requestId,
        'Server-Timing': `queue;dur=${result.queueWaitMs}, execute;dur=${result.executeMs}`,
      },
    });
  } catch (error) {
    console.error('[api/accounts] Snowflake query error:', {
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
        },
      );
    }

    return NextResponse.json(
      { error: 'Failed to load data. Try again or refresh.', requestId },
      { status: 500, headers: { 'X-Request-Id': requestId } },
    );
  }
}
