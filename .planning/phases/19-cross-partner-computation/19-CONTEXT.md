# Phase 19: Cross-Partner Computation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Compute per-partner rankings, normalized collection trajectories, and portfolio-level outlier flags so users can benchmark partners against each other. This is a pure computation/data layer — all UI display is Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Metric scope
- 5 ranking metrics (expanded from original 4):
  1. Penetration rate
  2. 6-month collection rate
  3. 12-month collection rate
  4. Total collected (raw dollar amount)
  5. Total collected (per-dollar-placed rate) — **new addition**
- Per-dollar-placed is the default/primary ranking metric for display
- All partners ranked in one global pool — no grouping by portfolio size or debt type

### Curve averaging
- Both equal-weight and dollar-weighted averaging available as user-selectable options (consistent with other parts of the app)
- Default mode: dollar-weighted (reflects real portfolio impact)
- Truncate average curves when fewer than 2 batches contribute data at a given month point — don't show averages based on a single batch

### Outlier thresholds
- 10th percentile cutoff on any single metric triggers a portfolio outlier flag
- Binary flag only (outlier or not) — no severity tiers for cross-partner flags
- 10th percentile is the right threshold — confirmed
- **Integrate with Phase 15 anomaly engine** as a new flag source, not a separate data layer. Extend the anomaly type system with percentile-based partner-level flags so downstream UI has one unified API for "what's wrong with this partner"

### Edge cases
- Minimum 3 batches required for a partner to appear in rankings
- Partners below threshold: still visible in cross-partner views but shown with "not enough data" indicator (no ranking displayed)
- Inactive partners (6-12 months no new batches): de-emphasized in rankings
- Inactive partners (12+ months): excluded from rankings entirely

### Claude's Discretion
- Exact hook architecture (useAllPartnerStats, useCrossPartnerRankings, etc.)
- How to extend the anomaly engine type system for percentile-based flags
- De-emphasis mechanism for semi-inactive partners (visual is Phase 20, but data-level flagging here)
- Performance approach for computing across all partners

</decisions>

<specifics>
## Specific Ideas

- Equal-weight vs dollar-weighted toggle is a pattern already used elsewhere in the app — stay consistent with that interaction model
- Per-dollar-placed normalization matters because portfolio sizes vary significantly across partners
- The anomaly engine integration should feel like a natural extension, not a bolt-on

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-cross-partner-computation*
*Context gathered: 2026-04-13*
