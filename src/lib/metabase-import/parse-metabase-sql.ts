/**
 * Phase 37 — pure `parseMetabaseSql(sql)` translator.
 *
 * Wraps `node-sql-parser`'s Snowflake build (Pitfall 10 — bundle-sized, not
 * the combined-dialect build) and emits a normalised `ParseResult` that the
 * Plan 02 wizard + Plan 03 apply pipeline consume verbatim.
 *
 * Responsibilities:
 *   1. Strip Metabase template tags BEFORE handing SQL to the parser
 *      (Pitfall 1 — `{{var}}` and `[[ ... ]]` crash the parser).
 *   2. Trap parser exceptions into `parseError` with `.line/.column` when
 *      available (Pitfall 2).
 *   3. Walk the AST exactly once to populate every ParseResult slot.
 *   4. Enforce the allow-list at the column-name boundary (Pitfall 3 —
 *      case-fold + strip quoted-identifier wrappers) so unknown columns
 *      silently drop into `skippedColumns` (META-05 safety net).
 *   5. Surface JOIN / CTE / subquery / GROUP BY / aggregate / window /
 *      non-SELECT / table-mismatch in `unsupportedConstructs` (partial
 *      import policy from 37-CONTEXT).
 *
 * This module is PURE: no DOM, no React, no localStorage, no network.
 */

// node-sql-parser ships CJS only. Default-import + destructure is the
// interop shape Node accepts directly under `--experimental-strip-types`
// (named-import-from-CJS fails in ESM mode on Node 22+).
import sqlParser from 'node-sql-parser/build/snowflake.js';
const { Parser } = sqlParser;

import { ALLOWED_COLUMNS, COLUMN_CONFIGS, SOURCE_TABLE } from '../columns/config.ts';
import { inferChart } from './chart-inference.ts';
import type {
  ChartInferenceResult,
  MatchedColumn,
  MatchedFilter,
  MatchedSort,
  ParseError,
  ParseResult,
  SkippedItem,
  UnsupportedConstruct,
} from './types.ts';

const labelByKey = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

/**
 * Drop `[[ ... ]]` optional clauses entirely and replace `{{var}}` with
 * the literal `NULL` so the resulting WHERE clause is still parseable.
 * Filters that end up referencing the NULL sentinel naturally fall into
 * `skippedFilters` via the type-mismatch path in `extractWhere`.
 */
function stripMetabaseTemplates(sql: string): string {
  return sql
    .replace(/\[\[[\s\S]*?\]\]/g, '')
    .replace(/\{\{[^}]+\}\}/g, 'NULL');
}

/** Case-fold + strip wrapping double quotes for allow-list lookups. */
function normaliseColumnKey(raw: string): string {
  return raw.replace(/^"(.*)"$/, '$1').toUpperCase();
}

/** Best-effort pretty-print of an AST fragment for skip-reason text. */
function printExpr(expr: unknown): string {
  try {
    const s = JSON.stringify(expr);
    return s.length > 80 ? `${s.slice(0, 77)}...` : s;
  } catch {
    return '[expr]';
  }
}

/**
 * Build an empty ParseResult. Optional `init` can seed fields pre-populated
 * by an early-return path (parseError, non-SELECT guard).
 */
function emptyResult(init?: Partial<ParseResult>): ParseResult {
  return {
    matchedColumns: [],
    skippedColumns: [],
    matchedFilters: [],
    skippedFilters: [],
    matchedSort: [],
    skippedSort: [],
    inferredChart: { chartType: null, x: null, y: null, skipped: [] },
    unsupportedConstructs: [],
    ...init,
  };
}

/** Pushes `construct` if no prior entry shares the same `kind` (dedupe). */
function pushUnique(arr: UnsupportedConstruct[], construct: UnsupportedConstruct): void {
  if (!arr.some((c) => c.kind === construct.kind)) arr.push(construct);
}

/** Resolve a column expression (column_ref OR double_quote_string) to key/raw. */
function resolveColumnRef(
  expr: unknown,
): { key: string; raw: string } | null {
  if (!expr || typeof expr !== 'object') return null;
  const e = expr as { type?: string; column?: unknown; value?: unknown };
  if (e.type === 'column_ref' && typeof e.column === 'string') {
    return { key: normaliseColumnKey(e.column), raw: e.column };
  }
  // Quoted identifiers arrive as double_quote_string literals (Pitfall 3).
  if (e.type === 'double_quote_string' && typeof e.value === 'string') {
    return { key: normaliseColumnKey(e.value), raw: `"${e.value}"` };
  }
  return null;
}

/**
 * Extract scalar value from a literal AST node. Returns `undefined` if the
 * node is not a literal we can translate (e.g. a nested expression).
 */
