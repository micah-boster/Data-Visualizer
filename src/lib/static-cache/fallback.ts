/**
 * Static data fallback for deployments without Snowflake credentials.
 *
 * When SNOWFLAKE_ACCOUNT is not set, API routes serve cached JSON snapshots
 * instead of querying Snowflake. This lets the team use the deployed app
 * immediately while credentials are being provisioned.
 */

import type { DataResponse } from '@/types/data';

const REQUIRED_ENV = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME', 'SNOWFLAKE_PASSWORD'] as const;

/** True when Snowflake credentials are NOT configured */
export function isStaticMode(): boolean {
  return REQUIRED_ENV.some((key) => !process.env[key]);
}

/** Load the cached batch summary */
export function getStaticBatchData(): DataResponse {
  // Dynamic require to avoid bundling in production when not needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cached = require('./batch-summary.json') as DataResponse;
  return {
    ...cached,
    meta: {
      ...cached.meta,
      fetchedAt: cached.meta.fetchedAt + ' (static cache)',
    },
  };
}

/** Load cached account data for a partner+batch combo, or null if not cached */
export function getStaticAccountData(partner: string, batch: string): DataResponse | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const index = require('./cache-index.json') as {
    accounts: Record<string, string>;
  };

  const key = `${partner}||${batch}`;
  const file = index.accounts[key];
  if (!file) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cached = require(`./${file}`) as DataResponse;
  return {
    ...cached,
    meta: {
      ...cached.meta,
      fetchedAt: cached.meta.fetchedAt + ' (static cache)',
    },
  };
}
