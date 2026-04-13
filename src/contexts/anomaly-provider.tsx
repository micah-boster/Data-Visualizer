'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PartnerAnomaly, CrossPartnerData } from '@/types/partner-stats';
import { useAllPartnerAnomalies } from '@/hooks/use-all-partner-anomalies';

interface AnomalyContextValue {
  /** Root-level anomaly map. Keyed by PARTNER_NAME. */
  partnerAnomalies: Map<string, PartnerAnomaly>;
}

const AnomalyContext = createContext<AnomalyContextValue | null>(null);

interface AnomalyProviderProps {
  /** Full dataset (all partners, all batches). */
  allRows: Record<string, unknown>[];
  /** Cross-partner data for percentile outlier enrichment (XPC-04). */
  crossPartnerData?: CrossPartnerData | null;
  children: ReactNode;
}

/**
 * Provides anomaly data for all partners to the component tree.
 * When crossPartnerData is provided, enriches anomaly entries with
 * percentile-based outlier flags from cross-partner computation.
 */
export function AnomalyProvider({ allRows, crossPartnerData, children }: AnomalyProviderProps) {
  const partnerAnomalies = useAllPartnerAnomalies(allRows);

  // Enrich anomaly map with percentile outlier flags from cross-partner data
  const enrichedAnomalies = useMemo(() => {
    if (!crossPartnerData) return partnerAnomalies;

    const enriched = new Map<string, PartnerAnomaly>();
    // Copy all existing anomalies first
    for (const [name, anomaly] of partnerAnomalies) {
      enriched.set(name, { ...anomaly });
    }

    // Merge percentile outlier flags from cross-partner entries
    for (const [name, entry] of crossPartnerData.partners) {
      const existing = enriched.get(name);
      if (existing) {
        enriched.set(name, {
          ...existing,
          isPercentileOutlier: entry.isPercentileOutlier,
          percentileOutlierMetrics: entry.outlierMetrics.map(String),
        });
      } else {
        // Partner had no z-score anomaly but may be a percentile outlier
        enriched.set(name, {
          isFlagged: false,
          severityScore: 0,
          flaggedBatchCount: 0,
          totalBatchCount: entry.batchCount,
          latestBatch: null,
          batches: [],
          usedPortfolioFallback: false,
          isPercentileOutlier: entry.isPercentileOutlier,
          percentileOutlierMetrics: entry.outlierMetrics.map(String),
        });
      }
    }

    return enriched;
  }, [partnerAnomalies, crossPartnerData]);

  const value = useMemo<AnomalyContextValue>(
    () => ({ partnerAnomalies: enrichedAnomalies }),
    [enrichedAnomalies],
  );

  return (
    <AnomalyContext.Provider value={value}>
      {children}
    </AnomalyContext.Provider>
  );
}

/**
 * Access the root-level partner anomaly map.
 * Must be used within an AnomalyProvider.
 */
export function useAnomalyContext(): AnomalyContextValue {
  const context = useContext(AnomalyContext);
  if (!context) {
    throw new Error('useAnomalyContext must be used within an AnomalyProvider');
  }
  return context;
}
