'use client';

import { useQuery } from '@tanstack/react-query';
import type { DataResponse } from '@/types/data';

/**
 * Fetches all batch performance data from the API.
 * Always fetches all columns -- preset visibility is handled client-side.
 */
export function useData() {
  return useQuery<DataResponse>({
    queryKey: ['data'],
    queryFn: async () => {
      const res = await fetch('/api/data');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch data' }));
        throw new Error(err.error ?? 'Failed to fetch data');
      }
      return res.json();
    },
  });
}
