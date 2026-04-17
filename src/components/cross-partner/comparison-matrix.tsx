'use client';

import { useMemo, useState, useCallback } from 'react';
import { ArrowLeftRight, Grid3X3, BarChart3, Table, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import type { PercentileRanks } from '@/types/partner-stats';
import { MATRIX_METRICS } from './matrix-types';
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
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [orientation, setOrientation] = useState<Orientation>('partners-as-rows');
  const [sortMetric, setSortMetric] = useState<keyof PercentileRanks>('perDollarPlacedRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback(
    (metricKey: keyof PercentileRanks) => {
      if (metricKey === sortMetric) {
        setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortMetric(metricKey);
        setSortDirection('desc');
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

  return (
    <Card className="shrink-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-title text-muted-foreground">
            Partner Comparison
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-help">
                <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[240px]">
                <p className="text-caption">Compare key metrics across all partners — view as heatmap, bar ranking, or plain table.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-caption text-muted-foreground/60">
            {sortedPartners.length} partners
          </span>
        </div>
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
              <span className="mx-1 h-4 w-px bg-border" />
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
      </CardHeader>
      <CardContent className="pt-0">
        {viewMode === 'heatmap' && <MatrixHeatmap {...viewProps} />}
        {viewMode === 'bar' && <MatrixBarRanking {...viewProps} />}
        {viewMode === 'plain' && <MatrixPlainTable {...viewProps} />}
      </CardContent>
    </Card>
  );
}
