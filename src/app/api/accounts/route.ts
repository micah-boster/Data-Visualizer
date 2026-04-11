import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';
import { ACCOUNT_ALLOWED_COLUMNS } from '@/lib/columns/account-config';
import type { DataResponse } from '@/types/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partner = searchParams.get('partner');
    const batch = searchParams.get('batch');

    if (!partner || !batch) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Both "partner" and "batch" query params are required.' },
        { status: 400 },
      );
    }

    const columnList = Array.from(ACCOUNT_ALLOWED_COLUMNS).join(', ');
    const rows = await executeQuery(
      `SELECT ${columnList} FROM master_accounts WHERE PARTNER_NAME = ? AND BATCH = ?`,
      [partner, batch],
    );

    const response: DataResponse = {
      data: rows,
      meta: {
        rowCount: rows.length,
        fetchedAt: new Date().toISOString(),
        columns: Array.from(ACCOUNT_ALLOWED_COLUMNS),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Snowflake account query error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch account data from Snowflake',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
