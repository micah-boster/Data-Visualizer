# Phase 21: Critical Bug Fixes - Research

**Researched:** 2026-04-14
**Domain:** Integration bugs — Snowflake column name mapping, anomaly column injection at root level
**Confidence:** HIGH

## Summary

Phase 21 addresses two concrete integration bugs discovered during the v3.0 milestone audit. Both bugs are fully characterized with exact file locations, line numbers, and root causes. No external library changes or architectural decisions are needed — this is purely fixing incorrect column name references and adding a missing column definition to the root-level table.

**Bug 1 (NLQ-03/04/09):** `QuerySearchBarWithContext` in `data-display.tsx` manually builds `KpiAggregates` using wrong Snowflake column names (e.g., `PENETRATION_RATE` instead of `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED`). Every numeric KPI sent to Claude is zero. The fix is to reuse the existing `computeKpis()` function which already uses the correct column names.

**Bug 2 (AD-07):** `buildRootColumnDefs()` in `root-columns.ts` does not include the `anomalyStatusColumn`. At root level, `CrossPartnerDataTable` passes `rootColumnDefs` as the column override, which replaces the default `columnDefs` (from `definitions.ts`) that DOES include the anomaly column. The fix is to prepend `anomalyStatusColumn` to the root column array.

**Primary recommendation:** Fix both bugs in a single plan. Reuse `computeKpis()` for the context builder data, prepend `anomalyStatusColumn` to `buildRootColumnDefs()`, and verify the fixes produce correct data in the context string.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NLQ-03 | System prompt injects relevant data as JSON context (aggregated/summarized, not raw matrix) to keep within token budget | Bug 1: Context builder receives all-zero KPIs because `QuerySearchBarWithContext` uses wrong column names. Fix column mapping to send real values. |
| NLQ-04 | Claude constrained to only reference data present in context — if question cannot be answered, responds with explicit "I don't have that data" message | Bug 1: Claude receives numerically garbage context (all zeros), so it references incorrect data. Fixing column names ensures Claude gets real numbers to reference. |
| NLQ-09 | Query automatically scoped to current view context — if drilled into a partner, questions resolve to that partner without user specifying | Bug 1: The drill-state scoping logic in `buildDataContext()` works correctly, but the partner summaries fed into it contain zeros. Once column names are fixed, scoping works end-to-end. |
| AD-07 | Anomaly badge (colored dot / warning icon) displayed in a dedicated Status column on partner rows (root level) and batch rows (partner drill-down) | Bug 2: Root-level table uses `buildRootColumnDefs()` which does NOT include `anomalyStatusColumn`. The column exists and works at partner/batch levels but is missing at root. Prepend it to the root column array. |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. All fixes use existing project code.

| Library | Version | Purpose | Role in Fix |
|---------|---------|---------|-------------|
| `compute-kpis.ts` | N/A (project module) | Deterministic KPI aggregation from raw Snowflake rows | Reuse instead of duplicating column name mapping |
| `anomaly-column.tsx` | N/A (project module) | TanStack Table ColumnDef for anomaly status badges | Already exists — just needs to be imported into root-columns.ts |

### Alternatives Considered

None. These are straightforward bug fixes with clear correct implementations already present in the codebase.

## Architecture Patterns

### Pattern 1: Reuse `computeKpis()` Instead of Inline Column Mapping

**What:** The `QuerySearchBarWithContext` component (data-display.tsx:372-449) manually builds `KpiAggregates` objects by reading Snowflake column values inline. It uses incorrect shorthand column names that don't match the actual Snowflake schema.

**The correct column names** (from `src/lib/columns/config.ts` and `src/lib/computation/compute-kpis.ts`):

