/**
 * Canonical parser for batch-summary rows from Snowflake or static cache.
 *
 * PHASE 43 BND-01 SCOPE (LANDED):
 *   - Returns typed `BatchRow | null` from `parseBatchRow`. Malformed rows
 *     (missing identity, invalid age) drop to null.
 *   - `parseBatchRows` over an array threads the filter-and-warn metadata
 *     back to callers via `ParseBatchRowsResult { rows, dropped }` and
 *     never throws.
 *   - Branded `BatchAgeMonths` resolves the days-vs-months ambiguity by
 *     construction (single coercion site at `asBatchAgeMonths` in
 *     `./types.ts`; the three duplicate `coerceAgeMonths` definitions in
 *     `src/lib/computation/` are removed in Task 3).
 *   - Long-format `curve: CurvePoint[]` baked at parse time from the wide
 *     `COLLECTION_AFTER_*_MONTH` columns.
 *   - DCR-08 rate-shaped `number | null` contract widened from "narrow
 *     scope" (7 fields, Plan 41-02) to canonical typed surface here.
 *
 * REUSE:
 *   Static cache loader (`src/lib/static-cache/fallback.ts`) routes the
 *   bundled JSON through `parseBatchRows` so live Snowflake responses and
 *   static cache rows share the same canonical parse path. Static-cache
 *   parity smoke (`parser-parity.smoke.ts`) verifies field-level behavior
 *   matches between the two paths.
 *
 * REACT-FREE:
 *   This module logs to `console.warn` in dev (process.env.NODE_ENV !==
 *   'production') but NEVER imports React or sonner. The non-blocking
 *   user-facing toast lives in the consumer (currently
 *   `src/hooks/use-partner-stats.ts`).
 */

import {
  asBatchAgeMonths,
  type BatchRow,
  type CurvePoint,
  type ParseBatchRowDrop,
  type ParseBatchRowsResult,
} from './types.ts';

/** Snowflake column keys whose value carries `number | null` after parsing. */
export const RATE_SHAPED_NULLABLE_FIELDS = [
  // Engagement (zero-activity is meaningfully different from zero rate):
  'SMS_OPEN_RATE',
  'SMS_CLICK_RATE',
  'EMAIL_OPEN_RATE',
  'EMAIL_CLICK_RATE',
  'CALL_CONNECT_RATE',
  'CALL_RPC_RATE',
  'DISPUTE_RATE',
] as const;

export type RateShapedNullableField =
  (typeof RATE_SHAPED_NULLABLE_FIELDS)[number];

const NULLABLE_SET = new Set<string>(RATE_SHAPED_NULLABLE_FIELDS);

/** Type-guard: is this metric a rate-shaped nullable field? */
export function isRateShapedNullable(metric: string): boolean {
  return NULLABLE_SET.has(metric);
}

/** Months covered by the wide `COLLECTION_AFTER_X_MONTH` columns. */
const CURVE_MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36, 48, 60,
] as const;

/** Drop reason categories — used by callers grouping the dev console summary. */
export const DROP_REASON_INVALID_AGE = 'invalid BATCH_AGE_IN_MONTHS' as const;
export const DROP_REASON_MISSING_IDENTITY =
  'missing identity (PARTNER_NAME / ACCOUNT_TYPE / BATCH_)' as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read a field as a finite number, defaulting to 0 when missing/empty/NaN. */
