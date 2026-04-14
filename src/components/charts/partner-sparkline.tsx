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

  return <ChartSparkline data={data} lineKeys={lineKeys} />;
}
