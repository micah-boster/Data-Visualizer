/**
 * Segment evaluator — pure function with zero React coupling.
 *
 * Applies a list of `SegmentRule`s to a row set and returns:
 *   - `bySegment`: Map<segmentName, rows[]> — rows that matched each segment
 *   - `other`: rows[] — rows that matched zero segments (auto-bucket)
 *   - `overlapRowCount`: number — rows that matched MORE THAN ONE segment
 *
 * Overlap semantics: an overlapping row appears in EVERY matching segment's
 * bucket (intentional double-counting) so the Setup UI's warning banner can
 * surface the conflict. `overlapRowCount` counts each overlapping row once
 * regardless of how many segments it matched. The invariant
 *
 *   sum(bySegment.values.length) + other.length === rows.length + (overlapping double-counts)
 *
 * is asserted in `segment-evaluator.smoke.ts`.
 *
 * Comparison rule: `String(row[column])` is matched against the segment's
 * `values[]`. Numeric/string parity (e.g. `LENDER_ID` may live as a number
 * in some rows and a string in others) is handled by always coercing to
 * string before comparison.
 *
 * Pitfall 7 (CENTRALIZE): every consumer (Setup UI's "Other" coverage
 * counter, segment-split charts in Plan 04, segment-split KPIs in Plan 04)
 * must call THIS function with the SAME pair-scoped + filter-applied row set.
 * Divergence between surfaces means the invariant breaks.
 */

import type { SegmentRule } from './types';

export interface EvaluateSegmentsResult {
  /** Per-segment matching rows, keyed by segment.name. */
  bySegment: Map<string, Array<Record<string, unknown>>>;
  /** Rows that matched zero segments — the auto "Other" bucket. */
  other: Array<Record<string, unknown>>;
  /** Count of rows that matched 2+ segments — drives Setup's warning banner. */
  overlapRowCount: number;
}

export function evaluateSegments(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): EvaluateSegmentsResult {
  const bySegment = new Map<string, Array<Record<string, unknown>>>();
  for (const s of segments) {
    bySegment.set(s.name, []);
  }
  const other: Array<Record<string, unknown>> = [];
  let overlapRowCount = 0;

  for (const row of rows) {
    let matched = 0;
    for (const s of segments) {
      const v = row[s.column];
      if (v == null) continue;
      // Coerce to string for parity — LENDER_ID etc. may be number-valued in
      // some rows but the user enters string values in the Setup picker.
      if (s.values.includes(String(v))) {
        bySegment.get(s.name)!.push(row);
        matched++;
      }
    }
    if (matched === 0) other.push(row);
    if (matched > 1) overlapRowCount++;
  }

  return { bySegment, other, overlapRowCount };
}
