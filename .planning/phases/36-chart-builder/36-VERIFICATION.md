---
phase: 36-chart-builder
verified: 2026-04-23T00:00:00Z
status: passed
human_uat_signoff: "2026-04-23 — user formally signed off CHRT-06/09/11/13 (\"i formally sign off / verify / bless / approve\")"
score: 11/11 requirements satisfied (automated evidence + human UAT sign-off); 4/4 Success Criteria satisfied
re_verification: null
requirement_coverage:
  CHRT-03:
    status: satisfied
    evidence: "src/components/charts/generic-chart.tsx:40,280-345 — LineChart variant renders via Recharts with pivotForSeries multi-series support; series field optional on lineChartVariantSchema (src/lib/views/schema.ts:55-62)"
  CHRT-04:
    status: satisfied
    evidence: "src/components/charts/generic-chart.tsx:42,390-431 — ScatterChart variant with per-group data binding; scatterChartVariantSchema carries series field (src/lib/views/schema.ts:69-76); ScatterTooltip custom component (src/components/charts/scatter-tooltip.tsx)"
  CHRT-05:
    status: satisfied
    evidence: "src/components/charts/generic-chart.tsx:44,450-527 — BarChart variant with <Cell> per-bar color cycling for single-series; barChartVariantSchema carries series field (src/lib/views/schema.ts:82-89)"
  CHRT-06:
    status: satisfied
    evidence: "src/components/charts/collection-curve-chart.tsx:349 lines (unchanged renderer core, extended with chartTypeSelector + presetMenu actions slots); ChartPanel dispatches to CollectionCurveChart when definition.type === 'collection-curve'. Visual parity preserved at code level, cannot prove pixel-identical output via grep."
  CHRT-07:
    status: satisfied
    evidence: "src/components/charts/axis-picker.tsx:123 lines — Popover + scrollable eligible-column list. ChartBuilderToolbar wires X picker (chart-builder-toolbar.tsx:80-97). getEligibleColumns curated via CHART_HEADLINE_METRICS + CHART_LINE_X_OPTIONS allowlists (axis-eligibility.ts:42-75)."
  CHRT-08:
    status: satisfied
    evidence: "src/components/charts/chart-builder-toolbar.tsx:100-108 — Y AxisPicker wired with chartType-derived eligible columns. Identical popover pattern as X picker. Unified curated Y list via CHART_HEADLINE_METRICS (17 headline metrics, excludes 20 COLLECTION_AFTER_N_MONTH + 16 balance-band slices)."
  CHRT-09:
    status: satisfied
    evidence: "src/components/charts/chart-type-segmented-control.tsx:67 lines — 4-icon segmented control (curves/line/scatter/bar) rendered on BOTH branches via ChartPanel (chart-panel.tsx:97-102,118-119). Click dispatches switchChartType (transitions.ts); GenericChart is pure-on-props so re-renders synchronously."
  CHRT-10:
    status: satisfied
    evidence: "src/hooks/use-chart-presets.ts:77-93 — savePreset deep-copies definition via structuredClone. SavePresetPopover composes inside PresetMenu (save-preset-popover.tsx + preset-menu.tsx). Dup-name flow with Enter/Replace recipe."
  CHRT-11:
    status: satisfied
    evidence: "src/components/charts/preset-menu.tsx:187 lines — Presets ▾ dropdown; one-click apply via handleApply dispatches structuredClone(preset.definition). ChartPanel.handlePresetApply routes through chartLoadRef for collection-curve branch (Pitfall 9 sync). Interactive flow (built-in + user apply + delete with sonner undo + back-to-preset from generic) requires human UAT."
  CHRT-12:
    status: satisfied
    evidence: "src/lib/chart-presets/defaults.ts:25-33 — BUILTIN_PRESETS = [{ id: 'builtin:collection-curves', locked: true, definition: DEFAULT_COLLECTION_CURVE }]. Reference-equality link smoke-asserted (chart-presets.smoke.ts 9 assertions pass). PresetMenu renders built-ins with Lock icon above user presets."
  CHRT-13:
    status: satisfied
    evidence: "src/components/data-display.tsx:372 chartDefinition state; lines 415-425 hydrate on view load from snapshot.chartState; lines 662-667 capture on view save branching on chartDefinition.type (Pitfall 8 two-snapshot resolution). Schema-level round-trip proven via smoke:migrate-chart (11 assertions). End-to-end save/reload cycle requires human UAT."
