'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CrossPartnerData } from '@/types/partner-stats';
import { useAllPartnerStats } from '@/hooks/use-all-partner-stats';

interface CrossPartnerContextValue {
  /** Cross-partner computation data. Null if no data. */
  crossPartnerData: CrossPartnerData | null;
}

const CrossPartnerContext = createContext<CrossPartnerContextValue | null>(null);

interface CrossPartnerProviderProps {
  allRows: Record<string, unknown>[];
  children: ReactNode;
}

/**
 * Provides cross-partner stats to the component tree.
 * Computes per-partner KPIs, percentile rankings, average curves,
 * activity classification, and portfolio outlier flags for all partners.
 *
 * Nest outside AnomalyProvider in DataDisplay so anomaly enrichment
 * can read cross-partner outlier data.
 */
export function CrossPartnerProvider({ allRows, children }: CrossPartnerProviderProps) {
  const crossPartnerData = useAllPartnerStats(allRows);

  const value = useMemo<CrossPartnerContextValue>(
    () => ({ crossPartnerData }),
    [crossPartnerData],
  );

  return (
    <CrossPartnerContext.Provider value={value}>
      {children}
    </CrossPartnerContext.Provider>
  );
}

/**
 * Access cross-partner data from the nearest CrossPartnerProvider.
 * Must be used within a CrossPartnerProvider.
 */
export function useCrossPartnerContext(): CrossPartnerContextValue {
  const context = useContext(CrossPartnerContext);
  if (!context) {
    throw new Error('useCrossPartnerContext must be used within a CrossPartnerProvider');
  }
  return context;
}
