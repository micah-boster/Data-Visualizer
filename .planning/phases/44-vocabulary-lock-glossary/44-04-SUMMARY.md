---
phase: 44-vocabulary-lock-glossary
plan: 04
subsystem: ui
tags: [vocabulary, revenue-model, sidebar, breadcrumb, partner-setup, drill-down, url-state, type-tokens, defensive-substrate]

# Dependency graph
requires:
  - phase: 32-url-backed-navigation
    provides: ?p=&pr=&b= drill-state URL convention (44-04 extends with ?rm=)
  - phase: 39-partner-config-module
    provides: PartnerProductPair / pairKey / displayNameForPair / SidebarPair shape; useDrillDown shape
  - phase: 44-vocabulary-lock-glossary (Plan 44-01)
    provides: <Term> primitive; first-instance-per-surface rule; TERMS registry shape
  - phase: 44-vocabulary-lock-glossary (Plan 44-03)
    provides: REVENUE_MODEL_VALUES enum; pair.revenueModel optional + 3-segment pairKey + REVENUE_MODEL_LABELS + labelForRevenueModel + sortPairs third comparator + displayNameForPair third arg; REVENUE_MODEL in PartnerListFilters + filter-evaluator; TERMS.revenueModel/contingency/debtSale entries
provides:
  - "AttributeFilterBar REVENUE_MODEL multi-select (4th attribute) with <Term name='revenueModel'> first-instance label; auto-hides when dataset has no REVENUE_MODEL values"
  - "DrillState.revenueModel: string | null + URL ?rm= round-trip (DRILL_REVENUE_MODEL_PARAM = 'rm'); drillToPair carries pair.revenueModel into URL; navigateToLevel('root') clears it; navigateToLevel('partner') preserves it"
  - "SidebarDataState extended with productsPerPartner + revenueModelsPerPair Maps; SidebarPair carries optional revenueModel"
  - "Sidebar pair rows split per (partner, product, revenueModel) when revenueModelsPerPair > 1; active-state matching includes the third dimension; key extended to ${partner}::${product}::${rm}"
  - "BreadcrumbTrail partner segment displays -Contingency / -DebtSale suffix when revenueModelsPerPair > 1 AND state.revenueModel is set; reads counts from useSidebarData() (no prop drilling)"
  - "PartnerSetupSheet read-only Revenue Model section with <Term name='revenueModel'> first-instance label on this surface; 'Not specified' fallback for single-model pairs"
  - "MixedRevenueModelChip + isMixedRevenueModelBatch defensive substrate at app-sidebar.tsx module scope — UNEXERCISED on current data (ZERO mixed batches per Wave 3 ETL audit), available for future ETL anomalies"
