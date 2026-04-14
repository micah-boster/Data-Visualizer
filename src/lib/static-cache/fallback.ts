/**
 * Static data fallback for deployments without Snowflake credentials.
 *
 * When SNOWFLAKE_ACCOUNT is not set, API routes serve cached JSON snapshots
 * instead of querying Snowflake. This lets the team use the deployed app
 * immediately while credentials are being provisioned.
 */

import type { DataResponse } from '@/types/data';
import { validateCachedData, BATCH_REQUIRED_COLUMNS, ACCOUNT_REQUIRED_COLUMNS } from './schema-validation';
import batchSummary from './batch-summary.json';
import accountsPri from './accounts-affirm-afrm_mar_26_pri.json';
import accountsSec from './accounts-affirm-afrm_mar_26_sec.json';
import accountsNov from './accounts-affirm-afrm_nov_25_pri.json';
import accountsDec from './accounts-affirm-afrm_dec_25_pri.json';
import accountsAff from './accounts-aff-aff_feb_26_lto_tertiary.json';

// --- Data normalization: convert empty strings to null at the loading boundary ---

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = value === '' ? null : value;
  }
  return normalized;
}

function normalizeData(response: DataResponse): DataResponse {
  return {
    ...response,
    data: response.data.map(normalizeRow),
  };
}

const REQUIRED_ENV = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME', 'SNOWFLAKE_PASSWORD'] as const;

/** Cached account data keyed by "partner||batch" */
const ACCOUNT_CACHE: Record<string, DataResponse> = {
  'Affirm||AFRM_MAR_26_PRI': accountsPri as unknown as DataResponse,
  'Affirm||AFRM_MAR_26_SEC': accountsSec as unknown as DataResponse,
  'Affirm||AFRM_NOV_25_PRI': accountsNov as unknown as DataResponse,
  'Affirm||AFRM_DEC_25_PRI': accountsDec as unknown as DataResponse,
  'American First Finance||AFF_FEB_26_LTO_TERTIARY': accountsAff as unknown as DataResponse,
};

/** True when Snowflake credentials are NOT configured */
export function isStaticMode(): boolean {
  return REQUIRED_ENV.some((key) => !process.env[key]);
}

/** Load the cached batch summary with normalization and validation */
export function getStaticBatchData(): DataResponse {
  const cached = batchSummary as unknown as DataResponse;
  const normalized = normalizeData(cached);
  const { data: validated, missing, unexpected } = validateCachedData(
    normalized,
    [...BATCH_REQUIRED_COLUMNS],
  );
  const result: DataResponse = {
    ...validated,
    meta: {
      ...validated.meta,
      fetchedAt: validated.meta.fetchedAt,
    },
  };
  if (missing.length > 0 || unexpected.length > 0) {
    result.schemaWarnings = { missing, unexpected };
  }
  return result;
}

/** Load cached account data for a partner+batch combo, or null if not cached */
export function getStaticAccountData(partner: string, batch: string): DataResponse | null {
  const key = `${partner}||${batch}`;
  const cached = ACCOUNT_CACHE[key];
  if (!cached) return null;

  const normalized = normalizeData(cached);
  const { data: validated, missing, unexpected } = validateCachedData(
    normalized,
    [...ACCOUNT_REQUIRED_COLUMNS],
  );
  const result: DataResponse = {
    ...validated,
    meta: {
      ...validated.meta,
      fetchedAt: validated.meta.fetchedAt,
    },
  };
  if (missing.length > 0 || unexpected.length > 0) {
    result.schemaWarnings = { missing, unexpected };
  }
  return result;
}