function literalValue(node: unknown): string | number | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as { type?: string; value?: unknown };
  switch (n.type) {
    case 'single_quote_string':
    case 'string':
    case 'double_quote_string':
      return typeof n.value === 'string' ? n.value : undefined;
    case 'number':
      return typeof n.value === 'number' ? n.value : undefined;
    case 'null':
      // IS NULL is handled separately; a bare `column = NULL` would fall
      // through to skipped-filters via type-mismatch.
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Walk `ast.columns` and bucket into matched / skipped. Aggregates bump
 * `unsupportedConstructs` via `pushUnique` so the preview can surface a
 * section-level warning in addition to per-column reasons (Pitfall 9).
 */
function extractColumns(
  columns: unknown[],
  matched: MatchedColumn[],
  skipped: SkippedItem[],
  unsupported: UnsupportedConstruct[],
): void {
  for (const col of columns) {
    if (!col || typeof col !== 'object') continue;
    const entry = col as { expr?: unknown; as?: unknown };
    const expr = entry.expr as { type?: string; name?: unknown } | undefined;
    const aliasRaw = entry.as;
    const alias = typeof aliasRaw === 'string' ? aliasRaw : undefined;

    if (!expr || typeof expr !== 'object') {
      skipped.push({ raw: printExpr(col), reason: 'unparseable column expression' });
      continue;
    }

    // column_ref OR double_quote_string — both map to a concrete column.
    const resolved = resolveColumnRef(expr);
    if (resolved) {
      if (ALLOWED_COLUMNS.has(resolved.key)) {
        matched.push({
          key: resolved.key,
          alias,
          label: labelByKey.get(resolved.key) ?? resolved.key,
        });
      } else {
        skipped.push({ raw: resolved.raw, reason: 'column not in schema' });
      }
      continue;
    }

    if (expr.type === 'aggr_func') {
      const name = typeof expr.name === 'string' ? expr.name : 'aggregate';
      skipped.push({
        raw: name,
        reason: 'aggregate functions not supported — use raw columns',
      });
      pushUnique(unsupported, {
        kind: 'aggregate',
        reason:
          'GROUP BY / aggregate functions are not applied — imported as raw rows',
      });
      continue;
    }

    if (expr.type === 'window_func') {
      skipped.push({ raw: printExpr(expr), reason: 'window functions not supported' });
      pushUnique(unsupported, {
        kind: 'window',
        reason: 'Window functions not supported',
      });
      continue;
    }

    // Anything else: case-expr, function, expr_list, star, etc.
    skipped.push({
      raw: printExpr(expr),
      reason: `expression type "${expr.type ?? 'unknown'}" not supported`,
    });
  }
}

/**
 * Walk FROM entries. Detects JOIN / subquery / table mismatch. The primary
 * table (index 0) is compared case-insensitively against SOURCE_TABLE.
 */
function extractFrom(
  from: unknown[],
  unsupported: UnsupportedConstruct[],
): void {
  if (!Array.isArray(from) || from.length === 0) return;

  const primary = from[0] as { table?: unknown; expr?: unknown };
  const primaryTable =
    typeof primary?.table === 'string' ? primary.table : undefined;

  // Subquery in primary FROM: `FROM (SELECT ...) x`.
  if (primary?.expr && typeof primary.expr === 'object') {
    const e = primary.expr as { ast?: unknown };
    if (e.ast) {
      pushUnique(unsupported, {
        kind: 'subquery',
        reason: 'Subquery in FROM not supported',
      });
    }
  }

  if (primaryTable && primaryTable.toUpperCase() !== SOURCE_TABLE) {
    pushUnique(unsupported, {
      kind: 'table-mismatch',
      reason: `Query references a different table: ${primaryTable} — columns are matched by name against app schema`,
    });
  }

  // JOINs + subqueries in any additional FROM entries.
  for (let i = 1; i < from.length; i++) {
    const entry = from[i] as { join?: unknown; expr?: unknown };
    if (entry?.join) {
      pushUnique(unsupported, {
        kind: 'join',
        reason: 'JOIN not supported — only the primary table is used',
      });
    }
    if (entry?.expr && typeof entry.expr === 'object') {
      const e = entry.expr as { ast?: unknown };
      if (e.ast) {
        pushUnique(unsupported, {
          kind: 'subquery',
          reason: 'Subquery in FROM not supported',
        });
      }
    }
  }
}

type BinaryExpr = {
  type: 'binary_expr';
  operator: string;
  left: unknown;
  right: unknown;
};

function isBinaryExpr(node: unknown): node is BinaryExpr {
  return (
    !!node &&
    typeof node === 'object' &&
    (node as { type?: unknown }).type === 'binary_expr'
  );
}

/**
 * Flatten a conjunction tree (`AND`s) into leaf predicates. Any OR branch
 * short-circuits to `skippedFilters` with a one-line reason.
 *
 * Mirrors 37-RESEARCH Pitfall 5 verbatim.
 */
function flattenConjunction(
  node: unknown,
  leaves: BinaryExpr[],
  skipped: SkippedItem[],
): void {
  if (!isBinaryExpr(node)) {
    if (node) {
      skipped.push({ raw: printExpr(node), reason: 'unsupported WHERE expression' });
    }
    return;
  }
  const op = node.operator.toUpperCase();
  if (op === 'AND') {
    flattenConjunction(node.left, leaves, skipped);
    flattenConjunction(node.right, leaves, skipped);
    return;
  }
  if (op === 'OR') {
    skipped.push({
      raw: printExpr(node),
      reason: 'OR conditions not supported',
    });
    return;
  }
  leaves.push(node);
}

/**
 * Translate a leaf binary_expr predicate into a MatchedFilter or a SkippedItem.
 * LHS must resolve to an allow-listed column; RHS shape depends on operator.
 */
function translateLeaf(
  leaf: BinaryExpr,
  matched: MatchedFilter[],
  skipped: SkippedItem[],
): void {
  const lhs = resolveColumnRef(leaf.left);
  if (!lhs || !ALLOWED_COLUMNS.has(lhs.key)) {
    skipped.push({
      raw: printExpr(leaf),
      reason: lhs
        ? 'column not in schema'
        : 'filter LHS is not a simple column reference',
    });
    return;
  }
  const columnKey = lhs.key;
  const op = leaf.operator.toUpperCase();

  switch (op) {
    case '=': {
      const v = literalValue(leaf.right);
      if (v === undefined) {
        skipped.push({
          raw: printExpr(leaf),
          reason: 'unsupported right-hand side on = filter',
        });
        return;
      }
      matched.push({ columnKey, operator: 'eq', value: v });
      return;
    }
    case 'IN': {
      const rhs = leaf.right as { type?: string; value?: unknown };
      if (rhs?.type !== 'expr_list' || !Array.isArray(rhs.value)) {
        skipped.push({ raw: printExpr(leaf), reason: 'IN requires a literal list' });
        return;
      }
      const values = rhs.value.map(literalValue).filter(
        (v): v is string | number => v !== undefined,
      );
      if (values.length !== rhs.value.length) {
        skipped.push({
          raw: printExpr(leaf),
          reason: 'IN list contains non-literal values',
        });
        return;
      }
      matched.push({ columnKey, operator: 'in', value: values });
      return;
    }
    case 'BETWEEN': {
      const rhs = leaf.right as { type?: string; value?: unknown };
      if (rhs?.type !== 'expr_list' || !Array.isArray(rhs.value) || rhs.value.length !== 2) {
        skipped.push({
          raw: printExpr(leaf),
          reason: 'BETWEEN requires exactly two literal bounds',
        });
        return;
      }
      const [minRaw, maxRaw] = rhs.value;
      const min = literalValue(minRaw);
      const max = literalValue(maxRaw);
      if (typeof min !== 'number' || typeof max !== 'number') {
        skipped.push({
          raw: printExpr(leaf),
          reason: 'BETWEEN requires numeric bounds',
        });
        return;
      }
      matched.push({ columnKey, operator: 'between', value: { min, max } });
      return;
    }
    case 'IS':
    case 'IS NULL': {
      // `x IS NULL` surfaces as `binary_expr { operator: 'IS', right: { type: 'null' } }`.
      // The app's filter schema has no null bucket, so defer to skippedFilters.
      skipped.push({
        raw: printExpr(leaf),
        reason: 'IS NULL filters not yet supported',
      });
      return;
    }
    default: {
      skipped.push({
        raw: printExpr(leaf),
        reason: `operator "${leaf.operator}" not supported`,
      });
    }
  }
}

function extractWhere(
  where: unknown,
  matched: MatchedFilter[],
  skipped: SkippedItem[],
): void {
  if (!where) return;
  const leaves: BinaryExpr[] = [];
  flattenConjunction(where, leaves, skipped);
  for (const leaf of leaves) {
    translateLeaf(leaf, matched, skipped);
  }
}

function extractOrderBy(
  orderby: unknown,
  matched: MatchedSort[],
  skipped: SkippedItem[],
): void {
  if (!Array.isArray(orderby)) return;
  for (const entry of orderby) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as { expr?: unknown; type?: unknown };
    const resolved = resolveColumnRef(e.expr);
    if (!resolved) {
      skipped.push({
        raw: printExpr(entry),
        reason: 'ORDER BY expression is not a simple column reference',
      });
      continue;
    }
    if (!ALLOWED_COLUMNS.has(resolved.key)) {
      skipped.push({ raw: resolved.raw, reason: 'column not in schema' });
      continue;
    }
    const desc = typeof e.type === 'string' && e.type.toUpperCase() === 'DESC';
    matched.push({ columnKey: resolved.key, desc });
  }
}

