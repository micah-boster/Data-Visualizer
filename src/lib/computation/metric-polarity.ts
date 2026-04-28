/**
 * Metric polarity registry for context-aware trend coloring.
 *
 * Defines whether "up" is good (`higher_is_better`), "down" is good
 * (`lower_is_better`), or no inherent good direction (`neutral`) for each
 * trended/displayed metric. Used everywhere the app encodes value direction
 * with color (KPI delta arrows, heatmap diverging palette, comparison-matrix
 * bar/rank order, sparkline tints, anomaly z-score direction, modeled-vs-actual
 * delta cell, tooltip delta tint).
 *
 * Phase 41-03 (DCR-09): refactored from a permissive map into an explicit
 * lookup table with a documented `higher_is_better` default fallback.
 *
 * Default fallback rationale:
 *   The dominant direction in this domain (collection / recovery / engagement
 *   / penetration rates) is "more = good." Metrics where lower is the desired
 *   direction MUST be explicitly registered below; treating them as default
 *   would silently flip the meaning of every color-encoded surface (the
 *   classic DISPUTE_RATE-as-green bug this audit prevents).
 *
 * Cross-references:
 *   - src/lib/data/parse-batch-row.ts RATE_SHAPED_NULLABLE_FIELDS (DCR-08).
 *     Every rate-shaped nullable field is registered here too — alignment
 *     between the parser's null-aware reads and the registry's color rules.
 *   - docs/POLARITY-AUDIT.md (DCR-09 audit doc) — surface inventory + adding
 *     new metrics workflow.
 *   - Phase 43 BND-05 `<ChartFrame>` polarity prop will consume this registry
 *     so charts inherit polarity-aware coloring without re-deriving the rule.
 *
 * Anomaly detection (`compute-anomalies.ts`) checks
 * `polarity === 'higher_is_better'` and `polarity === 'lower_is_better'`
 * explicitly; `'neutral'` metrics never flag anomalies (intentional —
 * neutral metrics have no "bad direction" to flag).
 */

export type MetricPolarity = 'higher_is_better' | 'lower_is_better' | 'neutral';

/**
 * Canonical polarity registry. Keys are Snowflake column names (uppercase).
 *
 * Categories:
 *   - Performance rates → higher_is_better (collection, recovery, conversion)
 *   - Engagement rates → higher_is_better (SMS/email opens, calls)
 *   - Penetration rates → higher_is_better (more contacted = better outreach)
 *   - Dispute / chargeoff rates → lower_is_better (DCR-09 guard)
 *   - Diagnostic credit/scoring → polarity per business meaning
 *     (e.g. AVG_AMOUNT_PLACED is `lower_is_better` — easier to collect smaller balances)
 *   - Volume / count metrics → neutral (no inherent good/bad direction)
 */
