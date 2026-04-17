'use client';

import type { BatchAnomaly, PartnerAnomaly, MetricNorm, AnomalyGroup } from '@/types/partner-stats';
import {
  classifySeverity,
  getMetricLabel,
  formatExpectedRange,
  formatDeviation,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '@/lib/formatting/anomaly-labels';
import { getFormatter } from '@/lib/formatting/numbers';
import { COLUMN_CONFIGS } from '@/lib/columns/config';

interface AnomalyDetailProps {
  /** Batch or partner anomaly data to display */
  anomaly: BatchAnomaly | PartnerAnomaly;
  /** Partner norms for computing expected ranges */
  norms: Record<string, MetricNorm> | null;
  /** Entity name shown in the header */
  entityName: string;
}

/**
 * Popover content showing all anomalous metrics for a flagged entity.
 *
 * Displays: severity header, grouped metrics with actual values,
 * expected ranges, and deviation magnitudes.
 *
 * Typography migrated to Phase 27 tokens. See docs/TYPE-MIGRATION.md
 * for the ad-hoc → token mapping used here.
 */
export function AnomalyDetail({ anomaly, norms, entityName }: AnomalyDetailProps) {
  // Get flags and groups from either BatchAnomaly or PartnerAnomaly
  const flags = 'flags' in anomaly ? anomaly.flags : (anomaly.latestBatch?.flags ?? []);
  const groups = 'groups' in anomaly ? anomaly.groups : (anomaly.latestBatch?.groups ?? []);

  const severity = classifySeverity({ flags, severityScore: anomaly.severityScore });

  return (
    <div className="max-w-xs space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`text-title ${SEVERITY_COLORS[severity]}`}>
          {SEVERITY_LABELS[severity]}
        </span>
        <span className="text-caption text-muted-foreground">
          {flags.length} anomalous metric{flags.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-caption text-muted-foreground">{entityName}</p>

      {/* Grouped metrics */}
      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map((group: AnomalyGroup) => (
            <div key={group.groupKey}>
              <p className="text-label text-muted-foreground">{group.label}</p>
              <ul className="mt-1 space-y-1.5">
                {group.flags.map((flag) => {
                  const config = COLUMN_CONFIGS.find((c) => c.key === flag.metric);
                  const formatter = getFormatter(config?.type ?? 'number');
                  const norm = norms?.[flag.metric];

                  return (
                    <li key={flag.metric} className="text-caption">
                      <span>{getMetricLabel(flag.metric)}:</span>{' '}
                      <span>{formatter(flag.value)}</span>
                      {norm && (
                        <span className="text-muted-foreground">
                          {' '}(expected {formatExpectedRange(norm.mean, norm.stddev, flag.metric)})
                        </span>
                      )}
                      <br />
                      <span className={SEVERITY_COLORS[severity]}>
                        {formatDeviation(flag.zScore, flag.direction)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        /* Ungrouped flags fallback */
        <ul className="space-y-1.5">
          {flags.map((flag) => {
            const config = COLUMN_CONFIGS.find((c) => c.key === flag.metric);
            const formatter = getFormatter(config?.type ?? 'number');
            const norm = norms?.[flag.metric];

            return (
              <li key={flag.metric} className="text-caption">
                <span>{getMetricLabel(flag.metric)}:</span>{' '}
                <span>{formatter(flag.value)}</span>
                {norm && (
                  <span className="text-muted-foreground">
                    {' '}(expected {formatExpectedRange(norm.mean, norm.stddev, flag.metric)})
                  </span>
                )}
                <br />
                <span className={SEVERITY_COLORS[severity]}>
                  {formatDeviation(flag.zScore, flag.direction)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
