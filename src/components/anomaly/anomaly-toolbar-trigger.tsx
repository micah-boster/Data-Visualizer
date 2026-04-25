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
import { parsePairKey, type PartnerProductPair } from '@/lib/partner-config/pair';

interface AnomalyToolbarTriggerProps {
  /** Phase 39 PCFG-03 — pair-aware drill (anomaly map is keyed by pairKey). */
  onDrillToPair: (pair: PartnerProductPair) => void;
}

/**
 * Toolbar icon button with popover showing flagged pairs.
 * Hidden when no anomalies. Badge shows count.
 *
 * Phase 39 PCFG-03: anomalies are keyed by `(partner, product)` pair, not
 * partner name. Display shows the pair's display name (suffixed for
 * multi-product partners — the buildAllPairAnomalies producer stamps a
 * `displayName` on each PartnerAnomaly entry, see compute-anomalies.ts).
 */
export function AnomalyToolbarTrigger({ onDrillToPair }: AnomalyToolbarTriggerProps) {
  const { partnerAnomalies } = useAnomalyContext();

  const flaggedPairs = [...partnerAnomalies.entries()]
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
          {flaggedPairs.map(([key, anomaly]) => {
            const severity = classifySeverity({
              flags: anomaly.latestBatch?.flags ?? [],
              severityScore: anomaly.severityScore,
            });
            const topFlag = anomaly.latestBatch?.flags[0];
            const pair = parsePairKey(key);
            // displayName is stamped on the anomaly entry by compute-anomalies.ts;
            // fall back to the parsed pair's partner for legacy entries.
            const label =
              anomaly.displayName ?? pair?.partner ?? key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (pair) onDrillToPair(pair);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-caption transition-colors hover:bg-muted"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY_BG_COLORS[severity]}`}
                />
                <span className="text-label text-foreground">{label}</span>
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
