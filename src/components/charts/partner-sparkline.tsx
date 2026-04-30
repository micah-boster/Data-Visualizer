'use client';

/**
 * Sparkline for partner-level collapsed charts.
 * Shows collection curve lines as a minimal preview.
 */

import { useMemo } from 'react';
import type { BatchCurve } from '@/types/partner-stats';
import { pivotCurveData } from '@/components/charts/pivot-curve-data';
import { ChartSparkline } from './chart-sparkline';

interface PartnerSparklineProps {
  curves: BatchCurve[];
}

export function PartnerSparkline({ curves }: PartnerSparklineProps) {
  const { data, lineKeys } = useMemo(() => {
    if (curves.length === 0) return { data: [], lineKeys: [] };

    const sorted = [...curves].sort((a, b) => a.ageInMonths - b.ageInMonths);
    const { data: pivoted } = pivotCurveData(sorted, 'recoveryRate');
    const keys = sorted.map((_, i) => `batch_${i}`);

    return { data: pivoted, lineKeys: keys };
  }, [curves]);

  // Phase 41-03 (DCR-09) — recoveryRate is the chart's value axis; the closest
  // canonical Snowflake metric key for polarity intent is COLLECTION_AFTER_6_MONTH
  // (the headline collection-rate metric, higher_is_better). Passing it
  // surfaces the audit hook for BND-05 forward compatibility; today's
  // rotational palette ignores polarity.
  return (
    <ChartSparkline
      data={data}
      lineKeys={lineKeys}
      metric="COLLECTION_AFTER_6_MONTH"
    />
  );
}
