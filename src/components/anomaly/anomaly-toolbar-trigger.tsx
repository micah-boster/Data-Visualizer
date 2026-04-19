'use client';

import { AlertTriangle } from 'lucide-react';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import {
  classifySeverity,
  getMetricLabel,
  formatDeviation,
  SEVERITY_BG_COLORS,
  SEVERITY_LABELS,
} from '@/lib/formatting/anomaly-labels';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface AnomalyToolbarTriggerProps {
  onDrillToPartner: (name: string) => void;
}

/**
 * Toolbar icon button with popover showing flagged partners.
 * Hidden when no anomalies. Badge shows count.
 */
export function AnomalyToolbarTrigger({ onDrillToPartner }: AnomalyToolbarTriggerProps) {
  const { partnerAnomalies } = useAnomalyContext();

  const flaggedPartners = [...partnerAnomalies.entries()]
    .filter(([, anomaly]) => anomaly.isFlagged)
    .sort((a, b) => b[1].severityScore - a[1].severityScore)
    .slice(0, 8);

  const totalFlagged = [...partnerAnomalies.values()].filter((a) => a.isFlagged).length;

  if (totalFlagged === 0) return null;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                aria-label={`Show anomalies (${totalFlagged})`}
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span
                  aria-hidden="true"
                  className="text-label-numeric absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-white"
                >
                  {totalFlagged}
                </span>
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Anomalies detected</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="end">
        <PopoverHeader>
          <PopoverTitle>
            {totalFlagged} anomal{totalFlagged === 1 ? 'y' : 'ies'} detected
          </PopoverTitle>
        </PopoverHeader>
        <div className="space-y-0.5">
          {flaggedPartners.map(([partnerName, anomaly]) => {
            const severity = classifySeverity({
              flags: anomaly.latestBatch?.flags ?? [],
              severityScore: anomaly.severityScore,
            });
            const topFlag = anomaly.latestBatch?.flags[0];

            return (
              <button
                key={partnerName}
                type="button"
                onClick={() => onDrillToPartner(partnerName)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-caption transition-colors hover:bg-muted"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_BG_COLORS[severity]}`}
                />
                <span className="text-label text-foreground">{partnerName}</span>
                <span className="text-muted-foreground">{SEVERITY_LABELS[severity]}</span>
                {topFlag && (
                  <span className="ml-auto truncate text-muted-foreground">
                    {getMetricLabel(topFlag.metric)}{' '}
                    {formatDeviation(topFlag.zScore, topFlag.direction)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
