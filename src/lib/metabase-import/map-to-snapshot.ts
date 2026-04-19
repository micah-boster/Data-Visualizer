/**
 * Phase 37 — ParseResult -> Partial<ViewSnapshot> translator.
 *
 * The mapping layer is where the parser's operator-level `MatchedFilter`
 * shape gets normalised to the storage shapes TanStack Table consumes
 * (Pitfall 6): `string[]` for text checklists, `{ min?, max? }` for
 * numeric ranges. Intentionally does NOT mutate the ParseResult — text vs
 * numeric mismatch handling happens here because the parser doesn't know
 * the column type when it classifies filters.
 *
 * Produces only the slices the Plan 03 apply pipeline can accept directly:
 *   - columnOrder  (SELECT order)
 *   - columnVisibility (explicit; mirrors activePreset apply semantics)
 *   - sorting (ORDER BY)
 *   - columnFilters (text/numeric-normalised)
 *   - dimensionFilters (always {} — SQL doesn't distinguish)
 *   - chartState (optional, from inferChart + migrateChartState gate)
 *
 * Deliberately NOT set:
 *   - sourceQuery  → written at Apply time in Plan 03 (where raw SQL +
 *     timestamp are both in scope)
 *   - columnSizing, drill, listId, activePreset, chartsExpanded,
 *     comparisonVisible → preserved from the current view by the caller
 */

import { COLUMN_CONFIGS, DEFAULT_COLUMNS } from '../columns/config.ts';
import { isNumericType } from '../formatting/numbers.ts';
import { migrateChartState } from '../views/migrate-chart.ts';
import type { ViewSnapshot } from '../views/types.ts';
import type { MatchedFilter, ParseResult } from './types.ts';

const configByKey = new Map(COLUMN_CONFIGS.map((c) => [c.key, c]));

/** Build the explicit visibility map. Matched columns -> true, others -> false. */
function buildVisibility(matchedKeys: Set<string>): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  for (const key of DEFAULT_COLUMNS) {
    visibility[key] = matchedKeys.has(key);
  }
  return visibility;
}

/**
 * Translate a single MatchedFilter into its TanStack storage shape. Returns
 * `undefined` when the operator-type combination isn't supported (e.g. IN on
 * a numeric column — the rangeFilter doesn't model a discrete set).
 */
function translateFilter(
  filter: MatchedFilter,
): string[] | { min?: number; max?: number } | undefined {
  const cfg = configByKey.get(filter.columnKey);
  if (!cfg) return undefined;

  if (cfg.type === 'text') {
    switch (filter.operator) {
      case 'eq':
        return [String(filter.value)];
      case 'in':
        return Array.isArray(filter.value)
          ? filter.value.map((v) => String(v))
          : undefined;
      // between / isNull on text columns: parser shouldn't emit these
      // (Task 2 routes non-string BETWEEN bounds to skippedFilters; IS NULL
      // is already skipped). Defensive fall-through.
      default:
        return undefined;
    }
  }

  if (isNumericType(cfg.type)) {
    switch (filter.operator) {
      case 'between': {
        const v = filter.value as { min?: unknown; max?: unknown };
        const range: { min?: number; max?: number } = {};
        if (typeof v?.min === 'number') range.min = v.min;
        if (typeof v?.max === 'number') range.max = v.max;
        return range;
      }
      case 'eq': {
        const n = typeof filter.value === 'number' ? filter.value : Number(filter.value);
        if (!Number.isFinite(n)) return undefined;
        return { min: n, max: n };
      }
      // IN / isNull on numeric columns: no storage shape.
      default:
        return undefined;
    }
  }

  // date / unknown types — no v1 mapping.
  return undefined;
}

/**
 * Build a partial ViewSnapshot from the parser output. The shape is exactly
 * what Plan 03's `handleApplyImport` will merge onto the current view via
 * the existing handleLoadView pipeline.
 */
export function mapToSnapshot(result: ParseResult): Partial<ViewSnapshot> {
  const matchedKeys = new Set(result.matchedColumns.map((c) => c.key));

  const columnOrder = result.matchedColumns.map((c) => c.key);
  const columnVisibility = buildVisibility(matchedKeys);

  const sorting = result.matchedSort.map((s) => ({ id: s.columnKey, desc: s.desc }));

  const columnFilters: Record<string, unknown> = {};
  for (const filter of result.matchedFilters) {
    const shape = translateFilter(filter);
    if (shape === undefined) continue;
    // Skip empty text arrays so downstream filter chips don't render
    // a zero-value selection.
    if (Array.isArray(shape) && shape.length === 0) continue;
    columnFilters[filter.columnKey] = shape;
  }

  const snapshot: Partial<ViewSnapshot> = {
    columnOrder,
    columnVisibility,
    sorting,
    columnFilters,
    dimensionFilters: {},
  };

  // Chart embed — only when inference produced a chart type AND the final
  // candidate passes chartDefinitionSchema via migrateChartState.
  const inferred = result.inferredChart;
  if (inferred.chartType !== null) {
    const candidate = {
      type: inferred.chartType,
      version: 1 as const,
      x: inferred.x ? { column: inferred.x } : null,
      y: inferred.y ? { column: inferred.y } : null,
    };
    const validated = migrateChartState(candidate);
    if (validated) snapshot.chartState = validated;
  }

  return snapshot;
}