must_haves_verified:
  count: 26
  items:
    - "chartDefinitionSchema carries line/scatter/bar variants (src/lib/views/schema.ts:40-95)"
    - "Each variant includes optional series: axisRefSchema.nullable().optional() (schema.ts:60,74,87)"
    - "axis-eligibility helpers pure-derived from COLUMN_CONFIGS + allowlists (axis-eligibility.ts:85-127)"
    - "CHART_HEADLINE_METRICS 17-entry allowlist (smoke banner: 'headline metrics: 17, line X: 2')"
    - "CHART_LINE_X_OPTIONS 2-entry allowlist (BATCH_AGE_IN_MONTHS + BATCH)"
    - "chart-presets slice: types.ts + schema.ts + storage.ts + defaults.ts all present"
    - "useChartPresets hook exports 7 CRUD methods (use-chart-presets.ts:143-151)"
    - "BUILTIN_PRESETS reference-equal DEFAULT_COLLECTION_CURVE (defaults.ts:31)"
    - "CHART_PRESETS_STORAGE_KEY = 'bounce-dv-chart-presets' (storage.ts)"
    - "GenericChart renders all three variants in separate ChartContainers (Pitfall 6 lock)"
    - "Stale-column handling via resolveColumnWithFallback + StaleColumnWarning banner (generic-chart.tsx:188-223)"
    - "ChartBuilderToolbar composes segmented control + X/Y/series pickers (115 lines)"
    - "ChartTypeSegmentedControl shared component (67 lines, 4 icons)"
    - "AxisPicker Popover with eligible-column list + stale-key raw fallback (123 lines)"
    - "PresetMenu with built-in + user sections + save action + sonner undo (187 lines)"
    - "SavePresetPopover with dup-name Replace flow (121 lines)"
    - "GenericChartLegend scalable sidebar (50 lines)"
    - "ScatterTooltip custom component for 2-item scatter payload (80 lines)"
    - "ChartPanel dispatcher routes collection-curve vs generic (137 lines, chart-panel.tsx:91-136)"
    - "data-display.tsx wires ChartPanel on BOTH render sites (lines 928-948)"
    - "partnerRows memo (line 227) + batchRows memo with drill filter (line 233-238)"
    - "chartDefinition state (data-display.tsx:372) + save/load round-trip (415-425, 662-667)"
    - "All 5 smoke tests green: migrate-chart (11) + axis-eligibility (17+2) + chart-presets (9) + charts (13) + transitions (16) = 64 assertions"
    - "All 5 DS guards green: tokens + components + surfaces + motion + polish"
    - "No blocker anti-patterns (1 pre-existing TODO comment in collection-curve-chart.tsx:188 from Phase 29-03, not a stub)"
    - "Scope expansion documented in 36-05-SUMMARY.md 'Expanded scope during human-verify iteration' + 'Deviations from plan' sections (unified selector, axis curation, series on scatter, drill row filtering, type-aware formatting, custom scatter tooltip, per-bar coloring)"
must_haves_unverifiable:
  count: 4
  items:
    - "CHRT-06 visual parity: Collection Curves output pixel-identical to pre-Phase-36 (requires browser rendering comparison — anomaly colors, solo-on-click, average line, batch visibility pills)"
    - "CHRT-09 interactive re-render: one-click chart-type swap feels instant with no flicker or layout jump (requires browser interaction)"
    - "CHRT-11 one-click preset load: apply flow from Presets dropdown, including back-to-preset from a generic chart, restores metric/hiddenBatches/showAverage/showAllBatches correctly (requires browser)"
    - "CHRT-13 end-to-end persistence: save a view with a generic chart → reload → chart state restored identically (requires browser + localStorage round-trip)"
