---
phase: 36-chart-builder
plan: 04
subsystem: charts
tags: [react, popover, segmented-control, chart-builder, presets, @base-ui/react, structured-clone, axis-eligibility, node-strip-types]

requires:
  - phase: 35-chart-schema-migration
    provides: "ChartDefinition discriminated-union + DEFAULT_COLLECTION_CURVE + Node --experimental-strip-types smoke harness"
  - phase: 36-chart-builder Plan 01
    provides: "line/scatter/bar variants + axis-eligibility helpers (getEligibleColumns + isColumnEligible) + narrow type aliases (LineChartDefinition / ScatterChartDefinition / BarChartDefinition / GenericChartDefinition)"
  - phase: 36-chart-builder Plan 02
    provides: "useChartPresets hook (7 CRUD methods) + BUILTIN_PRESETS (Collection Curves) + ChartPreset entity + chartPresetSchema"
provides:
  - "switchChartType(current, nextType) + seedGenericFromPreset(preset, nextType) pure helpers (src/lib/charts/transitions.ts)"
  - "isSameDefinition(a, b) variant-aware deep-equals (src/lib/charts/chart-definition-equals.ts)"
  - "AxisPicker — Popover+combobox for (chartType, axis) pair, options via getEligibleColumns (src/components/charts/axis-picker.tsx)"
  - "ChartBuilderToolbar — icon segmented control + X/Y pickers + ToolbarDivider separator (src/components/charts/chart-builder-toolbar.tsx)"
  - "SavePresetPopover — name input + Save/Replace? recipe mirroring SaveViewPopover (src/components/charts/save-preset-popover.tsx)"
  - "PresetMenu — single Presets ▾ dropdown listing BUILTIN_PRESETS (Lock) + user presets (Trash-on-hover) + Save action (src/components/charts/preset-menu.tsx)"
  - "smoke:transitions npm script (16 assertions covering switchChartType carryover + preset→generic seeding)"
affects: [36-chart-builder plan 05 (integration wiring into ChartPanel), 37-metabase-sql-import]

tech-stack:
  added: []
  patterns:
    - "Pure-component builder pattern: four new components are props-in / onChange-out; none own chart state. Plan 36-05 wires them into ChartPanel without re-architecting."
    - "Registry-derivation lock extended: switchChartType's generic→generic carryover calls isColumnEligible per-axis — never a hand-rolled compatibility list."
    - "Pitfall 4 deep-copy lock applied at preset-apply: handleApply dispatches structuredClone(preset.definition) so subsequent axis edits cannot mutate the stored preset."
    - "@base-ui/react nested Popover composition: SavePresetPopover renders as a child of PresetMenu's PopoverContent — no dropdown-menu primitive introduced; base Popover composes cleanly."
    - "Reference-equal same-type no-op: switchChartType(def, def.type) returns def; reference-equal DEFAULT_COLLECTION_CURVE returned on reset — smoke-asserted."

key-files:
  created:
    - src/lib/charts/transitions.ts
    - src/lib/charts/transitions.smoke.ts
    - src/lib/charts/chart-definition-equals.ts
    - src/components/charts/axis-picker.tsx
    - src/components/charts/chart-builder-toolbar.tsx
    - src/components/charts/save-preset-popover.tsx
    - src/components/charts/preset-menu.tsx
  modified:
    - package.json

