'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MetricNorm } from '@/types/partner-stats';
import { useHeatmapPreference } from '@/hooks/use-heatmap-preference';

interface PartnerNormsValue {
  /** Partner metric norms. Null when not at partner drill-down level. */
  norms: Record<string, MetricNorm> | null;
  /** Whether heatmap formatting is enabled (user toggle). */
  heatmapEnabled: boolean;
  /** Toggle heatmap on/off (persists to localStorage). */
  toggleHeatmap: () => void;
}

const PartnerNormsContext = createContext<PartnerNormsValue | null>(null);

interface PartnerNormsProviderProps {
  /** Norms from usePartnerStats. Pass null when not at partner level. */
  norms: Record<string, MetricNorm> | null;
  children: ReactNode;
}

/**
 * Provides partner metric norms and heatmap toggle state to the cell
 * rendering tree. Wrap around DataTable at the level where partner
 * context is available.
 */
export function PartnerNormsProvider({ norms, children }: PartnerNormsProviderProps) {
  const [heatmapEnabled, toggleHeatmap] = useHeatmapPreference();

  const value = useMemo<PartnerNormsValue>(
    () => ({
      norms,
      // Disable heatmap when norms unavailable (root level)
      heatmapEnabled: norms !== null && heatmapEnabled,
      toggleHeatmap,
    }),
    [norms, heatmapEnabled, toggleHeatmap],
  );

  return (
    <PartnerNormsContext.Provider value={value}>
      {children}
    </PartnerNormsContext.Provider>
  );
}

/**
 * Access partner norms and heatmap toggle state.
 * Must be used within a PartnerNormsProvider.
 */
export function usePartnerNorms(): PartnerNormsValue {
  const context = useContext(PartnerNormsContext);
  if (!context) {
    throw new Error('usePartnerNorms must be used within a PartnerNormsProvider');
  }
  return context;
}