gaps_found: []
human_verification:
  - test: "Collection Curves visual parity"
    expected: "Navigate to any partner drill-down → confirm curves render identically to pre-Phase-36: anomaly colors on outlier batches, solo-on-click dimming, average line position/color, batch visibility pills all functional"
    why_human: "Visual appearance cannot be proven by grep; regression requires side-by-side comparison"
    status: "Exercised during Plan 05 checkpoint iteration; user-confirmed visually before scope was expanded"
  - test: "Chart type switch (4 variants)"
    expected: "Click each of the 4 icons in the segmented control from both preset and generic branches → chart re-renders without flicker; appropriate toolbar appears (preset → curves controls; generic → axis pickers)"
    why_human: "Instant re-render feel + layout stability not grep-verifiable"
    status: "Exercised during Plan 05 refinement pass; unified selector verified reachable from all branches"
  - test: "Axis dropdown curation"
    expected: "Open X/Y/Series pickers on line/scatter/bar → only curated headline metrics appear (no COLLECTION_AFTER_N_MONTH flood, no balance-band slices); line X limited to BATCH_AGE_IN_MONTHS + BATCH"
    why_human: "Dropdown UX quality requires human visual scan"
    status: "Exercised during Plan 05 refinement; 17-metric + 2-line-X allowlist confirmed in smoke banner"
  - test: "Multi-series grouping"
    expected: "Set series=BATCH on line chart → one line per batch, color-coded; set series on bar chart → grouped bars; set series on scatter → colored point clusters with label in tooltip"
    why_human: "Grouping correctness + color cycling requires rendered output inspection"
    status: "Exercised during Plan 05 refinement (sidebar legend added specifically to handle 200+ batch case)"
  - test: "Save/load preset round-trip"
    expected: "Configure a line chart with specific X/Y/series → Save as preset → switch to a different chart type → click the saved preset from Presets menu → exact configuration restored. Delete a user preset → sonner undo toast restores it."
    why_human: "Storage round-trip + undo UX cannot be proven by smoke"
    status: "Exercised during Plan 05 refinement pass"
  - test: "Per-view chart persistence (CHRT-13)"
    expected: "Save a View with a generic chart active → reload the page → load the View → chart restored with the correct type, axes, and series. Same for Collection Curves with custom hiddenBatches."
    why_human: "End-to-end ViewSnapshot round-trip requires full app + localStorage"
    status: "Exercised during Plan 05 checkpoint; schema-level round-trip smoke-asserted (migrate-chart 11 assertions)"
  - test: "Drill-through row filtering"
    expected: "Drill into a partner → chart shows only that partner's rows (not global filteredRawData). Drill into a batch → chart shows only that batch's rows."
    why_human: "Data-scoping correctness requires verifying chart content matches drill context"
    status: "Exercised during Plan 05 refinement (silent bug caught: filteredRawData → partnerRows/batchRows fix landed)"
  - test: "Scatter tooltip layout"
    expected: "Hover on scatter points → three-row tooltip (X typed value, Y typed value, optional series label) with correct formatting per ColumnConfig.type"
    why_human: "Custom ScatterTooltip layout rendering requires browser"
    status: "Exercised during Plan 05 refinement (shadcn ChartTooltipContent replaced because 2-item scatter payload broke single-formatter iteration)"
---

# Phase 36: Chart Builder Verification Report

**Phase Goal:** Ship a generic chart builder alongside the existing Collection Curves preset so users can construct line/scatter/bar charts on-demand, save presets, and persist per-view chart state — without regressing visual parity for the Collection Curves default.

**Verified:** 2026-04-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The phase goal decomposes into 4 Success Criteria from v4.0-ROADMAP.md lines 262-265:

| # | Success Criterion | Status | Evidence Layer |
|---|------|--------|----------------|
| 1 | Line, scatter, and bar charts render correctly with user-selected axes | Satisfied | Code + smoke (CHRT-03/04/05/07/08) |
| 2 | Collection curves preset produces visually identical output to the current CollectionCurveChart | Satisfied (needs human UAT) | Code preserved; visual parity requires browser |
| 3 | User can select X/Y axes from filtered dropdowns, switch chart types, and see instant re-renders | Satisfied (needs human UAT) | Code + smoke (CHRT-07/08/09); interactive feel requires browser |
| 4 | User can save/load chart presets and chart config persists with saved views | Satisfied (needs human UAT) | Code + smoke (CHRT-10/11/12/13); round-trip requires browser |

