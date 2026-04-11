'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
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

  // Client-side filter for partner drill-down (no new API call needed)
  const tableData = useMemo(() => {
    if (!data?.data) return [];
    if (drillState.level === 'partner' && drillState.partner) {
      return data.data.filter(
        (row) => String(row.PARTNER_NAME ?? '') === drillState.partner,
      );
    }
    // Root level and batch level (batch handled by Plan 08-02)
    return data.data;
  }, [data?.data, drillState.level, drillState.partner]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState />;
  }

  const hasSchemaWarnings =
    !schemaWarningDismissed &&
    data.schemaWarnings &&
    (data.schemaWarnings.missing.length > 0 || data.schemaWarnings.unexpected.length > 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-2">
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
        <DataTable
          key={`${drillState.level}-${drillState.partner ?? ''}`}
          data={tableData}
          isFetching={isFetching}
          drillState={drillState}
          onDrillToPartner={drillToPartner}
          onDrillToBatch={drillToBatch}
          onNavigateToLevel={navigateToLevel}
          totalRowCount={data.data.length}
        />
      </div>
    </div>
  );
}
