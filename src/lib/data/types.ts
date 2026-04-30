/**
 * Phase 43 BND-01 / BND-02 — canonical typed-row contract for the data boundary.
 *
 * Every function in `src/lib/computation/**` consumes typed `BatchRow[]` from
 * this module instead of the legacy `Record<string, unknown>[]` bag-of-strings.
 * The `parseBatchRow` / `parseBatchRows` helpers in `./parse-batch-row.ts` are
 * the SINGLE producer of these types — Snowflake API responses (`/api/data`)
 * AND static cache JSON (`src/lib/static-cache/fallback.ts`) both flow through
 * the parser.
 *
 * This file is a pure type contract. Implementation lives in
 * `./parse-batch-row.ts` (Task 2). No runtime helpers beyond `asBatchAgeMonths`
 * — the brand constructor — are exported from here.
 */

// -----------------------------------------------------------------------------
// Branded month-unit type
// -----------------------------------------------------------------------------

/**
 * Branded number type representing batch age in MONTHS (never days).
 *
 * Why branded?
 *   The Snowflake source column is `BATCH_AGE_IN_MONTHS` and live queries
 *   return months (e.g. 7, 33). However, several pre-Phase-41 sites coerced
 *   to days via `* 30` or `/ 30` rounding errors, and pre-normalization
 *   static-cache snapshots could carry days values (>365). The legacy
 *   `coerceAgeMonths` helper in `@/lib/utils` (and three duplicate
 *   definitions across `src/lib/computation/`) papered over this with a
 *   "if value > 365 it's days, divide by 30" heuristic.
 *
 *   Phase 43 BND-01 collapses the three duplicates into a single coercion
 *   site (`asBatchAgeMonths` below) inside the parser, then BRANDS the
 *   result so downstream call sites can never accidentally pass an
 *   un-coerced number through. A function accepting `BatchAgeMonths` will
 *   refuse a plain `number` at the type level.
 *
 * Construction:
 *   Always via `asBatchAgeMonths(n)` — never via type assertion. Throws
 *   `RangeError` on negative or non-finite input; the parser catches the
 *   throw and feeds the row into the filter-and-warn drop pipeline so a
 *   single malformed row never crashes downstream compute.
 */
export type BatchAgeMonths = number & { readonly __brand: 'months' };

/**
 * Coerce a raw value into a `BatchAgeMonths` brand.
 *
 * Single source of truth for age coercion. Replaces the three duplicate
 * `coerceAgeMonths` definitions previously living inside
 * `compute-anomalies.ts`, `compute-kpis.ts`, and `compute-trending.ts`
 * (plus the shared one in `@/lib/utils.ts`).
 *
 * Coercion rule (preserved from the legacy helper for backward
 * compatibility with pre-normalization static-cache snapshots):
 *   - Values > 365 are treated as legacy DAYS and floored into months
 *     via `Math.floor(n / 30)`. Live Snowflake months pass through.
 *   - Non-finite or negative inputs throw `RangeError` so the parser can
 *     drop the malformed row.
 *
 * @throws RangeError when `n` is non-finite or negative after Number() coercion.
 */
export function asBatchAgeMonths(raw: unknown): BatchAgeMonths {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new RangeError(
      `asBatchAgeMonths: expected a non-negative finite number, got ${JSON.stringify(raw)}`,
    );
  }
  const months = n > 365 ? Math.floor(n / 30) : n;
  return months as BatchAgeMonths;
}

// -----------------------------------------------------------------------------
// Curve point — long format
// -----------------------------------------------------------------------------

/**
 * Long-format curve point baked onto each `BatchRow` by the parser.
 *
 * Mirrors the shape used downstream by `BatchCurve.points` (in
 * `@/types/partner-stats`) — same `month` integer + `recoveryRate` percentage
 * (0..100). The `amount` field carried by `BatchCurve.CurvePoint` is omitted
 * here on purpose: the row-level curve representation is a presentation
 * convenience for compute-cross-partner and the Collection Curve chart, not
 * the canonical accounting record. Callers needing per-month dollar amounts
 * should still read `row.raw.COLLECTION_AFTER_X_MONTH`.
 */
export interface CurvePoint {
  /** Calendar month after batch placement (1, 2, 3, ..., 12, 15, 18, ...). */
  month: number;
  /** Recovery rate as a percentage on the 0..100 scale. */
  recoveryRate: number;
}

// -----------------------------------------------------------------------------
// Canonical row interfaces
// -----------------------------------------------------------------------------

