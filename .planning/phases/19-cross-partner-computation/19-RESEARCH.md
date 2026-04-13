# Phase 19: Cross-Partner Computation - Research

**Researched:** 2026-04-13
**Domain:** Cross-partner percentile ranking, normalized trajectory computation, portfolio anomaly flags
**Confidence:** HIGH

## Summary

Phase 19 is a pure computation/data layer that extends the existing `usePartnerStats` pattern to compute aggregate metrics, percentile rankings, average collection curves, and portfolio-level outlier flags across ALL partners simultaneously. The existing codebase already demonstrates the patterns needed: `computeAllPartnerAnomalies()` in `compute-anomalies.ts` groups rows by PARTNER_NAME and iterates across all partners, which is the exact pattern this phase extends.

The primary new dependency is `simple-statistics` for `quantileRank()`. All other computation uses existing primitives (`computeKpis`, `computeNorms`, `reshapeCurves`) applied to per-partner row groups. The anomaly engine integration (XPC-04) extends the existing `PartnerAnomaly` type system with a new flag source for percentile-based outliers, keeping downstream UI consumers unified.

**Primary recommendation:** Build a single `compute-cross-partner.ts` module that computes all cross-partner data in one pass over the dataset, exposed via a `useAllPartnerStats` hook and context provider mirroring the `AnomalyProvider` pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 5 ranking metrics (expanded from original 4):
  1. Penetration rate
  2. 6-month collection rate
  3. 12-month collection rate
  4. Total collected (raw dollar amount)
  5. Total collected (per-dollar-placed rate) -- new addition
- Per-dollar-placed is the default/primary ranking metric for display
- All partners ranked in one global pool -- no grouping by portfolio size or debt type
- Both equal-weight and dollar-weighted averaging available as user-selectable options
- Default mode: dollar-weighted (reflects real portfolio impact)
- Truncate average curves when fewer than 2 batches contribute data at a given month point
- 10th percentile cutoff on any single metric triggers a portfolio outlier flag
- Binary flag only (outlier or not) -- no severity tiers for cross-partner flags
- Integrate with Phase 15 anomaly engine as a new flag source, not a separate data layer
- Minimum 3 batches required for a partner to appear in rankings
- Partners below threshold: still visible in cross-partner views but shown with "not enough data" indicator
- Inactive partners (6-12 months no new batches): de-emphasized in rankings
- Inactive partners (12+ months): excluded from rankings entirely

### Claude's Discretion
- Exact hook architecture (useAllPartnerStats, useCrossPartnerRankings, etc.)
- How to extend the anomaly engine type system for percentile-based flags
- De-emphasis mechanism for semi-inactive partners (visual is Phase 20, but data-level flagging here)
- Performance approach for computing across all partners

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| XPC-01 | `useAllPartnerStats` hook computes per-partner aggregate metrics for ALL partners | Extend existing `computeAllPartnerAnomalies` pattern: group by PARTNER_NAME, run `computeKpis` per group, add per-dollar-placed metric |
| XPC-02 | Percentile rank for each partner on key metrics using `simple-statistics` `quantileRank` | Install `simple-statistics`, use `quantileRank(values, partnerValue)` which returns 0-1 percentile |
| XPC-03 | Average collection curve per partner (mean of batch curves at each month point) | Use existing `reshapeCurves` output, average `recoveryRate` at each COLLECTION_MONTH across batches, support dollar-weighted mode |
| XPC-04 | Cross-partner anomaly flags: partners below 10th percentile flagged as portfolio outliers | Extend `PartnerAnomaly` type with percentile-based flag source, integrate into anomaly engine |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-statistics | latest | `quantileRank()` for percentile computation | Already specified in REQUIREMENTS.md; lightweight, zero-dependency, TypeScript types included |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | All other computation uses existing project modules | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-statistics | Manual percentile calculation | simple-statistics handles edge cases (ties, single values, empty arrays) correctly |

**Installation:**
```bash
npm install simple-statistics
```

