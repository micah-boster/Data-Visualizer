/**
 * Static data fallback for deployments without Snowflake credentials.
 *
 * When SNOWFLAKE_ACCOUNT is not set, API routes serve cached JSON snapshots
 * instead of querying Snowflake. This lets the team use the deployed app
 * immediately while credentials are being provisioned.
 */

import type { DataResponse } from '@/types/data';
import { validateCachedData, BATCH_REQUIRED_COLUMNS, ACCOUNT_REQUIRED_COLUMNS } from './schema-validation';
import { parseBatchRows } from '@/lib/data/parse-batch-row';
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

/**
 * Env vars that signal Snowflake is configured for the active auth mode.
 * Mirrors the validation in `src/lib/snowflake/connection.ts` so a partial
 * credential set falls back to the static cache instead of returning 500.
 *
 * Modes (selected by SNOWFLAKE_AUTH, default `password`):
 *   - password         → ACCOUNT + USERNAME + PASSWORD
 *   - externalbrowser  → ACCOUNT + USERNAME (browser handles auth)
 *   - keypair          → ACCOUNT + USERNAME + PRIVATE_KEY
 *
 * If any mode-required var is missing, isStaticMode() returns true so the
 * API routes serve cached JSON. The user gets a working app instead of a
 * 500 — and the actual connection-layer error never fires because we
 * never call into it.
 */
const COMMON_REQUIRED = ['SNOWFLAKE_ACCOUNT', 'SNOWFLAKE_USERNAME'] as const;
const MODE_EXTRA: Record<string, readonly string[]> = {
  password: ['SNOWFLAKE_PASSWORD'],
  externalbrowser: [],
  keypair: ['SNOWFLAKE_PRIVATE_KEY'],
};

/** Cached account data keyed by "partner||batch" */
const ACCOUNT_CACHE: Record<string, DataResponse> = {
  'Affirm||AFRM_MAR_26_PRI': accountsPri as unknown as DataResponse,
  'Affirm||AFRM_MAR_26_SEC': accountsSec as unknown as DataResponse,
  'Affirm||AFRM_NOV_25_PRI': accountsNov as unknown as DataResponse,
  'Affirm||AFRM_DEC_25_PRI': accountsDec as unknown as DataResponse,
  'American First Finance||AFF_FEB_26_LTO_TERTIARY': accountsAff as unknown as DataResponse,
};

/** True when Snowflake credentials are NOT configured for the chosen auth mode */
export function isStaticMode(): boolean {
  const mode = (process.env.SNOWFLAKE_AUTH ?? 'password').trim().toLowerCase();
  const extra = MODE_EXTRA[mode] ?? MODE_EXTRA.password;
  const required = [...COMMON_REQUIRED, ...extra];
  return required.some((key) => !process.env[key]);
}

/**
 * Load the cached batch summary with normalization, schema validation, and
 * Phase 43 BND-01 parser drop-warning surfacing.
 *
 * The fixture is also passed through `parseBatchRows` to surface any
 * malformed rows (missing identity, invalid age) at boot time. The wire
 * shape returned to the API consumer is unchanged — typed `BatchRow`
 * conversion happens inside `use-partner-stats.ts` (Phase 43 BND-02). A
 * non-zero drop count from this fixture means the bundled JSON is corrupt
 * and we want it visible in the dev console (expected: zero drops).
 */
export function getStaticBatchData(): DataResponse {
  const cached = batchSummary as unknown as DataResponse;
  const normalized = normalizeData(cached);
  const { data: validated, missing, unexpected } = validateCachedData(
    normalized,
    [...BATCH_REQUIRED_COLUMNS],
  );
  // Phase 43 BND-01: surface fixture corruption via the canonical parser.
  // parseBatchRows itself emits a console.warn in dev when drops > 0; the
  // returned typed rows are discarded here (the API still returns the raw
  // wire shape — typed BatchRow is consumed in `use-partner-stats.ts`).
  parseBatchRows(validated.data);
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