**Score:** 11/11 requirements accounted for at the code layer. 4 Success Criteria all satisfied at code + smoke layer; 3 of 4 require human UAT for final sign-off (already exercised per 36-05 SUMMARY).

## Requirements Coverage (CHRT-03 through CHRT-13)

| Req    | Status                     | Phase/Plan | Evidence |
|--------|----------------------------|------------|----------|
| CHRT-03 | Satisfied                  | 36-03 + 36-05 | `generic-chart.tsx:40,280-345` LineChart variant + pivotForSeries |
| CHRT-04 | Satisfied                  | 36-03 + 36-05 | `generic-chart.tsx:42,390-431` ScatterChart + custom ScatterTooltip |
| CHRT-05 | Satisfied                  | 36-03 + 36-05 | `generic-chart.tsx:44,450-527` BarChart + per-bar Cell color cycling |
| CHRT-06 | Satisfied (needs human UAT) | 36-05      | `collection-curve-chart.tsx` extended with slots; renderer core unchanged |
| CHRT-07 | Satisfied                  | 36-01+04+05 | `axis-picker.tsx` + curated `CHART_LINE_X_OPTIONS` (2) / `CHART_HEADLINE_METRICS` (17) |
| CHRT-08 | Satisfied                  | 36-01+04+05 | `chart-builder-toolbar.tsx:100-108` Y AxisPicker wired to `getEligibleColumns(_, 'y')` |
| CHRT-09 | Satisfied (needs human UAT) | 36-03+04+05 | `chart-type-segmented-control.tsx` shared across branches + `switchChartType` dispatch |
| CHRT-10 | Satisfied                  | 36-02 + 04 | `use-chart-presets.ts:77-93` savePreset + `save-preset-popover.tsx` |
| CHRT-11 | Satisfied (needs human UAT) | 36-02+04+05 | `preset-menu.tsx` handleApply + ChartPanel `handlePresetApply` sync (Pitfall 9) |
| CHRT-12 | Satisfied                  | 36-02      | `defaults.ts:25-33` BUILTIN_PRESETS reference-equal DEFAULT_COLLECTION_CURVE |
| CHRT-13 | Satisfied (needs human UAT) | 36-01+05   | `data-display.tsx:372,415-425,662-667` hydrate/capture round-trip |

**Coverage: 11/11** — every requirement ID in the phase range accounted for.

## Must-Haves Verified (Automated)

**26 items verified via file existence, content grep, smoke execution, and DS guard execution:**

### Schema layer
- [x] `chartDefinitionSchema` carries 4 variants (collection-curve + line + scatter + bar)
- [x] All three Phase 36 variants include `series: axisRefSchema.nullable().optional()` — scatter field added beyond original plan scope (documented in 36-05 SUMMARY deviations)
- [x] `axisRefSchema` shared across variants

### Data layer
- [x] `axis-eligibility.ts` with pure COLUMN_CONFIGS derivation
- [x] `CHART_HEADLINE_METRICS` 17-entry allowlist
- [x] `CHART_LINE_X_OPTIONS` 2-entry allowlist (BATCH_AGE_IN_MONTHS, BATCH)
- [x] `chart-presets/` slice (types + schema + storage + defaults)
- [x] `useChartPresets` hook exports 7 CRUD methods
- [x] `BUILTIN_PRESETS` reference-equal to `DEFAULT_COLLECTION_CURVE`
- [x] `CHART_PRESETS_STORAGE_KEY = 'bounce-dv-chart-presets'`

### Renderer layer
- [x] `GenericChart` (622 lines) renders all three variants in separate ChartContainers
- [x] Stale-column handling via `resolveColumnWithFallback` + `StaleColumnWarning`
- [x] `pivotForSeries` helper for multi-series line/bar
- [x] `scatterGroups` per-group data binding for Scatter

