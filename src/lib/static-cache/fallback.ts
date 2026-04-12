/**
 * Static data fallback for deployments without Snowflake credentials.
 *
 * When SNOWFLAKE_ACCOUNT is not set, API routes serve cached JSON snapshots
 * instead of querying Snowflake. This lets the team use the deployed app
 * immediately while credentials are being provisioned.
 */

import type { DataResponse } from '@/types/data';
import batchSummary from './batch-summary.json';
import accountsPri from './accounts-affirm-afrm_mar_26_pri.json';
import accountsSec from './accounts-affirm-afrm_mar_26_sec.json';

const REQUIRED_ENV = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME', 'SNOWFLAKE_PASSWORD'] as const;

/** Cached account data keyed by "partner||batch" */
const ACCOUNT_CACHE: Record<string, DataResponse> = {
  'Affirm||AFRM_MAR_26_PRI': accountsPri as unknown as DataResponse,
  'Affirm||AFRM_MAR_26_SEC': accountsSec as unknown as DataResponse,
};

/** True when Snowflake credentials are NOT configured */
export function isStaticMode(): boolean {
  return REQUIRED_ENV.some((key) => !process.env[key]);
}

/** Load the cached batch summary */
export function getStaticBatchData(): DataResponse {
  const cached = batchSummary as unknown as DataResponse;
  return {
    ...cached,
    meta: {
      ...cached.meta,
      fetchedAt: cached.meta.fetchedAt,
    },
  };
}

/** Load cached account data for a partner+batch combo, or null if not cached */
export function getStaticAccountData(partner: string, batch: string): DataResponse | null {
  const key = `${partner}||${batch}`;
  const cached = ACCOUNT_CACHE[key];
  if (!cached) return null;

  return {
    ...cached,
    meta: {
      ...cached.meta,
      fetchedAt: cached.meta.fetchedAt,
    },
  };
}
