/**
 * Builds a focused data summary string for Claude's system prompt based on the
 * current drill level. Receives pre-computed data (partner stats, anomalies)
 * and formats it — does NOT query Snowflake or read files.
 *
 * Three context levels (from CONTEXT.md locked decisions):
 * - Root: partner summaries + anomaly flags
 * - Partner: full detail + portfolio rank comparisons
 * - Batch: batch aggregates + parent partner summary + outlier accounts
 *
 * Token budget targets:
 * - Root (~8-10 partners): ~1000-1500 tokens
 * - Partner detail: ~500-800 tokens
 * - Batch detail: ~300-500 tokens
 */

import type { DrillLevel } from '@/hooks/use-drill-down';
import type { KpiAggregates, PartnerAnomaly } from '@/types/partner-stats';

/** Minimal partner data needed by the context builder */
export interface PartnerSummary {
  name: string;
  stats: KpiAggregates;
  batchCount: number;
}

/** Account-level outlier for batch context */
export interface AccountOutlier {
  accountId: string;
  balance: number;
  penetration: number;
}

export interface ContextData {
  partners: PartnerSummary[];
  anomalies: Map<string, PartnerAnomaly>;
  currentPartnerStats?: KpiAggregates;
  accountOutliers?: AccountOutlier[];
}

export function buildDataContext(
  drillState: {
    level: DrillLevel;
    partnerId: string | null;
    batchId: string | null;
  },
  data: ContextData,
): string {
  if (!data.partners || data.partners.length === 0) {
    return 'No data currently loaded.';
  }

  switch (drillState.level) {
    case 'root':
      return buildRootContext(data.partners, data.anomalies);
    case 'partner':
      return buildPartnerContext(
        drillState.partnerId,
        data.partners,
        data.anomalies,
        data.currentPartnerStats,
      );
    case 'batch':
      return buildBatchContext(
        drillState.batchId,
        drillState.partnerId,
        data.partners,
        data.anomalies,
        data.accountOutliers,
      );
    default:
      return 'No data currently loaded.';
  }
}

// ---------------------------------------------------------------------------
// Root level: all partner summaries + anomaly flags
// ---------------------------------------------------------------------------

