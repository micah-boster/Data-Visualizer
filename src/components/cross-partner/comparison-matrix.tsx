'use client';

import { useMemo, useState, useCallback } from 'react';
import { ArrowLeftRight, Grid3X3, BarChart3, Table, Info } from 'lucide-react';
import { DataPanel } from '@/components/patterns/data-panel';
import { ToolbarDivider } from '@/components/patterns/toolbar-divider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import type { PercentileRanks } from '@/types/partner-stats';
import { MATRIX_METRICS, polarityForMatrixMetric } from './matrix-types';
import type { Orientation, SortDirection } from './matrix-types';
import { MatrixHeatmap } from './matrix-heatmap';
import { MatrixBarRanking } from './matrix-bar-ranking';
import { MatrixPlainTable } from './matrix-plain-table';

type ViewMode = 'heatmap' | 'bar' | 'plain';

const VIEW_MODES: { key: ViewMode; label: string; Icon: typeof Grid3X3 }[] = [
  { key: 'heatmap', label: 'Heatmap', Icon: Grid3X3 },
  { key: 'bar', label: 'Bar', Icon: BarChart3 },
  { key: 'plain', label: 'Table', Icon: Table },
];

export function PartnerComparisonMatrix() {
  const { crossPartnerData } = useCrossPartnerContext();
  // Wave 0 fix: default to bar mode. Length/position is the strongest
  // perceptual channel for quantitative comparison; color hue (heatmap) is
  // the weakest. Heatmap remains available as a one-click toggle for the
  // dense-overview use case.
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [orientation, setOrientation] = useState<Orientation>('partners-as-rows');
  const [sortMetric, setSortMetric] = useState<keyof PercentileRanks>('perDollarPlacedRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Phase 41-03 (DCR-09): when the user picks a new metric, the default sort
  // direction is "best first" — descending for higher_is_better / neutral
  // (largest at top), ascending for lower_is_better (lowest dispute rate at
  // top). The user can still flip direction via the header chevron; this
  // only changes the FIRST direction after a metric switch so the default
  // reading shows the "best partner" at the top regardless of polarity.
  const handleSort = useCallback(
    (metricKey: keyof PercentileRanks) => {
      if (metricKey === sortMetric) {
        setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        const metric = MATRIX_METRICS.find((m) => m.key === metricKey);
        const polarity = metric ? polarityForMatrixMetric(metric) : 'higher_is_better';
        setSortMetric(metricKey);
        setSortDirection(polarity === 'lower_is_better' ? 'asc' : 'desc');
      }
    },
    [sortMetric],
  );

  const sortedPartners = useMemo(() => {
    if (!crossPartnerData) return [];
    const metric = MATRIX_METRICS.find((m) => m.key === sortMetric) ?? MATRIX_METRICS[0];
    return [...crossPartnerData.rankedPartners].sort((a, b) => {
      const diff = metric.getValue(b) - metric.getValue(a);
      return sortDirection === 'desc' ? diff : -diff;
    });
  }, [crossPartnerData, sortMetric, sortDirection]);

  if (!crossPartnerData || crossPartnerData.rankedPartners.length < 2) {
    return null;
  }

  const viewProps = {
    partners: sortedPartners,
    metrics: MATRIX_METRICS,
    orientation,
    sortMetric,
    sortDirection,
    onSort: handleSort,
  };

  // DataPanel gap noted for 29-SUMMARY: SectionHeader's title slot is plain
  // text only — this panel has an inline info-tooltip + partner-count meta
  // cluster next to the title. Carrying that through SectionHeader would
  // require a title-adjacent slot. Workaround: render the meta cluster at
  // the top of the content slot (above the matrix views). Keeps
  // SectionHeader unchanged per CONTEXT rule "extend only on concrete gap".
  return (
    <DataPanel
      title="Partner Comparison"
      className="shrink-0"
      actions={
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          {VIEW_MODES.map(({ key, label, Icon }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode(key)}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="ml-1">{label}</span>
            </Button>
          ))}

          {/* Orientation toggle (not for bar mode) */}
          {viewMode !== 'bar' && (
            <>
              <ToolbarDivider />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  setOrientation((o) =>
                    o === 'partners-as-rows' ? 'metrics-as-rows' : 'partners-as-rows',
                  )
                }
                title="Swap rows/columns"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-1.5 mb-stack">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="cursor-help">
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px]">
              <p className="text-caption">
                Compare key metrics across all partners — view as heatmap, bar ranking, or plain table.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-caption text-muted-foreground/60">
          {sortedPartners.length} partners
        </span>
      </div>
      <div
        role="img"
        aria-label={`Partner comparison matrix: ${sortedPartners.length} partners across ${MATRIX_METRICS.length} metrics, view mode ${viewMode}. Sibling data table provides the same data in accessible tabular form.`}
      >
        {viewMode === 'heatmap' && <MatrixHeatmap {...viewProps} />}
        {viewMode === 'bar' && <MatrixBarRanking {...viewProps} />}
        {viewMode === 'plain' && <MatrixPlainTable {...viewProps} />}
      </div>
    </DataPanel>
  );
}
