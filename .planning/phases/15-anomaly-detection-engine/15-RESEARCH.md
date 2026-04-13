# Phase 15: Anomaly Detection Engine - Research

**Researched:** 2026-04-12
**Domain:** Deterministic z-score anomaly detection for batch performance data
**Confidence:** HIGH

## Summary

Phase 15 builds a pure computation module (`compute-anomalies.ts`) that produces anomaly scores, flags, severity rankings, and grouped anomaly reports for every partner and batch. The codebase already has strong infrastructure to build on: `computeNorms()` provides per-partner mean/stddev for key metrics, `metric-polarity.ts` defines directional semantics, `computeDeviation()` in `deviation.ts` already computes z-scores for heatmap coloring, and `usePartnerStats` composes all computation into a single hook. The existing pattern is clear: pure TypeScript functions in `src/lib/computation/`, types in `src/types/partner-stats.ts`, and a hook that wires them into the React tree.

The dataset is 477 rows across 34 partners (1-39 batches each). This is small enough that all computation runs client-side in the browser with zero performance concern. Several partners have fewer than 3 batches (Avant: 1, Best Egg: 2, SkyOne: 2, Zable: 2, Zebit: 1), requiring the portfolio-average fallback path. The z-score approach is deterministic, explainable, and appropriate for this data scale -- no ML libraries needed.

**Primary recommendation:** Follow the exact pattern of `compute-trending.ts` and `compute-norms.ts` -- pure function, typed output, integrated via `usePartnerStats` hook. Add new types to `partner-stats.ts`, new computation to `src/lib/computation/compute-anomalies.ts`, wire through the existing hook, and document in `docs/ANOMALY-ALGORITHM.md`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Curated subset of ~10-15 metrics, NOT all 61 columns
- Performance metrics: penetration rate, conversion rate, collection milestones (6mo, 12mo), total collected lifetime
- Diagnostic metrics: contact rates, payment rates, average balance -- these explain WHY a performance metric is off
- Use existing v2 conditional formatting metric set as the starting point, then expand with diagnostic metrics
- Threshold: 2+ key metrics at 2 SD from partner mean to flag a batch
- Polarity-aware: only flag deviations in the "bad" direction (existing metric-polarity.ts)
- Fallback for partners with <3 batches: Compare against portfolio average curve as proxy for expected performance
- Partners with 3+ batches use their own historical norms as baseline
- Composite score formula: (count of flagged metrics) x (average deviation magnitude) x log(placement volume)
- Log scale for dollar impact -- big partners matter more but don't completely dominate
- Lean per-flag data: metric name, actual value, z-score, deviation direction
- Correlated metric grouping: Predefined metric groups (e.g., "funnel metrics", "collection metrics", "volume metrics"). If multiple metrics in the same group flag on the same batch, group them as one anomaly
- Two levels: Partner-level roll-up AND batch-level details underneath
- Partner flag is based on latest batch status plus overall partner severity
- Algorithm documented in docs/ANOMALY-ALGORITHM.md per explainability constraint

### Claude's Discretion
- Exact metric list selection (guided by column config + metric-polarity.ts)
- Predefined metric group definitions (how to bucket the curated metrics)
- Whether to use population stddev or sample stddev (team is small, either works)
- Internal data structure design for AnomalyReport type

### Deferred Ideas (OUT OF SCOPE)
- Build projected recovery curves from installment probability data
- Adaptive thresholds that learn from user feedback -- v4+
- Seasonal decomposition (STL/Prophet) for time-aware detection -- v4+
- Column drag-and-drop crash bug -- separate fix
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AD-01 | `compute-anomalies.ts` module computes z-scores for key metrics per batch against partner norms, using existing `computeNorms()` mean/stddev as baseline | Existing `computeNorms()` returns `Record<string, MetricNorm>` with mean/stddev/count. Existing `computeDeviation()` already computes z-scores. New module follows same pure-function pattern. |
| AD-02 | Anomaly detection respects metric polarity -- only flags deviations in the "bad" direction | Existing `metric-polarity.ts` exports `METRIC_POLARITY` map and `getPolarity()` function. Must expand map to cover all curated anomaly metrics. |
| AD-03 | A batch is flagged as anomalous when 2+ key metrics deviate beyond 2 SD from the partner mean | Pure threshold logic in the new module. Use `computeNorms()` output, filter flags where abs(z-score) > 2 AND direction is "bad", count >= 2 triggers flag. |
| AD-04 | At root level, a partner is flagged when their latest batch is anomalous | Sort batches chronologically (same pattern as `compute-trending.ts`), take latest, check its anomaly status. Roll up to partner level. |
| AD-05 | Algorithm documented in `docs/ANOMALY-ALGORITHM.md` | Follow exact pattern of existing `docs/TRENDING-ALGORITHM.md` -- same structure, same level of detail. |
| AD-06 | Anomalies ranked by composite severity score | Formula: (count of flagged metrics) x (average deviation magnitude) x log(placement volume). Uses `TOTAL_AMOUNT_PLACED` from row data. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5 | Type-safe computation module | Already in project |
| React | 19.2.4 | Hook integration via useMemo | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | No new dependencies needed |