function buildRootContext(
  partners: PartnerSummary[],
  anomalies: Map<string, PartnerAnomaly>,
): string {
  const lines: string[] = [
    '## Portfolio Overview',
    `Total partners: ${partners.length}`,
    '',
    '| Partner | Batches | Penetration | 6mo Collection | 12mo Collection | Total Collected | Anomaly |',
    '|---------|---------|-------------|----------------|-----------------|-----------------|---------|',
  ];

  for (const p of partners) {
    const anomaly = anomalies.get(p.name);
    const anomalyStatus = anomaly?.isFlagged
      ? `FLAGGED (severity: ${anomaly.severityScore.toFixed(1)}, ${anomaly.flaggedBatchCount} batch${anomaly.flaggedBatchCount === 1 ? '' : 'es'})`
      : 'OK';

    lines.push(
      `| ${p.name} | ${p.batchCount} | ${fmt.pct(p.stats.weightedPenetrationRate)} | ${fmt.pct(p.stats.collectionRate6mo)} | ${fmt.pct(p.stats.collectionRate12mo)} | ${fmt.currency(p.stats.totalCollected)} | ${anomalyStatus} |`,
    );
  }

  const flaggedCount = partners.filter((p) => anomalies.get(p.name)?.isFlagged).length;
  if (flaggedCount > 0) {
    lines.push('');
    lines.push(`**${flaggedCount} partner(s) flagged** with anomalous batches.`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Partner level: full detail for current partner + portfolio rank
// ---------------------------------------------------------------------------

function buildPartnerContext(
  partnerId: string | null,
  partners: PartnerSummary[],
  anomalies: Map<string, PartnerAnomaly>,
  currentStats?: KpiAggregates,
): string {
  if (!partnerId) return 'No partner selected.';

  const partner = partners.find((p) => p.name === partnerId);
  const stats = currentStats ?? partner?.stats;
  if (!stats) return `No data available for partner "${partnerId}".`;

  const anomaly = anomalies.get(partnerId);
  const lines: string[] = [`## Partner: ${partnerId}`, ''];

  // Key metrics
  lines.push('### Key Metrics');
  lines.push(`- Batches: ${partner?.batchCount ?? 'N/A'}`);
  lines.push(`- Total accounts: ${stats.totalAccounts.toLocaleString()}`);
  lines.push(`- Penetration rate: ${fmt.pct(stats.weightedPenetrationRate)}`);
  lines.push(`- 6-month collection rate: ${fmt.pct(stats.collectionRate6mo)}`);
  lines.push(`- 12-month collection rate: ${fmt.pct(stats.collectionRate12mo)}`);
  lines.push(`- Total collected: ${fmt.currency(stats.totalCollected)}`);
  lines.push(`- Total placed: ${fmt.currency(stats.totalPlaced)}`);

  // Portfolio rank comparisons
  if (partners.length > 1) {
    lines.push('');
    lines.push('### Portfolio Rank');
    const ranked = rankPartner(partnerId, partners);
    for (const r of ranked) {
      lines.push(`- ${r.metric}: ${r.rank} of ${partners.length} partners`);
    }
  }

  // Anomaly detail
  if (anomaly) {
    lines.push('');
    lines.push('### Anomaly Status');
    if (anomaly.isFlagged) {
      lines.push(
        `FLAGGED — severity ${anomaly.severityScore.toFixed(1)}, ${anomaly.flaggedBatchCount} of ${anomaly.totalBatchCount} batches anomalous`,
      );
      if (anomaly.latestBatch) {
        const flags = anomaly.latestBatch.flags
          .map(
            (f) =>
              `${f.metric}: ${f.value.toFixed(2)} (${f.zScore.toFixed(1)} SD ${f.direction})`,
          )
          .join('; ');
        lines.push(`Latest batch (${anomaly.latestBatch.batchName}): ${flags}`);
      }
    } else {
      lines.push('No anomalies detected.');
    }
  }

  // Note about future enhancement
  lines.push('');
  lines.push(
    '_Note: Currently showing current partner detail only. Future enhancement: full cross-partner context at every level._',
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Batch level: batch aggregates + parent partner summary + outliers
// ---------------------------------------------------------------------------

function buildBatchContext(
  batchId: string | null,
  partnerId: string | null,
  partners: PartnerSummary[],
  anomalies: Map<string, PartnerAnomaly>,
  accountOutliers?: AccountOutlier[],
): string {
  if (!batchId || !partnerId)
    return 'No batch selected.';

  const partner = partners.find((p) => p.name === partnerId);
  const anomaly = anomalies.get(partnerId);
  const batchAnomaly = anomaly?.batches.find((b) => b.batchName === batchId);

  const lines: string[] = [
    `## Batch: ${batchId}`,
    `### Parent Partner: ${partnerId}`,
    '',
  ];

  // Parent partner summary
  if (partner) {
    lines.push(`Partner has ${partner.batchCount} total batches.`);
    lines.push(`Partner penetration: ${fmt.pct(partner.stats.weightedPenetrationRate)}`);
    lines.push(`Partner 6mo collection: ${fmt.pct(partner.stats.collectionRate6mo)}`);
    lines.push(`Partner total collected: ${fmt.currency(partner.stats.totalCollected)}`);
    lines.push('');
  }

  // Batch anomaly status
  if (batchAnomaly) {
    lines.push('### Batch Anomaly Status');
    if (batchAnomaly.isFlagged) {
      lines.push(
        `FLAGGED — severity ${batchAnomaly.severityScore.toFixed(1)}`,
      );
      for (const flag of batchAnomaly.flags) {
        lines.push(
          `- ${flag.metric}: ${flag.value.toFixed(2)} (${flag.zScore.toFixed(1)} SD ${flag.direction})`,
        );
      }
    } else {
      lines.push('No anomalies on this batch.');
    }
    lines.push('');
  }

  // Outlier accounts
  if (accountOutliers && accountOutliers.length > 0) {
    lines.push('### Notable Accounts (top outliers)');
    for (const acct of accountOutliers.slice(0, 10)) {
      lines.push(
        `- Account ${acct.accountId}: balance ${fmt.currency(acct.balance)}, penetration ${fmt.pct(acct.penetration)}`,
      );
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = {
  pct: (v: number) => `${(v * 100).toFixed(1)}%`,
  currency: (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  },
};

interface RankEntry {
  metric: string;
  rank: number;
}

function rankPartner(partnerId: string, partners: PartnerSummary[]): RankEntry[] {
  const metrics: Array<{ key: keyof KpiAggregates; label: string; higherIsBetter: boolean }> = [
    { key: 'weightedPenetrationRate', label: 'Penetration rate', higherIsBetter: true },
    { key: 'collectionRate6mo', label: '6-month collection rate', higherIsBetter: true },
    { key: 'collectionRate12mo', label: '12-month collection rate', higherIsBetter: true },
    { key: 'totalCollected', label: 'Total collected', higherIsBetter: true },
  ];

  return metrics.map(({ key, label, higherIsBetter }) => {
    const sorted = [...partners].sort((a, b) => {
      const aVal = a.stats[key] as number;
      const bVal = b.stats[key] as number;
      return higherIsBetter ? bVal - aVal : aVal - bVal;
    });
    const rank = sorted.findIndex((p) => p.name === partnerId) + 1;
    return { metric: label, rank: rank || partners.length };
  });
}
