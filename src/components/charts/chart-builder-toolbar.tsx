'use client';

/**
 * Phase 36 Plan 04 — inline chart builder toolbar.
 *
 * Renders a line / scatter / bar icon segmented control + X/Y axis pickers.
 * Hidden by Plan 36-05 whenever the collection-curve preset is active
 * (CONTEXT.md:27 — preset keeps its own controls). Props accept only the
 * generic variants; the preset→generic conversion is owned by switchChartType.
 *
 * Pure props-in / onChange-out: the toolbar never owns chart state — parent
 * receives a new ChartDefinition on every interaction and decides what to do
 * with it (Plan 36-05 wires this into ChartPanel).
 *
 * Layout recipe (Phase 26 semantic gap tokens + Phase 27 type tokens):
 *   - Outer row: flex items-center gap-inline.
 *   - Segmented control: icon Buttons inside a flex wrapper.
 *   - ToolbarDivider between the segmented control and the X picker.
 *   - External `.text-label` X/Y labels sit next to their pickers — the
 *     picker's own placeholder is plain "Pick column" (no `X:`/`Y:` prefix).
 */

import { LineChart, ScatterChart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolbarDivider } from '@/components/patterns/toolbar-divider';
import { AxisPicker } from './axis-picker';
import { switchChartType } from '@/lib/charts/transitions';
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

type GenericType = GenericChartDefinition['type'];

const TYPE_OPTIONS: ReadonlyArray<{
  type: GenericType;
  Icon: typeof LineChart;
  label: string;
}> = [
  { type: 'line', Icon: LineChart, label: 'Line chart' },
  { type: 'scatter', Icon: ScatterChart, label: 'Scatter chart' },
  { type: 'bar', Icon: BarChart3, label: 'Bar chart' },
];

export function ChartBuilderToolbar({
  definition,
  onChange,
}: ChartBuilderToolbarProps) {
  function handleTypeClick(nextType: GenericType) {
    onChange(switchChartType(definition, nextType));
  }

  function handleXChange(next: { column: string } | null) {
    onChange({ ...definition, x: next } as ChartDefinition);
  }

  function handleYChange(next: { column: string } | null) {
    onChange({ ...definition, y: next } as ChartDefinition);
  }

  return (
    <div className="flex items-center gap-inline">
      {/* Segmented control — icon-only; aria-pressed carries the active state. */}
      <div className="flex items-center" role="group" aria-label="Chart type">
        {TYPE_OPTIONS.map(({ type, Icon, label }) => {
          const active = definition.type === type;
          return (
            <Button
              key={type}
              type="button"
              variant={active ? 'default' : 'ghost'}
              size="icon-sm"
              aria-label={label}
              aria-pressed={active}
              onClick={() => handleTypeClick(type)}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}
      </div>

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
    </div>
  );
}
