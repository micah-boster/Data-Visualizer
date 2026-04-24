'use client';

import { StatCard } from '@/components/patterns/stat-card';
import {
  formatCount,
  formatPercentage,
  formatAbbreviatedCurrency,
} from '@/lib/formatting';
import {
  selectCascadeTier,
  type CascadeRateKey,
} from '@/lib/computation/compute-kpis';
import type { KpiAggregates, TrendingData } from '@/types/partner-stats';

/** Identity/volume cards — never vary with batch age; always rendered. */
interface IdentityCardSpec {
  kind: 'identity';
  key: keyof KpiAggregates;
  label: string;
  format: (v: number) => string;
}

/** Rate cards — age-driven cascade picks which of these render (KPI-01). */
interface RateCardSpec {
  kind: 'rate';
  key: CascadeRateKey;
  /** KPI-aggregate field backing this rate (also used for trend metric lookup). */
  aggregateKey: keyof KpiAggregates;
  label: string;
  format: (v: number) => string;
  /** Snowflake column name for rolling-avg trend lookup. */
  trendMetric?: string;
}

type CardSpec = IdentityCardSpec | RateCardSpec;

/** Identity/volume cards — always shown. */
const IDENTITY_CARDS: IdentityCardSpec[] = [
  { kind: 'identity', key: 'totalBatches', label: 'Batches', format: formatCount },
  { kind: 'identity', key: 'totalAccounts', label: 'Accounts', format: formatCount },
  {
    kind: 'identity',
    key: 'weightedPenetrationRate',
    label: 'Penetration',
    format: (v) => formatPercentage(v, 1),
  },
  {
    kind: 'identity',
    key: 'totalCollected',
    label: 'Total Collected',
    format: formatAbbreviatedCurrency,
  },
];

/**
 * Rate-card catalog keyed by cascade tier. `selectCascadeTier` returns the
 * subset of keys to render for the cohort's max batch age.
 *
 * `trendMetric` maps to the Snowflake column whose rolling-avg delta is
 * surfaced on the card. `rateSinceInception` has no single-column trend
 * source (it's a lifetime aggregate); no trend wire-up.
 */
const RATE_CARDS: Record<CascadeRateKey, RateCardSpec> = {
  rate3mo: {
    kind: 'rate',
    key: 'rate3mo',
    aggregateKey: 'collectionRate3mo',
    label: '3mo Rate',
    format: (v) => formatPercentage(v, 1),
    // Existing TRENDING_METRICS does not include COLLECTION_AFTER_3_MONTH;
    // 3mo cards rely on the card-level suppression flag for absence-of-delta
    // and omit rolling-avg delta until Phase 40 adds projected-curve baseline.
  },
  rate6mo: {
    kind: 'rate',
    key: 'rate6mo',
    aggregateKey: 'collectionRate6mo',
    label: '6mo Rate',
    format: (v) => formatPercentage(v, 1),
    trendMetric: 'COLLECTION_AFTER_6_MONTH',
  },
  rate12mo: {
    kind: 'rate',
    key: 'rate12mo',
    aggregateKey: 'collectionRate12mo',
    label: '12mo Rate',
    format: (v) => formatPercentage(v, 1),
    trendMetric: 'COLLECTION_AFTER_12_MONTH',
  },
  rateSinceInception: {
    kind: 'rate',
    key: 'rateSinceInception',
    aggregateKey: 'collectionRateSinceInception',
    label: 'Rate Since Inception',
    format: (v) => formatPercentage(v, 1),
    // Age-agnostic lifetime rate — no horizon-matched trending metric exists.
  },
};

interface KpiSummaryCardsProps {
  kpis: KpiAggregates | null;
  trending: TrendingData | null;
}

/**
 * KPI summary grid rendered above the batch table at partner drill-down.
 *
 * Phase 38 KPI-01/02/04 rewrite:
 *   - Cascade-driven: `selectCascadeTier(maxBatchAgeMonths)` chooses which
 *     rate cards render. Non-applicable tiers are NOT rendered (no placeholder
 *     tiles for "12mo rate / no data yet").
 *   - Locked delta copy: every rolling-avg delta reads "vs 3-batch rolling avg"
 *     (StatCard's default `trendLabel`).
 *   - Per-horizon suppression: `trending.suppressDelta[key]` gates the trend
 *     wire-up per card; when suppressed the card renders value only (no "vs N/A",
 *     no misleading 0%).
 *
 * Handles three states:
 *   - Loading (`kpis === null`): skeleton StatCards.
 *   - Zero-batch partner: single "no data" message.
 *   - Normal: identity cards + cascade-selected rate cards.
 */
export function KpiSummaryCards({ kpis, trending }: KpiSummaryCardsProps) {
  // Loading state: skeleton cards via StatCard's loading branch.
  // Width grid sized for the worst case (identity + 2 rate = 6 slots).
  if (kpis === null) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCard key={i} label="" value="" loading />
        ))}
      </div>
    );
  }

  // Zero-batch partner: no data message
  if (kpis.totalBatches === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-surface-raised shadow-elevation-raised">
        <span className="text-body text-muted-foreground">
          No batch data available for this partner
        </span>
      </div>
    );
  }

  const cascadeKeys = selectCascadeTier(kpis.maxBatchAgeMonths);
  const rateCards = cascadeKeys.map((k) => RATE_CARDS[k]);
  const cards: CardSpec[] = [...IDENTITY_CARDS, ...rateCards];

  // Grid width adapts to card count (1 tier = 5 slots total, 2 tier = 6).
  const lgCols = cards.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6';

  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${lgCols}`}>
      {cards.map((spec) => {
        const value = kpis[spec.kind === 'identity' ? spec.key : spec.aggregateKey];
        const formattedValue = spec.format(value);

        // Phase 30 DS-25: KPI cards are interactive affordances.
        const INTERACTIVE = true;

        // Identity cards: plain value, no trend wire-up.
        if (spec.kind === 'identity') {
          return (
            <StatCard
              key={spec.key}
              label={spec.label}
              value={formattedValue}
              interactive={INTERACTIVE}
            />
          );
        }

        // Rate cards: gate trend via per-horizon suppressDelta flag.
        const isSuppressed =
          trending?.suppressDelta?.[spec.key] ?? true;

        // Find trend entry for this metric (latest batch).
        const trend =
          !isSuppressed && spec.trendMetric
            ? trending?.trends.find((t) => t.metric === spec.trendMetric)
            : null;

        return (
          <StatCard
            key={spec.key}
            label={spec.label}
            value={formattedValue}
            trend={
              trend
                ? {
                    direction: trend.direction,
                    deltaPercent: trend.deltaPercent,
                    metric: trend.metric,
                  }
                : null
            }
            interactive={INTERACTIVE}
          />
        );
      })}
    </div>
  );
}
