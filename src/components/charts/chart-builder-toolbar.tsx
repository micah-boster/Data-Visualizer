'use client';

/**
 * Phase 36 Plan 04 — inline chart builder toolbar (generic branch).
 *
 * Composes the shared ChartTypeSegmentedControl (Phase 36.x — also rendered on
 * the preset branch inside ChartPanel) with X/Y axis pickers. Only mounted on
 * the generic branch; the preset branch renders the segmented control on its
 * own next to CollectionCurveChart's metric-toggle cluster.
 *
 * Pure props-in / onChange-out: the toolbar never owns chart state — parent
 * receives a new ChartDefinition on every interaction and decides what to do
 * with it (Plan 36-05 wires this into ChartPanel).
 *
 * Layout recipe (Phase 26 semantic gap tokens + Phase 27 type tokens):
 *   - Outer row: flex items-center gap-inline.
 *   - Segmented control delegated to ChartTypeSegmentedControl.
 *   - ToolbarDivider between the segmented control and the X picker.
 *   - External `.text-label` X/Y labels sit next to their pickers — the
 *     picker's own placeholder is plain "Pick column" (no `X:`/`Y:` prefix).
 */

import { ToolbarDivider } from '@/components/patterns/toolbar-divider';
import { AxisPicker, type SyntheticAxisOption } from './axis-picker';
import { ChartTypeSegmentedControl } from './chart-type-segmented-control';
import { switchChartType } from '@/lib/charts/transitions';
import { usePartnerConfigContext } from '@/contexts/partner-config';
import { SEGMENT_VIRTUAL_COLUMN } from '@/lib/partner-config/segment-split';
import type {
  ChartDefinition,
  GenericChartDefinition,
} from '@/lib/views/types';

interface ChartBuilderToolbarProps {
  /**
   * The active generic chart definition. Plan 36-05's ChartPanel hides this
   * component entirely when `definition.type === 'collection-curve'` — the
   * preset carries its own control surface.
   */
  definition: GenericChartDefinition;
  /**
   * Receives a fresh ChartDefinition on every interaction. Kept as
   * `ChartDefinition` (not narrowed) because `switchChartType` may return
   * the collection-curve preset when the user clicks a locked segmented-
   * control slot (future; not wired here) — parent decides how to route.
   */
  onChange: (next: ChartDefinition) => void;
}

export function ChartBuilderToolbar({
  definition,
  onChange,
}: ChartBuilderToolbarProps) {
  function handleTypeClick(nextType: ChartDefinition['type']) {
    onChange(switchChartType(definition, nextType));
  }

  function handleXChange(next: { column: string } | null) {
    onChange({ ...definition, x: next } as ChartDefinition);
  }

  function handleYChange(next: { column: string } | null) {
    onChange({ ...definition, y: next } as ChartDefinition);
  }

  function handleSeriesChange(next: { column: string } | null) {
    onChange({ ...definition, series: next } as ChartDefinition);
  }

  // Phase 36.x — all three generic variants expose a series picker, but the
  // label differs to reflect each chart's semantics:
  //   - line / bar: "Series" — splits rows into color-coded groups.
  //   - scatter:   "Label"  — identifies each point by this column (shown
  //     on hover via the tooltip; also drives per-point color).
  const currentSeries =
    'series' in definition && definition.series ? definition.series : null;
  const seriesPickerLabel =
    definition.type === 'scatter' ? 'Label' : 'Series';

  // Phase 39 PCFG-07 — Segment synthetic option for the series axis. Enabled
  // when ANY pair has segments configured. When no pairs have segments, the
  // option still renders (so users discover the feature) but is disabled with
  // a tooltip explaining how to enable it.
  const partnerConfig = usePartnerConfigContext();
  const hasAnySegments = partnerConfig.configs.some(
    (c) => c.segments.length > 0,
  );
  const seriesSyntheticOptions: SyntheticAxisOption[] = [
    {
      column: SEGMENT_VIRTUAL_COLUMN,
      label: 'Segment (from partner config)',
      caption: 'Auto-grouped by per-pair segment rules',
      disabled: !hasAnySegments,
      disabledReason:
        'No segments configured — use the Setup UI on a partner to define segments.',
    },
  ];

  return (
    <div className="flex items-center gap-inline">
      <ChartTypeSegmentedControl
        activeType={definition.type}
        onTypeClick={handleTypeClick}
      />

      <ToolbarDivider />

      <span className="text-label text-muted-foreground">X</span>
      <AxisPicker
        chartType={definition.type}
        axis="x"
        value={definition.x}
        onChange={handleXChange}
        placeholder="Pick column"
      />

      <span className="text-label text-muted-foreground">Y</span>
      <AxisPicker
        chartType={definition.type}
        axis="y"
        value={definition.y}
        onChange={handleYChange}
        placeholder="Pick column"
      />

      <span className="text-label text-muted-foreground">{seriesPickerLabel}</span>
      <AxisPicker
        chartType={definition.type}
        axis="series"
        value={currentSeries}
        onChange={handleSeriesChange}
        placeholder="None"
        syntheticOptions={seriesSyntheticOptions}
      />
    </div>
  );
}