key-decisions:
  - "seedGenericFromPreset maps preset.metric 'recoveryRate' → PENETRATION_RATE_POSSIBLE_AND_CONFIRMED (closest always-numeric rate column in COLUMN_CONFIGS) and 'amount' → TOTAL_COLLECTED_LIFE_TIME. Plan allowed RECOVERY_RATE, but no literal RECOVERY_RATE column ships in the registry — rate-family fallback per plan's Claude-discretion clause, locked verbatim in smoke assertion 3."
  - "switchChartType returns reference-equal input on same-type (Rule 1) and reference-equal DEFAULT_COLLECTION_CURVE on any→preset (Rule 2). Smoke assertions 1 + 2 lock both reference-equality contracts."
  - "isSameDefinition requires same version even for same discriminator — a future collection-curve v3 with new fields cannot falsely match v2. Extra defense beyond the plan's 'variants are version-locked' note."
  - "scatter preset→line/bar/scatter Y-seed intentionally uses the same rate-column fallback when preset.metric === 'recoveryRate' — scatter's Y must be numeric, fallback column is already numeric."
  - "AxisPicker trigger falls back to raw column key when the saved value is no longer in COLUMN_CONFIGS — stale keys after a chart-type switch surface visibly without defensive pre-checks. Plan 03's StaleColumnWarning renders the full banner; picker label is the first-surface signal."
  - "chart-builder-toolbar.tsx uses ToolbarDivider between segmented control and X picker (Phase 29-04 pattern) — no bg-border hand-rolled dividers. Single vertical separator; no trailing divider after Y (PresetMenu owns its own placement in Plan 36-05)."
  - "Label copy ('X', 'Y') lives OUTSIDE the picker (external .text-label spans) rather than inside the placeholder (plan-locked: 'Pick column' is the placeholder, no X:/Y: prefix). Avoids doubling and honors Phase 27 overline recipe."
  - "SavePresetPopover is pure popover-with-button-trigger, NOT a DropdownMenu MenuItem — PresetMenu renders the popover at the bottom of its content. @base-ui/react's PopoverRoot supports the nested composition without a dedicated menu-item primitive."
  - "PresetMenu renders user-preset delete as a hover-revealed Trash2 button inside a group/preset div (Phase 26 motion-friendly group-hover:opacity-100). e.stopPropagation() on delete prevents the parent button's handleApply firing."
  - "Active-preset detection via a single useMemo'd activeId pass over presets — O(n) once per render rather than N isSameDefinition calls per row. Matches preset-dropdown.tsx's single-pass shape."

patterns-established:
  - "Four-component pure-UI pattern for builders: AxisPicker / SegmentedToolbar / SavePopover / DropdownMenu. Each composes Popover + Button + ToolbarDivider; none own state. Integration plan (36-05) provides the parent ChartPanel that routes onChange."
  - "Preset deep-copy discipline on both WRITE and READ sides: savePreset clones on storage write (useChartPresets — Phase 36-02 Pitfall 4), PresetMenu clones on apply (Phase 36-04 Pitfall 4). Two-sided isolation — caller state and preset storage cannot cross-contaminate."
  - "Variant-aware isSameDefinition helper reusable for other discriminated-union snapshot compare: when a future discriminated-union grows (ChartDefinition, ViewSnapshot variants), this pattern (discriminator-first + per-variant structural compare) is the template. Pure helper; no /components imports."

requirements-completed: [CHRT-07, CHRT-08, CHRT-09, CHRT-10, CHRT-11, CHRT-12]

duration: ~25 min (spanning two sessions — prior agent built task 1/2 + most of task 3 before API quota limit; continuation agent verified task 3 code + committed + closed out)
completed: 2026-04-19
---

# Phase 36 Plan 04: Chart Builder UI Components Summary

**Shipped the four builder-UI components (AxisPicker, ChartBuilderToolbar, PresetMenu, SavePresetPopover) + two pure helpers (switchChartType + seedGenericFromPreset + isSameDefinition) — pure props-in / onChange-out surfaces so Plan 36-05 can wire them into ChartPanel without re-architecting.**

## Performance

- **Duration:** ~25 min spread across two execution sessions
- **Tasks:** 3
- **Files modified:** 1 (package.json)
- **Files created:** 7 (2 helper libs + 1 smoke + 4 components)

## Accomplishments

