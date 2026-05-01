---
phase: 44-vocabulary-lock-glossary
plan: 03
subsystem: data-model
tags: [vocabulary, revenue-model, adr, partner-config, partner-lists, schema-evolution, scoping, etl]

# Dependency graph
requires:
  - phase: 39-partner-config-module
    provides: PartnerProductPair / pairKey / displayNameForPair / PartnerListFilters additive .optional() pattern
  - phase: 44-vocabulary-lock-glossary (Plan 44-01)
    provides: TERMS registry shape; smoke-test exhaustiveness checklist; <Term> primitive (consumed by Plan 44-04, not this plan)
  - phase: 44-vocabulary-lock-glossary (Plan 44-02)
    provides: docs/adr/0001 + ADR-format precedent (Status / Context / Decision / Alternatives Considered / Consequences)
  - external: ETL — REVENUE_MODEL column landed on AGG_BATCH_PERFORMANCE_SUMMARY 2026-04-29 (552 rows: 354 CONTINGENCY / 198 DEBT_SALE)
provides:
  - "ADR 0002 at docs/adr/0002-revenue-model-scoping.md — locks REVENUE_MODEL as third dimension of (partner, product, revenue_model); records 38→42 sidebar row-count audit and the ZERO mixed-revenue-model batch finding"
  - "REVENUE_MODEL_VALUES enum (CONTINGENCY, DEBT_SALE) at src/lib/columns/config.ts; REVENUE_MODEL registered in COLUMN_CONFIGS (feeds ALLOWED_COLUMNS allow-list automatically)"
  - "PartnerProductPair carries optional revenueModel; pairKey emits 3-segment '::' key; parsePairKey accepts both legacy 2-segment and new 3-segment keys; sortPairs gains REVENUE_MODEL_ORDER comparator layer"
  - "displayNameForPair(pair, productsPerPartner, revenueModelsPerPair = 1) — third arg defaults to 1 so every Phase 39 caller is byte-identical"
  - "REVENUE_MODEL_LABELS + labelForRevenueModel helper mirroring labelForProduct"
  - "TERMS registry extended from 12 → 15 entries (revenueModel, contingency, debtSale); vocabulary.smoke.ts checklist updated"
  - "PartnerListFilters.REVENUE_MODEL?: string[] additive optional; partnerListSchema additively extended; filter-evaluator handles cross-attribute AND / within-array OR with defensive missing-field fallback"
  - "Scope addendum (option b): 6 additional columns registered in COLUMN_CONFIGS — TOTAL_PAYMENT_PLAN_REMAINING_BALANCE, COMMITMENT_RATE, FINANCE_PRICE, FINANCE_REV_SHARE, TOTAL_BOUNCE_REVENUE, TOTAL_LENDER_REVENUE — API allow-list registration only; UI surfacing deferred"
