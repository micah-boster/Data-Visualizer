'use client';

/**
 * Sparkline for root-level collapsed charts.
 * Shows cross-partner trajectory lines as a minimal preview.
 */

import { useMemo } from 'react';
import { useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import { COLLECTION_MONTHS } from '@/lib/computation/reshape-curves';
import { ChartSparkline } from './chart-sparkline';

export function RootSparkline() {
  const { crossPartnerData } = useCrossPartnerContext();

  const { data, lineKeys } = useMemo(() => {
    if (!crossPartnerData || crossPartnerData.rankedPartners.length === 0) {
      return { data: [], lineKeys: [] };
    }

    const partners = crossPartnerData.rankedPartners;
    const months = [...COLLECTION_MONTHS];

    const pivoted = months.map((month) => {
      const point: Record<string, number | undefined> = { month };
      for (const p of partners) {
        const cp = p.averageCurve.dollarWeighted.find((c) => c.month === month);
        if (cp) point[p.partnerName] = cp.recoveryRate;
      }
      return point;
    });

    return {
      data: pivoted,
      lineKeys: partners.map((p) => p.partnerName),
    };
  }, [crossPartnerData]);

  // Decorative preview only — sibling data table is the accessible data source
  // for screen readers. Wrapper marks the full subtree aria-hidden so axe-core
  // does not flag inner SVG elements and SR users are not read duplicate data.
  return (
    <div aria-hidden="true">
      <ChartSparkline data={data} lineKeys={lineKeys} />
    </div>
  );
}
