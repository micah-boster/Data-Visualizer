'use client';

/**
 * Phase 36.x — unified chart-type segmented control.
 *
 * Four icons (collection-curve / line / scatter / bar) always visible on the
 * chart panel. Treats Collection Curves as a first-class chart type alongside
 * the generic variants. Pure presentational — parent owns the dispatch:
 *
 *   <ChartTypeSegmentedControl
 *     activeType={definition.type}
 *     onTypeClick={(next) => onDefinitionChange(switchChartType(definition, next))}
 *   />
 *
 * Used in two places:
 *   - ChartBuilderToolbar (generic branch — replaces inline segmented control).
 *   - ChartPanel (preset branch — rendered alongside CollectionCurveChart's
 *     metric-toggle cluster).
 */

import { ChartSpline, LineChart, ScatterChart, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChartDefinition } from '@/lib/views/types';

type AllChartType = ChartDefinition['type'];

const TYPE_OPTIONS: ReadonlyArray<{
  type: AllChartType;
  Icon: typeof LineChart;
  label: string;
}> = [
  { type: 'collection-curve', Icon: ChartSpline, label: 'Collection Curves' },
  { type: 'line', Icon: LineChart, label: 'Line chart' },
  { type: 'scatter', Icon: ScatterChart, label: 'Scatter chart' },
  { type: 'bar', Icon: BarChart3, label: 'Bar chart' },
];

interface ChartTypeSegmentedControlProps {
  activeType: AllChartType;
  onTypeClick: (nextType: AllChartType) => void;
}

export function ChartTypeSegmentedControl({
  activeType,
  onTypeClick,
}: ChartTypeSegmentedControlProps) {
  return (
    <div className="flex items-center" role="group" aria-label="Chart type">
      {TYPE_OPTIONS.map(({ type, Icon, label }) => {
        const active = activeType === type;
        return (
          <Button
            key={type}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onTypeClick(type)}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        );
      })}
    </div>
  );
}
