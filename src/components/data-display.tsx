'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useAccountData } from '@/hooks/use-account-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
import { accountColumnDefs } from '@/lib/columns/account-definitions';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable } from '@/components/table/data-table';

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
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-2 overflow-x-hidden">
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

      {/* Interactive data table with drill-down */}
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
          />
        )}
      </div>
    </div>
  );
}
