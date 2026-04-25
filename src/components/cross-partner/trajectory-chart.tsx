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
import { pairKey } from '@/lib/partner-config/pair';
import { TrajectoryTooltip } from './trajectory-tooltip';
import { TrajectoryLegend } from './trajectory-legend';

type CurveMode = 'dollarWeighted' | 'equalWeight';

/**
 * Phase 39 PCFG-04 — Recharts series key is the pairKey ("partner::product")
 * so multi-product partners contribute distinct series. Display labels go
 * through the chart config.
 */
function pivotTrajectoryData(
  partners: CrossPartnerEntry[],
  portfolioAvg: CurvePoint[],
  bestInClass: { key: string; curve: CurvePoint[] } | null,
  curveMode: CurveMode,
): Record<string, number | undefined>[] {
  const months = [...COLLECTION_MONTHS];
  return months.map((month) => {
    const point: Record<string, number | undefined> = { month };
    for (const p of partners) {
      const cp = p.averageCurve[curveMode].find((c) => c.month === month);
      if (cp) point[pairKey({ partner: p.partnerName, product: p.product })] = cp.recoveryRate;
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
  // Phase 39 PCFG-04: hidden / hovered tracking switched from partnerName
  // string to pairKey string so multi-product partners are independently
  // toggleable.
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());
  const [hoveredPair, setHoveredPair] = useState<string | null>(null);
  const [curveMode, setCurveMode] = useState<CurveMode>('dollarWeighted');

  // Sorted pair list and color assignment (deterministic by display name)
  const { sortedPairs, colorMap } = useMemo(() => {
    if (!crossPartnerData) return { sortedPairs: [], colorMap: new Map<string, string>() };
    const sorted = [...crossPartnerData.rankedPartners].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
    const cMap = new Map<string, string>();
    sorted.forEach((p, i) => {
      cMap.set(
        pairKey({ partner: p.partnerName, product: p.product }),
        CHART_COLORS[i % CHART_COLORS.length],
      );
    });
    return { sortedPairs: sorted, colorMap: cMap };
  }, [crossPartnerData]);

  // Determine best-in-class pair (highest perDollarPlacedRate)
  // Suppress when there's only 1 ranked pair — best-in-class would be that
  // same pair, rendering a duplicate line on top of itself.
  const bestInClass = useMemo(() => {
    if (!crossPartnerData || crossPartnerData.rankedPartners.length < 2) return null;
    const best = [...crossPartnerData.rankedPartners].sort(
      (a, b) => b.perDollarPlacedRate - a.perDollarPlacedRate,
    )[0];
    return {
      key: pairKey({ partner: best.partnerName, product: best.product }),
      displayName: best.displayName,
      curve: best.averageCurve[curveMode],
    };
  }, [crossPartnerData, curveMode]);

  // Pivot data for Recharts
  const pivotedData = useMemo(() => {
    if (!crossPartnerData) return [];
    return pivotTrajectoryData(
      sortedPairs,
      crossPartnerData.portfolioAverageCurve[curveMode],
      bestInClass,
      curveMode,
    );
  }, [crossPartnerData, sortedPairs, bestInClass, curveMode]);

  // Chart config for shadcn ChartContainer
  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    sortedPairs.forEach((p) => {
      const key = pairKey({ partner: p.partnerName, product: p.product });
      cfg[key] = {
        label: p.displayName,
        color: colorMap.get(key) ?? 'var(--muted-foreground)',
      };
    });
    cfg.__portfolioAvg__ = { label: 'Portfolio Avg', color: 'var(--muted-foreground)' };
    if (bestInClass) {
      cfg.__bestInClass__ = { label: `Best-in-class (${bestInClass.displayName})`, color: 'var(--foreground)' };
    }
    return cfg;
  }, [sortedPairs, colorMap, bestInClass]);

  const togglePair = useCallback((key: string) => {
    setHiddenPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!crossPartnerData || crossPartnerData.rankedPartners.length === 0) {
    return null;
  }

  // Display-name labels for the legend — match key order.
  const legendEntries = sortedPairs.map((p) => ({
    key: pairKey({ partner: p.partnerName, product: p.product }),
    displayName: p.displayName,
  }));

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
          className="h-[clamp(200px,28vh,320px)] w-full"
          role="img"
          aria-label={`Cross-partner collection trajectory: recovery rate across batches for ${sortedPairs.length} ${sortedPairs.length === 1 ? 'pair' : 'pairs'}${bestInClass ? `, best-in-class ${bestInClass.displayName}` : ''}. Sibling data table provides the same data in accessible tabular form.`}
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
              height={40}
              label={{
                value: 'Months Since Placement',
                position: 'insideBottom',
                offset: 0,
                style: { fontSize: 11, fill: 'var(--muted-foreground)', textAnchor: 'middle' },
              }}
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
                  hoveredPair={hoveredPair}
                  labelMap={
                    new Map(
                      sortedPairs.map((p) => [
                        pairKey({ partner: p.partnerName, product: p.product }),
                        p.displayName,
                      ]),
                    )
                  }
                />
              }
            />

            {/* Pair lines — Recharts dataKey is the pairKey */}
            {sortedPairs.map((p) => {
              const key = pairKey({ partner: p.partnerName, product: p.product });
              const isHidden = hiddenPairs.has(key);
              const isHovered = hoveredPair === key;
              const isDimmed = hoveredPair !== null && !isHovered;
              return (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={colorMap.get(key)}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeOpacity={isDimmed ? 0.15 : 1}
                  dot={false}
                  activeDot={{ r: 4, cursor: 'pointer' }}
                  hide={isHidden}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={800}
                  onMouseEnter={() => setHoveredPair(key)}
                  onMouseLeave={() => setHoveredPair(null)}
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
        <TrajectoryLegend
          pairs={legendEntries}
          colorMap={colorMap}
          hiddenPairs={hiddenPairs}
          bestPairLabel={bestInClass?.displayName ?? null}
          onTogglePair={togglePair}
        />
    </DataPanel>
  );
}
