import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import { ALLOWED_COLUMNS } from '@/lib/columns/config';
import { validateSchema } from '@/lib/columns/schema-validator';
import { isStaticMode, getStaticBatchData } from '@/lib/static-cache/fallback';
import type { DataResponse } from '@/types/data';

export const dynamic = 'force-dynamic'; // Never cache API responses

export async function GET(request: NextRequest) {
  // Serve cached data when Snowflake credentials are not configured
  if (isStaticMode()) {
    return NextResponse.json(getStaticBatchData());
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
          { error: 'No valid columns specified', details: 'None of the requested columns matched the allowed column list.' },
          { status: 400 }
        );
      }
    }

    // Run schema validation (cached after first call)
    const schemaResult = await validateSchema();

    // Build safe SQL -- column names are validated against the allow-list
    const columnList = selectedColumns.join(', ');
    const rows = await executeQuery(
      `SELECT ${columnList} FROM agg_batch_performance_summary`
    );

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

    return NextResponse.json(response);
  } catch (error) {
    // Log full error for debugging (server-side only)
    console.error('Snowflake query error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      // Never log credentials or connection strings
    });

    // Return safe error to client -- never expose credentials
    return NextResponse.json(
      {
        error: 'Failed to fetch data from Snowflake',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