Note: `simple-statistics` ships with TypeScript declarations. No `@types/` package needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/computation/
│   ├── compute-cross-partner.ts    # NEW: All cross-partner computation
│   └── (existing modules unchanged)
├── hooks/
│   ├── use-all-partner-stats.ts    # NEW: Hook wrapping cross-partner computation
│   └── (existing hooks unchanged)
├── contexts/
│   ├── cross-partner-provider.tsx  # NEW: Context provider for cross-partner data
│   └── anomaly-provider.tsx        # MODIFIED: Integrate percentile flags
├── types/
│   └── partner-stats.ts            # MODIFIED: Add cross-partner types
```

### Pattern 1: Group-and-Compute (existing pattern)

**What:** Group allRows by PARTNER_NAME, compute per-group, collect results into a Map.
**When to use:** Any cross-partner computation.
**Example (from existing `computeAllPartnerAnomalies`):**
```typescript
const byPartner = new Map<string, Record<string, unknown>[]>();
for (const row of allRows) {
  const name = String(row.PARTNER_NAME ?? '');
  if (!name) continue;
  const existing = byPartner.get(name);
  if (existing) existing.push(row);
  else byPartner.set(name, [row]);
}
// Then compute per partner group
```

### Pattern 2: Context Provider + Hook (existing pattern)

**What:** Computation wrapped in useMemo hook, exposed via React Context.
**When to use:** Data needed by multiple components across the tree.
**Example (from existing `AnomalyProvider`):**
```typescript
export function CrossPartnerProvider({ allRows, children }) {
  const stats = useAllPartnerStats(allRows);
  const value = useMemo(() => ({ stats }), [stats]);
  return <CrossPartnerContext.Provider value={value}>{children}</CrossPartnerContext.Provider>;
}
```

### Pattern 3: Dollar-Weighted vs Equal-Weight Averaging

**What:** Two averaging modes for collection curves. Dollar-weighted weights each batch's contribution by its TOTAL_AMOUNT_PLACED. Equal-weight treats all batches the same.
**When to use:** Average curve computation (XPC-03).
**Implementation:**
```typescript
// Equal-weight: simple mean of recoveryRate at each month
// Dollar-weighted: sum(recoveryRate * totalPlaced) / sum(totalPlaced) at each month

function averageCurves(
  curves: BatchCurve[],
  mode: 'equal' | 'dollar-weighted',
): CurvePoint[] {
  // For each COLLECTION_MONTH, collect all batches that have data at that month
  // Truncate when fewer than 2 batches contribute
}
```

### Pattern 4: Percentile Rank via simple-statistics

**What:** `quantileRank(sortedValues, value)` returns the fraction of values less than or equal to the given value (0 to 1).
**When to use:** XPC-02 -- ranking each partner on each metric.
**Implementation:**
```typescript
import { quantileRank } from 'simple-statistics';

// Collect metric values for all eligible partners
const values = eligiblePartners.map(p => p.kpis.collectionRate6mo);
// Compute percentile for each partner
const percentile = quantileRank(values, thisPartnerValue); // 0.0 to 1.0
```

### Pattern 5: Activity Status Classification

**What:** Classify partners as active, semi-inactive, or inactive based on batch recency.
**When to use:** XPC-01 filtering -- determining which partners appear in rankings.
**Implementation:**
```typescript
// Parse BATCH column (format like "2025-01" or similar date string)
// Compare latest batch date to current date
// 0-6 months: active (full ranking)
// 6-12 months: semi-inactive (de-emphasized, still ranked)
// 12+ months: inactive (excluded from rankings)
```

### Anti-Patterns to Avoid
- **Computing per-partner stats separately for each partner on re-render:** Compute all partners in a single pass, memoize the Map result.
- **Modifying existing `usePartnerStats` to handle cross-partner:** Keep the single-partner hook unchanged. Create a new `useAllPartnerStats` that computes across all partners.
- **Separate data layer for percentile anomaly flags:** Must integrate into existing anomaly engine type system per user decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Percentile rank | Manual sort + index division | `simple-statistics.quantileRank()` | Handles ties, edge cases, empty arrays correctly |
| Row grouping | New grouping utility | Existing pattern from `computeAllPartnerAnomalies` | Already proven, consistent codebase style |
| Collection curve reshaping | New curve parser | Existing `reshapeCurves()` per partner group | Already handles wide-to-long, age truncation |
| KPI aggregation | New aggregation | Existing `computeKpis()` per partner group | Already handles weighted averages, null safety |

## Common Pitfalls

### Pitfall 1: Batch Date Parsing for Activity Classification
**What goes wrong:** BATCH column format may not be a simple ISO date -- it could be "2025-01" or "Jan 2025" or another format.
**Why it happens:** Snowflake batch naming conventions vary.
**How to avoid:** Inspect actual BATCH values in the dataset first. Use the existing BATCH_AGE_IN_MONTHS (actually days) field instead -- a batch is "X months old" if BATCH_AGE_IN_MONTHS / 30 >= X.
**Warning signs:** Partners with known recent batches showing as "inactive."

### Pitfall 2: quantileRank Edge Cases
**What goes wrong:** With only 5-10 partners, percentile ranks are coarse (e.g., increments of 10-20%).
**Why it happens:** Small population size makes percentile ranks jumpy.
**How to avoid:** This is acceptable per user decision (all partners in one global pool). Document that with <10 partners, 10th percentile flag means literally the bottom 1 partner.
**Warning signs:** All partners flagged or none flagged.

### Pitfall 3: Curve Truncation with Dollar-Weighting
**What goes wrong:** Dollar-weighted average at month 48 might be dominated by a single large batch if only 2 batches reach that age.
**Why it happens:** Fewer batches contribute at later months; large portfolios dominate weighted averages.
**How to avoid:** Apply the "fewer than 2 batches contributing" truncation AFTER weighting. This is already a locked decision.
**Warning signs:** Average curve suddenly jumping at later months.

### Pitfall 4: Per-Dollar-Placed Rate Calculation
**What goes wrong:** Dividing totalCollected / totalPlaced when totalPlaced is 0.
**Why it happens:** Edge case with partners that have no placement data.
**How to avoid:** Guard division by zero, return 0 or null. Existing `computeKpis` already uses this pattern: `totalPlaced > 0 ? ... : 0`.
**Warning signs:** NaN or Infinity in percentile calculations.

### Pitfall 5: Anomaly Engine Integration Pollution
**What goes wrong:** Adding percentile-based flags changes the severity scoring or z-score reporting for existing anomaly badges.
**Why it happens:** Existing anomaly system uses z-scores; percentile flags use a different mechanism.
**How to avoid:** Add a new flag TYPE (e.g., 'percentile_outlier') to distinguish from z-score anomalies. Keep them in the same data structure but with clear type discrimination.
**Warning signs:** Existing anomaly badges changing unexpectedly after this phase.

## Code Examples

### Computing Per-Partner KPIs for All Partners
```typescript
function computeAllPartnerKpis(
  allRows: Record<string, unknown>[],
): Map<string, KpiAggregates> {
  const byPartner = groupByPartner(allRows);
  const result = new Map<string, KpiAggregates>();
  for (const [name, rows] of byPartner) {
    result.set(name, computeKpis(rows));
  }
  return result;
}
```

### Computing Percentile Rankings
```typescript
import { quantileRank } from 'simple-statistics';

