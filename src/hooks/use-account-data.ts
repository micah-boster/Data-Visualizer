'use client';

import { useQuery } from '@tanstack/react-query';
import type { DataResponse } from '@/types/data';

/**
 * Fetches account-level data from master_accounts for a specific partner + batch.
 * Only enabled when both partner and batch are provided (batch drill level).
 */
export function useAccountData(partner: string | null, batch: string | null) {
  return useQuery<DataResponse>({
    queryKey: ['accounts', partner, batch],
    queryFn: async () => {
      const res = await fetch(
        `/api/accounts?partner=${encodeURIComponent(partner!)}&batch=${encodeURIComponent(batch!)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch account data' }));
        throw new Error(err.error ?? 'Failed to fetch account data');
      }
      return res.json();
    },
    enabled: !!partner && !!batch,
  });
}
