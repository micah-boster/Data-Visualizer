'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { DataPanel } from '@/components/patterns/data-panel';
import { Button } from '@/components/ui/button';
import { CHART_COLORS } from '@/components/charts/curve-tooltip';
import { NumericTick } from '@/components/charts/numeric-tick';
import { COLLECTION_MONTHS } from '@/lib/computation/reshape-curves';
import { useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import type { CrossPartnerEntry, CurvePoint } from '@/types/partner-stats';
import { TrajectoryTooltip } from './trajectory-tooltip';
import { TrajectoryLegend } from './trajectory-legend';

type CurveMode = 'dollarWeighted' | 'equalWeight';

/** Pivot cross-partner curves into Recharts flat format */
function pivotTrajectoryData(
  partners: CrossPartnerEntry[],
  portfolioAvg: CurvePoint[],
  bestInClass: { name: string; curve: CurvePoint[] } | null,
  curveMode: CurveMode,
): Record<string, number | undefined>[] {
  const months = [...COLLECTION_MONTHS];
  return months.map((month) => {
    const point: Record<string, number | undefined> = { month };
    for (const p of partners) {
      const cp = p.averageCurve[curveMode].find((c) => c.month === month);
      if (cp) point[p.partnerName] = cp.recoveryRate;
    }
    // Portfolio average reference line
    const avgPt = portfolioAvg.find((c) => c.month === month);
    if (avgPt) point.__portfolioAvg__ = avgPt.recoveryRate;
    // Best-in-class reference line
    if (bestInClass) {
      const bestPt = bestInClass.curve.find((c) => c.month === month);
      if (bestPt) point.__bestInClass__ = bestPt.recoveryRate;
    }
    return point;
  });
}

export function CrossPartnerTrajectoryChart() {
  const { crossPartnerData } = useCrossPartnerContext();
  const [hiddenPartners, setHiddenPartners] = useState<Set<string>>(new Set());
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null);
  const [curveMode, setCurveMode] = useState<CurveMode>('dollarWeighted');

  // Sorted partner list and color assignment (deterministic by name)
  const { sortedPartners, colorMap } = useMemo(() => {
    if (!crossPartnerData) return { sortedPartners: [], colorMap: new Map<string, string>() };
    const sorted = [...crossPartnerData.rankedPartners].sort((a, b) =>
      a.partnerName.localeCompare(b.partnerName),
    );
    const cMap = new Map<string, string>();
    sorted.forEach((p, i) => {
      cMap.set(p.partnerName, CHART_COLORS[i % CHART_COLORS.length]);
    });
    return { sortedPartners: sorted, colorMap: cMap };
  }, [crossPartnerData]);

  // Determine best-in-class partner (highest perDollarPlacedRate)
  // Suppress when there's only 1 partner — best-in-class would be that same
  // partner, rendering a duplicate line on top of itself.
  const bestInClass = useMemo(() => {
    if (!crossPartnerData || crossPartnerData.rankedPartners.length < 2) return null;
    const best = [...crossPartnerData.rankedPartners].sort(
      (a, b) => b.perDollarPlacedRate - a.perDollarPlacedRate,
    )[0];
    return { name: best.partnerName, curve: best.averageCurve[curveMode] };
  }, [crossPartnerData, curveMode]);

  // Pivot data for Recharts
  const pivotedData = useMemo(() => {
    if (!crossPartnerData) return [];
    return pivotTrajectoryData(
      sortedPartners,
      crossPartnerData.portfolioAverageCurve[curveMode],
      bestInClass,
      curveMode,
    );
  }, [crossPartnerData, sortedPartners, bestInClass, curveMode]);

  // Chart config for shadcn ChartContainer
  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    sortedPartners.forEach((p) => {
      cfg[p.partnerName] = {
        label: p.partnerName,
        color: colorMap.get(p.partnerName) ?? 'var(--muted-foreground)',
      };
    });
    cfg.__portfolioAvg__ = { label: 'Portfolio Avg', color: 'var(--muted-foreground)' };
    if (bestInClass) {
      cfg.__bestInClass__ = { label: `Best-in-class (${bestInClass.name})`, color: 'var(--foreground)' };
    }
    return cfg;
  }, [sortedPartners, colorMap, bestInClass]);

  const togglePartner = useCallback((name: string) => {
    setHiddenPartners((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  if (!crossPartnerData || crossPartnerData.rankedPartners.length === 0) {
    return null;
  }

  const partnerNames = sortedPartners.map((p) => p.partnerName);

  return (
    <DataPanel
      title="Collection Trajectories"
      className="shrink-0"
      contentClassName="space-y-2"
      actions={
        <div className="flex gap-1">
          <Button
            variant={curveMode === 'dollarWeighted' ? 'default' : 'outline'}
            size="sm"
            className="h-7"
            onClick={curveMode === 'dollarWeighted' ? undefined : () => setCurveMode('dollarWeighted')}
          >
            $ Weighted
          </Button>
          <Button
            variant={curveMode === 'equalWeight' ? 'default' : 'outline'}
            size="sm"
            className="h-7"
            onClick={curveMode === 'equalWeight' ? undefined : () => setCurveMode('equalWeight')}
          >
            Equal Weight
          </Button>
        </div>
      }
    >
        <ChartContainer
          config={chartConfig}
          className="h-[45vh] w-full"
          role="img"
          aria-label={`Cross-partner collection trajectory: recovery rate across batches for ${sortedPartners.length} ${sortedPartners.length === 1 ? 'partner' : 'partners'}${bestInClass ? `, best-in-class ${bestInClass.name}` : ''}. Sibling data table provides the same data in accessible tabular form.`}
        >
          <LineChart
            data={pivotedData}
            margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="month"
              ticks={[...COLLECTION_MONTHS]}
              domain={[1, 'dataMax']}
              tickFormatter={(m: number) => `${m}`}
              tick={<NumericTick />}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              width={45}
              tick={<NumericTick anchor="end" dy={4} />}
              label={{
                value: 'Recovery Rate %',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                style: { fontSize: 11, fill: 'var(--muted-foreground)' },
              }}
            />
            <Tooltip
              content={
                <TrajectoryTooltip
                  colorMap={colorMap}
                  hoveredPartner={hoveredPartner}
                />
              }
            />

            {/* Partner lines */}
            {sortedPartners.map((p) => {
              const isHidden = hiddenPartners.has(p.partnerName);
              const isHovered = hoveredPartner === p.partnerName;
              const isDimmed = hoveredPartner !== null && !isHovered;
              return (
                <Line
                  key={p.partnerName}
                  dataKey={p.partnerName}
                  type="monotone"
                  stroke={colorMap.get(p.partnerName)}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeOpacity={isDimmed ? 0.15 : 1}
                  dot={false}
                  activeDot={{ r: 4, cursor: 'pointer' }}
                  hide={isHidden}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={800}
                  onMouseEnter={() => setHoveredPartner(p.partnerName)}
                  onMouseLeave={() => setHoveredPartner(null)}
                />
              );
            })}

            {/* Portfolio average reference line */}
            <Line
              dataKey="__portfolioAvg__"
              stroke="var(--muted-foreground)"
              strokeDasharray="8 4"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={true}
            />

            {/* Best-in-class reference line */}
            {bestInClass && (
              <Line
                dataKey="__bestInClass__"
                stroke="var(--foreground)"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={true}
              />
            )}
          </LineChart>
        </ChartContainer>
        <p className="text-center text-caption text-muted-foreground -mt-1">
          Months Since Placement
        </p>
        <TrajectoryLegend
          partners={partnerNames}
          colorMap={colorMap}
          hiddenPartners={hiddenPartners}
          bestPartnerName={bestInClass?.name ?? null}
          onTogglePartner={togglePartner}
        />
    </DataPanel>
  );
}
