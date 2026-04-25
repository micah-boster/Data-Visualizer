---
phase: 38-polish-correctness-pass
verified: 2026-04-24T00:00:00Z
status: human_needed
score: 16/16 requirements verified (KPI-03 deferred by design)
human_verification:
  - test: "Bounce logo renders correctly in sidebar (collapsed and expanded)"
    expected: "SVG brand mark visible, correct proportions, no broken image"
    why_human: "Visual rendering cannot be checked programmatically"
  - test: "Sidebar partner list collapses and re-expands"
    expected: "partners-list-collapsed class applied, items hidden, toggle works"
    why_human: "Interactive state transition requires browser"
  - test: "Column header truncation at 180px max-width"
    expected: "Long column names truncate with ellipsis, no line-clamp-2 wrapping"
    why_human: "CSS truncation behavior requires visual confirmation"
  - test: "Heatmap toggle tooltip appears on hover"
    expected: "Tooltip with explanatory text appears, dismisses on mouse-out"
    why_human: "Hover behavior requires browser interaction"
  - test: "Laptop layout (900px height) chart/table proportions"
    expected: "Chart capped, table has minimum floor, no content overflow"
    why_human: "Responsive breakpoint requires browser at target viewport"
  - test: "KPI cascade tier labels — stat cards show correct comparison text"
    expected: "'vs 3-batch rolling avg' shown where applicable"
    why_human: "Requires live data context and KPI card rendering"
  - test: "Filter popover tooltips on age-filter options"
    expected: "Tooltips appear on hover for filter options, 'Last 3mo' label visible"
    why_human: "Tooltip hover interactions require browser"
  - test: "Single-partner view hides partner column"
    expected: "When only 1 partner selected, partner column absent from table"
    why_human: "Requires live filter state and table render"
---

# Phase 38: Polish + Correctness Pass — Verification Report

**Phase Goal:** Close 17 polish + correctness items across branding, sidebar, columns, formatting, charts, KPI cascade, filters, laptop layout, and Metabase Import override. KPI-03 deferred to Phase 41 (out of scope).
**Verified:** 2026-04-24
**Status:** HUMAN_NEEDED (all automated checks pass; visual/interactive items need browser confirmation)
**Re-verification:** No — initial verification

---

## Requirement Checks

| Req    | Check                                                   | Result |
|--------|---------------------------------------------------------|--------|
| POL-01 | Bounce SVG `viewBox="0 0 313 145"` in app-sidebar.tsx  | ✓ (1 hit) |
| POL-02 | `partners-list-collapsed` class in app-sidebar.tsx      | ✓ (2 hits) |
| POL-03 | `identitySet.has(key)` absent from `toggleColumn`       | ✓ (guard removed; only remains in `hideAll` which is correct) |
| POL-04 | `decimals?: number` param in `formatPercentage`         | ✓ (line 49 of numbers.ts; auto-pick logic on line 51) |
| POL-05 | `Tooltip` used in heatmap-toggle.tsx                    | ✓ (7 hits) |
| POL-06 | `max-w-[180px]` in draggable-header.tsx, no line-clamp-2| ✓ (1 hit / 0 hits) |
| CHT-01 | `visibleCurves` in collection-curve-chart.tsx; `curves.length >= 2` absent from data-display.tsx | ✓ (2 / 0) |
| CHT-02 | `__avg__` sentinel in collection-curve-chart.tsx        | ✓ (5 hits) |
| CHT-03 | `max-h-[40vh]` in curve-legend.tsx                      | ✓ (1 hit) |
| CHT-04 | `chart-laptop-cap` + `table-laptop-floor` in globals.css + data-display.tsx; `max-height: 900px` in globals.css | ✓ (6 refs / 1 hit) |
| KPI-01 | `selectCascadeTier` in compute-kpis.ts + kpi-summary-cards.tsx; 3 metric fields present | ✓ (5 + 16 hits) |
| KPI-02 | `vs 3-batch rolling avg` in stat-card.tsx or kpi/        | ✓ (3 hits across 2 files) |
| KPI-03 | DEFERRED to Phase 41 — see note below                  | N/A |
| KPI-04 | `suppressDelta` in compute-trending.ts                  | ✓ (4 hits) |
| FLT-01 | `coerceAgeMonths` in utils.ts; `Last 3mo` in filter-popover.tsx; `batchAgeFilter` in views types + schema | ✓ (1 / 3 / 4 hits) |
| FLT-02 | `Tooltip` in filter-popover.tsx                         | ✓ (25 hits) |
| FLT-03 | `partnerIds.length === 1` or `hidePartnerColumn` in data-display.tsx | ✓ (5 hits) |
| MBI-01 | `inferenceReason` in chart-inference.ts + preview-step.tsx; `mergeOverride` in metabase-import/ | ✓ (1 + 2 / present) |

**Score: 16/16 active requirements verified**

---

## Smoke Test Results

All 7 smoke tests passed with `node --experimental-strip-types`:

| Smoke Test File                                    | Result |
|----------------------------------------------------|--------|
| src/lib/formatting/numbers.smoke.ts                | ✓ formatPercentage smoke OK |
| src/components/charts/visible-curves.smoke.ts      | ✓ visible-curves smoke OK |
| src/lib/computation/cascade.smoke.ts               | ✓ cascade smoke OK |
| src/lib/computation/suppression.smoke.ts           | ✓ suppression smoke OK |
| src/hooks/use-filter-state.smoke.ts                | ✓ filter-state smoke OK |
| src/hooks/use-saved-views.smoke.ts                 | ✓ saved-views migration smoke OK |
| src/lib/metabase-import/override.smoke.ts          | ✓ override merge smoke OK |

---

## Traceability

`v4.1-REQUIREMENTS.md` shows **17 `| Complete |` rows** — all Phase 38 active requirements marked complete.

---

## KPI-03 Deferral

KPI-03 (6mo/12mo commitment rate secondary line) is deferred to Phase 41. Confirmed:
- `v4.1-REQUIREMENTS.md` line 97: `| KPI-03 | 41 | Deferred |`
- `v4.1-REQUIREMENTS.md` line 36: requirement body annotated with deferral rationale (requires new Snowflake column `ACCOUNTS_WITH_PLANS_AT_{6,12}_MONTH`)

Do NOT treat as a gap.

---

## Human Verification Required

8 items need browser/interactive confirmation — see frontmatter `human_verification` list for full detail. These cover: Bounce logo visual, sidebar collapse animation, column header truncation, heatmap tooltip, laptop layout proportions, KPI stat card labels, filter popover tooltips, and single-partner column hiding.

---

_Verified: 2026-04-24_
_Verifier: Claude (gsd-verifier)_
