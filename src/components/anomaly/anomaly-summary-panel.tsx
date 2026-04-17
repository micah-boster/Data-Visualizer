'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import {
  classifySeverity,
  getMetricLabel,
  formatDeviation,
  SEVERITY_BG_COLORS,
  SEVERITY_LABELS,
} from '@/lib/formatting/anomaly-labels';

interface AnomalySummaryPanelProps {
  onDrillToPartner: (name: string) => void;
}

/**
 * Collapsible anomaly summary panel for root-level view.
 *
 * Collapsed: compact bar showing "X anomalies detected" with expand toggle.
 * Expanded: top 5 flagged partners sorted by severity, each clickable to drill in.
 * Not rendered when there are no anomalies.
 */
export function AnomalySummaryPanel({ onDrillToPartner }: AnomalySummaryPanelProps) {
  const { partnerAnomalies } = useAnomalyContext();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get flagged partners sorted by severity (descending)
  const flaggedPartners = [...partnerAnomalies.entries()]
    .filter(([, anomaly]) => anomaly.isFlagged)
    .sort((a, b) => b[1].severityScore - a[1].severityScore)
    .slice(0, 5);

  // Don't render if no anomalies
  if (flaggedPartners.length === 0) return null;

  const totalFlagged = [...partnerAnomalies.values()].filter((a) => a.isFlagged).length;

  return (
    <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-amber-800 dark:text-amber-200"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-title">
          {totalFlagged} anomal{totalFlagged === 1 ? 'y' : 'ies'} detected
        </span>
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Expanded list */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: isExpanded ? `${flaggedPartners.length * 48 + 8}px` : '0px',
        }}
      >
        <div className="space-y-0.5 px-3 pb-2">
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
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-caption transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30"
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
      </div>
    </div>
  );
}