export const POLARITY_REGISTRY: Record<string, MetricPolarity> = {
  // --- Higher is better — collection-rate family ---
  COLLECTION_AFTER_3_MONTH: 'higher_is_better',
  COLLECTION_AFTER_6_MONTH: 'higher_is_better',
  COLLECTION_AFTER_12_MONTH: 'higher_is_better',

  // --- Higher is better — penetration / commitment family ---
  PENETRATION_RATE_POSSIBLE_AND_CONFIRMED: 'higher_is_better',
  PENETRATION_RATE_CONFIRMED_ONLY: 'higher_is_better',
  PENETRATION_RATE_POSSIBLE_ONLY: 'higher_is_better',

  // --- Higher is better — conversion ---
  RAITO_FIRST_TIME_CONVERTED_ACCOUNTS: 'higher_is_better',

  // --- Higher is better — engagement family (rate-shaped nullable per DCR-08) ---
  SMS_OPEN_RATE: 'higher_is_better',
  SMS_CLICK_RATE: 'higher_is_better',
  EMAIL_OPEN_RATE: 'higher_is_better',
  EMAIL_CLICK_RATE: 'higher_is_better',
  CALL_CONNECT_RATE: 'higher_is_better',
  CALL_RPC_RATE: 'higher_is_better',

  // --- Higher is better — engagement family (existing Snowflake column names) ---
  // Kept registered so the existing trending/anomaly callsites that pass these
  // canonical column names (compute-anomalies.ts ANOMALY_METRICS) stay correct.
  OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED: 'higher_is_better',
  OUTBOUND_SMS_CLICK_RATE_FROM_OPENED: 'higher_is_better',
  OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED: 'higher_is_better',
  OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED: 'higher_is_better',
  OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED: 'higher_is_better',
  INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED: 'higher_is_better',

  // --- Higher is better — diagnostic ---
  TOTAL_ACCOUNTS_WITH_PAYMENT: 'higher_is_better',
  TOTAL_ACCOUNTS_WITH_PLANS: 'higher_is_better',
  // Better credit score → more collectible portfolio
  AVG_EXPERIAN_CA_SCORE: 'higher_is_better',

  // --- LOWER is better — DCR-09 guard. ---
  // These were silently treated as "higher is good" before this audit on
  // every directional-color surface. Register explicitly so heatmap inverts,
  // sparkline tints flip, anomalies trigger on the correct tail.
  DISPUTE_RATE: 'lower_is_better',
  // Smaller average balances are easier to collect at portfolio level.
  AVG_AMOUNT_PLACED: 'lower_is_better',

  // --- Neutral — volume / magnitude metrics. ---
  // These display with magnitude only; "good direction" depends on benchmark,
  // not on inherent properties of the number. Anomaly detection never flags
  // neutral metrics (no bad direction to flag).
  TOTAL_AMOUNT_PLACED: 'neutral',
  // The lifetime collected dollar amount magnitude is meaningful but the "good
  // direction" depends on placed denominator — the collection RATE is the
  // polarity-meaningful sibling. KPI cards already display the rate.
  TOTAL_COLLECTED_LIFE_TIME: 'neutral',
  TOTAL_ACCOUNTS: 'neutral',
  TOTAL_CONVERTED_ACCOUNTS: 'neutral',
  __BATCH_COUNT: 'neutral',
};

/**
 * Backward-compatibility alias — Phase 14 anomaly-detection / Phase 15
 * smoke-test code paths refer to `METRIC_POLARITY` directly. Keep as alias
 * so existing imports don't break; new callsites use POLARITY_REGISTRY
 * (more descriptive name).
 */
export const METRIC_POLARITY = POLARITY_REGISTRY;

/**
 * Look up polarity for a metric. Defaults to `higher_is_better` for unknown
 * metrics (the dominant direction in this domain).
 *
 * Use this in stable callsites that pass canonical Snowflake metric keys
 * (anomaly detection, trend indicators, modeled-delta cell). For NEWLY-touched
 * directional-color surfaces (heatmap, matrix, sparkline), prefer
 * `getPolarityWithAuditWarning` — it surfaces dev-mode warnings when an
 * unregistered metric flows in.
 */
export function getPolarity(metric: string): MetricPolarity {
  return POLARITY_REGISTRY[metric] ?? 'higher_is_better';
}

/** True if the metric is explicitly registered (not falling through to default). */
export function isPolarityRegistered(metric: string): boolean {
  return metric in POLARITY_REGISTRY;
}

/**
 * Audit-warning variant of `getPolarity`. In development, logs a console
 * warning when an unregistered metric is queried — surfaces silent fallbacks
 * to the dominant `higher_is_better` default that may be wrong for new
 * `lower_is_better` metrics added to Snowflake without a registry update.
 *
 * Use in directional-color surfaces (heatmap diverging palette, matrix bar
 * ranking, sparkline trend tint, KPI cards). Production behavior is identical
 * to `getPolarity`.
 *
 * Suppressed once-per-metric to avoid log spam on repeated renders. The Set
 * is module-scoped — across HMR boundaries the warning re-fires, which is
 * the desired behavior during active dev.
 */
const warnedMetrics = new Set<string>();

export function getPolarityWithAuditWarning(metric: string): MetricPolarity {
  if (
    process.env.NODE_ENV !== 'production' &&
    !isPolarityRegistered(metric) &&
    !warnedMetrics.has(metric)
  ) {
    warnedMetrics.add(metric);
    // eslint-disable-next-line no-console
    console.warn(
      `[polarity-audit] Metric "${metric}" is not registered in POLARITY_REGISTRY. ` +
        `Falling back to higher_is_better. Register explicitly per docs/POLARITY-AUDIT.md ` +
        `if this metric appears with directional color.`,
    );
  }
  return getPolarity(metric);
}