- `transitions.ts` implements the 4-rule carryover from 36-RESEARCH §Pattern 5 verbatim. `switchChartType` is the single dispatch point for segmented-control clicks; `seedGenericFromPreset` honors the CONTEXT-locked preset→generic conversion (preset.metric → Y-axis, BATCH_AGE_IN_MONTHS/BATCH/null X defaults by chart type). 16-assertion smoke covers every branch including reference-equal same-type no-op, reference-equal DEFAULT_COLLECTION_CURVE reset, and the registry-derived generic→generic eligibility rule.
- `chart-definition-equals.ts` ships `isSameDefinition` — discriminator-first, version-locked, variant-aware structural equality used by PresetMenu to render the ✓ badge on the currently-applied preset row. Pure helper; no /components imports.
- `AxisPicker` renders Popover + scrollable list of `getEligibleColumns(chartType, axis)` entries. Each option shows column label (`.text-body`) + raw Snowflake key (`.text-caption text-muted-foreground`) per the CONTEXT "density over hand-holding" lock. Clear option at top; empty-state copy for no-eligible-columns case. Stale saved keys surface as raw-key triggers (first-surface signal; Plan 03's banner handles the full warning).
- `ChartBuilderToolbar` renders the line/scatter/bar icon segmented control (LineChart/ScatterChart/BarChart3 from lucide-react) + ToolbarDivider + external `.text-label` X/Y spans + two AxisPickers. Every interaction dispatches `switchChartType` or `{...definition, x/y: next}` onChange — toolbar never owns chart state. Active-type indicated via `variant="default"` + `aria-pressed`; ToolbarDivider between segmented control and X picker (no hand-rolled `bg-border` divider — Phase 29-04 pattern).
- `SavePresetPopover` mirrors SaveViewPopover 1:1 minus the includeDrill checkbox. Popover-with-button-trigger composes inside PresetMenu's content; same dup-name flow (Enter submits → isDuplicate && !showReplace flips button to destructive "Replace?" → Enter confirms). `useRef + requestAnimationFrame` focus on open; reset on close.
- `PresetMenu` is the single Presets ▾ dropdown. BUILTIN_PRESETS (filtered via `p.locked`) render first with Lock icon and no Trash affordance; user presets render below with hover-revealed Trash2 button wired to `deletePreset` + sonner undo toast (restore → deletePreset). `Save current as preset…` action at the bottom opens SavePresetPopover which calls `savePreset(name, definition)` on confirm + sonner undo toast. Active-preset ✓ detection via single `useMemo` activeId pass over `presets`. Apply dispatches `onDefinitionChange(structuredClone(preset.definition))` — Pitfall 4 deep-copy lock.
- `smoke:transitions` npm script wired (16 assertions). All 4 smokes green (11/11 migrate-chart + 15/15 axis-eligibility + 9/9 chart-presets + 16/16 transitions + 13/13 stale-column from Plan 03). All 5 check:* guards green. `npx tsc --noEmit` shows only the pre-existing Phase-33 axe-core error (out of scope, logged to deferred-items.md). `npm run build` green.

## Task Commits

Each task was committed atomically:

1. **Task 1: transitions.ts + transitions.smoke.ts + AxisPicker + ChartBuilderToolbar** — `8bfa898` (feat)
2. **Task 2: isSameDefinition helper + SavePresetPopover** — `61d0ee0` (feat)
3. **Task 3: PresetMenu (built-ins + user + save action)** — `7069958` (feat)

_Task 3 was drafted by the first executor agent but the commit was blocked by an API quota limit; a continuation agent verified the file against the plan spec and committed without modification._

## Files Created/Modified

- `src/lib/charts/transitions.ts` — `switchChartType(current, nextType)` + `seedGenericFromPreset(preset, nextType)`. Relative `.ts` imports (Node ESM strip-types convention). Delegates registry-derived eligibility to `isColumnEligible`; reference-equals `DEFAULT_COLLECTION_CURVE` on reset.
- `src/lib/charts/transitions.smoke.ts` — 16-assertion Node strip-types smoke. Covers: same-type no-op reference equality, preset-reset reference equality, preset→line/bar/scatter seed mappings, line→bar clear-numeric-X rule, line→scatter carry-both-numeric rule, generic→generic fresh-object invariant.
- `src/lib/charts/chart-definition-equals.ts` — `isSameDefinition(a, b)`. Discriminator + version first; per-variant structural compare (collection-curve on metric/showAverage/showAllBatches + sorted hiddenBatches JSON stringify, line/scatter/bar on x/y column refs).
- `src/components/charts/axis-picker.tsx` — Popover+Button trigger with ChevronDown + scrollable list of eligible columns. Each option shows label (`.text-body`) + raw key (`.text-caption`). Clear item appears only when `value !== null`. `thin-scrollbar` on the scrollable list. Focus-glow on :focus. `'use client'`.
- `src/components/charts/chart-builder-toolbar.tsx` — `flex items-center gap-inline` row with icon segmented control + ToolbarDivider + external X/Y `.text-label` spans + two AxisPickers. `switchChartType` on type click; `{...definition, x/y: next}` on axis pick. `aria-pressed` + `aria-label` on every segmented-control button. `'use client'`.
- `src/components/charts/save-preset-popover.tsx` — Popover-with-ghost-button-trigger ("Save current as preset…"). `useRef` + `requestAnimationFrame` focus on open; `useState` name/showReplace/open with reset on close. Enter submits; Esc closes. Duplicate-name flow matches SaveViewPopover 1:1 (Save → Replace? on first submit → destructive variant).
- `src/components/charts/preset-menu.tsx` — Popover with grouped sections. `'Built-in'` heading (`.text-label text-muted-foreground`) over built-in rows with Lock icon; `divider-horizontal-fade` between sections; `'Your presets'` heading over user-preset rows with group-hover:opacity-100 Trash2 button. Footer divider + SavePresetPopover. `structuredClone(preset.definition)` on apply. Sonner toast with undo on save + delete. `'use client'`.
- `package.json` — appended `"smoke:transitions"` script alongside Plan 03's `"smoke:charts"` (parallel-landed — no merge conflict).

## Decisions Made

See `key-decisions` frontmatter. Most load-bearing resolutions:

1. **Registry-derivation lock extended across transitions.ts** — `switchChartType`'s generic→generic carryover never hand-rolls a compatibility list; delegates per-axis to `isColumnEligible`. When a new column lands in COLUMN_CONFIGS, its carryover eligibility propagates automatically.
2. **Two-sided deep-copy (structuredClone) discipline** — `useChartPresets.savePreset` clones on write (Phase 36-02 Pitfall 4); PresetMenu's `handleApply` clones on read (Phase 36-04 Pitfall 4). Caller state and preset storage cannot cross-contaminate regardless of which side mutates.
3. **Reference-equal returns on switchChartType rules 1 + 2** — same-type no-op returns the input reference; `nextType === 'collection-curve'` returns `DEFAULT_COLLECTION_CURVE` literal. React-memo-friendly; ancestor re-render avoidance.
4. **AxisPicker trigger shows raw column key on stale values** — fallback when the saved key is no longer in `getEligibleColumns` output. Plan 03's StaleColumnWarning owns the full banner; the picker label is the first-surface signal.
5. **seedGenericFromPreset uses PENETRATION_RATE_POSSIBLE_AND_CONFIRMED for metric === 'recoveryRate'** — plan offered RECOVERY_RATE, but no literal `RECOVERY_RATE` column ships in the registry. The closest always-numeric rate-family column was selected per the plan's Claude-discretion clause. Smoke assertion 3 verifies Y resolves to a numeric COLUMN_CONFIGS entry (not the specific key).

## Deviations from Plan

None — plan executed exactly as written.

The only non-action-item observations during execution:

- `seedGenericFromPreset` RECOVERY_RATE resolution: plan explicitly allowed Claude discretion when the exact column key doesn't exist ("if the exact key differs, pick the closest numeric column that represents the running recovery-rate metric"). PENETRATION_RATE_POSSIBLE_AND_CONFIRMED was selected as the closest-in-spirit rate-family column. Not a deviation — it's the plan's designated discretion path.
- The first executor agent hit an API quota limit after committing tasks 1 and 2 but before committing task 3. A continuation agent (this session) verified `preset-menu.tsx` against the plan spec and committed it unchanged — plan's must_haves.truths #3 + #4 + artifacts spec all satisfied by the pre-existing file.

## Issues Encountered

- `npx tsc --noEmit` continues to surface the pre-existing Phase-33 error `tests/a11y/baseline-capture.spec.ts(18,29): Cannot find module 'axe-core'`. Out of Phase 36 scope per `.planning/phases/36-chart-builder/deferred-items.md`. This plan introduces zero new tsc errors (verified by diffing tsc output against the pre-execution baseline).
- Parallel Wave 2: Plan 36-03 landed `c9b2622` (StaleColumnWarning banner) during the execution window. Both plans modified `package.json` (Plan 03: `smoke:charts`; Plan 04: `smoke:transitions`) — appended-at-end convention held; merge was automatic. Plan 03 owns `src/components/charts/generic-chart.tsx` + `src/lib/charts/stale-column.*`; Plan 04 did not touch those files.

## User Setup Required

None.

## Next Phase Readiness

- **Plan 36-05 unblocked.** The four builder components are stable, guarded, and smoke-tested. Plan 36-05 can now `import { ChartBuilderToolbar } from '@/components/charts/chart-builder-toolbar'`, `import { PresetMenu } from '@/components/charts/preset-menu'`, etc., and wire them into ChartPanel without further contract edits. The props-in / onChange-out shape means ChartPanel owns the single `definition` state and dispatches merges on each child's onChange.
- **CHRT-07, CHRT-08, CHRT-09, CHRT-10, CHRT-11, CHRT-12 fully satisfied at the component layer.** CHRT-09 (type-switch re-render) lands via `ChartBuilderToolbar.handleTypeClick` → `switchChartType` → parent dispatch. CHRT-07/CHRT-08 (axis dropdowns) land via `AxisPicker.options = getEligibleColumns(chartType, axis)`. CHRT-10/CHRT-11 (save/load) land via PresetMenu + SavePresetPopover wiring to `useChartPresets`. CHRT-12 (built-in Collection Curves) surfaces in `BUILTIN_PRESETS` render with Lock icon at the top of the menu.
- **Two-sided deep-copy lock enforced.** `savePreset` clones on storage write; `handleApply` clones on preset read. Any future chart-edit code-path can trust its `definition` reference is isolated from both caller state and storage.
- **Wave 2 winds down.** Plans 36-03 (stale-column warning) + 36-04 (builder UI) both complete; Plan 36-05 (ChartPanel integration) is the remaining work to close Phase 36. Phase 36 Wave 1 + Wave 2 (minus 05) shipped.

## Self-Check: PASSED

All 7 created files + package.json modification present on disk. All 3 task commits present in git log.

- FOUND: src/lib/charts/transitions.ts
- FOUND: src/lib/charts/transitions.smoke.ts
- FOUND: src/lib/charts/chart-definition-equals.ts
- FOUND: src/components/charts/axis-picker.tsx
- FOUND: src/components/charts/chart-builder-toolbar.tsx
- FOUND: src/components/charts/save-preset-popover.tsx
- FOUND: src/components/charts/preset-menu.tsx
- FOUND: package.json (smoke:transitions entry verified)
- FOUND: 8bfa898 (Task 1 commit)
- FOUND: 61d0ee0 (Task 2 commit)
- FOUND: 7069958 (Task 3 commit)
- FOUND: structuredClone usage in preset-menu.tsx (Pitfall 4 grep assertion from plan)

---
*Phase: 36-chart-builder*
*Completed: 2026-04-19*
