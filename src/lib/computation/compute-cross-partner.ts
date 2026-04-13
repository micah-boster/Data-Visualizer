import { quantileRank } from 'simple-statistics';
import type {
  KpiAggregates,
  BatchCurve,
  CurvePoint,
  PercentileRanks,
  AverageCurve,
  CrossPartnerEntry,
  CrossPartnerData,
  PartnerActivityStatus,
} from '@/types/partner-stats';
import { computeKpis } from './compute-kpis';
import { reshapeCurves } from './reshape-curves';
import { COLLECTION_MONTHS } from './reshape-curves';

/** Minimum batches required for a partner to appear in rankings. */
const MIN_BATCHES_FOR_RANKING = 3;

/** Inactivity threshold in days: 12 months. */
const INACTIVE_DAYS = 365;

/** Semi-inactive threshold in days: 6 months. */
const SEMI_INACTIVE_DAYS = 180;

/** Percentile threshold below which a partner is flagged as an outlier. */
const OUTLIER_PERCENTILE = 0.10;

/**
 * Group rows by PARTNER_NAME.
 * Same pattern as computeAllPartnerAnomalies in compute-anomalies.ts.
 */
function groupByPartner(
  allRows: Record<string, unknown>[],
): Map<string, Record<string, unknown>[]> {
  const byPartner = new Map<string, Record<string, unknown>[]>();
  for (const row of allRows) {
    const name = String(row.PARTNER_NAME ?? '');
    if (!name) continue;
    const existing = byPartner.get(name);
    if (existing) {
      existing.push(row);
    } else {
      byPartner.set(name, [row]);
    }
  }
  return byPartner;
}

/**
 * Classify partner activity status based on their most recent batch age.
 * BATCH_AGE_IN_MONTHS is actually stored in days (per reshape-curves.ts).
 */
function classifyActivity(
  rows: Record<string, unknown>[],
): PartnerActivityStatus {
  // Find the newest batch (smallest age in days)
  let minAge = Infinity;
  for (const row of rows) {
    const age = Number(row.BATCH_AGE_IN_MONTHS) || Infinity;
    if (age < minAge) minAge = age;
  }

  if (minAge > INACTIVE_DAYS) return 'inactive';
  if (minAge > SEMI_INACTIVE_DAYS) return 'semi-inactive';
  return 'active';
}

/**
 * Compute average collection curve from a set of batch curves.
 *
 * At each COLLECTION_MONTH, averages the recoveryRate across all batches
 * that have data at that month. Truncates when fewer than 2 batches contribute.
 *
 * @param curves - Batch curves to average
 * @param mode - 'equal' for equal-weight, 'dollar-weighted' for dollar-weighted
 */
function computeAverageCurve(
  curves: BatchCurve[],
  mode: 'equal' | 'dollar-weighted',
): CurvePoint[] {
  const result: CurvePoint[] = [];

  for (const month of COLLECTION_MONTHS) {
    // Find curves that have a data point at this month
    const contributing: { recoveryRate: number; totalPlaced: number }[] = [];
    for (const curve of curves) {
      const point = curve.points.find((p) => p.month === month);
      if (point) {
        contributing.push({
          recoveryRate: point.recoveryRate,
          totalPlaced: curve.totalPlaced,
        });
      }
    }

    // Truncation rule: stop when fewer than 2 batches contribute
    if (contributing.length < 2) break;

    let avgRate: number;
    if (mode === 'dollar-weighted') {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const c of contributing) {
        weightedSum += c.recoveryRate * c.totalPlaced;
        totalWeight += c.totalPlaced;
      }
      avgRate = totalWeight > 0 ? weightedSum / totalWeight : 0;
    } else {
      const sum = contributing.reduce((acc, c) => acc + c.recoveryRate, 0);
      avgRate = sum / contributing.length;
    }

    result.push({ month, amount: 0, recoveryRate: avgRate });
  }

  return result;
}

/**
 * Build an AverageCurve with both equal-weight and dollar-weighted modes.
 */
function buildAverageCurve(curves: BatchCurve[]): AverageCurve {
  return {
    equalWeight: computeAverageCurve(curves, 'equal'),
    dollarWeighted: computeAverageCurve(curves, 'dollar-weighted'),
  };
}

/**
 * Compute percentile ranks for all rank-eligible partners on each of the
 * 5 key metrics. Mutates entries in-place by setting percentileRanks.
 */
