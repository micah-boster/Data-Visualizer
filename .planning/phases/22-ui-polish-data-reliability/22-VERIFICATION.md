---
status: passed
phase: 22
phase_name: UI Polish & Data Reliability
verified: 2026-04-14
verifier: automated
---

# Phase 22 Verification: UI Polish & Data Reliability

## Goal
User-reported chart/interaction issues resolved and cached data loads reliably with validation.

## Success Criteria Verification

### 1. Clicking different batch lines updates tooltip to that batch's data
**Status: PASS**
- `soloedBatch` prop added to `CurveTooltipProps` in curve-tooltip.tsx
- When soloedBatch is set, tooltip filters payload to `p.dataKey === soloedBatch`
- When null, falls back to existing first-available-entry behavior
- soloedBatch threaded from `useCurveChartState` through `collection-curve-chart.tsx` to `CurveTooltip`

### 2. Visible collapse/minimize control exists for chart area
**Status: PASS**
- `chartsExpanded` state with localStorage persistence at root and partner levels
- Chevron toggle button (ChevronUp/ChevronDown) in chart header bar
- When collapsed, sparkline mini-preview (~80px) shows trend shape instead of empty space
- `RootSparkline` for cross-partner trajectories, `PartnerSparkline` for collection curves

### 3. Comparison button has clear labeling explaining what the mode shows
**Status: PASS**
- Toggle button with enter/exit states: "Compare Partners" / "Hide Comparison"
- GitCompareArrows icon on toggle button
- Card title: "Partner Comparison" with Info icon hover tooltip
- Tooltip text: "Compare key metrics across all partners — view as heatmap, bar ranking, or plain table."
- View mode buttons show icon + text label (Heatmap, Bar, Table)
- Partner count context: "{N} partners" in card header

### 4. Switching metric views updates chart to reflect selected metric
**Status: PASS**
- Chart's internal metric toggle (Recovery Rate % / Dollars Collected) already updates chart data, Y-axis formatting, and tooltip values reactively via `metric` state in `useCurveChartState`
- No external metric selector exists — internal toggle IS the view switch
- Documented at integration point in collection-curve-chart.tsx

### 5. Account JSON loads without errors (missing column handled, empty strings normalized)
**Status: PASS**
- `normalizeRow` converts empty strings to null for all values
- `normalizeData` applies to entire DataResponse.data array
- Both `getStaticBatchData()` and `getStaticAccountData()` apply normalization
- ACCOUNT_PUBLIC_ID not in BATCH_REQUIRED_COLUMNS or ACCOUNT_REQUIRED_COLUMNS (treated as optional)

### 6. Cached data files are schema-validated before serving in static mode
**Status: PASS**
- `validateCachedData` in schema-validation.ts uses Zod `safeParse` for structure
- Checks required columns (PARTNER_NAME, BATCH minimum)
- Detects unexpected columns against known column set
- Permissive: always returns data, never throws
- Validation runs lazily on function call, not at import time
- Schema warnings surfaced via `DataResponse.schemaWarnings`
- Alert banner "Data may be incomplete" renders when warnings exist

## Summary

All 6 success criteria verified. Phase 22 addresses UI-01 through UI-04 and DATA-01 through DATA-03 as specified.

**Score: 6/6 must-haves verified**