| KpiAggregates field | Correct Snowflake column | Wrong column used in bug |
|---------------------|--------------------------|-------------------------|
| `weightedPenetrationRate` | `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | `PENETRATION_RATE` |
| `collectionRate6mo` | `COLLECTION_AFTER_6_MONTH` | `COLLECTION_RATE_6MO` |
| `collectionRate12mo` | `COLLECTION_AFTER_12_MONTH` | `COLLECTION_RATE_12MO` |
| `totalCollected` | `TOTAL_COLLECTED_LIFE_TIME` | `TOTAL_COLLECTED` |
| `totalPlaced` | `TOTAL_AMOUNT_PLACED` | `TOTAL_PLACED` |

**Fix approach:** Replace the inline column-reading code with a call to `computeKpis(rows)` for each partner group. This:
1. Fixes all five column name mismatches in one shot
2. Gets the weighted penetration rate calculation correct (weighted by account count, not simple average)
3. Gets the collection rate calculation correct (% of total placed, not simple average)
4. Eliminates the duplicated computation logic

**Current buggy code location:** `src/components/data-display.tsx` lines 395-428 inside `QuerySearchBarWithContext`

**Reference implementation:** `src/lib/computation/compute-kpis.ts` — the canonical KPI computation function

### Pattern 2: Prepend Anomaly Column to Root Column Defs

**What:** `buildRootColumnDefs()` in `root-columns.ts` returns columns without the anomaly status column. When the root-level table passes this as `columnDefsOverride`, it completely replaces the default column set (which includes the anomaly column).

**Why the anomaly column works at partner/batch but not root:** At non-root levels, no `columnDefsOverride` is passed, so the table uses the default `columnDefs` from `definitions.ts` which includes `anomalyStatusColumn` at line 153. At root level, `rootColumnDefs` overrides this, losing the anomaly column.

**Fix approach:** Import `anomalyStatusColumn` from `./anomaly-column` in `root-columns.ts` and prepend it: `return [anomalyStatusColumn, ...ROOT_COLUMNS.map(...)]`.

**Additionally:** Ensure the column pinning state in `hooks.ts` line 123 (`left: ['__anomaly_status', 'PARTNER_NAME', 'BATCH']`) already covers root level — it does, since it pins `__anomaly_status` and `PARTNER_NAME` which both exist in root columns.

**The anomaly cell renderer** (`anomaly-column.tsx` lines 68-73) already handles `drillLevel === 'root'` correctly — it reads `PARTNER_NAME` from the row and looks up the partner anomaly from the anomaly map. So no changes needed to the renderer.

### Anti-Patterns to Avoid

- **Duplicating column name mappings:** The bug exists precisely because column names were duplicated instead of reusing `computeKpis()`. The fix should not introduce another column name listing.
- **Fixing column names inline:** Don't just change the five strings in `QuerySearchBarWithContext`. Replace the entire inline computation with `computeKpis()` to prevent future drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| KPI aggregation from Snowflake rows | Inline column reads in component | `computeKpis()` from `src/lib/computation/compute-kpis.ts` | Single source of truth for column names and computation logic (weighted averages, rates as % of placed) |

**Key insight:** The bug was caused by hand-rolling KPI computation instead of reusing the existing canonical function. The fix should eliminate the duplication entirely.

## Common Pitfalls

### Pitfall 1: Collection Rate Computation Mismatch

**What goes wrong:** `QuerySearchBarWithContext` computes collection rates as a simple average across batches. `computeKpis()` computes them as `(sum of collection amounts) / (total placed) * 100` — a fundamentally different calculation.

**Why it happens:** The inline code does `rows.reduce(...) / rows.length` which is a simple batch average. The correct calculation sums the dollar amounts and divides by total placed to get the portfolio-level rate.

**How to avoid:** Use `computeKpis()` which implements the correct calculation.

**Warning signs:** Collection rates in Claude responses that don't match what the table shows.

### Pitfall 2: Penetration Rate Weighting

**What goes wrong:** The inline code computes a simple average of penetration rates across batches. `computeKpis()` computes a weighted average where each batch's rate is weighted by its account count.

**Why it happens:** Simple average treats a 10-account batch and a 10,000-account batch equally.

**How to avoid:** Use `computeKpis()` which weights by account count.

### Pitfall 3: Anomaly Column Not Receiving Meta at Root

**What goes wrong:** The anomaly column renders correctly only if `table.options.meta.anomalyMap` is set. If the root table doesn't pass anomaly data through meta, the column will appear but show empty.

**Why it happens:** The `anomalyMap` is already passed via `UseDataTableOptions` in data-table.tsx line 152, so this should work automatically once the column is added.

**How to avoid:** Verify after fix that `meta.anomalyMap` is populated at root level. The `useAnomalyContext()` hook is already called in data-table.tsx line 123.

## Code Examples

### Fix 1: Replace inline KPI computation with computeKpis()

```typescript
// src/components/data-display.tsx — QuerySearchBarWithContext

