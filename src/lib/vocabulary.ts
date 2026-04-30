/**
 * Bounce domain vocabulary registry — Phase 44 VOC-02.
 *
 * The single rename point for the app's user-visible domain terms. Change
 * `TERMS[key].label` here and every <Term name="key"> consumer in the UI
 * picks up the new label without further edits.
 *
 * What lives here:
 *   - Conceptual primitives that surface in UI <Term> popovers: partner,
 *     product, batch, account, metric, curve, anomaly, norm, list, view,
 *     preset, percentile (12 terms total — locked by Phase 44 CONTEXT.md).
 *
 * What does NOT live here:
 *   - Derived terms (Modeled rate, Delta vs modeled, Cascade tier, Anomaly
 *     score). Those are documented in `docs/GLOSSARY.md` only — the registry
 *     covers terms that need hover-popover treatment in-product. Adding
 *     derived terms here trips the smoke-test exhaustiveness assertion.
 *   - Future v5.0 terms (scorecard, target, triangulation, reconciliation,
 *     divergence). v5.0 phases extend the registry as a one-line append per
 *     term as part of their plan deliverable. Adding them now creates dead
 *     entries and breaks the v5.0 phase boundary.
 *   - i18n / localization hooks. Explicitly deferred per CONTEXT.md
 *     "Deferred Ideas" — registry shape (string `label`) doesn't preclude
 *     future i18n but must not pre-build it.
 *
 * Rename example:
 *   To rename "Metric" → "KPI", change TERMS.metric.label and every
 *   <Term name="metric">Metric</Term> consumer reads the new label via
 *   TERMS[name].label at render time. Children are caller-controlled
 *   text (for casing/pluralization), so update those at the call sites
 *   if the rename should propagate visually as well.
 */

export interface TermDefinition {
  /** User-visible label. The rename point — change this to rename the term in-product. */
  label: string;
  /** One-sentence definition surfaced in <Term> popovers. New-analyst tone. */
  definition: string;
  /** Informal names that map to this term (e.g. "curve" / "collection curve" / "recovery curve"). */
  synonyms: string[];
  /** Term names (keys of this registry) that share conceptual context. Powers cross-references in popovers. */
  seeAlso: TermName[];
}

// Derived terms (Modeled rate, Delta vs modeled, Cascade tier, Anomaly score)
// live in docs/GLOSSARY.md only — the registry covers conceptual primitives
// that <Term> popovers reference. Do not add derived terms here unless they
// also gain a UI surface that needs hover-popover treatment.
export const TERMS = {
  partner: {
    label: 'Partner',
    definition:
      'A debt collection lender Bounce works with (Affirm, Happy Money, etc.); the top level of the unit-of-analysis hierarchy.',
    synonyms: ['lender', 'client'],
    seeAlso: ['product', 'batch'],
  },
  product: {
    label: 'Product',
    definition:
      "An ACCOUNT_TYPE within a partner (THIRD_PARTY, PRE_CHARGE_OFF_FIRST_PARTY, PRE_CHARGE_OFF_THIRD_PARTY); paired with a partner forms the canonical unit of analysis — the apples-and-oranges rule means we never blend products within a partner.",
    synonyms: ['account type', 'product type'],
    seeAlso: ['partner', 'batch'],
  },
  batch: {
    label: 'Batch',
    definition:
      'A monthly placement of accounts from a partner-product pair; each batch ages forward (M1, M2, ...) accumulating collections.',
    synonyms: ['placement', 'vintage'],
    seeAlso: ['account', 'curve'],
  },
  account: {
    label: 'Account',
    definition:
      'A single placed debt instance within a batch — the bottom of the partner > product > batch > account hierarchy.',
    synonyms: ['debt', 'loan'],
    seeAlso: ['batch'],
  },
  metric: {
    label: 'Metric',
    definition:
      'A column-shaped value computed per batch (rate, count, currency, days); the unit anomaly detection and trending operate on.',
    synonyms: ['KPI', 'measure'],
    seeAlso: ['curve', 'norm'],
  },
  curve: {
    label: 'Curve',
    definition:
      'The collection trajectory of a batch over time — what fraction of the placed amount has been recovered at each batch-age month.',
    synonyms: ['collection curve', 'recovery curve'],
    seeAlso: ['batch', 'norm'],
  },
  anomaly: {
    label: 'Anomaly',
    definition:
      'A metric whose value lies more than Z_THRESHOLD standard deviations from its peer-group norm — flagged for partnerships team attention.',
    synonyms: ['outlier', 'flag'],
    seeAlso: ['norm', 'percentile'],
  },
  norm: {
    label: 'Norm',
    definition:
      'The mean and standard deviation of a metric across a peer group, used as the reference distribution for anomaly detection.',
    synonyms: ['baseline', 'peer-group baseline'],
    seeAlso: ['anomaly', 'percentile'],
  },
  list: {
    label: 'List',
    definition:
      'A persisted collection of (partner, product) pairs the user can activate as a cross-app filter; either attribute-driven (refreshable) or hand-picked.',
    synonyms: ['partner list', 'cohort'],
    seeAlso: ['view'],
  },
  view: {
    label: 'View',
    definition:
      'A UI snapshot — saved column visibility plus sort, filter, and drill scope; loading a view restores that state.',
    synonyms: ['saved view', 'snapshot'],
    seeAlso: ['list', 'preset'],
  },
  preset: {
    label: 'Preset',
    definition:
      "A bundled column-visibility configuration (default columns plus curated presets like 'collections-focused').",
    synonyms: ['column preset', 'column set'],
    seeAlso: ['view'],
  },
  percentile: {
    label: 'Percentile',
    definition:
      "Where a value falls within its peer group's distribution; e.g. P50 is the median and P90 is the top decile.",
    synonyms: ['rank', 'percentile rank'],
    seeAlso: ['norm', 'metric'],
  },
} as const satisfies Record<string, TermDefinition>;

export type TermName = keyof typeof TERMS;
