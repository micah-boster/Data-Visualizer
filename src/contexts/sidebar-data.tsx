'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import type { SavedView } from '@/lib/views/types';
import type { ParseResult } from '@/lib/metabase-import/types';
import type { PartnerProductPair } from '@/lib/partner-config/pair';

/**
 * Phase 39 PCFG-02..04: sidebar entries are PAIRS, not partners. Multi-product
 * partners (Happy Money, Zable) emit multiple peer rows with suffixed
 * displayName. Single-product partners emit a single row (displayName equals
 * the bare partner name; productTooltip carries the product label for the
 * hover treatment per CONTEXT lock).
 */
export interface SidebarPair {
  partner: string;
  product: string;
  /** Bare partner name (single-product) OR "Partner — Product Label" (multi). */
  displayName: string;
  /** Always-present product label for the hover tooltip. */
  productTooltip: string;
  batchCount: number;
  isFlagged: boolean;
}

interface SidebarDataState {
  /** Phase 39 PCFG-02 — list of (partner, product) pair rows. */
  pairs: SidebarPair[];
  /** Current drill-down state */
  drillState: DrillState;
  /** Phase 39 PCFG-03 — pair-aware drill setter. */
  drillToPair: (pair: PartnerProductPair) => void;
  /** Navigate to a drill level */
  navigateToLevel: (level: DrillLevel) => void;
  /** Saved views for sidebar list */
  views: SavedView[];
  /** Load a saved view */
  onLoadView: (view: SavedView) => void;
  /** Delete a saved view */
  onDeleteView: (id: string) => void;
  /** Save current state as a new view */
  onSaveView: (name: string) => void;
  /**
   * Phase 37 — called when the user clicks Apply in the Metabase Import
   * Sheet. Receives the parsed result plus the original SQL string so the
   * apply path can stamp sourceQuery with both. DataDisplay binds this to
   * handleApplyImport; AppSidebar reads it and threads to ImportSheet.
   */
  onImportSql: (result: ParseResult, sourceSql: string) => void;
  /** Number of anomalies detected */
  anomalyCount: number;
  /** Whether data has loaded */
  isReady: boolean;
}

interface SidebarDataSetter {
  /** Push data from DataDisplay into the sidebar context */
  setSidebarData: (data: Omit<SidebarDataState, 'isReady'>) => void;
}

type SidebarDataContextValue = SidebarDataState & SidebarDataSetter;

const DEFAULT_DRILL: DrillState = {
  level: 'root',
  partner: null,
  product: null,
  batch: null,
};

const SidebarDataContext = createContext<SidebarDataContextValue | null>(null);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SidebarDataState>({
    pairs: [],
    drillState: DEFAULT_DRILL,
    drillToPair: () => {},
    navigateToLevel: () => {},
    views: [],
    onLoadView: () => {},
    onDeleteView: () => {},
    onSaveView: () => {},
    // Phase 37 Plan 03 — no-op until DataDisplay pushes handleApplyImport in.
    onImportSql: () => {},
    anomalyCount: 0,
    isReady: false,
  });

  const setSidebarData = useCallback(
    (incoming: Omit<SidebarDataState, 'isReady'>) => {
      setData({ ...incoming, isReady: true });
    },
    [],
  );

  return (
    <SidebarDataContext.Provider value={{ ...data, setSidebarData }}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData() {
  const context = useContext(SidebarDataContext);
  if (!context) {
    throw new Error('useSidebarData must be used within a SidebarDataProvider');
  }
  return context;
}
