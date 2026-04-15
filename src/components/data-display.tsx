'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useAccountData } from '@/hooks/use-account-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
import { useSidebarData } from '@/contexts/sidebar-data';
import { accountColumnDefs } from '@/lib/columns/account-definitions';
import { buildRootColumnDefs, buildPartnerSummaryRows } from '@/lib/columns/root-columns';
import dynamic from 'next/dynamic';
import { usePartnerStats } from '@/hooks/use-partner-stats';
import { PartnerNormsProvider } from '@/contexts/partner-norms';
import { AnomalyProvider } from '@/contexts/anomaly-provider';
import { CrossPartnerProvider, useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable } from '@/components/table/data-table';
import { KpiSummaryCards } from '@/components/kpi/kpi-summary-cards';
import { UnifiedToolbar } from '@/components/toolbar/unified-toolbar';
import { QueryCommandDialog } from '@/components/query/query-command-dialog';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import { useSavedViews } from '@/hooks/use-saved-views';
import { useFilterState } from '@/hooks/use-filter-state';
import { buildDataContext, type PartnerSummary } from '@/lib/ai/context-builder';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { getPartnerName } from '@/lib/utils';
import { toast } from 'sonner';
import type { DrillState } from '@/hooks/use-drill-down';
import type { SavedView } from '@/lib/views/types';

