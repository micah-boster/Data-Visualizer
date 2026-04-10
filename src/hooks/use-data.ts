'use client';

import { useQuery } from '@tanstack/react-query';
import type { DataResponse } from '@/types/data';

export function useData(columns?: string[]) {
  const params = new URLSearchParams();
  if (columns?.length) {
    params.set('columns', columns.join(','));
  }

  return useQuery<DataResponse>({
    queryKey: ['data', columns ?? null],
    queryFn: async () => {
      const url = columns?.length
        ? `/api/data?${params.toString()}`
        : '/api/data';

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch data' }));
        throw new Error(err.error ?? 'Failed to fetch data');
      }
      return res.json();
    },
  });
}
