'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { StatCard } from '@/components/patterns/stat-card';
import { Switch } from '@/components/ui/switch';
import { Term } from '@/components/ui/term';
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
import { kpiAggregatesPerSegment } from '@/lib/partner-config/segment-split';
import { usePartnerConfigContext } from '@/contexts/partner-config';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
import type {
  BatchCurve,
  BatchTrend,
  KpiAggregates,
  TrendingData,
} from '@/types/partner-stats';

/**
 * Numeric-valued KPI field keys. Excludes the Wave-0 `insufficientDenominator`
 * meta field so card specs (which expect a `number` value) stay type-safe.
 */
type NumericKpiKey = Exclude<keyof KpiAggregates, 'insufficientDenominator'>;

/** Identity/volume cards — never vary with batch age; always rendered. */
interface IdentityCardSpec {
  kind: 'identity';
  key: NumericKpiKey;
  /**
   * Card label. Phase 44 VOC-03 — widened to ReactNode so first-instance
   * domain terms (Batches, Accounts) can be wrapped in `<Term>` while other
   * cards stay as plain strings.
   */
  label: ReactNode;
  format: (v: number) => string;
}

/** Rate cards — age-driven cascade picks which of these render (KPI-01). */
interface RateCardSpec {
  kind: 'rate';
  key: CascadeRateKey;
  /** KPI-aggregate field backing this rate (also used for trend metric lookup). */
  aggregateKey: NumericKpiKey;
  label: ReactNode;
  format: (v: number) => string;
  /** Snowflake column name for rolling-avg trend lookup. */
  trendMetric?: string;
}

type CardSpec = IdentityCardSpec | RateCardSpec;

/**
 * Identity/volume cards — always shown.
 *
 * Phase 44 VOC-03 — first-instance-per-surface rule: the cohort's "Batches"
 * (totalBatches) and "Accounts" (totalAccounts) cards are the FIRST place
 * those terms appear in the KPI summary surface, so they're wrapped in
 * `<Term>`. Penetration / Total Collected aren't domain-vocabulary terms
 * that warrant a popover (they're metric names, not concepts in the registry).
 */
