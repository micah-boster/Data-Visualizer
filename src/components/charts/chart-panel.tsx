'use client';

/**
 * Phase 36 Plan 05 — ChartPanel dispatcher.
 *
 * Thin dispatcher that routes between the preset branch (CollectionCurveChart)
 * and the generic branch (GenericChart + ChartBuilderToolbar). The
 * ChartBuilderToolbar is hidden on the preset branch by design (CONTEXT lock —
 * the preset owns its own control surface); it appears only on the generic
 * branch. PresetMenu is rendered on BOTH branches so the Collection Curves
 * preset is always reachable from any chart (36-RESEARCH Open Q #4).
 *
 * State ownership: ChartPanel does NOT own `definition` — parent
 * (data-display.tsx) owns it via `useState<ChartDefinition>`. This keeps the
 * dispatcher a pure props-in / onChange-out shell.
 *
 * Pitfall 9 (preset sync): when a preset is applied while already on the
 * preset branch, the new definition needs to be routed through `chartLoadRef`
 * so the internal `useCurveChartState` hook re-reads metric / hiddenBatches /
 * showAverage / showAllBatches. `handlePresetApply` performs the sync before
 * calling the parent dispatch.
 */

import type { MutableRefObject, ReactNode } from 'react';
import { CollectionCurveChart } from './collection-curve-chart';
import { GenericChart } from './generic-chart';
import { ChartBuilderToolbar } from './chart-builder-toolbar';
import { ChartTypeSegmentedControl } from './chart-type-segmented-control';
import { PresetMenu } from './preset-menu';
import { DataPanel } from '@/components/patterns/data-panel';
import { switchChartType } from '@/lib/charts/transitions';
import type {
  ChartDefinition,
  CollectionCurveDefinition,
  GenericChartDefinition,
} from '@/lib/views/types';
import type { BatchCurve } from '@/types/partner-stats';
import type { BatchRow } from '@/lib/data/types';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
import type { DrillLevel } from '@/hooks/use-drill-down';
import type { BaselineMode } from '@/components/kpi/baseline-selector';

const TITLE_BY_TYPE: Record<GenericChartDefinition['type'], string> = {
  line: 'Line Chart',
  scatter: 'Scatter Plot',
  bar: 'Bar Chart',
};

export interface ChartPanelProps {
  /** Parent-owned chart definition (collection-curve preset OR a generic variant). */
  definition: ChartDefinition;
  /** Parent-owned dispatcher. ChartPanel forwards toolbar / preset-menu changes through this. */
  onDefinitionChange: (next: ChartDefinition) => void;
  /** Row source for the generic renderer — passed through to GenericChart. */
  rows: Array<Record<string, unknown>>;
  /**
   * Phase 43 BND-02 — typed pair-filtered rows for the preset renderer's
   * split-by-segment toggle. Sourced from `partnerStats.rawRows` upstream
   * (already pair-filtered + typed). Optional: when absent (root scope or
   * batch drill), the segment toggle simply doesn't appear. The legacy
   * `rows` prop continues to feed GenericChart's row-prep pipeline, which
   * keys on raw Snowflake column names — those two surfaces split here.
   */
  typedRows?: BatchRow[];
  /** Curve source for the preset renderer — passed through to CollectionCurveChart. */
  curves?: BatchCurve[];
  /** Snapshot ref wired by CollectionCurveChart on the preset branch. */
  chartSnapshotRef?: MutableRefObject<(() => CollectionCurveDefinition) | null>;
  /** Restore ref wired by CollectionCurveChart on the preset branch. */
  chartLoadRef?: MutableRefObject<((state: CollectionCurveDefinition) => void) | null>;
  /**
   * Phase 39 PCFG-07 — active (partner, product) pair, or null at root level.
   * Threaded through to CollectionCurveChart (split-by-segment toggle) and
   * GenericChart (Chart Builder's Segment series option).
   */
  pair?: PartnerProductPair | null;
  /**
   * Phase 40.1 PRJ-09 — current drill level. Forwarded verbatim to
   * CollectionCurveChart on the preset branch to gate projection visibility.
   * Generic branch ignores this prop — generic charts have no projection.
   */
  drillLevel?: DrillLevel;
  /**
   * Phase 40.1 PRJ-09 / PRJ-13 — current baseline mode. Forwarded verbatim
   * to CollectionCurveChart on the preset branch. Generic branch ignores.
   */
  baselineMode?: BaselineMode;
}

export function ChartPanel({
  definition,
  onDefinitionChange,
  rows,
  typedRows,
  curves,
  chartSnapshotRef,
  chartLoadRef,
  pair,
  drillLevel,
  baselineMode,
}: ChartPanelProps): ReactNode {
  /**
   * Pitfall 9 — when the user applies a preset via PresetMenu while already on
   * the preset branch, the outer `definition` updates to the new preset
   * shape (type: 'collection-curve' with fresh metric / hiddenBatches / etc.),
   * but the internal `useCurveChartState` hook inside CollectionCurveChart
   * owns its own state copy and would ignore the prop change. We synchronize
   * by calling `chartLoadRef.current(next)` BEFORE the parent dispatch — that
   * pipes the new state directly into the hook.
   */
  function handlePresetApply(next: ChartDefinition) {
    if (next.type === 'collection-curve' && chartLoadRef?.current) {
      chartLoadRef.current(next);
    }
    onDefinitionChange(next);
  }

  // Unified chart-type selector — rendered on BOTH branches (Phase 36.x).
  // On the preset branch it appears in CollectionCurveChart's actions slot so
  // the user can switch to a generic chart without opening the Presets menu.
  function handleTypeClick(nextType: ChartDefinition['type']) {
    onDefinitionChange(switchChartType(definition, nextType));
  }

  if (definition.type === 'collection-curve') {
    return (
      <CollectionCurveChart
        curves={curves ?? []}
        chartSnapshotRef={chartSnapshotRef}
        chartLoadRef={chartLoadRef}
        pair={pair ?? null}
        rawRows={typedRows}
        drillLevel={drillLevel}
        baselineMode={baselineMode}
        chartTypeSelector={
          <ChartTypeSegmentedControl
            activeType={definition.type}
            onTypeClick={handleTypeClick}
          />
        }
        presetMenu={
          <PresetMenu
            definition={definition}
            onDefinitionChange={handlePresetApply}
          />
        }
      />
    );
  }

  // Generic branch (line / scatter / bar).
  return (
    <DataPanel
      title={TITLE_BY_TYPE[definition.type]}
      actions={
        <div className="flex items-center gap-inline">
          <ChartBuilderToolbar
            definition={definition}
            onChange={onDefinitionChange}
          />
          <PresetMenu
            definition={definition}
            onDefinitionChange={onDefinitionChange}
          />
        </div>
      }
    >
      <GenericChart
        definition={definition}
        rows={rows}
        onDefinitionChange={onDefinitionChange}
        pair={pair ?? null}
      />
    </DataPanel>
  );
}
