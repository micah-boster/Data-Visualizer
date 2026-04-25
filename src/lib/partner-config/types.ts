/**
 * Type definitions for per-pair partner configuration (PCFG-05).
 *
 * A partner config entry stores the editable segment list for a single
 * `(partner, product)` pair. Segments are rule-based — each segment matches
 * rows where `row[column]` is in `values`. Rules are evaluated against the
 * pair-scoped row set; rows not matching any segment fall into an
 * auto-generated read-only "Other" bucket (computed at query time, never
 * stored).
 *
 * Mirrors the structural pattern of `src/lib/partner-lists/types.ts` —
 * single localStorage key, array shape, additive-optional schema evolution
 * via `.optional()` fields when new attributes land.
 */

/** A single segmenting rule within a pair's configuration. */
export interface SegmentRule {
  /**
   * Stable identifier (crypto.randomUUID()). Persists across reorder so the
   * UI can use it as a React key without remounting the row when the user
   * shifts position.
   */
  id: string;
  /**
   * Display name — required, unique within the owning pair (case-insensitive).
   * The literal "Other" (any case) is reserved for the auto-bucket and
   * rejected by `segmentRuleSchema` at parse time.
   */
  name: string;
  /**
   * Snowflake column name (UPPERCASE) the rule matches against. Comes from
   * the dataset's row keys (e.g. `LENDER_ID`, future `LANGUAGE`,
   * `BANK_SUBSIDIARY` etc.).
   */
  column: string;
  /**
   * Allowed values. A row matches the rule when `String(row[column])` is in
   * this list. Empty values arrays are rejected by the schema — every saved
   * segment must have at least one value.
   */
  values: string[];
}

/** Per-pair config entry — the localStorage row for one `(partner, product)` pair. */
export interface PartnerConfigEntry {
  /** PARTNER_NAME from the dataset. */
  partner: string;
  /** ACCOUNT_TYPE from the dataset (verbatim, UPPERCASE). */
  product: string;
  /** Ordered segment rules. Array position drives render + iteration order. */
  segments: SegmentRule[];
  /** Last-updated timestamp (Date.now()). Bumped on every upsert. */
  updatedAt: number;
}

/** localStorage shape — one array under a single key. */
export type PartnerConfigArray = PartnerConfigEntry[];