import { computeKpis } from '@/lib/computation/compute-kpis';

// Replace the manual stats building (lines 395-428) with:
const partners: PartnerSummary[] = Array.from(partnerGroups.entries()).map(
  ([name, rows]) => ({
    name,
    batchCount: rows.length,
    stats: computeKpis(rows),
  }),
);
```

**Source:** Pattern derived from `src/hooks/use-partner-stats.ts` line 43 which does `kpis: computeKpis(partnerRows)`.

### Fix 2: Add anomaly column to root column defs

```typescript
// src/lib/columns/root-columns.ts

import { anomalyStatusColumn } from './anomaly-column';

export function buildRootColumnDefs(): ColumnDef<Record<string, unknown>>[] {
  const dataColumns = ROOT_COLUMNS.map((col) => ({
    // ... existing column mapping (unchanged)
  }));

  // Prepend anomaly status column — matches definitions.ts pattern
  return [anomalyStatusColumn, ...dataColumns];
}
```

**Source:** Pattern from `src/lib/columns/definitions.ts` line 153: `return [anomalyStatusColumn, ...dataColumns]`.

## State of the Art

Not applicable — this phase is bug fixes, not new technology adoption.

## Open Questions

1. **Computation parity between table display and Claude context**
   - What we know: `buildPartnerSummaryRows()` in `root-columns.ts` uses a simple average for penetration rate (`rows.reduce(...) / total`), while `computeKpis()` uses a weighted average (weighted by account count). This means even after the fix, the exact penetration rate number Claude reports may differ slightly from what the root table displays.
   - What's unclear: Whether this discrepancy matters for the user experience.
   - Recommendation: Accept the difference for now. The `computeKpis()` weighted calculation is more statistically correct. The root table's simple average is a known simplification. Document this as a known difference in the plan's notes.

## Sources

### Primary (HIGH confidence)

- **Codebase inspection** — direct reading of all relevant source files:
  - `src/components/data-display.tsx` — QuerySearchBarWithContext with buggy column names (lines 395-428)
  - `src/lib/computation/compute-kpis.ts` — canonical KPI computation with correct column names
  - `src/lib/columns/root-columns.ts` — root column defs missing anomaly column
  - `src/lib/columns/definitions.ts` — batch/partner column defs WITH anomaly column (line 153)
  - `src/lib/columns/anomaly-column.tsx` — anomaly column definition and cell renderer
  - `src/lib/columns/config.ts` — COLUMN_CONFIGS with actual Snowflake column names
  - `src/lib/table/hooks.ts` — column pinning config already includes `__anomaly_status`
  - `src/components/table/data-table.tsx` — table options pass `anomalyMap` to meta

- **v3.0 Milestone Audit** (`.planning/v3.0-MILESTONE-AUDIT.md`) — identified both bugs with exact evidence

- **Query Architecture Doc** (`docs/QUERY-ARCHITECTURE.md`) — confirms pre-computed context pattern and `computeKpis()` as canonical source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all fixes use existing code
- Architecture: HIGH — both bugs fully characterized with root cause, exact locations, and verified fix patterns
- Pitfalls: HIGH — computation mismatches documented with specific examples from codebase

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable — bug fix, no external dependencies)