affects: [44-04 vocabulary-coverage, 43-01 BatchRow-extension, 45+ v5.0 triangulation phases consuming the third dimension, future polarity-audit + viable-columns + KPI follow-up phase that surfaces the 6 added columns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-optional pair extension: PartnerProductPair gains optional revenueModel; pairKey emits a third '::' segment (empty when undefined) keeping the key fully reversible. parsePairKey accepts both legacy 2-segment and new 3-segment keys — pre-Phase-44 persisted Saved Views, drill state, cross-partner entries parse cleanly with revenueModel: undefined."
    - "Default-arg backward-compat: displayNameForPair gains revenueModelsPerPair: number = 1. Every Phase 39 caller (sidebar render, cross-partner matrix, breadcrumb) keeps producing byte-identical output. Plan 44-04 wires the real count from sites that surface multi-model partners."
    - "Phase 39 .optional() schema-evolution applied a third time: Phase 39 absorbed PRODUCT_TYPE + SEGMENT this way; Plan 44-03 absorbs REVENUE_MODEL the same way. attributeFiltersSchema stays .strict() (unknown keys still fail at parse) but optional fields preserve legacy-list parse compatibility — no schemaVersion bump."
    - "ETL-gate verification at orchestration time: orchestrator queried Snowflake directly to confirm REVENUE_MODEL had landed (552 rows split 354/198 between CONTINGENCY/DEBT_SALE, 4 multi-model partners, ZERO mixed-revenue-model batches at the (partner, batch) grain) before unblocking this plan. Reusable pattern: when a plan is blocked on external infrastructure, an upfront live-data check at orchestration replaces a checkpoint inside the plan."
    - "Scope addendum (option b API-only registration): COLUMN_CONFIGS feeds ALLOWED_COLUMNS automatically (Set built from .map(c => c.key)). Adding entries with defaultVisible:false + identity:false is sufficient to permit them through the data API allow-list without any UI/formatter/polarity wiring. Lower-cost-than-full-surface plumbing pattern for newly-ETL'd columns."

key-files:
  created:
    - "docs/adr/0002-revenue-model-scoping.md (ADR, 7 sections incl. sidebar audit + alternatives + consequences; cites VOC-06)"
  modified:
    - "src/lib/columns/config.ts (REVENUE_MODEL_VALUES enum + REVENUE_MODEL COLUMN_CONFIGS entry; +6 scope-addendum columns: TOTAL_PAYMENT_PLAN_REMAINING_BALANCE, COMMITMENT_RATE, FINANCE_PRICE, FINANCE_REV_SHARE, TOTAL_BOUNCE_REVENUE, TOTAL_LENDER_REVENUE)"
    - "src/lib/partner-config/pair.ts (PartnerProductPair.revenueModel optional; REVENUE_MODEL_ORDER + REVENUE_MODEL_LABELS exports; pairKey emits 3-segment key; parsePairKey accepts legacy + 3-segment; sortPairs third comparator layer; displayNameForPair gains revenueModelsPerPair = 1; labelForRevenueModel helper)"
    - "src/lib/partner-config/pair.smoke.ts (extended from 7 to 16 cases incl. backward-compat assertions and multi-revenue-model display-name combinations)"
    - "src/lib/vocabulary.ts (TERMS registry +revenueModel/contingency/debtSale; module docstring updated to 15-entry checklist)"
    - "src/lib/vocabulary.smoke.ts (EXPECTED_TERMS checklist extended 12 → 15 entries)"
    - "src/lib/partner-lists/types.ts (AttributeKey union + 'REVENUE_MODEL'; PartnerListFilters.REVENUE_MODEL?: string[] additive optional; module-header docstring updated)"
    - "src/lib/partner-lists/schema.ts (attributeFiltersSchema +REVENUE_MODEL: z.array(z.string()).optional(); .strict() guard preserved)"
    - "src/lib/partner-lists/filter-evaluator.ts (REVENUE_MODEL predicate block following ACCOUNT_TYPE recipe with defensive missing-field handling)"

key-decisions:
  - "REVENUE_MODEL joins as a third dimension of the unit of analysis (NOT a tag/filter). ADR 0002 closes three rejected alternatives: (a) tag-on-existing-pair forces every consumer to add per-revenue-model split logic, defeating Phase 39's structural-enforcement-at-the-selection-layer pattern; (b) column-only filter has the same problem plus user friction (manual filter dance to compare 3P-Contingency vs 3P-DebtSale); (c) 'reopen if row count is unwieldy' was a CONTEXT.md-flagged threshold check — audit recorded 38 → 42 rows, max 2 per partner, well under the 50-row / 5-per-partner ceilings, so proceed."
  - "Sidebar row-count audit recorded inline in ADR 0002 Consequences: 38 pre-split (partner, product) pairs → 42 post-split (partner, product, revenue_model) tuples. Distribution: 34 partners stay one row (single revenue model); 4 partners split into 2 rows each — Advance Financial, Happy Money, Imprint, PatientFi. Max rows per partner: 2. Threshold check PASSED."
  - "ZERO mixed-revenue-model batches at the (partner, batch) grain in current data. CONTEXT.md anticipated a 1/550 batch outlier; ADR adoption found the live data carries no such case. Plan 44-04's mixed-model warning chip ships as defensive substrate (correctness guard for future ETL anomalies), not a feature users will see today. Captured explicitly in ADR 0002 Consequences for Plan 44-04's executor."
  - "displayNameForPair backward-compat via default arg: revenueModelsPerPair: number = 1 (no suffix). Every Phase 39 call site (sidebar render, cross-partner matrix entry construction, breadcrumb) keeps producing byte-identical output. Plan 44-04 will pass the real count from the sites that surface multi-model partners. Single signature, no parallel call-pattern to maintain."
  - "pairKey 3-segment format: '${partner}::${product}::${revenueModel ?? \"\"}' — third segment always emitted but empty when revenueModel undefined. parsePairKey accepts both legacy 2-segment keys (partner::product) and new 3-segment keys (with empty or non-empty third segment) so pre-Phase-44 persisted Saved Views, drill state, and cross-partner entries parse cleanly."
  - "PartnerListFilters additive .optional() — third application of the Phase 39 pattern. Phase 39 absorbed PRODUCT_TYPE + SEGMENT; Plan 44-03 absorbs REVENUE_MODEL. attributeFiltersSchema keeps .strict() so unknown attribute keys still fail at parse. Legacy lists (no REVENUE_MODEL key) parse identically and evaluate identically — no schemaVersion bump."
  - "Filter-evaluator REVENUE_MODEL block: defensive missing-field fallback. If a row lacks REVENUE_MODEL (or it's empty/null), the predicate excludes it rather than skipping the check. The apples-and-oranges rule (Contingency vs Debt Sale economics differ enough that mixing them in aggregations corrupts numbers) forbids leaking mismatched rows; same convention as missing PRODUCT_TYPE today."
  - "Scope addendum (option b): 6 additional columns registered as COLUMN_CONFIGS entries with defaultVisible:false + identity:false. ALLOWED_COLUMNS is built from `new Set(COLUMN_CONFIGS.map(c => c.key))` so adding entries automatically permits them through the data API. UI surfacing — formatters in aggregations.ts / meta.footerFormatter, POLARITY_REGISTRY entries, viable-columns.ts inclusion, KPI cards — explicitly deferred to a follow-up phase. Type assignments are best-guess (FINANCE_PRICE / FINANCE_REV_SHARE semantics not yet pinned; the follow-up phase should sample real values and refine if needed)."
  - "Plan 44-01 deviation continuity: src/lib/columns/config.ts is .ts (NOT .tsx) per the Plan 44-01 Task 4 architectural deviation — `<Term>` injection happens at the column-def builder layer (definitions.ts buildColumnDefs + root-columns.ts buildRootColumnDefs) via TermHeader render function, NOT inside the configs file. This plan honored that boundary: no JSX added to config.ts; smoke-test runtime under `node --experimental-strip-types` stays parseable."

requirements-completed: [VOC-05, VOC-06]

# Metrics
duration: ~60m wall-clock
completed: 2026-04-30
---

# Phase 44 Plan 03: REVENUE_MODEL Scoping Plumbing Summary

**ADR 0002 locks REVENUE_MODEL as the third dimension of the unit of analysis; the ETL surfaced the column 2026-04-29 with 552 rows (354 CONTINGENCY / 198 DEBT_SALE) across 4 multi-model partners and ZERO mixed-revenue-model batches; this plan ships the plumbing (REVENUE_MODEL_VALUES enum, optional pair field, additive zod filter, TERMS extensions) plus a 6-column option-(b) scope addendum — UI wiring deferred to Plan 44-04.**

## Performance

- **Duration:** ~60m wall-clock
- **Started:** 2026-04-30T13:07:26Z
- **Completed:** 2026-04-30T14:07:13Z
- **Tasks:** 3 (each committed atomically)
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments

### ETL gate verification (orchestration-time)

Before this plan ran, the orchestrator queried Snowflake directly against `BOUNCE.BOUNCE.AGG_BATCH_PERFORMANCE_SUMMARY` to confirm the column had landed:

- **REVENUE_MODEL** (TEXT) live with **552 rows**: **354 CONTINGENCY / 198 DEBT_SALE**.
- **38 distinct (partner, product) pairs** pre-split. **4 multi-model partners**: Advance Financial, Happy Money, Imprint, PatientFi. The remaining 34 are single-model.
- At the (partner, batch) grain, **ZERO batches mix revenue models** — every batch belongs cleanly to one model or the other. The "1/550 mixed-revenue-model batch outlier" CONTEXT.md anticipated does NOT exist in the live dataset.
- ETL also added **4 new finance columns** (FINANCE_PRICE, FINANCE_REV_SHARE, TOTAL_BOUNCE_REVENUE, TOTAL_LENDER_REVENUE) and surfaced **2 previously-unregistered columns** (TOTAL_PAYMENT_PLAN_REMAINING_BALANCE, COMMITMENT_RATE) → handled in the Task 3 scope addendum.

### Sidebar row-count audit (recorded in ADR 0002)

- **Pre-split:** 38 (partner, product) pairs
- **Post-split:** 42 (partner, product, revenue_model) tuples (= 34 single-model partners + 4×2 multi-model splits)
- **Max rows per partner:** 2
- **Threshold check:** PASSED (under 50-row total ceiling and 5-per-partner ceiling)
- **Decision:** Proceed with third-dimension scoping per CONTEXT.md.

### ADR 0002 shipped

`docs/adr/0002-revenue-model-scoping.md` follows the ADR 0001 template (Status / Context / Decision / Alternatives Considered / Consequences). Closes three rejected alternatives — tag/filter, column-only, re-evaluate-on-row-count — each with concrete consequences. Captures the ETL adoption state, the actual sidebar audit, the ZERO mixed-batch finding, and the Plan-44-04 wiring scope explicitly.

### Plumbing primitives shipped

- **`REVENUE_MODEL_VALUES`** enum at `src/lib/columns/config.ts` mirroring the `ACCOUNT_TYPE_VALUES` pattern.
- **`REVENUE_MODEL`** entry in `COLUMN_CONFIGS` (identity:false, defaultVisible:false, enumValues: REVENUE_MODEL_VALUES). Feeds `ALLOWED_COLUMNS` automatically via the existing `new Set(COLUMN_CONFIGS.map(c => c.key))` pattern — no separate allow-list edit needed.
- **`PartnerProductPair.revenueModel?: string`** additive optional field. `pairKey` emits a third `::` segment (empty when undefined). `parsePairKey` accepts both legacy 2-segment keys (`partner::product`) and 3-segment keys (with empty or non-empty third segment) — pre-Phase-44 persisted pair keys parse cleanly with `revenueModel: undefined`.
- **`REVENUE_MODEL_ORDER`** (CONTINGENCY → DEBT_SALE; unknown alphabetical after) wired into `sortPairs` as a third comparator layer (partner alpha → PRODUCT_TYPE_ORDER → REVENUE_MODEL_ORDER). Undefined revenueModel sorts before defined for the same (partner, product).
- **`displayNameForPair(pair, productsPerPartner, revenueModelsPerPair = 1)`** — third arg defaults to 1 (no suffix) so every Phase 39 call site is byte-identical. When `revenueModelsPerPair > 1` AND the pair carries a `revenueModel`, append `-{Contingency|DebtSale}` to the display name. Multi-product + multi-revenue-model: "Happy Money — 3rd Party-Contingency". Single-product + multi-revenue-model (e.g. Advance Financial): "Happy Money-Contingency". Single-everything: bare partner name.
- **`REVENUE_MODEL_LABELS`** (`{ CONTINGENCY: 'Contingency', DEBT_SALE: 'DebtSale' }`) + `labelForRevenueModel(rm)` helper mirroring `labelForProduct`.
- **TERMS registry** extended from 12 → 15 entries: `revenueModel`, `contingency`, `debtSale`. Each one-sentence definition follows the Plan 44-01 tone and ends with a sentence period (vocabulary smoke enforces). `vocabulary.smoke.ts` `EXPECTED_TERMS` checklist updated.
- **`PartnerListFilters.REVENUE_MODEL?: string[]`** additive optional (Phase 39 evolution pattern, third application). `attributeFiltersSchema` extended additively; `.strict()` guard preserved; no schemaVersion bump.
- **Filter-evaluator REVENUE_MODEL block** — within-array OR, cross-attribute AND. Rows missing REVENUE_MODEL degrade defensively to no-match (apples-and-oranges rule guard).

### Scope addendum (Task 3, 6 columns option-b)

Per user request 2026-04-29: register all 6 newly-ETL'd or previously-unregistered columns at `COLUMN_CONFIGS` so the data API allow-list permits them. UI/formatter/polarity wiring deferred to a follow-up phase.

| Key                                       | Type        | Notes                                                                                            |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `TOTAL_PAYMENT_PLAN_REMAINING_BALANCE`    | currency    | Remaining unpaid balance on active payment plans                                                 |
| `COMMITMENT_RATE`                         | percentage  | Snowflake-derived — see formula below                                                            |
| `FINANCE_PRICE`                           | currency    | Type best-guess; semantics not yet pinned; refine in follow-up phase if needed                   |
| `FINANCE_REV_SHARE`                       | percentage  | Type best-guess; semantics not yet pinned                                                        |
| `TOTAL_BOUNCE_REVENUE`                    | currency    | Bounce's share of revenue                                                                        |
| `TOTAL_LENDER_REVENUE`                    | currency    | Lender's share of revenue                                                                        |

**COMMITMENT_RATE formula (per user, for future readers):**
```
COMMITMENT_RATE = (TOTAL_PAYMENT_PLAN_REMAINING_BALANCE + TOTAL_COLLECTED_LIFE_TIME)
                  / TOTAL_AMOUNT_PLACED
```
This is computed in Snowflake (NUMBER column on the source table); the app does NOT compute it client-side. Captured here so the follow-up phase that surfaces COMMITMENT_RATE in KPI cards / curves doesn't re-invent the computation.

## Task Commits

Each task was committed atomically:

1. **Task 1: ADR 0002 + REVENUE_MODEL column + pair helpers + TERMS extensions** — `4be17f1` (feat)
2. **Task 2: PartnerListFilters + filter-evaluator additive REVENUE_MODEL** — `6a14c5f` (feat)
3. **Task 3: 6 additional columns scope addendum** — `001f0af` (feat)

**Plan metadata commit:** _(this commit — pending after summary write)_

## Files Created/Modified

**Created (Task 1):**

- `docs/adr/0002-revenue-model-scoping.md` — ADR 0002 cites VOC-06, records the sidebar audit, closes three alternatives.

**Modified (Task 1):**

- `src/lib/columns/config.ts` — REVENUE_MODEL_VALUES enum + REVENUE_MODEL COLUMN_CONFIGS entry.
- `src/lib/partner-config/pair.ts` — PartnerProductPair.revenueModel + REVENUE_MODEL_ORDER + REVENUE_MODEL_LABELS + 3-segment pairKey + extended parsePairKey + sortPairs third comparator + displayNameForPair default arg + labelForRevenueModel.
- `src/lib/partner-config/pair.smoke.ts` — Extended from 7 to 16 cases (backward-compat + multi-model display-name + 3-segment key roundtrip).
- `src/lib/vocabulary.ts` — TERMS +revenueModel/contingency/debtSale; module docstring updated.
- `src/lib/vocabulary.smoke.ts` — EXPECTED_TERMS checklist 12 → 15 entries.

**Modified (Task 2):**

- `src/lib/partner-lists/types.ts` — AttributeKey union + 'REVENUE_MODEL'; PartnerListFilters.REVENUE_MODEL additive optional.
- `src/lib/partner-lists/schema.ts` — attributeFiltersSchema +REVENUE_MODEL: z.array(z.string()).optional().
- `src/lib/partner-lists/filter-evaluator.ts` — REVENUE_MODEL predicate block with defensive missing-field handling.

**Modified (Task 3):**

- `src/lib/columns/config.ts` — +6 scope-addendum entries (TOTAL_PAYMENT_PLAN_REMAINING_BALANCE, COMMITMENT_RATE, FINANCE_PRICE, FINANCE_REV_SHARE, TOTAL_BOUNCE_REVENUE, TOTAL_LENDER_REVENUE).

## Setup for Plan 44-04 (consumer surfaces)

Plan 44-04 wires the UI consumers that need the primitives this plan ships. Below is a precise integration map for the next executor:

| Consumer surface              | File                                                                  | Integration point                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar pair-row split        | `src/components/layout/app-sidebar.tsx` (Partners group .map body)    | Compute `revenueModelsPerPair` per (partner, product) before .map; pass as 3rd arg to `displayNameForPair`. 4 partners affected today. |
| Sidebar tooltip               | Same file as above                                                    | Use `labelForRevenueModel(pair.revenueModel)` for hover tooltip on multi-model rows (mirroring single-product `labelForProduct` recipe). |
| Breadcrumb prefix + value     | `src/components/navigation/breadcrumb-trail.tsx`                      | Add a `revenueModel` segment when the active pair carries one. Wrap the segment label with `<Term name="revenueModel">` (first instance per CONTEXT.md). The drill VALUE (Contingency/DebtSale) stays plain text per the Plan 44-01 first-instance rule. |
| Partner Setup section         | `src/components/partner-config/...` (audit during 44-04 to find the right file) | Surface revenue model on the per-pair config sheet; first-instance `<Term name="revenueModel">` wrap on the section label.            |
| AttributeFilterBar control    | `src/components/partner-lists/...` (look for ACCOUNT_TYPE filter UI)  | Add a REVENUE_MODEL multi-select chip. First-instance `<Term name="revenueModel">` on the chip label. Wire to `useActivePartnerList` to round-trip the filter through `PartnerListFilters.REVENUE_MODEL`. |
| Mixed-model warning chip      | Batch-row UI (likely `src/components/data-display.tsx` or similar)    | DEFENSIVE — current data has ZERO mixed-batch rows; chip is correctness substrate for future ETL anomalies. Render only when a batch row carries multiple distinct REVENUE_MODEL values; tooltip explains the data-quality issue. |
| Drill-down state              | `src/hooks/use-drill-down.ts` (or whichever owns drill state today)   | Extend the drill key to include revenueModel for multi-model pairs. `parsePairKey` already accepts both legacy 2-segment and new 3-segment keys, so persisted drill state from pre-44-03 sessions parses cleanly.                                       |
| compute-layer split (Phase 43)| `src/hooks/use-partner-stats.ts`, `src/lib/computation/...`           | NOT a Plan 44-04 deliverable. Phase 43 BND-02 (compute-layer signature change) — partition-by-pair logic gains a third predicate. ADR 0002 Consequences captures this as a forward dep.                                                                |

**Plan 44-04 first-instance `<Term>` wraps to add** (continuing the first-instance-per-surface rule from Plan 44-01):

- `<Term name="revenueModel">` on: AttributeFilterBar chip label, Partner Setup section header, breadcrumb segment prefix.
- `<Term name="contingency">` and `<Term name="debtSale">` are sub-concepts of revenueModel — wrap on the AttributeFilterBar chip values themselves at first appearance (mirroring how individual ACCOUNT_TYPE values are wrapped if they are anywhere — audit the existing pattern when wiring).

**Out-of-scope for Plan 44-04** (deferred to follow-up):

- Wiring formatters / polarity / KPI cards / viable-columns for the 6 scope-addendum columns from Task 3.
- Compute-layer signature change (Phase 43 BND-02 territory).

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **Third-dimension scoping** (not tag, not column-only) — preserves Phase 39's structural-enforcement-at-the-selection-layer pattern. Three rejected alternatives closed in ADR 0002 with concrete consequences.
- **Sidebar audit threshold check passed** — 42 rows max 2 per partner, well under ceilings.
- **ZERO mixed-batch finding** captured for Plan 44-04's executor — the warning chip ships as defensive substrate, not user-visible feature on current data.
- **displayNameForPair default arg** for backward compat — single signature, no parallel call patterns.
- **3-segment pairKey accepts legacy 2-segment input** — pre-Phase-44 persisted state parses cleanly without migration.
- **PartnerListFilters additive .optional()** — third application of Phase 39 pattern; .strict() preserved; no schemaVersion bump.
- **Filter-evaluator missing-field defense** — apples-and-oranges rule forbids leaking mismatched rows.
- **Scope addendum (option b)** — API allow-list registration only; UI deferred. ALLOWED_COLUMNS auto-builds from COLUMN_CONFIGS so adding entries is sufficient.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Concurrent Phase 43 work in working tree caused a near-miss broad sweep on Task 2**

- **Found during:** Task 2 commit (`git status` after `git stash`/`git stash pop` revealed ~30 unrelated Phase 43 files in the working tree that hadn't been visible at session start).
- **Issue:** A parallel agent's `feat(43-01)` commit (`a9b42e0`) landed between this plan's Task 1 and Task 2 commits, plus a separate stash dance brought back additional uncommitted Phase 43 changes. My first Task 2 commit (`4b81f0a`, since reset) accidentally swept up 27 Phase 43 files alongside the 3 partner-lists files I intended to stage — exactly the working-tree-drift pollution the prompt's `<scope_notes>` warned against.
- **Fix:** `git reset --soft HEAD~1` followed by `git reset HEAD` (unstage everything) followed by individual `git add` of only the 3 partner-lists files. Re-committed cleanly as `6a14c5f` with 3 files / 54 insertions / 8 deletions — exactly Task 2 scope.
- **Verification:** `git show --stat 6a14c5f` confirms only the 3 intended files were staged.
- **Why Rule 3 (Blocking):** The dirty commit would have polluted the per-task atomicity contract that downstream summary readers rely on; a clean re-commit was the only way to preserve the contract.

### Process Notes

- **ETL gate handled at orchestration time, not as a checkpoint.** The plan's `blocked_on` field referenced the REVENUE_MODEL ETL; rather than the executor pausing to verify, the orchestrator queried Snowflake directly before unblocking the plan and passed the verified data shape (552 rows, 354/198 split, 38→42 audit, ZERO mixed batches) into the executor's prompt. This kept execution non-interactive and let the SUMMARY cite live numbers.
- **Working-tree drift respected.** Phase 43 files in `<scope_notes>` (`.env.example`, `src/lib/snowflake/connection.ts`, `src/lib/snowflake/types.ts`, `src/lib/static-cache/fallback.ts`, `src/lib/data/parse-batch-row.ts`, etc.) were never staged into any 44-03 commit. Verified post-Task-2-reset.
- **Plan 44-01 architectural deviation honored.** `src/lib/columns/config.ts` stays plain `.ts` — no JSX added. The `<Term>` wrap for the REVENUE_MODEL header (if ever added) would live at the column-def builder layer, not in the configs file, preserving smoke-test runtime under `node --experimental-strip-types`.

## Issues Encountered

- **Pre-existing axe-core TS error** in `tests/a11y/baseline-capture.spec.ts:18` (`Cannot find module 'axe-core'`) — out of scope per Phase 44-01 deferred-items.md; module not installed in this branch. Verified pre-existing — only error from `npx tsc --noEmit` at every checkpoint.
- **Concurrent Phase 43 work in working tree** caused the Rule 3 deviation captured above. Resolved cleanly with reset + individual file staging.
- **`git stash` + `git stash pop` dance during Task 2 verification** brought back additional Phase 43 work that wasn't visible at session start. The git-state was self-correcting once the stash dance ended; `git status` final state at end of execution shows the working tree is clean of unintended 44-03 staging — Phase 43 files remain untracked-or-modified-but-not-staged, exactly the boundary `<scope_notes>` required.

## User Setup Required

None — no external service configuration required. The REVENUE_MODEL column is already live in Snowflake (per orchestration-time verification); the data API picks it up automatically via the `ALLOWED_COLUMNS` allow-list pattern; the new TERMS entries surface in `<Term>` popovers when Plan 44-04 wires the consumer surfaces.

## Next Phase Readiness

- **Plan 44-04 (Vocabulary coverage sweep + REVENUE_MODEL UI wiring)** — every primitive it needs is on disk: `REVENUE_MODEL_VALUES` enum, `PartnerProductPair.revenueModel`, `displayNameForPair` third arg, `REVENUE_MODEL_LABELS` + `labelForRevenueModel`, `AttributeKey` union extended, `PartnerListFilters.REVENUE_MODEL` schema, filter-evaluator extended, `TERMS.revenueModel/contingency/debtSale` ready for `<Term>` wraps. The integration-point map in this SUMMARY is the executor's checklist.
- **Phase 43 BND-02 (compute-layer signature change)** — ADR 0002's Consequences section captures the forward dependency. `usePartnerStats` and friends will gain a third predicate (filter by revenueModel) when the BND-02 plan runs. Until then, behavior is unchanged because no UI consumer triggers a revenueModel-aware compute path.
- **v5.0 triangulation phases** — inherit the same primitives. The unit-of-analysis triple `(partner, product, revenue_model)` is the substrate; the apples-and-oranges rule honors it structurally.
- **Follow-up phase that surfaces the 6 scope-addendum columns** — owner of formatters / polarity / KPI cards / viable-columns work for `TOTAL_PAYMENT_PLAN_REMAINING_BALANCE`, `COMMITMENT_RATE`, `FINANCE_PRICE`, `FINANCE_REV_SHARE`, `TOTAL_BOUNCE_REVENUE`, `TOTAL_LENDER_REVENUE`. Sample real values to refine `FINANCE_PRICE` / `FINANCE_REV_SHARE` types if needed; register polarity entries for the rate-shaped columns; add presets if any of the 6 should appear in default visibility.

## Self-Check

**Files exist:**
- FOUND: docs/adr/0002-revenue-model-scoping.md
- FOUND: src/lib/columns/config.ts (REVENUE_MODEL_VALUES + 7 new COLUMN_CONFIGS entries)
- FOUND: src/lib/partner-config/pair.ts (revenueModel + helpers)
- FOUND: src/lib/partner-config/pair.smoke.ts (16 cases)
- FOUND: src/lib/vocabulary.ts (15 TERMS entries)
- FOUND: src/lib/vocabulary.smoke.ts (15-entry checklist)
- FOUND: src/lib/partner-lists/types.ts (AttributeKey + REVENUE_MODEL)
- FOUND: src/lib/partner-lists/schema.ts (REVENUE_MODEL zod field)
- FOUND: src/lib/partner-lists/filter-evaluator.ts (REVENUE_MODEL block)

**Commits exist:**
- FOUND: 4be17f1 (Task 1 — ADR + column + pair helpers + TERMS)
- FOUND: 6a14c5f (Task 2 — PartnerListFilters + evaluator)
- FOUND: 001f0af (Task 3 — 6 scope-addendum columns)

**Verification gates:**
- PASS: `npx tsc --noEmit` (only pre-existing axe-core error in tests/a11y, out of scope per deferred-items.md)
- PASS: `node --experimental-strip-types src/lib/partner-config/pair.smoke.ts` ("pair smoke OK", 16 cases)
- PASS: `node --experimental-strip-types src/lib/vocabulary.smoke.ts` ("✓ vocabulary smoke OK", exhaustiveness updated to 15-entry checklist)
- PASS: `npm run lint -- --max-warnings 0 src/lib/partner-lists/types.ts src/lib/partner-lists/schema.ts src/lib/partner-lists/filter-evaluator.ts` (clean)
- PASS: All 6 scope-addendum columns greppable in src/lib/columns/config.ts
- PASS: ADR 0002 contains required sections (Status / Context / Decision / Alternatives Considered / Consequences) and cites VOC-06

## Self-Check: PASSED

---
*Phase: 44-vocabulary-lock-glossary*
*Completed: 2026-04-30*