/**
 * Walk the full SELECT AST once. Returns a populated ParseResult; callers
 * handle non-SELECT / array-of-statements guards upstream.
 */
function walkSelect(ast: Record<string, unknown>): ParseResult {
  const result = emptyResult();

  // CTE presence → unsupported.
  if (ast.with && Array.isArray(ast.with) && ast.with.length > 0) {
    pushUnique(result.unsupportedConstructs, {
      kind: 'cte',
      reason:
        'CTE (WITH clause) not supported — only the top-level SELECT is imported',
    });
  }

  const columns = Array.isArray(ast.columns) ? ast.columns : [];
  extractColumns(
    columns,
    result.matchedColumns,
    result.skippedColumns,
    result.unsupportedConstructs,
  );

  if (Array.isArray(ast.from)) {
    extractFrom(ast.from, result.unsupportedConstructs);
  }

  extractWhere(ast.where, result.matchedFilters, result.skippedFilters);

  // GROUP BY: parser emits `{ columns: [...] }` (or null).
  const groupby = ast.groupby as { columns?: unknown } | null | undefined;
  if (
    groupby &&
    Array.isArray((groupby as { columns?: unknown }).columns) &&
    ((groupby as { columns: unknown[] }).columns.length ?? 0) > 0
  ) {
    pushUnique(result.unsupportedConstructs, {
      kind: 'groupby',
      reason: 'GROUP BY not supported — imported as raw rows',
    });
  }

  extractOrderBy(ast.orderby, result.matchedSort, result.skippedSort);

  // Chart inference runs last so it can read matchedColumns +
  // unsupportedConstructs (for the groupby→bar hint).
  result.inferredChart = inferChart(
    result.matchedColumns,
    result.unsupportedConstructs,
  );

  return result;
}