### UI component layer
- [x] `ChartBuilderToolbar` (115 lines) composes segmented control + X/Y/series AxisPickers
- [x] `ChartTypeSegmentedControl` (67 lines) — 4-icon selector shared across branches
- [x] `AxisPicker` (123 lines) with Popover + stale-key raw fallback
- [x] `PresetMenu` (187 lines) with built-in/user sections + sonner undo
- [x] `SavePresetPopover` (121 lines) with dup-name Replace flow
- [x] `GenericChartLegend` (50 lines) sidebar scalable for 200+ batches
- [x] `ScatterTooltip` (80 lines) custom 3-row tooltip

### Dispatcher + integration layer
- [x] `ChartPanel` (137 lines) routes collection-curve vs generic + handles Pitfall 9 preset sync
- [x] `data-display.tsx` wires ChartPanel on BOTH render sites (lines 928, 941)
- [x] `partnerRows` memo (line 227) + `batchRows` drill-filtered memo (line 233)
- [x] `chartDefinition` state + save/load round-trip (lines 372, 415-425, 662-667)

### Test + guard layer
- [x] All 5 smoke tests green (64 assertions total: migrate-chart 11 + axis-eligibility 17+2 + chart-presets 9 + charts 13 + transitions 16)
- [x] All 5 DS guards green (tokens + components + surfaces + motion + polish)

### Anti-pattern scan
- [x] No blocker anti-patterns. One pre-existing TODO comment at `collection-curve-chart.tsx:188` is from Phase 29-03 (EmptyState consideration for empty body) — not a Phase 36 stub.

## Must-Haves Unverifiable (Human UAT Required)

**4 items require browser-based human verification:**

1. **CHRT-06 visual parity** — Collection Curves rendering pixel-identical to pre-Phase-36. Code structure preserved (CollectionCurveChart extended with slots, not rewritten), but visual regression can only be caught by eye.
2. **CHRT-09 interactive re-render** — chart-type swap feels instant, no flicker.
3. **CHRT-11 preset apply flow** — one-click load, back-to-preset from generic, sonner undo toast.
4. **CHRT-13 end-to-end persistence** — Save View → reload → load View → chart state restored.

All four were exercised during Plan 05's checkpoint + refinement iteration (see 36-05-SUMMARY.md "Expanded scope during human-verify iteration") and user-confirmed visually before the phase was closed out.

## Scope Expansion Audit

Per user prompt: verify 36-05's scope expansion is documented. **Confirmed.** `36-05-SUMMARY.md` lines 110-121 ("Expanded scope during human-verify iteration") and lines 132-136 ("Deviations from plan") explicitly list and justify:

- Unified chart-type selector on both branches (reversed original CONTEXT lock)
- Axis curation allowlist (17 headline metrics + 2 line X)
- Series field added to scatter variant (originally scoped line+bar only)
- On-chart scatter point labels abandoned (tooltip-only final behavior)
- Per-bar color cycling via `<Cell>` for single-series bars
- `ChartPanel` passes `partnerRows`/`batchRows` instead of `filteredRawData` (silent drill bug fix)
- `.text-body-numeric` for tooltip values instead of `.text-label-numeric` (letter-spacing fix)
- Custom `ScatterTooltip` component (shadcn iteration model incompatible)

## Gaps Summary

**No gaps.** All 11 requirements covered; all 26 automated must-haves verified; 64 smoke assertions pass; 5 DS guards green; `npx tsc --noEmit` clean on Phase-36 files (only pre-existing Phase-33 axe-core error remains, logged in `deferred-items.md`).

**Status: human_needed.** Automated verification cannot prove visual parity (CHRT-06), interactive feel (CHRT-09, CHRT-11), or end-to-end persistence round-trip (CHRT-13). Per user prompt, these were exercised during Plan 05's checkpoint iteration with user confirmation — the `human_verification` items above document what was tested rather than adding new test requirements.

Phase 36 is the final gate for milestone v4.0's chart system. Ready to mark complete once human UAT sign-off is recorded.

---

*Verified: 2026-04-23*
*Verifier: Claude (gsd-verifier)*
