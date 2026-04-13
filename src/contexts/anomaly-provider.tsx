'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PartnerAnomaly } from '@/types/partner-stats';
import { useAllPartnerAnomalies } from '@/hooks/use-all-partner-anomalies';

interface AnomalyContextValue {
  /** Root-level anomaly map. Keyed by PARTNER_NAME. */
  partnerAnomalies: Map<string, PartnerAnomaly>;
}

const AnomalyContext = createContext<AnomalyContextValue | null>(null);

interface AnomalyProviderProps {
  /** Full dataset (all partners, all batches). */
  allRows: Record<string, unknown>[];
  children: ReactNode;
}

/**
 * Provides anomaly data for all partners to the component tree.
 * Wrap around the outermost content so anomaly data is available everywhere.
 */
export function AnomalyProvider({ allRows, children }: AnomalyProviderProps) {
  const partnerAnomalies = useAllPartnerAnomalies(allRows);

  const value = useMemo<AnomalyContextValue>(
    () => ({ partnerAnomalies }),
    [partnerAnomalies],
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
