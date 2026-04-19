/**
 * Phase 35 — lazy-on-read migration for ChartDefinition.
 *
 * Invoked from a single site (sanitizeSnapshot in useSavedViews), this pure
 * function accepts any stored chartState payload (unknown at parse time thanks
 * to the schema's `z.unknown().optional()` relaxation — see 35-RESEARCH §Pitfall
 * 1) and returns a valid `ChartDefinition | undefined`.
 *
 * Contract:
 * - Idempotent: re-running on a v2 record returns an equivalent v2 record.
 * - Legacy detection: objects with a `metric` field but no `type` are treated
 *   as pre-Phase-35 `ChartViewState` records and rewrapped.
 * - Failure fallback: any unrecoverable shape falls back to
 *   `DEFAULT_COLLECTION_CURVE` and emits a single `console.warn` with the
 *   stable `[chartState migration]` prefix (Pitfall 4).
 *
 * CHRT-02 contract is locked in `migrate-chart.smoke.ts`.
 */

import { chartDefinitionSchema } from './schema.ts';
import type { ChartDefinition, CollectionCurveDefinition } from './types.ts';

/**
 * Legacy pre-Phase-35 shape. Kept PRIVATE to this module — CONTEXT lock:
 * "legacy shape lives as an inline/private type inside the migration function,
 * not exported".
 */
type LegacyChartState = {
  metric: 'recoveryRate' | 'amount';
  hiddenBatches?: string[];
  showAverage?: boolean;
  showAllBatches?: boolean;
};

/**
 * Default fallback used when migration cannot recover a legacy record.
 * Exported so the smoke test and future consumers can reference the exact
 * shape without duplicating the literal.
 */
export const DEFAULT_COLLECTION_CURVE: CollectionCurveDefinition = {
  type: 'collection-curve',
  version: 2,
  metric: 'recoveryRate',
  hiddenBatches: [],
  showAverage: true,
  showAllBatches: false,
};

/**
 * Migrate a stored chartState value (possibly legacy, possibly v2, possibly
 * garbage) to a valid `ChartDefinition`. Returns `undefined` when the input
 * was itself `undefined`/`null` (view had no chart state to begin with).
 */
export function migrateChartState(input: unknown): ChartDefinition | undefined {
  if (input === undefined || input === null) return undefined;

  if (typeof input !== 'object') {
    console.warn('[chartState migration] non-object payload, falling back', input);
    return DEFAULT_COLLECTION_CURVE;
  }

  // Already v2 — revalidate (Pitfall 5 idempotency guard) and pass through.
  if ('type' in input && 'version' in input) {
    const parsed = chartDefinitionSchema.safeParse(input);
    if (parsed.success) return parsed.data;
    console.warn(
      '[chartState migration] v2 record failed revalidation, falling back',
      input,
    );
    return DEFAULT_COLLECTION_CURVE;
  }

  // Legacy detection: object with `metric` but no `type`/`version` discriminator.
  if ('metric' in input) {
    const legacy = input as LegacyChartState;
    const candidate: CollectionCurveDefinition = {
      type: 'collection-curve',
      version: 2,
      metric: legacy.metric,
      hiddenBatches: legacy.hiddenBatches ?? [],
      showAverage: legacy.showAverage ?? true,
      showAllBatches: legacy.showAllBatches ?? false,
    };
    const parsed = chartDefinitionSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    console.warn(
      '[chartState migration] legacy record missing required fields, falling back',
      input,
    );
    return DEFAULT_COLLECTION_CURVE;
  }

  console.warn('[chartState migration] unrecognized shape, falling back', input);
  return DEFAULT_COLLECTION_CURVE;
}
