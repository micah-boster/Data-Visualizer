'use client';

/**
 * Hook managing per-pair partner configuration with localStorage persistence.
 *
 * Mirrors `usePartnerLists` (`src/hooks/use-partner-lists.ts`) and
 * `useSavedViews` — empty initial state on SSR/first paint, hydrate from
 * localStorage in a `useEffect`, persist on every change after hydration.
 * The `hasHydrated` ref guards against persisting the empty default over
 * real saved data on first mount (Phase 25 Plan D lock).
 *
 * Contract (UsePartnerConfigResult):
 * - `configs`         current array (mirrors usePartnerLists.lists shape)
 * - `getConfig(pair)` returns PartnerConfigEntry | undefined; the
 *   undefined contract signals "no segments configured" so downstream
 *   consumers (charts, KPIs in Plan 39-04) fall back to rolled-up rendering.
 * - `upsertSegments`  insert-or-replace the entry for `pair`; bumps updatedAt
 * - `deleteConfig`    remove the entry for `pair` (currently unused but kept
 *                     symmetric with usePartnerLists.deleteList for future
 *                     "Reset segments" affordance)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import type { PartnerProductPair } from '@/lib/partner-config/pair';
import {
  loadPartnerConfig,
  persistPartnerConfig,
  subscribePartnerConfig,
} from '@/lib/partner-config/storage';
import type {
  PartnerConfigArray,
  PartnerConfigEntry,
  SegmentRule,
} from '@/lib/partner-config/types';

export interface UsePartnerConfigResult {
  configs: PartnerConfigArray;
  getConfig: (pair: PartnerProductPair) => PartnerConfigEntry | undefined;
  upsertSegments: (pair: PartnerProductPair, segments: SegmentRule[]) => void;
  deleteConfig: (pair: PartnerProductPair) => void;
}

export function usePartnerConfig(): UsePartnerConfigResult {
  // Initialize empty for SSR/hydration safety (KI-13 deferred per Phase 25
  // Plan D — reading localStorage during render breaks SSR).
  const [configs, setConfigs] = useState<PartnerConfigArray>([]);
  const hasHydrated = useRef(false);
  // Phase 43 gap-closure: skip the next persist round when the state change
  // came from cross-tab subscribe — prevents the ping-pong loop between tabs.
  const externalUpdateRef = useRef(false);

  // Hydrate from localStorage on first mount, then mark hasHydrated so the
  // persistence effect below knows it's safe to write.
  useEffect(() => {
    setConfigs(loadPartnerConfig());
    hasHydrated.current = true;
  }, []);

  // Persist to localStorage after hydration on every change. The hasHydrated
  // guard prevents persisting the empty default over real saved data on
  // first mount; the externalUpdateRef guard short-circuits when the change
  // came from the cross-tab listener (no echo back to localStorage).
  useEffect(() => {
    if (!hasHydrated.current) return;
    if (externalUpdateRef.current) {
      externalUpdateRef.current = false;
      return;
    }
    persistPartnerConfig(configs);
  }, [configs]);

  // Phase 43 BND-03 — cross-tab sync. When another tab writes the same key,
  // mirror it locally so segment definitions stay aligned across tabs. Mark
  // the update as external so persist skips one round.
  useEffect(() => {
    const unsub = subscribePartnerConfig((next) => {
      externalUpdateRef.current = true;
      setConfigs(next);
    });
    return unsub;
  }, []);

  const getConfig = useCallback(
    (pair: PartnerProductPair): PartnerConfigEntry | undefined => {
      return configs.find(
        (c) => c.partner === pair.partner && c.product === pair.product,
      );
    },
    [configs],
  );

  const upsertSegments = useCallback(
    (pair: PartnerProductPair, segments: SegmentRule[]): void => {
      setConfigs((prev) => {
        const ix = prev.findIndex(
          (c) => c.partner === pair.partner && c.product === pair.product,
        );
        const next: PartnerConfigEntry = {
          partner: pair.partner,
          product: pair.product,
          segments,
          updatedAt: Date.now(),
        };
        if (ix === -1) return [...prev, next];
        return prev.map((c, i) => (i === ix ? next : c));
      });
    },
    [],
  );

  const deleteConfig = useCallback((pair: PartnerProductPair): void => {
    setConfigs((prev) =>
      prev.filter(
        (c) => !(c.partner === pair.partner && c.product === pair.product),
      ),
    );
  }, []);

  return { configs, getConfig, upsertSegments, deleteConfig };
}