**No new packages required.** All z-score computation is basic arithmetic (subtraction, division, Math.sqrt, Math.log). The existing `computeNorms()` already handles mean and population stddev. The project explicitly rejected ML libraries (REQUIREMENTS.md: "Overkill for 477 rows, violates explainability constraint").

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    computation/
      compute-norms.ts          # EXISTING - provides mean/stddev baseline
      compute-trending.ts       # EXISTING - pattern to follow
      compute-kpis.ts           # EXISTING - pattern to follow
      compute-anomalies.ts      # NEW - core anomaly detection engine
      metric-polarity.ts        # EXISTING - expand with diagnostic metrics
  types/
    partner-stats.ts            # EXISTING - add anomaly types here
  hooks/
    use-partner-stats.ts        # EXISTING - wire in computeAnomalies call
docs/
  ANOMALY-ALGORITHM.md          # NEW - algorithm documentation
  TRENDING-ALGORITHM.md         # EXISTING - template to follow
```

### Pattern 1: Pure Computation Function
**What:** Stateless function that takes rows + norms, returns typed anomaly report
**When to use:** All anomaly computation
**Example:**
```typescript
// Follow exact pattern of compute-trending.ts
export function computeAnomalies(
  rows: Record<string, unknown>[],
  norms: Record<string, MetricNorm>,
  portfolioNorms?: Record<string, MetricNorm>,
): AnomalyReport {
  // ...computation logic
}
```

### Pattern 2: Hook Composition via usePartnerStats
**What:** Wire new computation into existing `usePartnerStats` hook that already composes kpis, norms, curves, trending
**When to use:** Exposing anomaly data to the component tree
**Example:**
```typescript
// In use-partner-stats.ts, add to the returned PartnerStats:
return {
  kpis: computeKpis(partnerRows),
  norms: computeNorms(partnerRows),
  curves: reshapeCurves(partnerRows),
  trending: computeTrending(partnerRows),
  anomalies: computeAnomalies(partnerRows, norms, portfolioNorms),
};
```

### Pattern 3: Portfolio-Level Norms for Fallback
**What:** Compute norms across ALL rows (all partners) as fallback baseline for partners with <3 batches
**When to use:** Partners with <3 batches cannot compute meaningful partner-specific norms
**Key detail:** Must compute portfolio norms from `allRows` (all 477 rows), not just the partner's rows. This means `usePartnerStats` needs access to portfolio-level norms, which can be computed once and passed in.

### Pattern 4: Root-Level Partner Anomaly Aggregation
**What:** At root level, compute anomaly status for ALL partners (not just selected partner)
**When to use:** The root-level table needs partner anomaly flags for every row
**Key detail:** This is a new computation pattern -- existing `usePartnerStats` only runs for the selected partner. Root-level anomaly flags require iterating all partners. This should be a separate hook or computation that runs on `allRows` grouped by PARTNER_NAME.

### Anti-Patterns to Avoid
- **Running anomaly detection only for selected partner:** AD-04 requires root-level partner flags visible without drilling down. Must compute for ALL partners on load.
- **Duplicating z-score logic:** Reuse `computeNorms()` output directly. Do NOT re-implement mean/stddev calculation.
- **Using sample stddev (n-1):** Existing `computeNorms()` uses population stddev (divide by n). The comment says "these are all the partner's batches, not a sample from a larger population." Stick with population stddev for consistency.
- **Flagging zero-stddev metrics:** When stddev is 0, z-score is undefined. Existing `computeDeviation()` returns null for count < 2 or stddev === 0. Follow this pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mean/stddev calculation | Custom statistics | Existing `computeNorms()` | Already tested, handles null/NaN filtering |
| Metric polarity lookup | Hardcoded if/else | Existing `getPolarity()` from `metric-polarity.ts` | Single source of truth for directional semantics |
| Z-score computation | Complex deviation logic | Simple `(value - mean) / stddev` | It is literally one line of math |
| Batch sorting | Complex date parsing | String sort on BATCH column | Same pattern as `compute-trending.ts`, batch names sort chronologically |

## Common Pitfalls

### Pitfall 1: Zero Standard Deviation
**What goes wrong:** Division by zero when computing z-scores for metrics where all batches have the same value
**Why it happens:** Small partners (2-3 batches) may have identical values for some metrics
**How to avoid:** Check `norm.stddev === 0` before computing z-score. Skip metric (do not flag). Existing `computeDeviation()` already handles this by returning null.
**Warning signs:** NaN or Infinity in z-score output

### Pitfall 2: Partners with <3 Batches Missing Anomaly Data
**What goes wrong:** 7 partners have <3 batches (Avant: 1, Best Egg: 2, SkyOne: 2, Zable: 2, Zebit: 1, Oportun: 3, Rent App: 3). If fallback is not implemented, these partners silently lack anomaly detection.
**Why it happens:** `computeNorms()` returns count: 0 or stddev: 0 for single-batch partners
**How to avoid:** Implement portfolio-average fallback per CONTEXT.md decision. Compute norms from all 477 rows, use as baseline for partners with <3 batches.
**Warning signs:** Partners with no anomaly flags at all when they should have some

### Pitfall 3: Polarity Map Coverage Gaps
**What goes wrong:** Metrics added to the anomaly curated set but not in `METRIC_POLARITY` map default to `higher_is_better`, which may be wrong for diagnostic metrics
**Why it happens:** The current polarity map only covers 5 metrics. Diagnostic metrics (contact rates, payment rates, avg balance) need explicit entries.
**How to avoid:** Expand `METRIC_POLARITY` to cover every metric in the anomaly curated set before implementing detection logic.
**Warning signs:** Metrics flagging in the wrong direction

### Pitfall 4: Root-Level Computation Cost
**What goes wrong:** Computing anomalies for all 34 partners on every render
**Why it happens:** Root level needs partner flags for all rows, not just selected partner
**How to avoid:** Memoize with `useMemo` keyed on `allRows` reference. 477 rows x 15 metrics = ~7,000 z-score calculations -- trivial performance, but memoize to avoid redundant work on re-renders.
**Warning signs:** Unnecessary re-computation on filter/sort changes that don't change underlying data

### Pitfall 5: Batch Sort Order Assumption
**What goes wrong:** "Latest batch" is wrong if batch naming convention changes
**Why it happens:** `compute-trending.ts` sorts by BATCH string. This works because batch names contain dates (e.g., "AFRM_MAR_26_PRI")
**How to avoid:** Follow the same sort approach as `compute-trending.ts` for consistency. If batch age is needed, `BATCH_AGE_IN_MONTHS` (actually days) can be used as a secondary signal -- lowest value = most recent batch.
**Warning signs:** Wrong batch identified as "latest"

### Pitfall 6: Log(0) in Severity Score
**What goes wrong:** `Math.log(0)` returns `-Infinity`, breaking severity score
**Why it happens:** `TOTAL_AMOUNT_PLACED` could theoretically be 0
**How to avoid:** Use `Math.log(Math.max(placementVolume, 1))` or guard with a minimum value
**Warning signs:** NaN or Infinity severity scores

## Code Examples

### Recommended Curated Metric List

Based on column config analysis, metric-polarity.ts, and CONTEXT.md guidance:

```typescript
// Performance metrics (from existing HEATMAP_COLUMNS + trending metrics)
const PERFORMANCE_METRICS = [
  'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',  // higher_is_better
  'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',      // higher_is_better
  'TOTAL_COLLECTED_LIFE_TIME',                 // higher_is_better
  'COLLECTION_AFTER_6_MONTH',                  // higher_is_better
  'COLLECTION_AFTER_12_MONTH',                 // higher_is_better
] as const;

