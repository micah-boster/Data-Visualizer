'use client';

import { useState, useCallback } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';

export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

const ROOT_STATE: DrillState = { level: 'root', partner: null, batch: null };

/**
 * Drill-down state management hook.
 *
 * Uses plain React state — no URL search params, no closures over
 * stale router state. Simple and reliable.
 */
export function useDrillDown() {
  const [state, setState] = useState<DrillState>(ROOT_STATE);

  const drillToPartner = useCallback((partnerName: string) => {
    setState({ level: 'partner', partner: partnerName, batch: null });
  }, []);

  const drillToBatch = useCallback((batchName: string) => {
    setState((prev) => ({
      level: 'batch',
      partner: prev.partner,
      batch: batchName,
    }));
  }, []);

  const navigateToLevel = useCallback((level: DrillLevel) => {
    setState((prev) => {
      if (level === 'root') return ROOT_STATE;
      if (level === 'partner') return { level: 'partner', partner: prev.partner, batch: null };
      return prev; // batch — already at deepest level
    });
  }, []);

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
