'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DrillState, DrillLevel } from '@/hooks/use-drill-down';
import type { SavedView } from '@/lib/views/types';

export interface SidebarPartner {
  name: string;
  batchCount: number;
  isFlagged: boolean;
}

interface SidebarDataState {
  /** Partner list for sidebar navigation */
  partners: SidebarPartner[];
  /** Current drill-down state */
  drillState: DrillState;
  /** Navigate to a partner */
  drillToPartner: (name: string) => void;
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

const DEFAULT_DRILL: DrillState = { level: 'root', partner: null, batch: null };

const SidebarDataContext = createContext<SidebarDataContextValue | null>(null);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SidebarDataState>({
    partners: [],
    drillState: DEFAULT_DRILL,
    drillToPartner: () => {},
    navigateToLevel: () => {},
    views: [],
    onLoadView: () => {},
    onDeleteView: () => {},
    onSaveView: () => {},
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