const CollectionCurveChart = dynamic(
  () =>
    import('@/components/charts/collection-curve-chart').then(
      (mod) => mod.CollectionCurveChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[40vh] w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const CrossPartnerTrajectoryChart = dynamic(
  () =>
    import('@/components/cross-partner/trajectory-chart').then(
      (mod) => mod.CrossPartnerTrajectoryChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[40vh] w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const PartnerComparisonMatrix = dynamic(
  () =>
    import('@/components/cross-partner/comparison-matrix').then(
      (mod) => mod.PartnerComparisonMatrix,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const RootSparkline = dynamic(
  () =>
    import('@/components/charts/root-sparkline').then(
      (mod) => mod.RootSparkline,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const PartnerSparkline = dynamic(
  () =>
    import('@/components/charts/partner-sparkline').then(
      (mod) => mod.PartnerSparkline,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

export function DataDisplay() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useData();
  const { state: drillState, drillToPartner, drillToBatch, navigateToLevel } =
    useDrillDown();
  const {
    data: accountData,
    isLoading: isAccountLoading,
    isError: isAccountError,
    error: accountError,
  } = useAccountData(drillState.partner, drillState.batch);
  const { setFetchedAt, setIsFetching } = useDataFreshness();
  const [schemaWarningDismissed, setSchemaWarningDismissed] = useState(false);
  const partnerStats = usePartnerStats(drillState.partner, data?.data ?? []);

  // Chart state
  const [chartsExpanded, setChartsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('charts-expanded') !== 'false';
  });
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const toggleCharts = useCallback(() => {
    setChartsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('charts-expanded', String(next));
      return next;
    });
  }, []);

  // Query dialog state
  const [queryOpen, setQueryOpen] = useState(false);

  // Lifted state: saved views
  const {
    views,
    saveView,
    deleteView,
    restoreView,
    hasViewWithName,
    replaceView,
    restoreDefaults,
  } = useSavedViews();

  // Lifted state: dimension filters (URL-backed)
  const {
    columnFilters: dimensionFilters,
    setFilter,
    clearAll: clearAllDimension,
    activeFilters,
    searchParams,
  } = useFilterState(data?.data);

  // Sync freshness state to context so header can display it
  useEffect(() => {
    if (data?.meta?.fetchedAt) {
      setFetchedAt(data.meta.fetchedAt);
    }
  }, [data?.meta?.fetchedAt, setFetchedAt]);

  useEffect(() => {
    setIsFetching(isFetching);
  }, [isFetching, setIsFetching]);

  // Data source depends on drill level
  const tableData = useMemo(() => {
    if (drillState.level === 'batch') {
      return accountData?.data ?? [];
    }
    if (!data?.data) return [];
    if (drillState.level === 'partner' && drillState.partner) {
      return data.data.filter(
        (row) => getPartnerName(row) === drillState.partner,
      );
    }
    return data.data;
  }, [data?.data, accountData?.data, drillState.level, drillState.partner]);

  // Memoize batch-level curve for single-batch drill-down
  const batchCurve = useMemo(() => {
    if (drillState.level !== 'batch' || !drillState.batch || !partnerStats?.curves) return null;
    const curves = partnerStats.curves.filter((c) => c.batchName === drillState.batch);
    return curves.length > 0 ? curves : null;
  }, [drillState.level, drillState.batch, partnerStats?.curves]);

  // Memoize unique partner count
  const uniquePartnerCount = useMemo(
    () => new Set(data?.data?.map((r) => getPartnerName(r))).size,
    [data?.data],
  );

  // Filter options for the toolbar filter popover
  const partnerOptions = useMemo(
    () =>
      [...new Set((data?.data ?? []).map((r) => String(r.PARTNER_NAME ?? '')))]
        .filter(Boolean)
        .sort(),
    [data?.data],
  );
  const typeOptions = useMemo(
    () =>
      [...new Set((data?.data ?? []).map((r) => String(r.ACCOUNT_TYPE ?? '')))]
        .filter(Boolean)
        .sort(),
    [data?.data],
  );
  const selectedPartner = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'PARTNER_NAME');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const selectedType = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'ACCOUNT_TYPE');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const selectedBatch = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'BATCH');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const batchOptions = useMemo(() => {
    const rows = selectedPartner
      ? (data?.data ?? []).filter((r) => String(r.PARTNER_NAME ?? '') === selectedPartner)
      : (data?.data ?? []);
    return [...new Set(rows.map((r) => String(r.BATCH ?? '')))]
      .filter(Boolean)
      .sort();
  }, [data?.data, selectedPartner]);

  // View loading handler — called from sidebar or toolbar
  const handleLoadView = useCallback(
    (view: SavedView) => {
      const { snapshot } = view;

      // Restore chart state
      if (snapshot.chartsExpanded !== undefined) {
        setChartsExpanded(snapshot.chartsExpanded);
        localStorage.setItem('charts-expanded', String(snapshot.chartsExpanded));
      }
      if (snapshot.comparisonVisible !== undefined) {
        setComparisonVisible(snapshot.comparisonVisible);
      }

      // Restore dimension filters via URL
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(snapshot.dimensionFilters)) {
        if (value) params.set(key, value);
      }
      const qs = params.toString();
      // Use window.history to avoid full re-render
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);

      // The rest (sorting, visibility, order, column filters, sizing, preset)
      // is handled by DataTable via the onLoadView callback
      if (tableLoadViewRef.current) {
        tableLoadViewRef.current(view);
      }
    },
    [],
  );

  const handleDeleteView = useCallback(
    (id: string) => {
      const { deleted } = deleteView(id);
      if (deleted) {
        toast('View deleted', {
          description: `"${deleted.name}" was removed`,
          action: {
            label: 'Undo',
            onClick: () => restoreView(deleted),
          },
          duration: 5000,
        });
      }
    },
    [deleteView, restoreView],
  );

  const handleSaveView = useCallback(
    (name: string) => {
      if (tableSnapshotRef.current) {
        const snapshot = tableSnapshotRef.current();
        // Enrich with chart state
        snapshot.chartsExpanded = chartsExpanded;
        snapshot.comparisonVisible = comparisonVisible;
        saveView(name, snapshot);
        toast('View saved', {
          description: `"${name}" has been saved`,
          duration: 3000,
        });
      }
    },
    [saveView, chartsExpanded, comparisonVisible],
  );

  const handleReplaceView = useCallback(
    (name: string) => {
      if (tableSnapshotRef.current) {
        const snapshot = tableSnapshotRef.current();
        snapshot.chartsExpanded = chartsExpanded;
        snapshot.comparisonVisible = comparisonVisible;
        replaceView(name, snapshot);
        toast('View updated', {
          description: `"${name}" has been updated`,
          duration: 3000,
        });
      }
    },
    [replaceView, chartsExpanded, comparisonVisible],
  );

  // Refs for DataTable to expose snapshot capture and view loading
  const tableSnapshotRef = useRef<(() => import('@/lib/views/types').ViewSnapshot) | null>(null);
  const tableLoadViewRef = useRef<((view: SavedView) => void) | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) return <EmptyState />;
  if (drillState.level === 'batch' && isAccountError) {
    return <ErrorState error={accountError} onRetry={() => navigateToLevel('partner')} />;
  }

  const hasSchemaWarnings =
    !schemaWarningDismissed &&
    data.schemaWarnings &&
    (data.schemaWarnings.missing.length > 0 || data.schemaWarnings.unexpected.length > 0);

  return (
    <CrossPartnerProvider allRows={data.data}>
      <EnrichedAnomalyProvider allRows={data.data}>
        <SidebarDataPopulator
          allData={data.data}
          drillState={drillState}
          drillToPartner={drillToPartner}
          navigateToLevel={navigateToLevel}
          views={views}
          onLoadView={handleLoadView}
          onDeleteView={handleDeleteView}
          onSaveView={handleSaveView}
        />

        <div className="flex h-[calc(100vh-3.5rem)] flex-col">
          {/* Schema warnings */}
          {hasSchemaWarnings && (
            <Alert className="relative shrink-0 mx-2 mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8">
                <span className="font-medium">Data may be incomplete. </span>
                {data.schemaWarnings!.missing.length > 0 && (
                  <span>
                    Missing columns: {data.schemaWarnings!.missing.join(', ')}.{' '}
                  </span>
                )}
                {data.schemaWarnings!.unexpected.length > 0 && (
                  <span>
                    {data.schemaWarnings!.unexpected.length} unexpected column(s) found.
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={() => setSchemaWarningDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </Alert>
          )}

          {/* Collapsible charts section */}
          {chartsExpanded && (
            <div className="shrink-0 px-2 pt-2 space-y-2">
              {drillState.level === 'root' && (
                <>
                  <CrossPartnerTrajectoryChart />
                  {comparisonVisible && <PartnerComparisonMatrix />}
                </>
              )}
              {drillState.level === 'partner' && (
                <>
                  <KpiSummaryCards
                    kpis={partnerStats?.kpis ?? null}
                    trending={partnerStats?.trending ?? null}
                  />
                  {partnerStats?.curves && partnerStats.curves.length >= 2 && (
                    <CollectionCurveChart curves={partnerStats.curves} />
                  )}
                </>
              )}
              {batchCurve && (
                <CollectionCurveChart curves={batchCurve} />
              )}
            </div>
          )}

          {/* Sparkline when charts collapsed */}
          {!chartsExpanded && drillState.level === 'root' && (
            <div className="shrink-0 px-2 pt-2">
              <RootSparkline />
            </div>
          )}
          {!chartsExpanded && drillState.level === 'partner' && partnerStats?.curves && partnerStats.curves.length >= 2 && (
            <div className="shrink-0 px-2 pt-2">
              <PartnerSparkline curves={partnerStats.curves} />
            </div>
          )}

          {/* Interactive data table with toolbar */}
          <PartnerNormsProvider norms={partnerStats?.norms ?? null}>
            <div className="min-h-0 flex-1 flex flex-col">
              {drillState.level === 'batch' && isAccountLoading ? (
                <LoadingState />
              ) : (
                <CrossPartnerDataTable
                  drillState={drillState}
                  tableData={tableData}
                  isFetching={isFetching}
                  drillToPartner={drillToPartner}
                  drillToBatch={drillToBatch}
                  navigateToLevel={navigateToLevel}
                  totalRowCount={uniquePartnerCount}
                  partnerStats={partnerStats}
                  allData={data.data}
                  // Lifted state
                  dimensionFilters={dimensionFilters}
                  setFilter={setFilter}
                  clearAllDimension={clearAllDimension}
                  activeFilters={activeFilters}
                  searchParams={searchParams}
                  views={views}
                  onLoadView={handleLoadView}
                  onDeleteView={handleDeleteView}
                  onSaveView={handleSaveView}
                  onReplaceView={handleReplaceView}
                  hasViewWithName={hasViewWithName}
                  restoreDefaults={restoreDefaults}
                  // Chart state for toolbar
                  chartsExpanded={chartsExpanded}
                  onToggleCharts={toggleCharts}
                  comparisonVisible={comparisonVisible}
                  // Query
                  onOpenQuery={() => setQueryOpen(true)}
                  // Filter options
                  partnerOptions={partnerOptions}
                  typeOptions={typeOptions}
                  batchOptions={batchOptions}
                  selectedPartner={selectedPartner}
                  selectedType={selectedType}
                  selectedBatch={selectedBatch}
                  // Refs for snapshot/load
                  snapshotRef={tableSnapshotRef}
                  loadViewRef={tableLoadViewRef}
                />
              )}
            </div>
          </PartnerNormsProvider>

          {/* Query command dialog */}
          <QueryCommandDialogWithContext
            open={queryOpen}
            onOpenChange={setQueryOpen}
            drillState={drillState}
            allData={data.data}
            onRemoveScope={() => navigateToLevel('root')}
          />
        </div>
      </EnrichedAnomalyProvider>
    </CrossPartnerProvider>
  );
}

// ---------------------------------------------------------------------------
// EnrichedAnomalyProvider — feeds cross-partner outlier data into AnomalyProvider
// ---------------------------------------------------------------------------

function EnrichedAnomalyProvider({
  allRows,
  children,
}: {
  allRows: Record<string, unknown>[];
  children: React.ReactNode;
}) {
  const { crossPartnerData } = useCrossPartnerContext();
  return (
    <AnomalyProvider allRows={allRows} crossPartnerData={crossPartnerData}>
      {children}
    </AnomalyProvider>
  );
}

// ---------------------------------------------------------------------------
// SidebarDataPopulator — pushes data into sidebar context
// ---------------------------------------------------------------------------

function SidebarDataPopulator({
  allData,
  drillState,
  drillToPartner,
  navigateToLevel,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
}: {
  allData: Record<string, unknown>[];
  drillState: DrillState;
  drillToPartner: (name: string) => void;
  navigateToLevel: (level: import('@/hooks/use-drill-down').DrillLevel) => void;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string) => void;
}) {
  const { setSidebarData } = useSidebarData();
  const { partnerAnomalies } = useAnomalyContext();

  const partners = useMemo(() => {
    const partnerGroups = new Map<string, number>();
    for (const row of allData) {
      const name = getPartnerName(row);
      if (!name) continue;
      partnerGroups.set(name, (partnerGroups.get(name) ?? 0) + 1);
    }

    const flaggedSet = new Set(
      [...partnerAnomalies.entries()]
        .filter(([, a]) => a.isFlagged)
        .map(([name]) => name),
    );

    return [...partnerGroups.entries()]
      .map(([name, batchCount]) => ({
        name,
        batchCount,
        isFlagged: flaggedSet.has(name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allData, partnerAnomalies]);

  const anomalyCount = useMemo(
    () => [...partnerAnomalies.values()].filter((a) => a.isFlagged).length,
    [partnerAnomalies],
  );

  useEffect(() => {
    setSidebarData({
      partners,
      drillState,
      drillToPartner,
      navigateToLevel,
      views,
      onLoadView,
      onDeleteView,
      onSaveView,
      anomalyCount,
    });
  }, [partners, drillState, drillToPartner, navigateToLevel, views, onLoadView, onDeleteView, onSaveView, anomalyCount, setSidebarData]);

  return null;
}

// ---------------------------------------------------------------------------
// CrossPartnerDataTable — reads cross-partner context and renders toolbar + table
// ---------------------------------------------------------------------------

function CrossPartnerDataTable({
  drillState,
  tableData,
  isFetching,
  drillToPartner,
  drillToBatch,
  navigateToLevel,
  totalRowCount,
  partnerStats,
  allData,
  // Lifted state
  dimensionFilters,
  setFilter,
  clearAllDimension,
  activeFilters,
  searchParams,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
  onReplaceView,
  hasViewWithName,
  restoreDefaults,
  // Chart state
  chartsExpanded,
  onToggleCharts,
  comparisonVisible,
  // Query
  onOpenQuery,
  // Filter options
  partnerOptions,
  typeOptions,
  batchOptions,
  selectedPartner,
  selectedType,
  selectedBatch,
  // Refs
  snapshotRef,
  loadViewRef,
}: {
  drillState: DrillState;
  tableData: Record<string, unknown>[];
  isFetching: boolean;
  drillToPartner: (name: string) => void;
  drillToBatch: (name: string, partnerName?: string) => void;
  navigateToLevel: (level: import('@/hooks/use-drill-down').DrillLevel) => void;
  totalRowCount: number;
  partnerStats: ReturnType<typeof usePartnerStats>;
  allData: Record<string, unknown>[];
  dimensionFilters: import('@tanstack/react-table').ColumnFiltersState;
  setFilter: (param: string, value: string | null) => void;
  clearAllDimension: () => void;
  activeFilters: import('@/hooks/use-filter-state').ActiveFilter[];
  searchParams: URLSearchParams;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string) => void;
  onReplaceView: (name: string) => void;
  hasViewWithName: (name: string) => boolean;
  restoreDefaults: () => void;
  chartsExpanded: boolean;
  onToggleCharts: () => void;
  comparisonVisible: boolean;
  onOpenQuery: () => void;
  partnerOptions: string[];
  typeOptions: string[];
  batchOptions: string[];
  selectedPartner: string | null;
  selectedType: string | null;
  selectedBatch: string | null;
  snapshotRef: React.MutableRefObject<(() => import('@/lib/views/types').ViewSnapshot) | null>;
  loadViewRef: React.MutableRefObject<((view: SavedView) => void) | null>;
}) {
  const { crossPartnerData } = useCrossPartnerContext();

  // At root level, show one row per partner (deduplicated summary)
  const rootSummaryRows = useMemo(
    () => (drillState.level === 'root' ? buildPartnerSummaryRows(allData) : []),
    [drillState.level, allData],
  );

  const rootColumnDefs = useMemo(
    () => (drillState.level === 'root' ? buildRootColumnDefs() : undefined),
    [drillState.level],
  );

  const effectiveData = drillState.level === 'root' ? rootSummaryRows : tableData;
  const effectiveColumns =
    drillState.level === 'batch'
      ? accountColumnDefs
      : drillState.level === 'root'
        ? rootColumnDefs
        : undefined;

  return (
    <DataTable
      key={`${drillState.level}-${drillState.partner ?? ''}-${drillState.batch ?? ''}`}
      data={effectiveData}
      isFetching={drillState.level === 'batch' ? false : isFetching}
      drillState={drillState}
      onDrillToPartner={drillToPartner}
      onDrillToBatch={drillToBatch}
      onNavigateToLevel={navigateToLevel}
      totalRowCount={drillState.level === 'root' ? undefined : totalRowCount}
      columnDefs={effectiveColumns}
      partnerRowCount={
        drillState.level === 'batch' && drillState.partner
          ? allData.filter((r) => getPartnerName(r) === drillState.partner).length
          : undefined
      }
      trendingData={drillState.level === 'partner' ? partnerStats?.trending ?? null : null}
      crossPartnerData={drillState.level === 'root' ? crossPartnerData : undefined}
      // Lifted state
      dimensionFilters={dimensionFilters}
      setFilter={setFilter}
      clearAllDimension={clearAllDimension}
      activeFilters={activeFilters}
      searchParams={searchParams}
      views={views}
      onLoadView={onLoadView}
      onDeleteView={onDeleteView}
      onSaveView={onSaveView}
      onReplaceView={onReplaceView}
      hasViewWithName={hasViewWithName}
      restoreDefaults={restoreDefaults}
      chartsExpanded={chartsExpanded}
      onToggleCharts={onToggleCharts}
      comparisonVisible={comparisonVisible}
      onOpenQuery={onOpenQuery}
      partnerOptions={partnerOptions}
      typeOptions={typeOptions}
      batchOptions={batchOptions}
      selectedPartner={selectedPartner}
      selectedType={selectedType}
      selectedBatch={selectedBatch}
      snapshotRef={snapshotRef}
      loadViewRef={loadViewRef}
    />
  );
}

// ---------------------------------------------------------------------------
// QueryCommandDialogWithContext — lives inside AnomalyProvider
// ---------------------------------------------------------------------------

function QueryCommandDialogWithContext({
  open,
  onOpenChange,
  drillState,
  allData,
  onRemoveScope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drillState: DrillState;
  allData: Record<string, unknown>[];
  onRemoveScope: () => void;
}) {
  const { partnerAnomalies } = useAnomalyContext();

  const dataContext = useMemo(() => {
    if (!allData || allData.length === 0) return '';

    const partnerGroups = new Map<string, Record<string, unknown>[]>();
    for (const row of allData) {
      const name = getPartnerName(row);
      if (!name) continue;
      if (!partnerGroups.has(name)) partnerGroups.set(name, []);
      partnerGroups.get(name)!.push(row);
    }

    const partners: PartnerSummary[] = Array.from(partnerGroups.entries()).map(
      ([name, rows]) => ({
        name,
        batchCount: rows.length,
        stats: computeKpis(rows),
      }),
    );

    return buildDataContext(
      {
        level: drillState.level,
        partnerId: drillState.partner,
        batchId: drillState.batch,
      },
      { partners, anomalies: partnerAnomalies },
    );
  }, [allData, drillState, partnerAnomalies]);

  return (
    <QueryCommandDialog
      open={open}
      onOpenChange={onOpenChange}
      drillState={drillState}
      dataContext={dataContext}
      onRemoveScope={onRemoveScope}
    />
  );
}
