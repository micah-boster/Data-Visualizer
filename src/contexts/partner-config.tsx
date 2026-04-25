'use client';

/**
 * PartnerConfigProvider — single upstream site for the usePartnerConfig() hook.
 *
 * Mirrors `PartnerListsProvider` (`src/contexts/partner-lists.tsx`). The
 * sidebar's per-pair Setup sheet, the Setup editor itself, and the future
 * Plan 39-04 chart/KPI consumers all need to read the same `configs` array
 * — calling `usePartnerConfig()` independently in each surface would spin
 * up parallel React-state copies and desync writes from one place would
 * not appear in another.
 *
 * Provider mounts in `src/app/layout.tsx` so the entire app tree can
 * consume the context.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import {
  usePartnerConfig,
  type UsePartnerConfigResult,
} from '@/hooks/use-partner-config';

const PartnerConfigContext = createContext<UsePartnerConfigResult | null>(
  null,
);

export function PartnerConfigProvider({ children }: { children: ReactNode }) {
  const value = usePartnerConfig();

  // Memoize the context value so unrelated parent re-renders don't
  // invalidate every downstream memo keyed on this value. The hook returns
  // a stable shape but defensive memoization avoids identity churn if a
  // non-memoized field is added later.
  const memo = useMemo(() => value, [value]);

  return (
    <PartnerConfigContext.Provider value={memo}>
      {children}
    </PartnerConfigContext.Provider>
  );
}

export function usePartnerConfigContext(): UsePartnerConfigResult {
  const ctx = useContext(PartnerConfigContext);
  if (!ctx) {
    throw new Error(
      'usePartnerConfigContext must be used within a PartnerConfigProvider',
    );
  }
  return ctx;
}