const IDENTITY_CARDS: IdentityCardSpec[] = [
  {
    kind: 'identity',
    key: 'totalBatches',
    label: <Term name="batch">Batches</Term>,
    format: formatCount,
  },
  {
    kind: 'identity',
    key: 'totalAccounts',
    label: <Term name="account">Accounts</Term>,
    format: formatCount,
  },
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
  /**
   * Phase 39 PCFG-07 — active (partner, product) pair. When set AND the pair
   * has segments configured, a "Split by segment" toggle appears in the
   * header area. Toggling on renders a grouped layout (one StatCard row per
   * segment). When null or no segments configured, no toggle / grouped view.
   */
  pair?: PartnerProductPair | null;
  /**
   * Phase 39 PCFG-07 — pair-filtered raw rows used to compute per-segment
   * KPIs when split is on. Required when `pair` is non-null and the pair has
   * segments. Sourced from `usePartnerStats(pair).rawRows` in the parent.
   */
  rawRows?: Array<Record<string, unknown>>;
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
  pair,
  rawRows,
}: KpiSummaryCardsProps) {
  // Phase 39 PCFG-07 — segment-split state. Local to the KPI block (the
  // chart's split toggle is independent). Hidden entirely when the active
  // pair has no configured segments.
  // Hooks must run unconditionally before any early returns.
  const partnerConfig = usePartnerConfigContext();
  const segments = useMemo(
    () => (pair ? partnerConfig.getConfig(pair)?.segments ?? [] : []),
    [pair, partnerConfig],
  );
  const segmentToggleAvailable = segments.length > 0;
  const [splitBySegmentRaw, setSplitBySegment] = useState(false);
  // Derive effective split state — see equivalent comment in
  // CollectionCurveChart. Forces false when segments aren't available,
  // avoiding a reset useEffect (lint: react-hooks/set-state-in-effect).
  const splitBySegment = segmentToggleAvailable && splitBySegmentRaw;

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

  // Phase 39 PCFG-07 — split-by-segment grouped layout. One row of StatCards
  // per segment, with the segment label as a section header. Other bucket
  // (when present) renders with a muted surface to signal it's auto-computed.
  if (splitBySegment && segmentToggleAvailable && rawRows) {
    const segmentEntries = kpiAggregatesPerSegment(rawRows, segments);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <SegmentSplitToggle
            checked={splitBySegment}
            onChange={setSplitBySegment}
          />
        </div>
        <div className="space-y-3">
          {segmentEntries.map((entry) => (
            <div
              key={entry.label}
              className={
                entry.isOther
                  ? 'rounded-lg bg-surface-inset p-3 space-y-2'
                  : 'space-y-2'
              }
            >
              <div className="text-label text-muted-foreground uppercase">
                {entry.label}
              </div>
              <KpiCardRow
                kpis={entry.kpis}
                trending={null}
                baselineMode="rolling"
                curves={undefined}
                onSwitchToRolling={undefined}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segmentToggleAvailable && (
        <div className="flex items-center justify-end">
          <SegmentSplitToggle
            checked={splitBySegment}
            onChange={setSplitBySegment}
          />
        </div>
      )}
      <KpiCardRow
        kpis={kpis}
        trending={trending}
        baselineMode={baselineMode}
        curves={curves}
        onSwitchToRolling={onSwitchToRolling}
      />
    </div>
  );
}

/**
 * Phase 39 PCFG-07 — small chrome control rendered inline in the KPI block
 * header area when the active pair has segments configured. Mirrors the
 * Switch + label pattern used in the Collection Curve chart's toggle so the
 * two surfaces feel consistent.
 */
function SegmentSplitToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-label text-muted-foreground">
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onChange}
        aria-label="Split by segment"
      />
      <span>Split by segment</span>
    </label>
  );
}

/**
 * Phase 39 PCFG-07 — rendering body extracted from the original
 * KpiSummaryCards return path. Renders one cascade-driven StatCard row for a
 * given KpiAggregates value. Used twice:
 *   1. The default rolled-up layout (single row).
 *   2. Inside the grouped split-by-segment layout (one row per segment).
 *
 * Trending + modeled baselines remain wired only for the rolled-up render
 * path; per-segment rows fall back to value-only rolling-mode by passing
 * `trending: null` (per-segment trending would require segmentation-aware
 * computeTrending which is out of scope for v1 — segment grouped layout
 * focuses on the headline KPIs themselves). See Plan 39-04 success criteria
 * — all 6 truths pass with value-only-per-segment rendering.
 */
function KpiCardRow({
  kpis,
  trending,
  baselineMode,
  curves,
  onSwitchToRolling,
}: {
  kpis: KpiAggregates;
  trending: TrendingData | null;
  baselineMode: 'rolling' | 'modeled';
  curves: BatchCurve[] | undefined;
  onSwitchToRolling?: () => void;
}) {
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

        // Wave 0 fix: when the eligibility-gated denominator is too small to
        // support a confident rate (currently `rate3mo` only), render
        // value-only with an "Insufficient data" caption rather than a
        // misleadingly precise percentage. Phase 41.6 extends this to 6mo /
        // 12mo once eligibility-gated denominators are added there.
        const isInsufficientDenom =
          spec.key === 'rate3mo' &&
          kpis.insufficientDenominator?.rate3mo === true;

        if (isInsufficientDenom) {
          return (
            <div key={spec.key} className="flex flex-col gap-1">
              <StatCard
                label={spec.label}
                value={formattedValue}
                interactive={INTERACTIVE}
              />
              <p className="text-caption text-muted-foreground px-1">
                Insufficient data — too few accounts have reached the 3-month
                horizon for a stable rate.
              </p>
            </div>
          );
        }

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