/**
 * Parse Metabase-flavoured Snowflake SQL into a normalized ParseResult.
 *
 * Contract:
 *   - Never throws. Any parser exception is captured into `parseError`.
 *   - Template tags (`{{var}}`, `[[...]]`) are stripped before parsing.
 *   - Unknown columns, aggregates, JOINs, CTEs, GROUP BY, window functions,
 *     non-SELECT, and OR branches all produce a ParseResult with the
 *     appropriate `skipped*` / `unsupportedConstructs` entries.
 */
export function parseMetabaseSql(sql: string): ParseResult {
  const parser = new Parser();
  let ast: unknown;
  try {
    ast = parser.astify(stripMetabaseTemplates(sql), { database: 'Snowflake' });
  } catch (err) {
    const e = err as {
      message?: string;
      location?: { start?: { line?: number; column?: number } };
    };
    const parseError: ParseError = { message: e.message ?? 'SQL parse error' };
    if (e.location?.start?.line !== undefined) parseError.line = e.location.start.line;
    if (e.location?.start?.column !== undefined) parseError.column = e.location.start.column;
    return emptyResult({ parseError });
  }

  const unsupported: UnsupportedConstruct[] = [];

  // Multi-statement: use the first statement; flag the rest.
  let head: unknown = ast;
  if (Array.isArray(ast)) {
    if (ast.length > 1) {
      unsupported.push({
        kind: 'non-select',
        reason: 'Multiple statements — only the first SELECT is imported',
      });
    }
    head = ast[0];
  }

  if (!head || typeof head !== 'object') {
    return emptyResult({
      unsupportedConstructs: [
        ...unsupported,
        { kind: 'non-select', reason: 'Only SELECT statements are supported' },
      ],
    });
  }

  const headAst = head as Record<string, unknown>;
  if (headAst.type !== 'select') {
    return emptyResult({
      unsupportedConstructs: [
        ...unsupported,
        { kind: 'non-select', reason: 'Only SELECT statements are supported' },
      ],
    });
  }

  const result = walkSelect(headAst);
  // Prepend any multi-statement warning we recorded above.
  if (unsupported.length > 0) {
    result.unsupportedConstructs = [...unsupported, ...result.unsupportedConstructs];
  }
  return result;
}

// Re-export inference result type so Plan 02 can import from a single module.
export type { ChartInferenceResult };
