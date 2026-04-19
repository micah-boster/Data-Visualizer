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
 * surfaces the stale flag via `StaleColumnWarning`, and the user's explicit
 * toolbar pick (landed by Plan 36-04) is what eventually overwrites the stale
 * ref. Auto-healing would turn every render into a save and smear the user's
 * explicit choice across re-renders.
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

export function resolveColumnWithFallback(
  chartType: ChartTypeForAxis,
  axis: AxisRole,
  requested: { column: string } | null,
): ResolvedColumn | null {
  if (requested === null) return null;

  const requestedKey = requested.column;
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
