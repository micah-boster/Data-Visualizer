/**
 * Canonical parser for batch-summary rows from Snowflake or static cache.
 *
 * NARROW SCOPE (Phase 41 / DCR-08):
 *   Rate-shaped fields carry `number | null`. Currently the codebase reads
 *   these as `Number(row.X) || 0` which conflates "metric not applicable
 *   to this partner" (e.g. partner sent no SMS, so SMS_OPEN_RATE is null)
 *   with "metric is genuinely zero." Compute layers consume typed
 *   `number | null` after this parser runs; the `|| 0` pattern is removed
 *   at downstream callsites (handled in subsequent tasks of this plan and
 *   in Plan 41-05's audit sweep).
 *
 * EXTENSION POINTS (Phase 43 / BND-01..BND-02 — DO NOT IMPLEMENT HERE):
 *   - Branded `BatchAgeMonths = number & { __brand: 'months' }`
 *   - Long-format `curve: CurvePoint[]` baked into the row shape
 *   - Full BatchRow / AccountRow interfaces consumed by every function
 *     in src/lib/computation/. Phase 43 amends the BND-01 success criterion
 *     to "extend the existing parser" rather than "build the parser".
 *
 * REUSE:
 *   Static cache loader (src/lib/static-cache/fallback.ts) MUST route through
 *   this parser — Plan 41-05 (audit) verifies static-cache parity by routing
 *   the JSON fixture rows through parseBatchRow and confirming behavior matches
 *   live Snowflake rows.
 */

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

/**
 * Parse a raw row from Snowflake (or static cache) and resolve rate-shaped
 * fields to `number | null`. All other fields pass through unchanged
 * (they remain `Record<string, unknown>` for now; Phase 43 BND-01 types them).
 *
 * Null when:
 *   - The raw value is `null` or `undefined`
 *   - The raw value is an empty string
 *   - `Number(value)` is `NaN`
 *
 * Otherwise the parsed `number`. Note: a parsed `0` means "the partner has
 * activity AND the rate computed to 0", not "no activity" — null encodes
 * the latter.
 */
export function parseBatchRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of NULLABLE_SET) {
    const raw = row[key];
    if (raw === null || raw === undefined || raw === '') {
      out[key] = null;
      continue;
    }
    const num = Number(raw);
    out[key] = Number.isFinite(num) ? num : null;
  }
  return out;
}

/** Type-guard: is this metric a rate-shaped nullable field? */
export function isRateShapedNullable(metric: string): boolean {
  return NULLABLE_SET.has(metric);
}