function computePercentileRanks(
  partnerKpis: Map<string, KpiAggregates>,
  metric: keyof KpiAggregates,
): Map<string, number> {
  const entries = [...partnerKpis.entries()];
  const values = entries.map(([, kpi]) => kpi[metric] as number);
  const ranks = new Map<string, number>();
  for (const [name, kpi] of entries) {
    ranks.set(name, quantileRank(values, kpi[metric] as number));
  }
  return ranks;
}
```

### Average Collection Curve (Dollar-Weighted)
```typescript
function averageCurve(
  curves: BatchCurve[],
  mode: 'equal' | 'dollar-weighted',
): CurvePoint[] {
  const result: CurvePoint[] = [];
  for (const month of COLLECTION_MONTHS) {
    const contributing = curves.filter(c =>
      c.points.some(p => p.month === month)
    );
    if (contributing.length < 2) break; // Truncation rule

    if (mode === 'dollar-weighted') {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const curve of contributing) {
        const point = curve.points.find(p => p.month === month)!;
        weightedSum += point.recoveryRate * curve.totalPlaced;
        totalWeight += curve.totalPlaced;
      }
      result.push({
        month,
        amount: 0, // Not meaningful for averages
        recoveryRate: totalWeight > 0 ? weightedSum / totalWeight : 0,
      });
    } else {
      const rates = contributing.map(c =>
        c.points.find(p => p.month === month)!.recoveryRate
      );
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      result.push({ month, amount: 0, recoveryRate: avg });
    }
  }
  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-partner computation only | Cross-partner computation pattern exists (computeAllPartnerAnomalies) | Phase 15 | Reuse this group-and-compute pattern |

**No deprecated/outdated patterns relevant to this phase.**

## Open Questions

1. **BATCH column format for activity classification**
   - What we know: BATCH_AGE_IN_MONTHS exists (actually stores days)
   - What's unclear: Whether age alone is sufficient or if we need to parse BATCH dates
   - Recommendation: Use BATCH_AGE_IN_MONTHS / 30 for activity classification. The newest batch per partner determines activity status. This avoids date parsing entirely.

2. **Per-dollar-placed rate as 5th metric**
   - What we know: This is `totalCollected / totalPlaced` at the partner level
   - What's unclear: Whether this should be computed from `computeKpis` output or directly from raw rows
   - Recommendation: Compute from `computeKpis` output since it already has `totalCollected` and `totalPlaced`. Simple division.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/computation/compute-anomalies.ts` - cross-partner computation pattern
- Existing codebase: `src/hooks/use-partner-stats.ts` - per-partner computation pattern
- Existing codebase: `src/contexts/anomaly-provider.tsx` - context provider pattern
- simple-statistics npm: `quantileRank` function documentation

### Secondary (MEDIUM confidence)
- None needed -- this phase builds entirely on existing codebase patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - simple-statistics is the only new dependency, well-documented
- Architecture: HIGH - follows existing codebase patterns exactly
- Pitfalls: HIGH - derived from direct codebase analysis of edge cases

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain, no external API dependencies)
