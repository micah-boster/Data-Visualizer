'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { useData } from '@/hooks/use-data';
import { useDataFreshness } from '@/contexts/data-freshness';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DataDisplay() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useData();
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

  // Get first 5 rows for preview
  const previewRows = data.data.slice(0, 5);
  const columns = data.meta.columns;

  return (
    <div className="space-y-4">
      {/* Schema warnings */}
      {hasSchemaWarnings && (
        <Alert className="relative">
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

      {/* Summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Data Summary</CardTitle>
            <CardDescription>
              {data.meta.rowCount.toLocaleString()} rows loaded &middot;{' '}
              {columns.length} columns
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Data preview -- simple grid showing first 5 rows */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 whitespace-nowrap text-xs"
                      >
                        {row[col] != null ? String(row[col]) : '\u2014'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing first {previewRows.length} of {data.meta.rowCount.toLocaleString()} rows.
            Full table view coming in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
