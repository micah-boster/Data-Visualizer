# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Within-Partner Comparison

**Shipped:** 2026-04-12
**Phases:** 5 | **Plans:** 9

### What Was Built
- Computation layer (`usePartnerStats`) composing KPI aggregates, metric norms, collection curves, and batch trending
- 6 KPI summary cards with polarity-aware trend arrows at partner drill-down
- Multi-line collection curve chart (Recharts) with recovery rate %, partner average, legend, lazy loading
- Conditional formatting with deviation-based green/red cell tinting via React Context
- Batch-over-batch trending arrows on 5 key metrics in the partner-level table

### What Worked
- Computation-first architecture: building `usePartnerStats` in Phase 10 meant Phases 11-14 were purely UI work consuming pre-computed data
- 4 independent phases (11-14) all depending only on Phase 10 — no serial bottleneck
- Research + plan + verify loop caught the camelCase-to-Snowflake-column-name mismatch before execution
- Immediate browser verification after each phase caught the `compute-kpis.ts` column name bug early

### What Was Inefficient
- Snowflake column names in plan docs didn't match actual data (`TOTAL_NUMBER_OF_ACCOUNTS` vs `TOTAL_ACCOUNTS`, `TOTAL_COLLECTED` vs `TOTAL_COLLECTED_LIFE_TIME`) — executor wrote code matching the plan, required post-execution fix
- `BATCH_AGE_IN_MONTHS` is actually days in Snowflake — the comment says so but the column name is misleading, caused confusion
- Phase 13/14 SUMMARY frontmatter didn't populate `requirements_completed` — caused audit to flag as partial

### Patterns Established
- `usePartnerStats` as composition hook pattern — single entry point, 4 pure computation modules
- React Context for norm distribution (PartnerNormsProvider) — avoids prop drilling through TanStack Table
- `CARD_SPECS` array pattern bridging camelCase keys to Snowflake column names for trend lookup
- Metric polarity system (`getPolarity()`) for context-aware trend coloring

### Key Lessons
1. Always verify Snowflake column names against actual API response data before planning — plan docs are unreliable source of truth for column names
2. Browser verification after each phase is essential — the column name bug would have been invisible without it
3. The audit 3-source cross-reference (VERIFICATION + SUMMARY + REQUIREMENTS) catches documentation gaps even when code is correct

### Cost Observations
- All 5 phases completed in a single day
- Research agents high-confidence on all phases (existing codebase well-documented)
- Single plan per phase for Phase 11 (compact scope) — appropriate, didn't need splitting

---

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 |
|--------|------|------|
| Phases | 9 | 5 |
| Plans | 18 | 9 |
| LOC (total) | ~7,150 | ~9,400 |
| LOC added | ~7,150 | ~2,344 |
| Requirements | 13 | 29 |
| Timeline | ~1 day | ~1 day |

---
*Updated: 2026-04-12*