// Diagnostic metrics (explain WHY a performance metric is off)
const DIAGNOSTIC_METRICS = [
  'TOTAL_ACCOUNTS_WITH_PAYMENT',              // higher_is_better (more payments = better)
  'TOTAL_ACCOUNTS_WITH_PLANS',                // higher_is_better (more plans = better engagement)
  'AVG_AMOUNT_PLACED',                        // lower_is_better (lower avg balance = easier to collect)
  'AVG_EXPERIAN_CA_SCORE',                    // higher_is_better (better credit = more collectible)
  'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',    // higher_is_better
  'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',  // higher_is_better
] as const;

// Combined curated set (~11 metrics)
const ANOMALY_METRICS = [...PERFORMANCE_METRICS, ...DIAGNOSTIC_METRICS] as const;
```

### Recommended Metric Groups (for correlated anomaly grouping)

```typescript
const METRIC_GROUPS: Record<string, { label: string; metrics: string[] }> = {
  funnel: {
    label: 'Funnel Degradation',
    metrics: [
      'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED',
      'RAITO_FIRST_TIME_CONVERTED_ACCOUNTS',
      'TOTAL_ACCOUNTS_WITH_PLANS',
    ],
  },
  collection: {
    label: 'Collection Underperformance',
    metrics: [
      'TOTAL_COLLECTED_LIFE_TIME',
      'COLLECTION_AFTER_6_MONTH',
      'COLLECTION_AFTER_12_MONTH',
      'TOTAL_ACCOUNTS_WITH_PAYMENT',
    ],
  },
  portfolio_quality: {
    label: 'Portfolio Quality Shift',
    metrics: [
      'AVG_AMOUNT_PLACED',
      'AVG_EXPERIAN_CA_SCORE',
    ],
  },
  engagement: {
    label: 'Engagement Drop',
    metrics: [
      'OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED',
      'OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED',
    ],
  },
};
```

### Anomaly Type Definitions

```typescript
// Add to src/types/partner-stats.ts

