import { NextRequest, NextResponse } from 'next/server';
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

export const dynamic = 'force-dynamic'; // Never cache API responses

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

    // Build safe SQL -- column names are validated against the allow-list
    const columnList = selectedColumns.join(', ');
    const result = await executeWithReliability(
      () => executeQuery(`SELECT ${columnList} FROM agg_batch_performance_summary`),
      { requestId, queryDescription: 'data:batch-summary' }
    );
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
