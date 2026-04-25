/**
 * Types for the modeled-projection data sourced from
 * `BOUNCE.FINANCE.CURVES_RESULTS` (Phase 40 PRJ-01).
 *
 * Wire shape: rows come back with UPPERCASE column names matching the existing
 * `/api/data` route convention (snowflake-sdk preserves Snowflake's native case).
 * The client-side index helper in `useCurvesResultsIndex` reshapes these into
 * lowercase `ProjectionRow` objects keyed by `${lenderId}||${batchName}`.
 */

/**
 * Raw wire row returned by `/api/curves-results`. Mirrors the case convention
 * used by `/api/data/route.ts`: UPPERCASE Snowflake column names, parsed by
 * the consumer hook.
 */
export interface CurvesResultsWireRow {
  LENDER_ID: string;
  BATCH_: string;
  COLLECTION_MONTH: number;
  /**
   * Already converted to 0..100 percentage scale at the API boundary
   * (multiplied by 100 from the warehouse's `PROJECTED_FRACTIONAL` column,
   * per Plan 01 CONFIRM.md decision). Consistent with `CurvePoint.recoveryRate`
   * which is also 0..100.
   */
  PROJECTED_RATE: number;
}

/**
 * Normalized projection row used inside the client-side hook layer. The wire
 * shape is intentionally separate so the API can evolve column casing without
 * forcing every consumer to rename keys.
 */
export interface ProjectionRow {
  lenderId: string;
  batchName: string;
  month: number;
  /** 0..100 percentage scale — consistent with BatchCurve.recoveryRate. */
  projectedRate: number;
}

export interface CurvesResultsResponse {
  data: CurvesResultsWireRow[];
  meta: {
    rowCount: number;
    fetchedAt: string;
  };
}
