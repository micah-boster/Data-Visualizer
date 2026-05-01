# Architecture Decision Records

This directory holds one ADR per statistical threshold or weighting choice in
the app's computation layer. Each ADR captures: what the value is, what
alternatives were considered, why this value, the partner-overrides answer,
and when to revisit.

**Format conventions:**

- One value, one decision, one history per file.
- File name: `NNN-kebab-name.md` (zero-padded sequence).
- Status field: `Accepted` / `Superseded by NNN` / `Proposed`.
- Code references use exact `file:line` paths so a reader can click through.
- Each constant in code carries a one-line `// ADR: .planning/adr/NNN-...md`
  comment immediately above it — grep `ADR: \.planning/adr/` to find them all.

## Index

| #   | Title                                                                                                | Code reference                                                  | Status                              |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| 001 | Z-score anomaly threshold = 2                                                                        | `src/lib/computation/compute-anomalies.ts:83`                   | Accepted                            |
| 002 | Anomaly `MIN_GROUPS = 2` (correlated-metric dedup)                                                   | `src/lib/computation/compute-anomalies.ts:97`                   | Accepted (Wave 0 supersedes MIN_FLAGS) |
| 003 | Trending threshold = 5% relative                                                                     | `src/lib/computation/compute-trending.ts:17` (`THRESHOLD`)      | Accepted                            |
| 004 | Trending baseline window = up to 4 prior batches (min 2)                                             | `src/lib/computation/compute-trending.ts:104-107`               | Accepted                            |
| 005 | KPI cascade breakpoints = 3 / 6 / 12 mo                                                              | `src/lib/computation/compute-kpis.ts:95` (`selectCascadeTier`)  | Accepted                            |
| 006 | `MIN_PLACED_DENOMINATOR_DOLLARS = $100K`                                                             | `src/lib/computation/compute-kpis.ts:84`                        | Accepted (Wave 0)                   |
| 007 | Dollar-weighted penetration is canonical primary; account-weighted is column-picker only            | `src/lib/columns/root-columns.ts:186` (`weightedByPlaced`)      | Accepted                            |
| 008 | Young-batch censoring via metric-age-eligibility filter (strict rule)                                | `src/lib/computation/metric-eligibility.ts` (`isMetricEligible`) | Accepted                            |
| 009 | Caching layers — Next route cache + React Query + Snowflake; locked RefreshButton path              | `src/app/api/data/route.ts:13` (`revalidate = 3600`)            | Accepted (Phase 43-03 / BND-06)     |

## Adding new ADRs

When adding or changing a threshold:

1. Pick the next sequence number (009, 010, ...).
2. Copy the template from any existing ADR — the fixed sections are:
   Status / Date / Supersedes / Cross-references / Context / Decision /
   Alternatives considered / Why this value / Partner overrides / When to
   revisit / References.
3. Fill in each section.
4. Add a row to the Index above.
5. Add the `// ADR: .planning/adr/NNN-...md` inline comment above the
   constant or function it documents.

If superseding an existing ADR:

- Mark the old ADR `Status: Superseded by NNN-...md`.
- Reference it from the new ADR's `Supersedes:` field.
- Update the Index Status column.

## Convention: NO partner overrides

All thresholds in this directory are global. Partner-specific overrides invite
p-hacking and erode the cross-partner triangulation surface that v5.0 builds
on. v5.5+ revisits this convention only if specific partners need tuning that
doesn't compromise triangulation. Set in Phase 41-04 (DCR-11).

---

_Created: Phase 41-04 (DCR-11), v4.5._