function computePercentileRanks(entries: CrossPartnerEntry[]): void {
  const eligible = entries.filter((e) => e.isRankEligible);
  if (eligible.length === 0) return;

  // For each metric, collect values, sort, and compute quantileRank
  const metrics: {
    key: keyof PercentileRanks;
    getValue: (e: CrossPartnerEntry) => number;
  }[] = [
    { key: 'penetrationRate', getValue: (e) => e.kpis.weightedPenetrationRate },
    { key: 'collectionRate6mo', getValue: (e) => e.kpis.collectionRate6mo },
    { key: 'collectionRate12mo', getValue: (e) => e.kpis.collectionRate12mo },
    { key: 'totalCollected', getValue: (e) => e.kpis.totalCollected },
    { key: 'perDollarPlacedRate', getValue: (e) => e.perDollarPlacedRate },
  ];

  for (const m of metrics) {
    const values = eligible.map((e) => m.getValue(e)).sort((a, b) => a - b);

    for (const entry of eligible) {
      if (!entry.percentileRanks) {
        entry.percentileRanks = {
          penetrationRate: 0,
          collectionRate6mo: 0,
          collectionRate12mo: 0,
          totalCollected: 0,
          perDollarPlacedRate: 0,
        };
      }
      entry.percentileRanks[m.key] = quantileRank(values, m.getValue(entry));
    }
  }
}

/**
 * Detect percentile outliers: partners below 10th percentile on any metric.
 * Mutates entries in-place by setting isPercentileOutlier and outlierMetrics.
 */
function detectPercentileOutliers(entries: CrossPartnerEntry[]): void {
  const metricKeys: (keyof PercentileRanks)[] = [
    'penetrationRate',
    'collectionRate6mo',
    'collectionRate12mo',
    'totalCollected',
    'perDollarPlacedRate',
  ];

  for (const entry of entries) {
    if (!entry.percentileRanks) continue;

    const outliers: (keyof PercentileRanks)[] = [];
    for (const key of metricKeys) {
      if (entry.percentileRanks[key] < OUTLIER_PERCENTILE) {
        outliers.push(key);
      }
    }

    if (outliers.length > 0) {
      entry.isPercentileOutlier = true;
      entry.outlierMetrics = outliers;
    }
  }
}

/**
 * Compute all cross-partner data from the full dataset in a single pass.
 *
 * @param allRows - All rows from the dataset (all partners combined)
 * @returns CrossPartnerData with per-partner stats, rankings, and portfolio averages
 */
export function computeCrossPartnerData(
  allRows: Record<string, unknown>[],
): CrossPartnerData {
  const byPartner = groupByPartner(allRows);
  const partners = new Map<string, CrossPartnerEntry>();
  const allEligibleCurves: BatchCurve[] = [];

  // Step 1: Compute per-partner stats
  for (const [name, rows] of byPartner) {
    const kpis = computeKpis(rows);
    const perDollarPlacedRate =
      kpis.totalPlaced > 0 ? kpis.totalCollected / kpis.totalPlaced : 0;
    const curves = reshapeCurves(rows);
    const averageCurve = buildAverageCurve(curves);
    const activityStatus = classifyActivity(rows);
    const batchCount = rows.length;
    const isRankEligible =
      batchCount >= MIN_BATCHES_FOR_RANKING && activityStatus !== 'inactive';

    const entry: CrossPartnerEntry = {
      partnerName: name,
      kpis,
      perDollarPlacedRate,
      percentileRanks: null,
      averageCurve,
      activityStatus,
      batchCount,
      isRankEligible,
      isPercentileOutlier: false,
      outlierMetrics: [],
    };

    partners.set(name, entry);

    // Collect curves from eligible partners for portfolio average
    if (isRankEligible) {
      allEligibleCurves.push(...curves);
    }
  }

  // Step 2: Compute percentile ranks across eligible partners
  const allEntries = [...partners.values()];
  computePercentileRanks(allEntries);

  // Step 3: Detect percentile outliers
  detectPercentileOutliers(allEntries);

  // Step 4: Build ranked partners list (eligible only)
  const rankedPartners = allEntries.filter((e) => e.isRankEligible);

  // Step 5: Compute portfolio-wide average curve
  const portfolioAverageCurve = buildAverageCurve(allEligibleCurves);

  return { partners, rankedPartners, portfolioAverageCurve };
}
