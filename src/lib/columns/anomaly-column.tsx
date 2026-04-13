'use client';

import { createElement } from 'react';
import type { ColumnDef, CellContext } from '@tanstack/react-table';
import type { PartnerAnomaly, BatchAnomaly, MetricNorm } from '@/types/partner-stats';
import type { DrillLevel } from '@/hooks/use-drill-down';
import { AnomalyBadge } from '@/components/anomaly/anomaly-badge';
import { AnomalyDetail } from '@/components/anomaly/anomaly-detail';
import { classifySeverity } from '@/lib/formatting/anomaly-labels';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

/** Extended table meta with anomaly data. */
export interface AnomalyTableMeta {
  drillLevel?: DrillLevel;
  anomalyMap?: Map<string, PartnerAnomaly>;
  norms?: Record<string, MetricNorm> | null;
}

/**
 * Render the anomaly badge + popover for a cell.
 * Returns null for non-flagged rows (empty cell).
 */
function AnomalyCell({
  anomaly,
  norms,
  entityName,
}: {
  anomaly: BatchAnomaly | PartnerAnomaly;
  norms: Record<string, MetricNorm> | null;
  entityName: string;
}) {
  const flags = 'flags' in anomaly ? anomaly.flags : (anomaly.latestBatch?.flags ?? []);
  const severity = classifySeverity({ flags, severityScore: anomaly.severityScore });

  return (
    <Popover>
      <PopoverTrigger>
        <AnomalyBadge severity={severity} onClick={() => {}} />
      </PopoverTrigger>
      <PopoverContent side="right" sideOffset={8} className="w-80">
        <AnomalyDetail anomaly={anomaly} norms={norms} entityName={entityName} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Cell renderer for the anomaly status column.
 */
function renderAnomalyStatus(
  ctx: CellContext<Record<string, unknown>, unknown>,
): React.ReactNode {
  const meta = ctx.table.options.meta as AnomalyTableMeta | undefined;
  if (!meta?.anomalyMap) return null;

  const drillLevel = meta.drillLevel ?? 'root';

  // At batch (account) level, no anomaly badges
  if (drillLevel === 'batch') return null;

  const partnerName = String(ctx.row.original.PARTNER_NAME ?? '');
  const partnerAnomaly = meta.anomalyMap.get(partnerName);

  if (drillLevel === 'root') {
    // Root level: show partner anomaly (based on latest batch)
    if (!partnerAnomaly?.isFlagged) return null;
    return createElement(AnomalyCell, {
      anomaly: partnerAnomaly,
      norms: meta.norms ?? null,
      entityName: partnerName,
    });
  }

  if (drillLevel === 'partner') {
    // Partner level: show batch anomaly
    if (!partnerAnomaly) return null;
    const batchName = String(ctx.row.original.BATCH ?? '');
    const batchAnomaly = partnerAnomaly.batches.find(
      (b) => b.batchName === batchName,
    );
    if (!batchAnomaly?.isFlagged) return null;
    return createElement(AnomalyCell, {
      anomaly: batchAnomaly,
      norms: meta.norms ?? null,
      entityName: `${partnerName} \u2014 ${batchName}`,
    });
  }

  return null;
}

/**
 * TanStack Table ColumnDef for the anomaly Status column.
 *
 * - Prepended to column array (leftmost position)
 * - Not sortable, not hideable, not resizable
 * - Fixed 40px width
 * - Reads anomaly data from table meta
 */
export const anomalyStatusColumn: ColumnDef<Record<string, unknown>> = {
  id: '__anomaly_status',
  header: '',
  cell: renderAnomalyStatus,
  size: 40,
  minSize: 40,
  maxSize: 40,
  enableSorting: false,
  enableHiding: false,
  enableResizing: false,
};
