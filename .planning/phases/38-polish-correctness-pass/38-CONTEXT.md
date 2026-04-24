# Phase 38: Polish + Correctness Pass — Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 18 first-week feedback items against v4.0 in one batched phase — branding (POL-01, POL-02), columns + formatting (POL-03..06), chart correctness (CHT-01..04), KPI clarity (KPI-01..04), filter fixes (FLT-01..03), laptop layout (CHT-04), and Metabase Import chart-type override (MBI-01). Discussion resolved two items with data-layer dependencies by deferring them to v4.5 Phase 41, shrinking in-phase scope from 18 to 17 items.

</domain>

<decisions>
## Implementation Decisions

### Date-range filter (FLT-01)

- **Filter dimension**: `BATCH_AGE_IN_MONTHS` — Snowflake `agg_batch_performance_summary` has no date columns today (verified via schema query). Age-bucket presets ship the feedback fix without a data-layer change.
- **UX**: Preset chips only in Phase 38 — "Last 3mo" (age ≤ 3), "Last 6mo" (age ≤ 6), "Last 12mo" (age ≤ 12), "All" (no filter). No custom calendar in Phase 38.
- **Cascade**: Full cascade with partner + account-type filters (AND-combine), applied upstream of aggregation per the Phase 25 filter-before-aggregate contract. No special-casing.
- **Saved-view migration**: Views with legacy batch filters drop the filter on load and show a sonner toast ("Batch filter removed — re-save with date range"). No attempt to translate batch IDs → age buckets (lossy, drifts over time).
- **Data note (locked for future reference)**: Every `master_accounts` row across all three ACCOUNT_TYPE values (THIRD_PARTY 808k, PRE_CHARGE_OFF_FIRST_PARTY 5.4k, PRE_CHARGE_OFF_THIRD_PARTY 431) has both `ORIGINATION_DATE` and `ASSIGNMENT_DATE` populated. `ASSIGNMENT_DATE` is tight within a batch (same-day to ~6-day spans); `ORIGINATION_DATE` spans years within a single batch (e.g., AF_APR_26_CORE_BB: 2015→2025). Therefore `ASSIGNMENT_DATE` is the only dimension that reduces to a scalar per batch. When v4.5 Phase 41 adds a real date column, it must be `BATCH_PLACEMENT_DATE = MIN(ASSIGNMENT_DATE) per batch`, not origination-based.
- **First-party DPD concern**: Account-level DPD uses `ORIGINATION_DATE` on individual rows during drill-down — unaffected by the batch-level filter either way.

### Laptop layout (CHT-04)

- **Mechanism**: Capped max-heights. No resize handle, no auto-collapse.
- **Breakpoint**: `@media (max-height: 900px)` — fix applies only to small viewports; desktop behavior unchanged.
- **Ratios**: Chart panel `max-height: 48vh` when expanded; table container `min-height: 320px` (~8 rows at dense density) and scrolls internally via existing TanStack Virtual. Sticky toolbar + KPI strip stay at natural height above.
- **Default expanded state**: Honor existing `charts-expanded` localStorage value — no viewport-conditional force-collapse.
- **Scroll**: Table container scrolls; page stays put. Existing behavior preserved.

### KPI copy + cascade (KPI-02, KPI-04)

- **KPI-02 delta copy**: Exactly `vs 3-batch rolling avg`. Applies to every delta label on KPI cards that use the rolling-avg baseline.
- **KPI-04 suppression rule**: Rolling-avg delta for an Xmo rate card requires ≥3 prior batches that have reached X months of age. Applied uniformly across horizons (3mo, 6mo, 12mo). 'Since inception' card always shows the delta if any prior batch exists. When suppressed, card renders value only with no delta indicator — no "vs N/A", no misleading 0%.

### Branding + sidebar (POL-01, POL-02)

- **Logo asset**: User (Micah) will drop `public/bounce-logo.svg` (and optionally `public/bounce-logo-dark.svg`) before execution. Plan assumes the filename. Implementation is a one-line swap of the `"B"` span at `src/components/layout/app-sidebar.tsx:65` for an `<Image />` or inline SVG.
- **Mark form**: Icon mark only (not full wordmark). Same footprint as current "B" block so surrounding layout is preserved.
- **Dark variant**: Planner decides at execution time based on what the dropped SVG looks like — prefer single SVG with `fill="currentColor"` if monochrome; two SVGs with theme-class swap if multicolor.
- **POL-02 collapsed state**: Partners list pre-collapsed on first-ever load; user's expand/collapse choice thereafter persists in localStorage. Matches the existing `charts-expanded` pattern.

