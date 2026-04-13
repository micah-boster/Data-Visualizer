# Anomaly Detection Algorithm

## Overview

Deterministic z-score anomaly detection that flags batches where 2 or more curated metrics deviate beyond 2 standard deviations in the "bad" direction from the partner's historical norms. Anomalies are grouped by correlated metric clusters, scored by severity, and rolled up to the partner level. Partners with insufficient batch history fall back to portfolio-average norms.

## Curated Metrics

Detection uses 11 curated metrics split into performance and diagnostic groups:

### Performance Metrics

| Metric | Column Key | Type | Polarity |
|--------|-----------|------|----------|
| Penetration Rate | PENETRATION_RATE_POSSIBLE_AND_CONFIRMED | percentage | higher_is_better |
| Conversion Rate | RAITO_FIRST_TIME_CONVERTED_ACCOUNTS | percentage | higher_is_better |
| Total Collected Lifetime | TOTAL_COLLECTED_LIFE_TIME | currency | higher_is_better |
| 6-Month Collection | COLLECTION_AFTER_6_MONTH | currency | higher_is_better |
| 12-Month Collection | COLLECTION_AFTER_12_MONTH | currency | higher_is_better |

### Diagnostic Metrics

| Metric | Column Key | Type | Polarity |
|--------|-----------|------|----------|
| Accounts with Payment | TOTAL_ACCOUNTS_WITH_PAYMENT | count | higher_is_better |
| Accounts with Plans | TOTAL_ACCOUNTS_WITH_PLANS | count | higher_is_better |
| Avg Amount Placed | AVG_AMOUNT_PLACED | currency | lower_is_better |
| Avg Credit Score | AVG_EXPERIAN_CA_SCORE | score | higher_is_better |
| SMS Open Rate | OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED | percentage | higher_is_better |
| Email Open Rate | OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED | percentage | higher_is_better |

Diagnostic metrics explain WHY a performance metric may be off. For example, a drop in penetration rate combined with lower credit scores and higher average balances suggests a portfolio quality shift, not a process failure.

## Metric Groups

Flagged metrics are clustered into correlated groups. When multiple metrics in the same group flag on the same batch, they are presented as a single grouped anomaly with a shared label.

| Group Key | Label | Member Metrics |
|-----------|-------|---------------|
| funnel | Funnel Degradation | Penetration Rate, Conversion Rate, Accounts with Plans |
| collection | Collection Underperformance | Total Collected, 6mo Collection, 12mo Collection, Accounts with Payment |
| portfolio_quality | Portfolio Quality Shift | Avg Amount Placed, Avg Credit Score |
| engagement | Engagement Drop | SMS Open Rate, Email Open Rate |

Flags that do not belong to any predefined group are placed in an "Other" group. The average deviation within each group is computed as the mean of absolute z-scores of the group's flagged metrics.

## Z-Score Computation

For each metric on each batch:

```
z = (value - mean) / stddev
```

Where `mean` and `stddev` come from `computeNorms()` -- the population mean and population standard deviation across the partner's historical batches.

Population stddev (divide by n, not n-1) is used because the batches represent the partner's full history, not a sample from a larger population.

### Polarity-Aware Flagging

Not all deviations are bad. The metric polarity map determines which direction is concerning:

- **higher_is_better**: Only flag when z < -2 (value significantly below the partner mean)
- **lower_is_better**: Only flag when z > 2 (value significantly above the partner mean)

This ensures that a partner collecting MORE than usual is never flagged as anomalous for collection metrics, and a partner with LOWER average balances is not flagged for portfolio quality.

## Batch Flagging Threshold

A batch is marked as anomalous only when **2 or more** metrics flag simultaneously. This prevents single-metric false positives -- a single metric deviating could be noise or a one-off data issue. Two or more co-occurring deviations indicate a systemic pattern worth investigating.

## Severity Score

Each flagged batch receives a composite severity score:

```
severity = flagCount * avgDeviation * log(placementVolume)
```

Where:
- **flagCount**: Number of metrics that exceed the 2 SD threshold in the bad direction
- **avgDeviation**: Mean of absolute z-scores across all flagged metrics
- **placementVolume**: `TOTAL_AMOUNT_PLACED` for the batch (total dollar volume placed)

The logarithmic scale for dollar impact ensures that large partners rank higher in severity (a problem affecting $50M in placements matters more than $500K) but do not completely dominate the ranking. `Math.log(Math.max(value, 1))` guards against log(0).

## Partner-Level Roll-Up

Each partner receives a roll-up assessment:

- **isFlagged**: Whether the partner's latest (most recent) batch is anomalous
- **severityScore**: The severity score of the latest batch
- **flaggedBatchCount**: Total number of flagged batches across all history
- **totalBatchCount**: Total number of batches for context
- **latestBatch**: Full `BatchAnomaly` object for the most recent batch
- **batches**: All `BatchAnomaly` objects for historical drill-down

The latest batch determines the partner's flag status because it represents current performance. Historical flagged batch count provides additional context for persistent vs. one-off issues.

## Portfolio Fallback

Partners with fewer than 3 batches lack sufficient history for meaningful partner-specific norms. These partners are compared against portfolio-average norms computed from all 477 rows across all 34 partners.

**Affected partners** (as of current dataset):
- Avant: 1 batch
- Best Egg: 2 batches
- SkyOne: 2 batches
- Zable: 2 batches
- Zebit: 1 batch

The `usedPortfolioFallback` flag on `PartnerAnomaly` indicates when portfolio norms were used, allowing the UI to display appropriate context (e.g., "Compared against portfolio average" instead of "Compared against partner history").

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Zero stddev for a metric | Metric skipped (cannot compute z-score) |
| Null or NaN metric value | Metric skipped |
| Single-batch partner | Uses portfolio fallback norms |
| Missing TOTAL_AMOUNT_PLACED | Severity uses log(1) = 0 (severity becomes 0) |
| No flagged metrics on batch | severityScore = 0, isFlagged = false, groups = [] |
| Only 1 metric flagged | Batch NOT flagged (requires 2+) |
| Norm count < 2 | Metric skipped (insufficient data) |

## Implementation

- **Core engine**: `src/lib/computation/compute-anomalies.ts`
- **Polarity map**: `src/lib/computation/metric-polarity.ts`
- **Norms computation**: `src/lib/computation/compute-norms.ts`
- **Type definitions**: `src/types/partner-stats.ts` (MetricAnomaly, AnomalyGroup, BatchAnomaly, PartnerAnomaly, AnomalyReport)

---

*Last updated: 2026-04-12*
