'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp, BarChart3, GitCompareArrows } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useAccountData } from '@/hooks/use-account-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
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
import { AnomalySummaryPanel } from '@/components/anomaly/anomaly-summary-panel';
import { QuerySearchBar } from '@/components/query/query-search-bar';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import { buildDataContext, type PartnerSummary } from '@/lib/ai/context-builder';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { getPartnerName } from '@/lib/utils';
import type { DrillState } from '@/hooks/use-drill-down';

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
  const [chartsExpanded, setChartsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('charts-expanded') !== 'false';
  });
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const toggleCharts = () => {
    setChartsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('charts-expanded', String(next));
      return next;
    });
  };

  // Sync freshness state to context so header can display it
  useEffect(() => {
    if (data?.meta?.fetchedAt) {
      setFetchedAt(data.meta.fetchedAt);
    }
  }, [data?.meta?.fetchedAt, setFetchedAt]);

  useEffect(() => {
    setIsFetching(isFetching);
  }, [isFetching, setIsFetching]);

  // Data source depends on drill level:
  // root/partner: batch data (client-side filtered for partner)
  // batch: account data from dedicated API
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

  // Memoize unique partner count to avoid re-creating Set on every render
  const uniquePartnerCount = useMemo(
    () => new Set(data?.data?.map((r) => getPartnerName(r))).size,
    [data?.data],
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState />;
  }

  // Account-level error state (batch data failed but root data loaded fine)
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
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-2">
      {/* AI Query search bar — always visible across drill levels */}
      <QuerySearchBarWithContext
        drillState={drillState}
        allData={data.data}
        onRemoveScope={() => navigateToLevel('root')}
      />

      {/* Anomaly summary panel at root level */}
      {drillState.level === 'root' && (
        <AnomalySummaryPanel onDrillToPartner={drillToPartner} />
      )}

      {/* Collapsible visualization section at root level */}
      {drillState.level === 'root' && (
        <div className="shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex flex-1 items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={toggleCharts}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Charts</span>
              {chartsExpanded ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
            </button>
            {chartsExpanded && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => setComparisonVisible((v) => !v)}
              >
                <GitCompareArrows className="mr-1 h-3.5 w-3.5" />
                {comparisonVisible ? 'Hide Comparison' : 'Compare Partners'}
              </Button>
            )}
          </div>
          {chartsExpanded && (
            <div className="mt-2 space-y-2">
              <CrossPartnerTrajectoryChart />
              {comparisonVisible && <PartnerComparisonMatrix />}
            </div>
          )}
          {!chartsExpanded && <RootSparkline />}
        </div>
      )}

      {/* Schema warnings */}
      {hasSchemaWarnings && (
        <Alert className="relative shrink-0">
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
                {data.schemaWarnings!.unexpected.length} unexpected column(s) found in Snowflake.
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

      {/* Collapsible KPI + chart at partner level */}
      {drillState.level === 'partner' && (
        <div className="shrink-0">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            onClick={toggleCharts}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Charts</span>
            {chartsExpanded ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
          </button>
          {chartsExpanded && (
            <div className="mt-2 space-y-2">
              <KpiSummaryCards
                kpis={partnerStats?.kpis ?? null}
                trending={partnerStats?.trending ?? null}
              />
              {partnerStats?.curves && partnerStats.curves.length >= 2 && (
                <CollectionCurveChart curves={partnerStats.curves} />
              )}
            </div>
          )}
          {!chartsExpanded && partnerStats?.curves && partnerStats.curves.length >= 2 && (
            <PartnerSparkline curves={partnerStats.curves} />
          )}
        </div>
      )}

      {/* Single-batch curve at batch drill-down level */}
      {batchCurve && (
        <div className="shrink-0">
          <CollectionCurveChart curves={batchCurve} />
        </div>
      )}

      {/* Interactive data table with drill-down */}
      <PartnerNormsProvider norms={partnerStats?.norms ?? null}>
        <div className="min-h-0 flex-1">
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
            />
          )}
        </div>
      </PartnerNormsProvider>
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
// CrossPartnerDataTable — reads cross-partner context and passes to DataTable
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
    />
  );
}

// ---------------------------------------------------------------------------
// QuerySearchBarWithContext — lives inside AnomalyProvider to access anomaly data
// ---------------------------------------------------------------------------

function QuerySearchBarWithContext({
  drillState,
  allData,
  onRemoveScope,
}: {
  drillState: DrillState;
  allData: Record<string, unknown>[];
  onRemoveScope: () => void;
}) {
  const { partnerAnomalies } = useAnomalyContext();

  const dataContext = useMemo(() => {
    if (!allData || allData.length === 0) return '';

    // Build partner summaries from batch-level data rows
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
    <QuerySearchBar
      drillState={drillState}
      dataContext={dataContext}
      onRemoveScope={onRemoveScope}
    />
  );
}