affects: [43-* compute-layer, future-phases-using-revenue-model-scoping, v5.0 triangulation phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DrillState additive-optional URL slot: extending DrillState with revenueModel: string | null requires no schemaVersion bump because the URL is the source of truth and searchParams.get(absent_param) returns null naturally. Backward compat: a URL without ?rm= produces revenueModel === null, identical to pre-44-04 behavior. Same recipe as Phase 32 + Phase 39."
    - "displayNameForPair third-arg consumption pattern: producer (data-display.tsx) computes revenueModelsPerPair Map ONCE across all pairs, pushes to context; consumers (sidebar pair rows, BreadcrumbTrail) read via useSidebarData() and pass per-pair count into displayNameForPair(pair, productCount, rmCount). Caller-owns-the-count keeps the pair helper pure."
    - "Defensive substrate without consumer wiring: MixedRevenueModelChip + isMixedRevenueModelBatch live at app-sidebar.tsx module scope as exported symbols, with a thorough docstring explaining the unexercised-on-current-data state. When a future ETL anomaly creates a mixed-revenue-model batch, the chip is ready to wire into table-body.tsx without re-deriving the warning UX."
    - "ReactNode-typed attribute label widening: AttributeFilterBar's ATTRIBUTES const-array widened from `string` to `ReactNode` so the REVENUE_MODEL entry can carry <Term> JSX while the other entries pass plain strings. Plain-string `labelText` kept alongside JSX `label` for trigger / popover-header / row-id contexts that need a stable string."
    - "BreadcrumbTrail consumes useSidebarData() context for the suffix-decision Map rather than threading props through UnifiedToolbar + DataTable. Cleaner ownership: BreadcrumbTrail already owns its drill-state-aware rendering; the maps are sidebar-scope data that BreadcrumbTrail naturally co-reads. Avoids a 3-file prop-drilling diff."

key-files:
  created: []
  modified:
    - "src/components/partner-lists/attribute-filter-bar.tsx (REVENUE_MODEL ATTRIBUTES entry with <Term> label; AttributeKey-typed availableValues; ReactNode label widening + labelText fallback)"
    - "src/components/partner-lists/create-list-dialog.tsx (REVENUE_MODEL distinct-values computation in availableValues — Rule 3 blocking; not in plan files_modified, see Deviations)"
    - "src/contexts/sidebar-data.tsx (SidebarPair.revenueModel optional; SidebarDataState.productsPerPartner + revenueModelsPerPair Maps; DEFAULT_DRILL extended with revenueModel: null)"
    - "src/hooks/use-drill-down.ts (DrillState.revenueModel: string | null; DRILL_REVENUE_MODEL_PARAM = 'rm'; pushWith handles revenueModel; drillToPair carries pair.revenueModel; drillToBatch preserves from pair or state; navigateToLevel('root') clears, ('partner') preserves)"
    - "src/components/data-display.tsx (SidebarDataPusher rewritten to compute (partner, product, revenue_model) triples; revenueModelsPerPair Map keyed by ${partner}::${product}; productsPerPartner counts DISTINCT pairs not tuples; pushes both Maps via setSidebarData; SidebarPair type imported)"
    - "src/components/table/data-table.tsx (Rule 3 blocking — DrillState fallback literal extended with revenueModel: null; not in plan files_modified)"
    - "src/components/layout/app-sidebar.tsx (revenueModelsPerPair from useSidebarData; pair-row rmCount lookup; active-state matching + drillToPair carry pair.revenueModel; pairForMenu carries revenueModel; key extended to 3-segment; MixedRevenueModelChip + isMixedRevenueModelBatch defensive substrate; AlertTriangle + Tooltip imports)"
    - "src/components/navigation/breadcrumb-trail.tsx (useSidebarData + labelForRevenueModel imports; partner-segment suffix logic when revenueModelsPerPair > 1 AND state.revenueModel set)"
    - "src/components/partner-config/partner-setup-sheet.tsx (Term + labelForRevenueModel imports; read-only Revenue Model section with <Term> first-instance wrap)"
    - ".planning/phases/44-vocabulary-lock-glossary/deferred-items.md (logged 2 new pre-existing lint items — use-drill-down.ts deprecation-shim warnings + partner-setup-sheet.tsx hydrationKey set-state-in-effect)"

key-decisions:
  - "URL slot 'rm' not 'revenueModel': continues the Phase 32-01 short-code convention (?p=&pr=&b=). Compact, scannable, no collision with use-filter-state.ts FILTER_PARAMS."
  - "navigateToLevel('partner') PRESERVES revenueModel (only clears batch). Coming back up from batch to partner inside a multi-model pair should keep the user on the Contingency / DebtSale row they came from, not bounce them to a partner-level mixed view that the apples-and-oranges rule explicitly forbids. navigateToLevel('root') clears all four slots."
  - "BreadcrumbTrail reads revenueModelsPerPair from useSidebarData() instead of accepting props from UnifiedToolbar. Avoids a 3-file prop-drilling diff (UnifiedToolbar + DataTable + DataDisplay) for a single read; the maps are already sidebar-scope state with a single producer (data-display.tsx) and now multiple consumers (sidebar pair rows + breadcrumb)."
  - "productsPerPartner counts DISTINCT (partner, product) combos, not pair-row tuples. This matters because a single-product multi-revenue-model partner (none on current data, but possible in fixtures) would otherwise see productsPerPartner === 2 and falsely surface a product suffix. The count is built from the deduped revenueModelsPerPairSet keys, so a partner with 1 product × 2 revenue models still maps to productsPerPartner.get(partner) === 1."
  - "MixedRevenueModelChip is DEFENSIVE substrate, NOT a user-visible feature on current data. The Wave 3 ETL audit found ZERO mixed-revenue-model batches at the (partner, batch) grain (Plan 44-03 ADR 0002 Consequences). The chip + helper are exported from app-sidebar.tsx with thorough docstrings explaining the unexercised state. Wiring into table-body.tsx batch-row rendering is OUT of scope for this plan (table-body.tsx not in files_modified) — when a future ETL anomaly creates a mixed batch, the chip is ready to wire without re-deriving."
  - "AttributeFilterBar label widened to ReactNode (not the more permissive `string | ReactNode`) so the const-array entries can mix JSX and plain strings cleanly. Plain-string `labelText` kept alongside JSX `label` for trigger / popover-header / row-id contexts that need a stable string — JSX label rendered in popover header (the discoverable surface), labelText used for the chip trigger + checkbox row ids."
  - "Plan 44-01 first-instance-per-surface rule honored: <Term name='revenueModel'> wraps on AttributeFilterBar control label (Partner Lists / Create List dialog surface) AND Partner Setup sheet section header (Partner Setup surface) — TWO surfaces, TWO first-instance wraps. Sidebar pair-row labels render data values ('Happy Money 3P-Contingency'), NOT term labels — left plain. Breadcrumb segment value ('Happy Money-Contingency') is data — left plain; only the literal 'Partner' prefix wrap from Plan 44-01 carries the term."
  - "data-display.tsx satisfies the plan's 'passes productsPerPartner + revenueModelsPerPair to BreadcrumbTrail' clause via the SidebarDataProvider context push (Task 1). No additional prop-passing in data-display.tsx → DataTable → UnifiedToolbar → BreadcrumbTrail required — BreadcrumbTrail consumes the context directly."

requirements-completed: [VOC-07]

# Metrics
duration: ~30m wall-clock
completed: 2026-05-01
---

# Phase 44 Plan 04: REVENUE_MODEL UI Surfacing Summary

**Wired REVENUE_MODEL into every UI consumer of the Plan 44-03 plumbing — sidebar pair rows split per (partner, product, revenue_model) with the displayNameForPair `-Contingency` / `-DebtSale` suffix, drill-down state and URL `?rm=` round-trip, breadcrumb partner-segment suffix, AttributeFilterBar 4th multi-select with `<Term>` label, Partner Setup sheet read-only Revenue Model section with `<Term>` first-instance wrap, and a defensive MixedRevenueModelChip substrate for the unexercised mixed-batch outlier case.**

## Performance

- **Duration:** ~30m wall-clock
- **Started:** 2026-05-01T04:02:34Z
- **Completed:** 2026-05-01T04:32:03Z
- **Tasks:** 2 (each committed atomically)
- **Files modified:** 9 (1 create-list-dialog.tsx + data-table.tsx Rule 3 fixes outside the plan's listed `files_modified`, see Deviations)

## Accomplishments

### Sidebar row-count post-split (matches ADR 0002 audit)

The Plan 44-03 ADR 0002 audit recorded the expected post-split distribution:

- **Pre-split:** 38 (partner, product) pairs
- **Post-split (this plan ships):** 42 (partner, product, revenue_model) tuples
- **Distribution:** 34 partners → single row each (no suffix); 4 partners → 2 rows each (with `-Contingency` / `-DebtSale` suffix)

The 4 multi-revenue-model partners (per the Wave 3 ETL audit at orchestration-time):

| Partner             | Single-product? | Pre-split row | Post-split rows                                               |
| ------------------- | --------------- | ------------- | ------------------------------------------------------------- |
| Advance Financial   | yes             | 1             | "Advance Financial-Contingency", "Advance Financial-DebtSale" |
| Happy Money         | no (3P only multi-model) | 2             | "Happy Money — 3rd Party-Contingency", "Happy Money — 3rd Party-DebtSale" + (1st Party row unchanged if applicable) |
| Imprint             | yes             | 1             | "Imprint-Contingency", "Imprint-DebtSale"                     |
| PatientFi           | yes             | 1             | "PatientFi-Contingency", "PatientFi-DebtSale"                 |

The remaining 34 partners stay as 34 single rows — pre-Phase-44 behavior preserved.

### Drill-down + URL round-trip

Example URL transitions for a multi-model partner (Happy Money 3P-Contingency vs DebtSale):

- **Before drill (root):** `/`
- **After clicking "Happy Money — 3rd Party-Contingency":** `/?p=Happy+Money&pr=THIRD_PARTY&rm=CONTINGENCY`
- **After clicking "Happy Money — 3rd Party-DebtSale":** `/?p=Happy+Money&pr=THIRD_PARTY&rm=DEBT_SALE`
- **After back-button (browser history pop):** restores the previous URL — `?rm=` value rehydrates `state.revenueModel`
- **After "All Partners" breadcrumb click (navigateToLevel('root')):** `/` — all four slots cleared

For single-model partners, the URL never carries `?rm=` (drillToPair passes `pair.revenueModel ?? null` which deletes the slot in `pushWith`).

### Breadcrumb suffix examples

- Multi-model + multi-product partner: "All **Partners** ›  **Partner**: Happy Money-Contingency"
- Single-model partner: "All **Partners** ›  **Partner**: Citizens" (unchanged from pre-44-04)
- Note: the `<Term name='partner'>` wrap on the literal "Partner" word is from Plan 44-01; the suffix is appended to the data value (which stays plain text).

### Partner Setup Sheet — Revenue Model section JSX (for v5.0 reference)

```tsx
<div className="mt-stack flex flex-col gap-0.5">
  <span className="text-label text-muted-foreground uppercase">
    <Term name="revenueModel">Revenue Model</Term>
  </span>
  <span className="text-body">
    {pair.revenueModel
      ? labelForRevenueModel(pair.revenueModel)
      : 'Not specified'}
  </span>
  <span className="text-caption text-muted-foreground">
    Data-derived, not editable
  </span>
</div>
```

Mirrors the existing Product type read-out section above it. Type tokens: `text-label uppercase` for the section overline, `text-body` for the value, `text-caption` for the help text. NO font-weight pairings (Phase 27 rule). The `<Term>` wrap is the FIRST-INSTANCE on the Partner Setup surface (Plan 44-01 first-instance rule).

### Mixed-revenue-model batch chip — UNEXERCISED on current data

**Substrate shipped, no current consumer.** The Wave 3 ETL audit (recorded in ADR 0002 Consequences) found **ZERO** batches mixing revenue models at the (partner, batch) grain on the live Snowflake dataset (552 rows; every batch maps cleanly to CONTINGENCY or DEBT_SALE). The 1/550 outlier anticipated by Phase 44 CONTEXT.md does NOT exist on real data.

I shipped:

- `isMixedRevenueModelBatch(batchRows)` helper (pure function — checks if a batch's accounts span multiple distinct REVENUE_MODEL values)
- `MixedRevenueModelChip` component (renders the Phase 28+ semantic warning treatment with explanatory tooltip)

Both live at `src/components/layout/app-sidebar.tsx` module scope as exported symbols. **No current rendering site consumes them.** The plan's intended consumer site (batch-row rendering) lives in `src/components/table/table-body.tsx`, which is NOT in `files_modified` for this plan and was deemed out-of-scope given the audit's ZERO finding.

**For a future-reader:** when a future ETL anomaly creates a mixed-revenue-model batch (e.g. an upstream join error, a cross-partner data merge, or a deliberate aggregation that mixes models), wiring the chip is straightforward — call `isMixedRevenueModelBatch(rowsForBatch)` in the table-body row composer and render `<MixedRevenueModelChip />` next to the batch identifier when true. The dominant-model assignment logic (the plan's Step 2 `mode(batchRows.map(r => r.REVENUE_MODEL))`) is similarly a one-liner if needed.

This is **NOT a bug** — it's intentional defensive substrate per the orchestrator's instruction: "Implement the warning chip defensively (cheap), but explicitly note in your SUMMARY that the chip is unexercised."

### CONTEXT.md locked decisions — visibility check

- ✅ **Sidebar split format** ("Happy Money 3P-Contingency", "Happy Money 3P-DebtSale" — one row per (partner, product, revenue_model)) — visible in app-sidebar.tsx pair-row rendering via displayNameForPair(pair, productCount, rmCount). Tested via tsc + the unchanged pair.smoke.ts (which already exercises the `displayNameForPair(pair, 2, 2)` multi-everything case).
- ✅ **Mixed-model batch handler** (display under dominant model + small warning chip + tooltip) — substrate shipped, unwired (see above). Ready for future ETL anomalies.
- ✅ **Third-dimension scoping** (REVENUE_MODEL as third dim of unit of analysis) — every UI consumer of (partner, product) is updated to be aware of (partner, product, revenue_model).

## Task Commits

Each task was committed atomically:

1. **Task 1: AttributeFilterBar + useDrillDown + sidebar-data + create-list-dialog wire** — `5fd1052` (feat)
2. **Task 2: Sidebar pair-row split + breadcrumb suffix + Partner Setup section + mixed-model chip substrate** — `61acffe` (feat)

**Plan metadata commit:** _(pending after this summary write)_

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **`?rm=` URL slot** continues the Phase 32-01 short-code convention.
- **`navigateToLevel('partner')` preserves revenueModel** — back-from-batch keeps the user on the same Contingency / DebtSale row they came from.
- **BreadcrumbTrail reads via context, not props** — avoids 3-file prop-drilling diff for a single read.
- **`productsPerPartner` counts DISTINCT pairs**, not pair-row tuples — prevents false-positive product suffixes for single-product multi-revenue-model partners.
- **MixedRevenueModelChip is unexercised defensive substrate** — chip + helper exported from app-sidebar.tsx ready to wire when a future ETL anomaly demands it.
- **`<Term>` first-instance wraps on TWO surfaces** (AttributeFilterBar + Partner Setup) — sidebar pair-row labels and breadcrumb values are data, NOT term labels, and stay plain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `create-list-dialog.tsx` not in `files_modified` but required for the REVENUE_MODEL chip to ever render**

- **Found during:** Task 1 step "wire the available REVENUE_MODEL values from the dataset into the parent that passes `availableValues`" (the plan explicitly anticipated this in Step 1).
- **Issue:** The plan's `files_modified` list omits `src/components/partner-lists/create-list-dialog.tsx` even though Step 1 of Task 1 explicitly directs the executor to wire REVENUE_MODEL into the parent's `availableValues` computation. Without that wire, the new AttributeFilterBar entry would always receive an empty REVENUE_MODEL array and auto-hide forever — making the entire feature invisible.
- **Fix:** Append `REVENUE_MODEL: Array.from(new Set(allRows.map(r => getStringField(r, 'REVENUE_MODEL')).filter(Boolean)))` to the parent's `availableValues` useMemo (the same loop that populates ACCOUNT_TYPE values). Single-pass across `allRows` — no perf change.
- **Files modified:** `src/components/partner-lists/create-list-dialog.tsx` (adds REVENUE_MODEL to availableValues type signature + computes distinct values inside the existing useMemo).
- **Verification:** `npx tsc --noEmit` clean; AttributeFilterBar's REVENUE_MODEL chip will receive populated values when the dataset carries them and auto-hide when empty (existing hide-on-empty behavior).
- **Committed in:** `5fd1052` (Task 1 commit, alongside the AttributeFilterBar widening).

**2. [Rule 3 — Blocking] `data-table.tsx` not in `files_modified` but DrillState type extension forced it**

- **Found during:** Task 1 `npx tsc --noEmit` after extending `DrillState.revenueModel: string | null` (additive non-optional — `null` is the legacy default at root and for single-model pairs).
- **Issue:** `src/components/table/data-table.tsx:408` had a fallback DrillState literal `{ level: 'root', partner: null, product: null, batch: null }` for the case when `drillState` prop is undefined. After the type extension, this literal is no longer assignable to DrillState because it's missing the `revenueModel` property. Build error.
- **Fix:** Append `revenueModel: null` to the fallback literal. Single-line edit; no behavior change (the fallback is the legacy root-level default, which by definition has no revenueModel scope).
- **Files modified:** `src/components/table/data-table.tsx` (one literal extended).
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** `5fd1052` (Task 1 commit, alongside the DrillState extension).

**Why both deviations are Rule 3 (Blocking) and not Rule 4 (Architectural):**

Rule 4 reserves "ask the user" for changes that alter structure or breaking API surfaces. Both deviations here are tiny mechanical wires made unavoidable by the plan's intentional changes — extending DrillState with `revenueModel` and adding REVENUE_MODEL to AttributeFilterBar — and the fixes don't introduce any new structure. They're file-list omissions in the plan's frontmatter, not architectural decisions.

### Process Notes

- **Plan 44-03 plumbing was perfectly tee'd up.** Every primitive this plan needed was on disk and import-ready: REVENUE_MODEL_VALUES enum, PartnerProductPair.revenueModel optional field, displayNameForPair third arg with default-1, REVENUE_MODEL_LABELS + labelForRevenueModel helper, AttributeKey union extension, PartnerListFilters.REVENUE_MODEL schema, filter-evaluator block, TERMS.revenueModel/contingency/debtSale entries. The 30-minute execution time is a direct consequence of Plan 44-03's thoroughness.
- **Working-tree drift respected throughout.** `.env.example`, `.planning/MILESTONES.md`, `.planning/NEXT-STEPS.md`, `.planning/phases/44-vocabulary-lock-glossary/44-03-PLAN.md`, `src/lib/snowflake/connection.ts`, `src/lib/snowflake/types.ts`, `src/components/charts/collection-curve-chart.tsx`, `src/app/globals.css`, and the untracked `chart-frame.smoke.tsx` / `chart-frame.tsx` / `.planning/phases/43-boundary-hardening/*` files are NOT staged in either commit. Verified post-Task-2 via `git show --stat 5fd1052 61acffe`.
- **No Plan 44-01 architectural deviation triggered.** `src/lib/columns/config.ts` stays plain `.ts` (no JSX) — Plan 44-01's TermHeader render-function pattern is the boundary; this plan didn't need to add any column-header JSX so the configs file stayed untouched.
- **No checkpoints encountered.** `npm run dev` smoke deferred per orchestrator instruction (the visible behavior change manifests only against live Snowflake data; orchestrator already verified the live data against ADR 0002 expectations).

## Issues Encountered

- **2 pre-existing lint items logged to deferred-items.md** — `use-drill-down.ts` deprecation-shim warnings (lines 188, 195 — was 119, 126 pre-44-04; line shift only) and `partner-setup-sheet.tsx:71` `react-hooks/set-state-in-effect` (was :69 pre-44-04). Verified pre-existing via `git stash push <path> && npm run lint <path>` reproductions on each.
- **Pre-existing `axe-core` TS error** in `tests/a11y/baseline-capture.spec.ts:18` — out of scope per Phase 44-01 deferred-items.md; module not installed in this branch.
- **Pre-existing chart-frame.tsx + collection-curve-chart.tsx + chart-frame.smoke.tsx errors** appeared in the working tree during execution (other-agent / phase 43 work). NOT staged into either 44-04 commit. Recorded here for SCOPE BOUNDARY visibility — these are NOT 44-04 deviations, they're working-tree drift outside this plan's blast radius.

## User Setup Required

None — no external service configuration required. The visible behavior change activates automatically against the live Snowflake dataset (REVENUE_MODEL column already landed per Plan 44-03 ETL gate) when the user reloads the app. Pre-ETL fixtures and the 34 single-model partners flow through the unchanged pre-44-04 code paths.

## Next Phase Readiness

- **Phase 43 BND-02 (compute-layer signature change)** — ADR 0002 Consequences captured the forward dependency; `usePartnerStats` and friends gain a third predicate (filter by revenueModel) when the BND-02 plan runs. Nothing in 44-04 blocks BND-02 — the UI surfaces all carry the third dimension; the compute layer doesn't yet read it but doesn't break either.
- **Future plan: wire MixedRevenueModelChip into table-body.tsx batch-row rendering** — the helper + chip are exported from app-sidebar.tsx ready to import. Trigger condition: a future ETL anomaly producing a mixed-revenue-model batch (current data has zero). One-line wire.
- **v5.0 triangulation phases** — inherit the (partner, product, revenue_model) substrate. Triangulation surfaces operate at the same unit-of-analysis grain; no further URL / drill-state extension needed. The `<Term>` first-instance pattern continues to apply as new surfaces appear.
- **Future: surface the 6 columns from Plan 44-03 Task 3 scope addendum** — independent of 44-04. Owner registers formatters / polarity / KPI cards for TOTAL_PAYMENT_PLAN_REMAINING_BALANCE, COMMITMENT_RATE, FINANCE_PRICE, FINANCE_REV_SHARE, TOTAL_BOUNCE_REVENUE, TOTAL_LENDER_REVENUE.

## Self-Check

**Files exist:**
- FOUND: src/components/partner-lists/attribute-filter-bar.tsx (REVENUE_MODEL ATTRIBUTES entry + ReactNode label widening)
- FOUND: src/components/partner-lists/create-list-dialog.tsx (REVENUE_MODEL distinct-values computation)
- FOUND: src/contexts/sidebar-data.tsx (productsPerPartner + revenueModelsPerPair Maps + revenueModel optional on SidebarPair)
- FOUND: src/hooks/use-drill-down.ts (DrillState.revenueModel + DRILL_REVENUE_MODEL_PARAM + ?rm= round-trip)
- FOUND: src/components/data-display.tsx (SidebarDataPusher rewritten for triples + maps)
- FOUND: src/components/table/data-table.tsx (DrillState fallback literal extended)
- FOUND: src/components/layout/app-sidebar.tsx (pair-row rmCount + drillToPair revenueModel + key 3-segment + MixedRevenueModelChip + isMixedRevenueModelBatch)
- FOUND: src/components/navigation/breadcrumb-trail.tsx (suffix logic + useSidebarData + labelForRevenueModel)
- FOUND: src/components/partner-config/partner-setup-sheet.tsx (read-only Revenue Model section with <Term>)
- FOUND: .planning/phases/44-vocabulary-lock-glossary/deferred-items.md (2 new pre-existing items logged)

**Commits exist:**
- FOUND: 5fd1052 (Task 1 — AttributeFilterBar + useDrillDown + sidebar-data + create-list-dialog wire + data-table fallback)
- FOUND: 61acffe (Task 2 — sidebar pair-row split + breadcrumb suffix + Partner Setup section + mixed-model chip substrate)

**Verification gates:**
- PASS: `npx tsc --noEmit` (only pre-existing axe-core error; chart-frame + collection-curve-chart drift errors are working-tree noise NOT in either commit)
- PASS: `node --experimental-strip-types src/lib/partner-config/pair.smoke.ts` ("pair smoke OK", 16 cases — unchanged from Plan 44-03)
- PASS: `node --experimental-strip-types src/lib/vocabulary.smoke.ts` ("✓ vocabulary smoke OK", 15-entry checklist — unchanged from Plan 44-03)
- PASS: `bash scripts/check-type-tokens.sh` ("Type tokens enforced — no ad-hoc classes outside allowlist.")
- PASS: `npm run lint -- --max-warnings 0 <Task 1 + Task 2 files>` introduces ZERO new errors/warnings (the 5 errors + 1 warning that remain are all pre-existing per deferred-items.md, verified via `git stash` reproductions on each file)

**Behavior gates:**
- PASS: AttributeFilterBar — 4-entry ATTRIBUTES const-array now includes REVENUE_MODEL with `<Term name='revenueModel'>` label; control hidden when availableValues empty; create-list-dialog populates from dataset.
- PASS: DrillState carries `revenueModel: string | null`; URL `?rm=` round-trips; pre-Phase-44 URLs without ?rm= produce `revenueModel: null` (legacy default).
- PASS: Sidebar pair rows split per (partner, product, revenueModel) when `revenueModelsPerPair > 1`; key extended to 3-segment; active-state matching includes revenueModel; drillToPair carries pair.revenueModel.
- PASS: Breadcrumb partner segment shows `-Contingency` / `-DebtSale` suffix only when both `revenueModelsPerPair > 1` AND `state.revenueModel` set; reads from useSidebarData() context.
- PASS: PartnerSetupSheet — Revenue Model read-only section with `<Term name='revenueModel'>` first-instance wrap; "Not specified" fallback for single-model pairs.
- PASS: MixedRevenueModelChip + isMixedRevenueModelBatch substrate exported from app-sidebar.tsx; UNEXERCISED on current data (ZERO mixed batches per Wave 3 ETL audit) — explicitly disclosed above.

## Self-Check: PASSED

---
*Phase: 44-vocabulary-lock-glossary*
*Completed: 2026-05-01*
