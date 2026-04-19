/**
 * Phase 37 — Metabase SQL Import type surface.
 *
 * Single source of truth for `parseMetabaseSql` output shape and the
 * downstream `mapToSnapshot` / `inferChart` contracts. The UI layer
 * (Plan 02 wizard, Plan 03 apply wiring) consumes these types verbatim.
 *
 * Shape locked in 37-RESEARCH §Pattern 2 and echoed in 37-01-PLAN.
 */

/** A SELECT column that matched the app's allow-list. */
export interface MatchedColumn {
  /** Snowflake column key (uppercase, matches COLUMN_CONFIGS[].key). */
  key: string;
  /** Optional `AS alias` from the original SQL (lowercased by parser). */
  alias?: string;
  /** Display label from COLUMN_CONFIGS, falls back to `key` if lookup fails. */
  label: string;
}

/** A column / filter / sort entry that could not be mapped. */
export interface SkippedItem {
  /** Raw source text (or best-effort JSON-stringified AST fragment). */
  raw: string;
  /** One-line human-readable reason, rendered in the preview UI. */
  reason: string;
}

/** Normalised filter operators we can translate to TanStack columnFilters. */
export type FilterOperator = 'eq' | 'in' | 'between' | 'isNull';

/** A WHERE-clause leaf predicate the mapper knows how to translate. */
export interface MatchedFilter {
  /** Allow-listed column key (uppercase). */
  columnKey: string;
  /** Normalised operator — the mapper uses this to pick storage shape. */
  operator: FilterOperator;
  /**
   * Operator-dependent value:
   *   eq      → string | number
   *   in      → (string | number)[]
   *   between → { min: number; max: number }
   *   isNull  → null
   */
  value: unknown;
}

/** An ORDER BY entry that matched the allow-list. */
export interface MatchedSort {
  columnKey: string;
  desc: boolean;
}

/** Buckets the parser uses to surface section-level warnings. */
export type UnsupportedKind =
  | 'join'
  | 'cte'
  | 'subquery'
  | 'aggregate'
  | 'groupby'
  | 'window'
  | 'table-mismatch'
  | 'non-select';

export interface UnsupportedConstruct {
  kind: UnsupportedKind;
  reason: string;
}

/** Result of the chart-inference heuristic. */
export interface ChartInferenceResult {
  /** Null when no chart could be inferred. */
  chartType: 'line' | 'scatter' | 'bar' | null;
  /** X axis column key; null when axis-eligibility rejects or type unknown. */
  x: string | null;
  /** Y axis column key; null when axis-eligibility rejects or type unknown. */
  y: string | null;
  /** Per-inference notes (e.g. "no suitable chart type could be inferred"). */
  skipped: SkippedItem[];
}

/** Captured parser exception — surfaced in the Plan 02 error card. */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * End-to-end parse output. Every category has a `matched*` and `skipped*`
 * array; `unsupportedConstructs` carries section-agnostic warnings (JOIN,
 * CTE, GROUP BY, table mismatch, etc.). `parseError` is set only when the
 * underlying `astify` call threw.
 */
export interface ParseResult {
  matchedColumns: MatchedColumn[];
  skippedColumns: SkippedItem[];
  matchedFilters: MatchedFilter[];
  skippedFilters: SkippedItem[];
  matchedSort: MatchedSort[];
  skippedSort: SkippedItem[];
  inferredChart: ChartInferenceResult;
  unsupportedConstructs: UnsupportedConstruct[];
  parseError?: ParseError;
}