/** Single metric flag on a batch */
interface MetricAnomaly {
  metric: string;
  value: number;
  zScore: number;
  direction: 'above' | 'below';  // deviation direction
}

/** Correlated anomaly group on a batch */
interface AnomalyGroup {
  groupKey: string;           // e.g., 'funnel', 'collection'
  label: string;              // e.g., 'Funnel Degradation'
  flags: MetricAnomaly[];     // individual metrics in this group that flagged
  avgDeviation: number;       // average abs(z-score) across flags
}

/** Batch-level anomaly assessment */
interface BatchAnomaly {
  batchName: string;
  isFlagged: boolean;         // true when 2+ metrics exceed 2 SD in bad direction
  flags: MetricAnomaly[];     // all individual metric flags
  groups: AnomalyGroup[];     // correlated groupings of flags
  severityScore: number;      // composite: flagCount * avgDeviation * log(placement)
}

/** Partner-level anomaly roll-up */
interface PartnerAnomaly {
  isFlagged: boolean;         // true when latest batch is anomalous
  severityScore: number;      // overall partner severity
  flaggedBatchCount: number;  // how many batches are anomalous
  totalBatchCount: number;
  latestBatch: BatchAnomaly | null;
  batches: BatchAnomaly[];    // all batch details
  usedPortfolioFallback: boolean;  // true if <3 batches, used portfolio norms
}

/** Full anomaly report (extends existing PartnerStats) */
interface AnomalyReport {
  partner: PartnerAnomaly;
}
```

### Z-Score with Polarity-Aware Flagging

```typescript
function computeMetricAnomalies(
  row: Record<string, unknown>,
  norms: Record<string, MetricNorm>,
  metrics: readonly string[],
  threshold: number = 2,
): MetricAnomaly[] {
  const flags: MetricAnomaly[] = [];

  for (const metric of metrics) {
    const norm = norms[metric];
    if (!norm || norm.count < 2 || norm.stddev === 0) continue;

    const raw = row[metric];
    if (raw == null) continue;
    const value = Number(raw);
    if (Number.isNaN(value)) continue;

    const zScore = (value - norm.mean) / norm.stddev;
    const polarity = getPolarity(metric);

    // Only flag deviations in the "bad" direction
    const isBadDeviation =
      (polarity === 'higher_is_better' && zScore < -threshold) ||
      (polarity === 'lower_is_better' && zScore > threshold);

    if (isBadDeviation) {
      flags.push({
        metric,
        value,
        zScore,
        direction: zScore > 0 ? 'above' : 'below',
      });
    }
  }

  return flags;
}
```

### Severity Score Computation

```typescript
function computeSeverityScore(
  flags: MetricAnomaly[],
  totalAmountPlaced: number,
): number {
  if (flags.length === 0) return 0;

  const avgDeviation =
    flags.reduce((sum, f) => sum + Math.abs(f.zScore), 0) / flags.length;

  // Guard against log(0)
  const logVolume = Math.log(Math.max(totalAmountPlaced, 1));

  return flags.length * avgDeviation * logVolume;
}
```

### Portfolio Norms Fallback

```typescript
// Compute once from all rows, pass to computeAnomalies for partners with <3 batches
function computePortfolioNorms(
  allRows: Record<string, unknown>[],
): Record<string, MetricNorm> {
  // Reuse existing computeNorms() -- it works on any row set
  return computeNorms(allRows);
}
```

### Root-Level Partner Anomaly Map

```typescript
// New hook or computation for root level
function computeAllPartnerAnomalies(
  allRows: Record<string, unknown>[],
): Map<string, PartnerAnomaly> {
  const portfolioNorms = computeNorms(allRows);
  const partnerMap = new Map<string, PartnerAnomaly>();

  // Group rows by partner
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of allRows) {
    const name = String(row.PARTNER_NAME ?? '');
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(row);
  }

  for (const [partnerName, partnerRows] of grouped) {
    const usePortfolioFallback = partnerRows.length < 3;
    const norms = usePortfolioFallback
      ? portfolioNorms
      : computeNorms(partnerRows);

    const anomalyReport = computeAnomalies(partnerRows, norms);
    partnerMap.set(partnerName, {
      ...anomalyReport.partner,
      usedPortfolioFallback: usePortfolioFallback,
    });
  }

  return partnerMap;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ML anomaly detection (Isolation Forest, DBSCAN) | Deterministic z-scores | Project decision | Explainable, no dependencies, appropriate for 477 rows |