function numOrZero(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Read a rate-shaped field per the DCR-08 contract:
 *   null when raw is null/undefined/empty/NaN; otherwise the parsed number.
 *   A genuine 0 stays as 0.
 */
function rateOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read a horizon collection value (`COLLECTION_AFTER_X_MONTH`).
 *
 * Returns null when the raw is null/undefined/empty/NaN — preserves the
 * "data not yet available" semantics for young batches that haven't reached
 * the horizon. Compute layer skips null contributions in aggregations.
 */
function collectionOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Read a string field, returning empty string for null/undefined. */
function stringField(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

/**
 * Build the long-format curve from a row's wide `COLLECTION_AFTER_*_MONTH`
 * columns. Recovery rate is computed as
 * `(amount / totalAmountPlaced) * 100`. Months with null/undefined/NaN
 * collection values are skipped (curve sparseness handled gracefully).
 *
 * When `totalAmountPlaced` is zero, recovery rate would be NaN — the month
 * is skipped to avoid injecting non-finite values into downstream charts.
 */
function buildCurve(
  row: Record<string, unknown>,
  totalAmountPlaced: number,
): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (const month of CURVE_MONTHS) {
    const raw = row[`COLLECTION_AFTER_${month}_MONTH`];
    if (raw === null || raw === undefined || raw === '') continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) continue;
    if (totalAmountPlaced <= 0) continue;
    const recoveryRate = (amount / totalAmountPlaced) * 100;
    if (!Number.isFinite(recoveryRate)) continue;
    points.push({ month, recoveryRate });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a single raw row into a typed `BatchRow`, or `null` when the row is
 * malformed and should be filtered.
 *
 * Drop conditions:
 *   - `BATCH_AGE_IN_MONTHS` is missing, non-finite, or negative (caught via
 *     `asBatchAgeMonths` throw)
 *   - `PARTNER_NAME`, `ACCOUNT_TYPE`, or `BATCH`/`BATCH_` is empty/missing
 *     (identity required for downstream pair-keying)
 *
 * On success: returns a `BatchRow` with `batchAgeMonths` branded, identity
 * + volume + horizon fields typed, rate-shaped engagement fields as
 * `number | null` per DCR-08, and `curve` pre-baked from the wide columns.
 * The original row is preserved on `raw`.
 */
export function parseBatchRow(row: Record<string, unknown>): BatchRow | null {
  // Identity — required.
  const partnerName = stringField(row.PARTNER_NAME);
  const accountType = stringField(row.ACCOUNT_TYPE);
  // Live Snowflake column is `BATCH`; static cache + curves-results use
  // `BATCH_`. Accept either — the bundle path doesn't matter once parsed.
  const batchName = stringField(row.BATCH ?? row.BATCH_);
  if (!partnerName || !accountType || !batchName) return null;

  // Age — branded; throws on invalid.
  let batchAgeMonths;
  try {
    batchAgeMonths = asBatchAgeMonths(row.BATCH_AGE_IN_MONTHS);
  } catch {
    return null;
  }

  const lenderId = stringField(row.LENDER_ID);

  // Volume.
  const totalAmountPlaced = numOrZero(row.TOTAL_AMOUNT_PLACED);

  // Build curve once at parse time.
  const curve = buildCurve(row, totalAmountPlaced);

  return {
    // Identity
    partnerName,
    accountType,
    batchName,
    lenderId,

    // Age
    batchAgeMonths,

    // Volume
    totalAccounts: numOrZero(row.TOTAL_ACCOUNTS),
    totalAmountPlaced,
    totalConvertedAccounts: numOrZero(row.TOTAL_CONVERTED_ACCOUNTS),
    totalCollectedLifeTime: numOrZero(row.TOTAL_COLLECTED_LIFE_TIME),
    avgAmountPlaced: numOrZero(row.AVG_AMOUNT_PLACED),

    // Horizon collection metrics
    collectionAfter3Month: collectionOrNull(row.COLLECTION_AFTER_3_MONTH),
    collectionAfter6Month: collectionOrNull(row.COLLECTION_AFTER_6_MONTH),
    collectionAfter12Month: collectionOrNull(row.COLLECTION_AFTER_12_MONTH),

    // Rate-shaped engagement (DCR-08)
    smsOpenRate: rateOrNull(row.SMS_OPEN_RATE),
    smsClickRate: rateOrNull(row.SMS_CLICK_RATE),
    emailOpenRate: rateOrNull(row.EMAIL_OPEN_RATE),
    emailClickRate: rateOrNull(row.EMAIL_CLICK_RATE),
    callConnectRate: rateOrNull(row.CALL_CONNECT_RATE),
    callRpcRate: rateOrNull(row.CALL_RPC_RATE),
    disputeRate: rateOrNull(row.DISPUTE_RATE),

    // Long-format curve
    curve,

    // Raw passthrough
    raw: row,
  };
}

/**
 * Parse a batch of raw rows, partitioning into typed `rows` and `dropped`
 * metadata. Logs a dev-mode summary (grouped by drop reason) to
 * `console.warn`; never throws.
 *
 * Callers (currently `src/hooks/use-partner-stats.ts`) surface a
 * non-blocking sonner toast to the user when `dropped.length > 0`.
 */
export function parseBatchRows(
  rows: Record<string, unknown>[],
): ParseBatchRowsResult {
  const out: BatchRow[] = [];
  const dropped: ParseBatchRowDrop[] = [];

  for (const row of rows) {
    // Pre-screen identity + age separately so we can record a precise
    // drop reason. parseBatchRow itself returns null without distinguishing.
    const partnerName = stringField(row.PARTNER_NAME);
    const accountType = stringField(row.ACCOUNT_TYPE);
    const batchName = stringField(row.BATCH ?? row.BATCH_);
    if (!partnerName || !accountType || !batchName) {
      dropped.push({ reason: DROP_REASON_MISSING_IDENTITY, sample: row });
      continue;
    }
    let parsed: BatchRow | null;
    try {
      parsed = parseBatchRow(row);
    } catch {
      // parseBatchRow itself catches asBatchAgeMonths throws — if anything
      // else somehow throws, treat as invalid age (only other throw site).
      dropped.push({ reason: DROP_REASON_INVALID_AGE, sample: row });
      continue;
    }
    if (parsed === null) {
      // Identity passed above, so the only remaining drop reason inside
      // parseBatchRow is the asBatchAgeMonths throw.
      dropped.push({ reason: DROP_REASON_INVALID_AGE, sample: row });
      continue;
    }
    out.push(parsed);
  }

  if (dropped.length > 0 && process.env.NODE_ENV !== 'production') {
    const summary: Record<string, number> = {};
    for (const d of dropped) {
      summary[d.reason] = (summary[d.reason] ?? 0) + 1;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[parseBatchRows] dropped ${dropped.length} of ${rows.length} rows:`,
      summary,
    );
  }

  return { rows: out, dropped };
}
