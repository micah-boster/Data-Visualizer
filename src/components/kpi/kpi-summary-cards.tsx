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
import {
  computeModeledDelta,
} from '@/lib/computation/compute-projection';
import type {
  BatchCurve,
  BatchTrend,
  KpiAggregates,
  TrendingData,
} from '@/types/partner-stats';

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
    // Existing TRENDING_METRICS does not include COLLECTION_AFTER_3_MONTH,
    // so 3mo cards rely on the card-level suppression flag for absence-of-
    // delta in the rolling path. Phase 40 PRJ-04 modeled path uses
    // 'COLLECTION_AFTER_3_MONTH' as the metric key passed to StatCard so
    // polarity lookup defaults to higher_is_better (collection rate up = good).
    trendMetric: 'COLLECTION_AFTER_3_MONTH',
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

/**
 * Phase 40 PRJ-04 — KPI horizon for each cascade rate key.
 *
 * Used to look up the modeled rate at the matching month from
 * `BatchCurve.projection`. `rateSinceInception` is intentionally absent: it's
 * a lifetime aggregate with no single horizon, so the modeled-baseline path
 * skips it and renders rolling-avg behavior unchanged (see code below).
 */
const HORIZON_BY_KEY: Partial<Record<CascadeRateKey, number>> = {
  rate3mo: 3,
  rate6mo: 6,
  rate12mo: 12,
};

interface KpiSummaryCardsProps {
  kpis: KpiAggregates | null;
  trending: TrendingData | null;
  /**
   * Phase 40 PRJ-04 — when 'modeled', rate cards compute delta against the
   * latest batch's modeled-curve value at the card's horizon (instead of the
   * 3-batch rolling average). Defaults to 'rolling' for zero regression.
   */
  baselineMode?: 'rolling' | 'modeled';
  /**
   * Phase 40 PRJ-04 — required when `baselineMode === 'modeled'`. The latest
   * batch's `projection` array is read at the card's horizon. Curves are
   * expected in input row order; the youngest batch (lowest `ageInMonths`)
   * is selected as "latest" for the modeled baseline lookup.
   */
  curves?: BatchCurve[];
  /**
   * Phase 40 PRJ-04 — invoked when a card's baseline-absent recovery action
   * (the inline "Switch to rolling avg" button) is clicked. Caller should
   * flip the panel-level baselineMode back to 'rolling'.
   */
  onSwitchToRolling?: () => void;
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
 * Phase 40 PRJ-04 — baseline selector:
 *   - When `baselineMode === 'modeled'`, rate cards swap their trend source
 *     from rolling-avg to a modeled-curve delta computed via
 *     `computeModeledDelta(latestCurve, horizon, actualRate, metricKey)` and
 *     override `trendLabel` to "vs modeled curve".
 *   - When the latest batch has no modeled coverage at the card's horizon,
 *     the card renders VALUE ONLY with a baseline-absent caption + an inline
 *     "Switch to rolling avg" recovery action. No silent fallback to rolling.
 *   - `rateSinceInception` has no single-horizon modeled rate (it's a lifetime
 *     aggregate); under `baselineMode === 'modeled'` it renders value-only
 *     with a "Lifetime rate — no modeled baseline at a single horizon" caption.
 *
 * Handles three states:
 *   - Loading (`kpis === null`): skeleton StatCards.
 *   - Zero-batch partner: single "no data" message.
 *   - Normal: identity cards + cascade-selected rate cards.
 */
export function KpiSummaryCards({
  kpis,
  trending,
  baselineMode = 'rolling',
  curves,
  onSwitchToRolling,
}: KpiSummaryCardsProps) {
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

  // Phase 40 PRJ-04 — pick the latest (youngest) batch as the modeled-baseline
  // anchor. `partnerStats.curves` arrives in raw-row order from reshapeCurves;
  // we sort defensively here so the choice is stable regardless of upstream
  // ordering. The latest batch is the trending baseline analog.
  const latestCurve =
    baselineMode === 'modeled' && curves && curves.length > 0
      ? [...curves].sort((a, b) => a.ageInMonths - b.ageInMonths)[0]
      : null;

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

        // Rate cards: routing depends on baselineMode.
        // Default-path (rolling): existing per-horizon suppressDelta + trend
        // lookup, unchanged. Modeled-path: compute delta vs latestCurve's
        // projection at the card's horizon.

        if (baselineMode === 'modeled') {
          const horizon = HORIZON_BY_KEY[spec.key];

          // rateSinceInception under modeled mode — no single-horizon modeled
          // rate exists. Render value-only with a caption explaining why.
          // Caller's "Switch to rolling avg" recovery action is offered for
          // consistency with the per-card baseline-absent state below.
          if (horizon === undefined) {
            return (
              <div key={spec.key} className="flex flex-col gap-1">
                <StatCard
                  label={spec.label}
                  value={formattedValue}
                  interactive={INTERACTIVE}
                />
                <p className="text-caption text-muted-foreground px-1">
                  Lifetime rate — no modeled baseline at a single horizon.
                </p>
              </div>
            );
          }

          // Card horizon has a modeled lookup target. Try to compute the delta.
          const modeledTrend: BatchTrend | null = latestCurve
            ? computeModeledDelta(
                latestCurve,
                horizon,
                value,
                spec.trendMetric ?? String(spec.aggregateKey),
              )
            : null;

          if (modeledTrend) {
            return (
              <StatCard
                key={spec.key}
                label={spec.label}
                value={formattedValue}
                trend={{
                  direction: modeledTrend.direction,
                  deltaPercent: modeledTrend.deltaPercent,
                  metric: modeledTrend.metric,
                }}
                trendLabel="vs modeled curve"
                interactive={INTERACTIVE}
              />
            );
          }

          // Baseline-absent state — value only + caption + recovery action.
          // StatCard does not have a "delta-absent-with-caption" slot, so we
          // wrap it in a sibling div and render the caption beneath.
          return (
            <div key={spec.key} className="flex flex-col gap-1">
              <StatCard
                label={spec.label}
                value={formattedValue}
                interactive={INTERACTIVE}
              />
              <p className="text-caption text-muted-foreground px-1">
                No modeled curve for this scope.{' '}
                {onSwitchToRolling && (
                  <button
                    type="button"
                    onClick={onSwitchToRolling}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Switch to rolling avg
                  </button>
                )}
              </p>
            </div>
          );
        }

        // Rolling-avg path (default) — gate trend via per-horizon suppressDelta.
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
