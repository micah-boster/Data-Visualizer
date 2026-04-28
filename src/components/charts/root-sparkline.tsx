'use client';

/**
 * Sparkline for root-level collapsed charts.
 * Shows cross-partner trajectory lines as a minimal preview.
 */

import { useMemo } from 'react';
import { useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import { COLLECTION_MONTHS } from '@/lib/computation/reshape-curves';
import { pairKey } from '@/lib/partner-config/pair';
import { ChartSparkline } from './chart-sparkline';

export function RootSparkline() {
  const { crossPartnerData } = useCrossPartnerContext();

  const { data, lineKeys } = useMemo(() => {
    if (!crossPartnerData || crossPartnerData.rankedPartners.length === 0) {
      return { data: [], lineKeys: [] };
    }

    const partners = crossPartnerData.rankedPartners;
    const months = [...COLLECTION_MONTHS];

    // Phase 41.2: key by pairKey, not partnerName. Multi-product partners
    // (Happy Money, Zable) contribute multiple entries — keying by partner
    // alone collided and triggered React duplicate-key warnings.
    const pivoted = months.map((month) => {
      const point: Record<string, number | undefined> = { month };
      for (const p of partners) {
        const cp = p.averageCurve.dollarWeighted.find((c) => c.month === month);
        if (cp) point[pairKey({ partner: p.partnerName, product: p.product })] = cp.recoveryRate;
      }
      return point;
    });

    return {
      data: pivoted,
      lineKeys: partners.map((p) =>
        pairKey({ partner: p.partnerName, product: p.product }),
      ),
    };
  }, [crossPartnerData]);

  // Decorative preview only — sibling data table is the accessible data source
  // for screen readers. Wrapper marks the full subtree aria-hidden so axe-core
  // does not flag inner SVG elements and SR users are not read duplicate data.
  //
  // Phase 41-03 (DCR-09) — recoveryRate axis polarity intent maps to
  // COLLECTION_AFTER_6_MONTH (higher_is_better). The metric prop runs the
  // audit hook in dev; rotational palette consumes no polarity today.
  return (
    <div aria-hidden="true">
      <ChartSparkline
        data={data}
        lineKeys={lineKeys}
        metric="COLLECTION_AFTER_6_MONTH"
      />
    </div>
  );
}
