/**
 * Viable-columns helper for the Setup UI's column dropdown.
 *
 * Enumerates columns in `rows` that are plausibly segmenting columns —
 * columns the user could realistically partition a pair's data on.
 *
 * Heuristics:
 *   1. Excludes self-referential or pair-axis columns
 *      (PARTNER_NAME, ACCOUNT_TYPE, LENDER_ID, BATCH).
 *      - PARTNER_NAME / ACCOUNT_TYPE: identical for every row in a
 *        pair-scoped set (the row set is already filtered by pair).
 *      - LENDER_ID: keeping it in the exclude list keeps the dropdown
 *        meaningful — partners with a 1:1 partner→lender mapping would
 *        only see a single value here. (If a future use-case wants to
 *        partition by lender for multi-lender partners, drop the exclude.)
 *      - BATCH: too high-cardinality (one value per batch), not a
 *        partitioning attribute.
 *   2. Keeps only columns where at least one row carries a non-null
 *      string-typed (or string-coercible) value.
 *   3. Filters by distinct-value count: 2 ≤ distinctValues ≤ 20.
 *      - <2: degenerate (single-value or empty column).
 *      - >20: ultra-high-cardinality, not a useful segment axis.
 *
 * Today's reality: against `agg_batch_performance_summary` this returns []
 * — the batch-summary dataset has no viable segmenting columns (Pitfall 4
 * in 39-RESEARCH). The Setup UI uses an empty result to render the
 * "no viable columns yet" empty state. Scaffolding ships regardless so the
 * UX is ready when ETL adds language/bank-subsidiary/cohort columns.
 *
 * Returns columns sorted alphabetically by `column` for stable dropdown
 * ordering. Each entry carries up to 5 `sampleValues` for the dropdown
 * helper text.
 */

const EXCLUDED_COLUMNS = new Set<string>([
  'PARTNER_NAME',
  'ACCOUNT_TYPE',
  'LENDER_ID',
  'BATCH',
]);

const MIN_DISTINCT_VALUES = 2;
const MAX_DISTINCT_VALUES = 20;
const MAX_SAMPLE_VALUES = 5;

export interface ViableSegmentColumn {
  column: string;
  /** Up to 5 representative non-null string values (alphabetical). */
  sampleValues: string[];
}

export function getViableSegmentColumns(
  rows: Array<Record<string, unknown>>,
): ViableSegmentColumn[] {
  if (rows.length === 0) return [];

  // Collect all keys appearing across all rows. Sparse rows are handled by
  // iterating Object.keys per row rather than assuming a uniform shape.
  const allKeys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }

  const result: ViableSegmentColumn[] = [];

  for (const key of allKeys) {
    if (EXCLUDED_COLUMNS.has(key)) continue;

    // Collect distinct non-null string-coercible values for this column.
    const distinctValues = new Set<string>();
    for (const row of rows) {
      const v = row[key];
      if (v == null) continue;
      // Restrict to string-typed values OR primitives that string-coerce
      // cleanly (number → numeric string is fine for segment matching).
      const t = typeof v;
      if (t !== 'string' && t !== 'number') continue;
      const coerced = String(v);
      if (!coerced) continue;
      distinctValues.add(coerced);
      if (distinctValues.size > MAX_DISTINCT_VALUES) break;
    }

    if (
      distinctValues.size < MIN_DISTINCT_VALUES ||
      distinctValues.size > MAX_DISTINCT_VALUES
    ) {
      continue;
    }

    const sortedValues = [...distinctValues].sort((a, b) => a.localeCompare(b));
    result.push({
      column: key,
      sampleValues: sortedValues.slice(0, MAX_SAMPLE_VALUES),
    });
  }

  result.sort((a, b) => a.column.localeCompare(b.column));
  return result;
}