| Custom statistics library | Hand-computed mean/stddev | Already in codebase | `computeNorms()` handles all statistics |
| Bidirectional flagging | Polarity-aware unidirectional | Project decision | Only "bad" deviations flagged, reduces false positives |

**Not applicable / out of scope:**
- `simple-statistics` library: Mentioned in v3 roadmap for Phase 19 (cross-partner percentile rank). NOT needed for Phase 15 -- basic arithmetic suffices.

## Open Questions

1. **Batch sorting reliability**
   - What we know: `compute-trending.ts` uses string sort on BATCH name and this works for current data
   - What's unclear: Whether all partner batch names follow a consistent date-embedded naming convention
   - Recommendation: Use BATCH string sort (matches existing pattern). Add BATCH_AGE_IN_MONTHS as tiebreaker if needed. Test with actual data to verify "latest" is correct.

2. **Diagnostic metric polarity assignments**
   - What we know: Performance metrics all have explicit polarity entries. Diagnostic metrics (SMS open rate, email open rate, avg amount placed) do not.
   - What's unclear: Whether `AVG_AMOUNT_PLACED` should be `lower_is_better` or `higher_is_better` in all contexts
   - Recommendation: `AVG_AMOUNT_PLACED` as `lower_is_better` (lower balance = easier to collect), all rate metrics as `higher_is_better`. Add to polarity map with clear comments.

3. **Partner severity score aggregation**
   - What we know: Per-batch severity is well-defined (flagCount x avgDeviation x log(volume))
   - What's unclear: How to combine across multiple flagged batches for overall partner severity
   - Recommendation: Use latest batch severity as primary signal (matches AD-04). Sum of all flagged batch severities as secondary ranking.

## Sources

### Primary (HIGH confidence)
- `src/lib/computation/compute-norms.ts` -- exact API for mean/stddev computation
- `src/lib/computation/metric-polarity.ts` -- polarity map with 5 existing entries
- `src/lib/computation/compute-trending.ts` -- pattern template for new computation modules
- `src/lib/formatting/deviation.ts` -- existing z-score computation for heatmap, handles edge cases
- `src/types/partner-stats.ts` -- existing type definitions to extend
- `src/hooks/use-partner-stats.ts` -- hook composition pattern
- `src/lib/columns/config.ts` -- all 61 column definitions
- `src/components/data-display.tsx` -- component tree showing how hooks wire into UI
- Static cache data analysis: 477 rows, 34 partners, 1-39 batches each

### Secondary (MEDIUM confidence)
- `docs/TRENDING-ALGORITHM.md` -- documentation template to follow

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, builds entirely on existing infrastructure
- Architecture: HIGH - follows established patterns (compute-*.ts + usePartnerStats + types), only open question is root-level aggregation pattern
- Pitfalls: HIGH - identified from direct codebase analysis (zero stddev, <3 batch partners, polarity gaps, log(0))
- Metric selection: MEDIUM - recommended based on column config analysis and CONTEXT.md guidance, but marked as Claude's discretion

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- deterministic algorithm, no external dependencies)