### Claude's Discretion

- **POL-05 heatmap tooltip copy**: Exact wording. Planner writes a short explanatory string ("Colors cells by deviation from the partner's norm range" or similar).
- **POL-06 header truncation**: Native `title` attribute vs a tooltip primitive; precise `max-width` value. Planner picks.
- **FLT-02 filter help tooltips**: Copy for each of the three filters (partner, account type, date range). Planner writes.
- **MBI-01 chart-type override**: UI pattern is locked (mirrors Phase 36's `ChartBuilderToolbar` segmented control). Copy for the inference-reason helper text is planner's call.
- **CHT-01 "currently displayed" semantics**: For the avg-line + x-axis clipping, "currently displayed vintages" = the batches whose curves are visible after user's curve-selection and filter state. Planner confirms during implementation by reading the existing selection state in `collection-curve-chart.tsx`.

</decisions>

<specifics>
## Specific Ideas

- **Phase 38 scope shrinks from 18 → 17 items** because KPI-03 (matching-horizon commitment rate) defers to v4.5 Phase 41. Update `v4.1-REQUIREMENTS.md` to mark KPI-03 as deferred when the Phase 38 plan lands.
- **Phase 41 (v4.5 Data Correctness Audit) inherits three new work items** from this discussion (see Deferred Ideas below). Worth noting at the top of 41-CONTEXT.md when it's gathered.
- **localStorage parity**: POL-02 collapsed state uses the same pattern as `charts-expanded` (Phase 30-04 precedent). Key name should follow same convention (`partners-list-collapsed` or similar).
- **Schema-aware date filter defaults**: Once v4.5 Phase 41 adds `BATCH_PLACEMENT_DATE`, the existing preset chips ("Last 3mo" etc.) should continue to work unchanged — they just gain a "Custom" option alongside. Don't rewrite the presets, layer the calendar on top.

</specifics>

<deferred>
## Deferred Ideas

### To v4.5 Phase 41 (Data Correctness Audit)

1. **`BATCH_PLACEMENT_DATE` Snowflake view column** — add `MIN(ASSIGNMENT_DATE)` per batch to the agg table or a view on top, so downstream consumers (this app, Airflow, MBR pipelines, partner scorecards) share a single canonical batch placement date. Unblocks the custom calendar on the FLT-01 filter.
2. **Custom date-range calendar UI** — once `BATCH_PLACEMENT_DATE` is available, add a "Custom" chip to the date-range filter that opens a two-date calendar popover. Presets (3mo/6mo/12mo/All) remain unchanged; "Custom" is additive.
3. **Horizon-matched commitment rate** — the `TOTAL_ACCOUNTS_WITH_PLANS` column today is a lifetime count. KPI-03 wants commitment rate *at a specific horizon* (6mo, 12mo) as a secondary line on the matching rate card. This needs a new column (e.g., `ACCOUNTS_WITH_PLANS_AT_6_MONTH`, `ACCOUNTS_WITH_PLANS_AT_12_MONTH`) or a derivation from timestamped plan-creation events. Add the column in Phase 41, then wire the UI (KPI-03 completion moves to Phase 41).

### Out of scope for this phase (already belong elsewhere)

- Per-product splitting (Happy Money 1st vs 3rd party blending) — Phase 39 owns it.
- Projected-curve overlays and "vs projected curve" KPI baseline — Phase 40 owns it. KPI-04 note in the roadmap ("projected curve becomes the natural fallback for early batches") explicitly references this future integration.
- Resize handle between chart + table — not shipping in Phase 38; a future layout phase could add it if the team wants power-user ratio control after daily-driving the capped-heights solution.
- Metabase card JSON paste / URL import (MBI-02, MBI-03) — already deferred to Future Requirements per the roadmap.

</deferred>

---

*Phase: 38-polish-correctness-pass*
*Context gathered: 2026-04-23*
