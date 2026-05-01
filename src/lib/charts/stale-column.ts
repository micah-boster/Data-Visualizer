/**
 * Phase 36 Plan 03 — resolveColumnWithFallback
 *
 * Pure helper shared by the GenericChart renderer AND Plan 36-05's ChartPanel:
 * given a requested axis ref from a stored `ChartDefinition`, return the
 * `ColumnConfig` the chart should render against plus a `stale` flag signalling
 * whether the stored ref no longer matches the live COLUMN_CONFIGS /
 * eligibility rules.
 *
 * Pitfall 3 lock (36-RESEARCH): this function is READ-ONLY. It NEVER mutates
 * `ChartDefinition` and NEVER dispatches `onDefinitionChange`. The renderer
 * surfaces the stale flag via ChartFrame's title-row stale-columns chip
 * (Phase 43 BND-05 — absorbed the prior `StaleColumnWarning` standalone
 * banner), and the user's explicit toolbar pick (landed by Plan 36-04) is
 * what eventually overwrites the stale ref. Auto-healing would turn every
 * render into a save and smear the user's explicit choice across re-renders.
 *
 * Contract:
 * - `requested === null` → `null`. Caller renders EmptyState (axis not picked).
 * - `requested.column` found AND eligible  → `{ config: found, stale: false }`.
 * - `requested.column` found BUT not eligible (e.g. numeric column after a
 *   switch to bar-X which wants categorical) → treated as stale; falls back to
 *   the first eligible column.
 * - `requested.column` not in COLUMN_CONFIGS → same stale-with-fallback path.
 * - No eligible column exists for (chartType, axis) → `null`.
 */

import { COLUMN_CONFIGS, type ColumnConfig } from '../columns/config.ts';
import {
  getEligibleColumns,
  isColumnEligible,
  type ChartTypeForAxis,
  type AxisRole,
} from '../columns/axis-eligibility.ts';

export interface ResolvedColumn {
  config: ColumnConfig;
  stale: boolean;
  requested: string | null;
}

/**
 * Phase 39 PCFG-07 — sentinel-key prefix recognized as "intentionally not in
 * COLUMN_CONFIGS." Keys starting with `__` are virtual-axis sentinels (e.g.
 * `__SEGMENT__` from segment-split.ts) — they ride through ChartDefinition
 * unchanged and the renderer (GenericChart) handles them as synthetic
 * categorical columns. The stale-column resolver MUST NOT flag them as
 * stale; doing so would cause the resolver to silently swap the user's
 * picked sentinel for whatever the first eligible registry column happens
 * to be, breaking segment-split mode.
 *
 * Callers (GenericChart) typically short-circuit BEFORE calling this
 * function when they detect the sentinel, but we defense-in-depth here so
 * any future caller path is safe by default.
 */
const SENTINEL_KEY_PREFIX = '__';

export function resolveColumnWithFallback(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
  requested: { column: string } | null,
): ResolvedColumn | null {
  if (requested === null) return null;

  const requestedKey = requested.column;

  // Phase 39 PCFG-07 — sentinel keys (e.g. __SEGMENT__) are valid by design,
  // never stale. Caller is responsible for synthesizing a ColumnConfig.
  if (requestedKey.startsWith(SENTINEL_KEY_PREFIX)) {
    return null;
  }

  const found = COLUMN_CONFIGS.find((c) => c.key === requestedKey);

  if (found && isColumnEligible(chartType, axis, requestedKey)) {
    return { config: found, stale: false, requested: requestedKey };
  }

  // Stale path: key missing from registry OR key present but ineligible for
  // this (chartType, axis) slot.
  const eligible = getEligibleColumns(chartType, axis);
  const fallback = eligible[0];
  if (!fallback) return null;

  return { config: fallback, stale: true, requested: requestedKey };
}
