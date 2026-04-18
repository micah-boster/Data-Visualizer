/**
 * Type definitions for partner lists.
 *
 * A PartnerList is a named, persisted collection of PARTNER_NAME values
 * the user can activate as a cross-app filter. Lists are either
 * attribute-driven (derived from ACCOUNT_TYPE etc. and refreshable)
 * or manual/hand-picked snapshots.
 *
 * v1 attribute scope: ACCOUNT_TYPE only. PRODUCT_TYPE / REVENUE_BAND
 * are deferred per CONTEXT.md 2026-04-18 update. PartnerListFilters is
 * kept intentionally additive so more attribute keys can slot in as
 * optional fields without a breaking change.
 */

/** Supported attribute keys for attribute-driven partner lists (v1 scope). */
export type AttributeKey = 'ACCOUNT_TYPE';

/**
 * Multi-select filter shape used to derive attribute lists.
 * Within an attribute, values are OR'd. Across attributes, keys are AND'd.
 * An empty / undefined attribute entry means "no constraint on this attribute".
 */
export interface PartnerListFilters {
  /** ACCOUNT_TYPE multi-select; values are OR'd within this attribute. */
  ACCOUNT_TYPE?: string[];
  // Future attributes added here as `.optional()` fields (additive evolution).
}

/** A named, persisted partner list. */
export interface PartnerList {
  /** Unique identifier (crypto.randomUUID()). */
  id: string;
  /** User-visible name, required, trimmed before storage. */
  name: string;
  /** Snapshot of matching PARTNER_NAME values at creation/refresh time. */
  partnerIds: string[];
  /** Attribute filter inputs; `{}` when the list was hand-picked only. */
  filters: PartnerListFilters;
  /**
   * Creation mode locked at save time (Pitfall 7):
   * - 'attribute' — derived from filters; gets a Refresh action.
   * - 'manual'    — hand-picked snapshot; no Refresh action.
   * Never mutated after creation.
   */
  source: 'attribute' | 'manual';
  /** Creation timestamp (Date.now()). */
  createdAt: number;
  /** Last-updated timestamp (Date.now()). */
  updatedAt: number;
}