/**
 * Typed batch-summary row produced by `parseBatchRow` / `parseBatchRows`.
 *
 * BND-02: every function in `src/lib/computation/**` accepts `BatchRow[]` at
 * its top-level signature. UI-rendering surfaces (table cells, sidebar) still
 * read from `row.raw.PARTNER_NAME` style during this phase; migrating those
 * is deferred to v5.5 DEBT-07/08.
 *
 * Field naming convention: Snowflake source columns are SCREAMING_SNAKE
 * (`PARTNER_NAME`, `BATCH_AGE_IN_MONTHS`); typed surface uses camelCase
 * (`partnerName`, `batchAgeMonths`). The original row is preserved on `raw`
 * for any consumer not yet migrated to the typed shape.
 *
 * Rate-shaped engagement fields (DCR-08 contract from Plan 41-02): typed as
 * `number | null` per `RATE_SHAPED_NULLABLE_FIELDS`. Compute layer skips null
 * contributions; UI suppression already in place from Plan 41-02 keeps
 * working.
 */
export interface BatchRow {
  // -- Identity (required for downstream pair-keying — drop-on-missing) --
  /** From `PARTNER_NAME`. Drop-on-missing. */
  partnerName: string;
  /** From `ACCOUNT_TYPE`. Drop-on-missing (Phase 39 PCFG-04 pair scope). */
  accountType: string;
  /** From `BATCH` (or `BATCH_` legacy alias). Drop-on-missing. */
  batchName: string;
  /** From `LENDER_ID`. May be empty string (some partners share a lender). */
  lenderId: string;

  // -- Age (branded) --
  /**
   * Branded batch age in months. See `asBatchAgeMonths` for the coercion
   * contract. Days-vs-months ambiguity is resolved at parse time; downstream
   * callers can pass this directly to `isMetricEligible` etc.
   */
  batchAgeMonths: BatchAgeMonths;

  // -- Volume (sum-aggregable) --
  totalAccounts: number;
  totalAmountPlaced: number;
  totalConvertedAccounts: number;
  totalCollectedLifeTime: number;
  avgAmountPlaced: number;

  // -- Horizon collection metrics (DCR-07 eligibility-gated) --
  /**
   * `COLLECTION_AFTER_3_MONTH` — null when the batch is too young to have
   * reached the 3-month horizon (per `isMetricEligible`). Consumers should
   * skip null contributions in aggregations rather than coerce to 0.
   */
  collectionAfter3Month: number | null;
  collectionAfter6Month: number | null;
  collectionAfter12Month: number | null;

  // -- Rate-shaped engagement (DCR-08 — null = "no activity", NOT zero rate) --
  smsOpenRate: number | null;
  smsClickRate: number | null;
  emailOpenRate: number | null;
  emailClickRate: number | null;
  callConnectRate: number | null;
  callRpcRate: number | null;
  disputeRate: number | null;

  // -- Long-format curve (pre-baked at parse time) --
  /**
   * Long-format collection curve built from the wide
   * `COLLECTION_AFTER_{1..12,15,...}_MONTH` columns at parse time. Months
   * with null/undefined/NaN values are skipped (curve sparseness handled
   * gracefully). This pre-baked field replaces the per-render
   * `reshape-curves.ts` work for downstream BND-02 consumers.
   *
   * `reshape-curves.ts` is retained as a backward-compat shim for callers
   * still threading `BatchCurve` shapes; new code should read `row.curve`
   * directly.
   */
  curve: CurvePoint[];

  // -- Raw passthrough for un-migrated UI surfaces --
  /**
   * Original Snowflake row preserved unchanged. Sidebar + table currently
   * access `row.PARTNER_NAME` style via `getValue('PARTNER_NAME')`; the raw
   * passthrough lets compute migrate first without breaking those surfaces.
   * v5.5 DEBT-07/08 will migrate UI surfaces to read typed fields and the
   * passthrough can then be deprecated.
   */
  raw: Record<string, unknown>;
}

/**
 * Minimal canonical interface for `/api/accounts` rows.
 *
 * Only the fields the app actually reads today (loan ID + partner/batch
 * identity + status fields). Same `raw` passthrough convention as `BatchRow`.
 *
 * Phase 43 ships this as a type contract only; account-level migration to
 * the typed shape is deferred to v5.5+ DEBT-09 per the Phase 41 CONTEXT lock
 * (root → (partner, product) → batch is the v4.5 audit boundary; account
 * level is out of scope).
 */
export interface AccountRow {
  loanId: string;
  partnerName: string;
  batchName: string;
  accountType: string;
  /** Original Snowflake row preserved unchanged. */
  raw: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Parser return shape
// -----------------------------------------------------------------------------

/**
 * Drop-record metadata threaded back to callers from `parseBatchRows`.
 *
 * `reason` is one of the documented filter-and-warn categories; `sample`
 * carries the raw row that failed so the dev console can see the offending
 * data. Callers (currently `use-partner-stats.ts`) surface a non-blocking
 * sonner toast summarizing the dropped count + reasons.
 */
export interface ParseBatchRowDrop {
  reason: string;
  sample: Record<string, unknown>;
}

/** Return shape for `parseBatchRows` — typed rows + drop metadata. */
export interface ParseBatchRowsResult {
  rows: BatchRow[];
  dropped: ParseBatchRowDrop[];
}
