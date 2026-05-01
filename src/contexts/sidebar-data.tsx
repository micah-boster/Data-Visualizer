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
 *
 * Phase 44 VOC-07: pairs gain an optional `revenueModel` so multi-model
 * partners (Advance Financial, Happy Money, Imprint, PatientFi) emit one row
 * per (partner, product, revenue_model) tuple. The `displayName` carries the
 * `-Contingency` / `-DebtSale` suffix when relevant (decided by the producer
 * via `displayNameForPair(pair, productsPerPartner, revenueModelsPerPair)`);
 * single-model pair rows continue to render unchanged.
 */
export interface SidebarPair {
  partner: string;
  product: string;
  /**
   * Phase 44 VOC-07 — REVENUE_MODEL of this pair row, or undefined for the
   * 34 single-model partners on current data. Carries through to drill state
   * (URL `?rm=`), active-state matching, and the breadcrumb suffix.
   */
  revenueModel?: string;
  /** Bare partner name (single-product) OR "Partner — Product Label" (multi). */
  displayName: string;
  /** Always-present product label for the hover tooltip. */
  productTooltip: string;
  batchCount: number;
  isFlagged: boolean;
}

interface SidebarDataState {
  /** Phase 39 PCFG-02 — list of (partner, product[, revenue_model]) pair rows. */
  pairs: SidebarPair[];
  /**
   * Phase 44 VOC-07 — number of distinct products per partner. Drives the
   * sidebar pair-row product-suffix treatment (single-product → no suffix;
   * multi-product → "Partner — Product Label"). The breadcrumb consumes
   * this for its partner-segment label too. Producer (data-display.tsx)
   * computes once across all pairs; consumers read by partner key.
   */
  productsPerPartner: Map<string, number>;
  /**
   * Phase 44 VOC-07 — number of distinct revenue models per (partner,
   * product). Map keyed by `${partner}::${product}` so consumers can
   * compute the suffix decision (`size > 1` → split + suffix). Producer
   * fills this from the dataset rows; consumers (sidebar pair rows,
   * breadcrumb, mixed-model chip future-readiness) read by composite key.
   *
   * On current data: 34 entries map to 1; 4 entries map to 2 (the
   * multi-model partners). The mixed-model batch chip is unexercised
   * (every batch maps cleanly to a single model; ZERO mixed-model
   * batches per the Wave 3 ETL audit captured in ADR 0002).
   */
  revenueModelsPerPair: Map<string, number>;
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
  // Phase 44 VOC-07 — third-dimension slot in DrillState. Always null at
  // root level; producers set this for multi-revenue-model pair rows.
  revenueModel: null,
};

const SidebarDataContext = createContext<SidebarDataContextValue | null>(null);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SidebarDataState>({
    pairs: [],
    // Phase 44 VOC-07 — Maps default to empty; producer (data-display.tsx)
    // fills them from the dataset on every render and pushes via setSidebarData.
    productsPerPartner: new Map<string, number>(),
    revenueModelsPerPair: new Map<string, number>(),
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
