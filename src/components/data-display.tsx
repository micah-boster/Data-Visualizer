'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useAccountData } from '@/hooks/use-account-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
import { accountColumnDefs } from '@/lib/columns/account-definitions';
import dynamic from 'next/dynamic';
import { usePartnerStats } from '@/hooks/use-partner-stats';
import { PartnerNormsProvider } from '@/contexts/partner-norms';
import { AnomalyProvider } from '@/contexts/anomaly-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable } from '@/components/table/data-table';
import { KpiSummaryCards } from '@/components/kpi/kpi-summary-cards';
import { AnomalySummaryPanel } from '@/components/anomaly/anomaly-summary-panel';

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
        (row) => String(row.PARTNER_NAME ?? '') === drillState.partner,
      );
    }
    return data.data;
  }, [data?.data, accountData?.data, drillState.level, drillState.partner]);

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
    <AnomalyProvider allRows={data.data}>
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-2">
      {/* Anomaly summary panel at root level */}
      {drillState.level === 'root' && (
        <AnomalySummaryPanel onDrillToPartner={drillToPartner} />
      )}

      {/* Schema warnings */}
      {hasSchemaWarnings && (
        <Alert className="relative shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="pr-8">
            <span className="font-medium">Schema mismatch detected. </span>
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

      {/* KPI summary cards at partner drill-down level */}
      {drillState.level === 'partner' && (
        <div className="shrink-0">
          <KpiSummaryCards
            kpis={partnerStats?.kpis ?? null}
            trending={partnerStats?.trending ?? null}
          />
        </div>
      )}

      {/* Collection curve chart at partner drill-down level */}
      {drillState.level === 'partner' &&
        partnerStats?.curves &&
        partnerStats.curves.length >= 2 && (
          <div className="shrink-0">
            <CollectionCurveChart curves={partnerStats.curves} />
          </div>
        )}

      {/* Single-batch curve at batch drill-down level */}
      {drillState.level === 'batch' &&
        drillState.batch &&
        partnerStats?.curves && (() => {
          const batchCurve = partnerStats.curves.filter(
            (c) => c.batchName === drillState.batch,
          );
          return batchCurve.length > 0 ? (
            <div className="shrink-0">
              <CollectionCurveChart curves={batchCurve} />
            </div>
          ) : null;
        })()}

      {/* Interactive data table with drill-down */}
      <PartnerNormsProvider norms={partnerStats?.norms ?? null}>
        <div className="min-h-0 flex-1">
          {drillState.level === 'batch' && isAccountLoading ? (
            <LoadingState />
          ) : (
            <DataTable
              key={`${drillState.level}-${drillState.partner ?? ''}-${drillState.batch ?? ''}`}
              data={tableData}
              isFetching={drillState.level === 'batch' ? false : isFetching}
              drillState={drillState}
              onDrillToPartner={drillToPartner}
              onDrillToBatch={drillToBatch}
              onNavigateToLevel={navigateToLevel}
              totalRowCount={data.data.length}
              columnDefs={drillState.level === 'batch' ? accountColumnDefs : undefined}
              partnerRowCount={
                drillState.level === 'batch' && drillState.partner
                  ? data.data.filter((r) => String(r.PARTNER_NAME ?? '') === drillState.partner).length
                  : undefined
              }
              trendingData={drillState.level === 'partner' ? partnerStats?.trending ?? null : null}
            />
          )}
        </div>
      </PartnerNormsProvider>
    </div>
    </AnomalyProvider>
  );
}
