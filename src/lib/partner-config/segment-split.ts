/**
 * Phase 39 PCFG-07 — segment-split compute helpers.
 *
 * Centralizes ALL segment-split row + KPI + curve computation in one module so
 * every consumer (Collection Curve chart, KPI summary cards, Chart Builder
 * series-pivot path) routes through the SAME evaluator on the SAME inputs.
 *
 * Pitfall 7 lock (39-RESEARCH): "Other bucket recomputed inconsistently across
 * surfaces" — every caller MUST go through these helpers; never re-implement
 * the segment → row split inline.
 *
 * Apples-and-oranges invariant (segment granularity):
 *   sum(segment.kpis.totalCollected) + other.kpis.totalCollected
 *     === computeKpis(allRows).totalCollected
 *
 * The invariant is asserted in `segment-split.smoke.ts`. It guarantees the
 * Setup UI's "Other" coverage counter, the chart's split-by-segment lines, and
 * the KPI grouped layout all reconcile against the rolled-up total.
 *
 * Note on overlap semantics: `evaluateSegments` intentionally double-counts
 * rows that match multiple segments (so the Setup banner can surface the
 * conflict). When segments are configured to be non-overlapping (the v1
 * recommendation), the invariant above holds exactly. When segments overlap,
 * `sum(segments) > rolled-up` by the overlap count — callers in chart/KPI
 * surfaces SHOULD avoid presenting results when overlapRowCount > 0 OR should
 * surface a warning. The Setup UI prevents save-with-overlap by default.
 */

import { computeKpis } from '@/lib/computation/compute-kpis';
import { reshapeCurves } from '@/lib/computation/reshape-curves';
import type { BatchCurve, KpiAggregates } from '@/types/partner-stats';

import { evaluateSegments } from './segment-evaluator';
import type { SegmentRule } from './types';

/**
 * Sentinel column name used by GenericChart's row-prep pipeline to inject a
 * synthetic "segment" axis into the series pivot. Keeps the chart schema
 * stable (Phase 35 axisRefSchema permits any string in `column`) — no new
 * literal variant needed.
 *
 * Double underscore prefix is the established sentinel pattern in this
 * codebase (Phase 40 PROJECTED_KEY_SUFFIX uses '__projected'; Phase 39
 * derived-list IDs use '__derived__'). Stale-column-warning's allowlist
 * recognizes the prefix so legitimate sentinels don't get flagged as
 * stale references.
 */
export const SEGMENT_VIRTUAL_COLUMN = '__SEGMENT__';

/**
 * Reserved label for the auto-bucket of rows that match zero segments.
 * Mirrors the schema-level reserved name: SegmentRule.name === 'Other' is
 * rejected at parse time so user-defined segments can never collide.
 */
export const OTHER_BUCKET_LABEL = 'Other';

/** A single segment-bucket entry — segment label + rows + isOther flag. */
export interface SegmentBucket {
  label: string;
  rows: Array<Record<string, unknown>>;
  isOther: boolean;
}

/** A single segment-KPI entry — label + computed KPIs + isOther flag. */
export interface SegmentKpiEntry {
  label: string;
  kpis: KpiAggregates;
  isOther: boolean;
}

/** A single segment-curve entry — label + reshaped curves + isOther flag. */
export interface SegmentCurveEntry {
  label: string;
  curves: BatchCurve[];
  isOther: boolean;
}

/**
 * Split pair-scoped rows into per-segment buckets + an Other bucket.
 *
 * Stable ordering: segments in their configured array order, followed by the
 * Other bucket LAST (only included when uncovered rows exist).
 *
 * Edge cases:
 *   - `segments` empty → returns a single { label: 'Other', isOther: true,
 *     rows: [...all rows] } bucket. In practice the chart/KPI wrappers guard
 *     `segments.length > 0` upstream and never call this with zero segments,
 *     but the fallback shape keeps the helper robust.
 *   - `rows` empty → returns one empty bucket per configured segment, no
 *     Other bucket (no rows to be "other" of).
 */
export function splitRowsBySegment(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): SegmentBucket[] {
  // Empty-segments fallback — single Other bucket carrying all rows.
  if (segments.length === 0) {
    return [{ label: OTHER_BUCKET_LABEL, rows: [...rows], isOther: true }];
  }

  const { bySegment, other } = evaluateSegments(rows, segments);
  const buckets: SegmentBucket[] = segments.map((s) => ({
    label: s.name,
    rows: bySegment.get(s.name) ?? [],
    isOther: false,
  }));
  if (other.length > 0) {
    buckets.push({ label: OTHER_BUCKET_LABEL, rows: other, isOther: true });
  }
  return buckets;
}

/**
 * Compute KPI aggregates per segment plus the Other bucket.
 *
 * Each entry's `kpis` is produced by `computeKpis` over that segment's row
 * subset — same function the rolled-up pair view uses. When segments are
 * non-overlapping, `sum(entry.kpis.totalCollected)` equals the rolled-up
 * `computeKpis(allRows).totalCollected` (apples-and-oranges invariant at
 * segment granularity).
 */
export function kpiAggregatesPerSegment(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): SegmentKpiEntry[] {
  return splitRowsBySegment(rows, segments).map(
    ({ label, rows: segRows, isOther }) => ({
      label,
      kpis: computeKpis(segRows),
      isOther,
    }),
  );
}

/**
 * Reshape curves per segment.
 *
 * Each entry carries the segment label and the curve series array for that
 * segment's rows — same `reshapeCurves` the rolled-up Collection Curve chart
 * uses. The chart consumer typically renders one `<Line>` per (segment, batch)
 * pair, or aggregates curves to a single per-segment line via downstream
 * averaging when the chart is in segment-overlay mode.
 */
export function reshapeCurvesPerSegment(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): SegmentCurveEntry[] {
  return splitRowsBySegment(rows, segments).map(
    ({ label, rows: segRows, isOther }) => ({
      label,
      curves: reshapeCurves(segRows),
      isOther,
    }),
  );
}

/**
 * Tag each row with its segment name (or 'Other'). Used by GenericChart's
 * row-prep pipeline to feed the existing series pivot (`pivotForSeries`)
 * without changing pivot semantics — the synthetic `__SEGMENT__` column is
 * just another categorical column.
 *
 * Returns a NEW array of cloned rows (shallow `{ ...r, __SEGMENT__: ... }`)
 * — never mutates the inputs. Callers feed the result into pivot/scatter
 * pipelines that read by key.
 *
 * Edge case: rows that match multiple segments get tagged with the FIRST
 * matching segment's name (stable order = segments array order). Overlap
 * inflation that affects `evaluateSegments`-driven aggregations does NOT
 * apply here because each row produces exactly one tagged output row.
 */
export function tagRowsWithSegment(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): Array<Record<string, unknown>> {
  if (segments.length === 0) {
    return rows.map((r) => ({ ...r, [SEGMENT_VIRTUAL_COLUMN]: OTHER_BUCKET_LABEL }));
  }

  return rows.map((row) => {
    let label: string = OTHER_BUCKET_LABEL;
    for (const s of segments) {
      const v = row[s.column];
      if (v == null) continue;
      if (s.values.includes(String(v))) {
        label = s.name;
        break; // first-match wins for the tag (single-label-per-row contract)
      }
    }
    return { ...row, [SEGMENT_VIRTUAL_COLUMN]: label };
  });
}
