'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DataFreshnessState {
  fetchedAt: string | null;
  isFetching: boolean;
  setFetchedAt: (timestamp: string | null) => void;
  setIsFetching: (fetching: boolean) => void;
}

const DataFreshnessContext = createContext<DataFreshnessState | null>(null);

export function DataFreshnessProvider({ children }: { children: ReactNode }) {
  const [fetchedAt, setFetchedAtState] = useState<string | null>(null);
  const [isFetching, setIsFetchingState] = useState(false);

  const setFetchedAt = useCallback((timestamp: string | null) => {
    setFetchedAtState(timestamp);
  }, []);

  const setIsFetching = useCallback((fetching: boolean) => {
    setIsFetchingState(fetching);
  }, []);

  return (
    <DataFreshnessContext.Provider
      value={{ fetchedAt, isFetching, setFetchedAt, setIsFetching }}
    >
      {children}
    </DataFreshnessContext.Provider>
  );
}

export function useDataFreshness() {
  const context = useContext(DataFreshnessContext);
  if (!context) {
    throw new Error('useDataFreshness must be used within a DataFreshnessProvider');
  }
  return context;
}
