/**
 * Phase 36 Plan 04 — isSameDefinition helper.
 *
 * A small discriminator-aware structural equality check for `ChartDefinition`.
 * Used by PresetMenu to render a `✓` against the preset row whose stored
 * definition matches the currently-applied ChartDefinition.
 *
 * Version differences between same-discriminator variants are NOT equal by
 * design — variants are version-locked (e.g. a future `collection-curve` v3
 * could carry new fields and must not falsely match v2).
 *
 * Pure helper — no imports from `/components`. Safe to use from any layer.
 */

import type { ChartDefinition } from '../views/types';

/** Deep-equals for ChartDefinition (variant-aware). */
export function isSameDefinition(
  a: ChartDefinition,
  b: ChartDefinition,
): boolean {
  if (a.type !== b.type) return false;
  if (a.version !== b.version) return false;

  if (a.type === 'collection-curve' && b.type === 'collection-curve') {
    if (a.metric !== b.metric) return false;
    if (a.showAverage !== b.showAverage) return false;
    if (a.showAllBatches !== b.showAllBatches) return false;
    const aSorted = [...a.hiddenBatches].sort();
    const bSorted = [...b.hiddenBatches].sort();
    return JSON.stringify(aSorted) === JSON.stringify(bSorted);
  }

  // Line / scatter / bar all share the { x, y } axis-ref shape.
  if (
    (a.type === 'line' || a.type === 'scatter' || a.type === 'bar') &&
    (b.type === 'line' || b.type === 'scatter' || b.type === 'bar')
  ) {
    const aX = a.x?.column ?? null;
    const bX = b.x?.column ?? null;
    const aY = a.y?.column ?? null;
    const bY = b.y?.column ?? null;
    return aX === bX && aY === bY;
  }

  return false;
}
