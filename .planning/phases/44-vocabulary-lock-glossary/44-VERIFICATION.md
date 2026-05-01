---
phase: 44-vocabulary-lock-glossary
verified: 2026-04-29T00:00:00Z
re_verified: 2026-04-30T00:00:00Z
status: passed
score: 8/8 success criteria verified
gaps_resolved:
  - truth: "docs/GLOSSARY.md defines every existing domain term including Contingency / Debt Sale"
    resolution: "GLOSSARY.md extended with three new entries under Partners & Products — Revenue Model (parent concept, cites ADR 0002, lists 4 multi-model partners), Contingency (one paragraph), Debt Sale (one paragraph). Each carries See also cross-references. Closed inline 2026-04-30."
  - truth: "VOC-04 completion recorded in v4.5-REQUIREMENTS.md"
    resolution: "v4.5-REQUIREMENTS.md line 56 checkbox set to [x] with Plan 44-02 completion note (ADR 0001 + sidebar View→List nesting + per-view expansion state). Traceability matrix line 146 updated to '✅ Complete 2026-04-30 (44-02 — ADR 0001 + sidebar View→List nesting)'. Closed inline 2026-04-30."
human_verification:
  - test: "Hover over a domain term label (e.g. 'Batches' KPI card label, 'Partner' breadcrumb prefix, 'Views' sidebar group label)"
    expected: "After ~400ms hover, a popover appears with the term's label as a title, one-sentence definition, and 'See also' footer. Click pins it; Esc or click-outside dismisses."
    why_human: "Cannot verify popover render timing, animation, or click-to-pin behavior programmatically."
  - test: "Navigate to a multi-model partner (e.g. Advance Financial) in the sidebar, click a Contingency row, then examine the breadcrumb and URL"
    expected: "URL shows '?rm=CONTINGENCY'; breadcrumb shows '-Contingency' suffix on the partner segment; clicking 'All Partners' in breadcrumb clears ?rm=. Clicking the DebtSale row shows '?rm=DEBT_SALE'."
    why_human: "Requires live Snowflake data with REVENUE_MODEL populated. Cannot verify URL round-trip and breadcrumb rendering against live data programmatically."
  - test: "Open Partner Setup sheet for a multi-model partner pair"
    expected: "A read-only 'Revenue Model' section appears (with text-label uppercase overline wrapped in <Term> dotted underline on hover) showing 'Contingency' or 'Debt Sale' value and 'Data-derived, not editable' caption."
    why_human: "Requires live data to populate pair.revenueModel; visual layout and type-token rendering need visual check."
  - test: "Open Create List dialog, observe the attribute filter chips"
    expected: "Four attribute controls appear: ACCOUNT_TYPE, SEGMENT, PARTNER_NAME, REVENUE_MODEL. The REVENUE_MODEL chip shows 'Revenue Model' label with dotted-underline Term wrap on hover. If dataset has REVENUE_MODEL values, the control is populated; if empty, it auto-hides."
    why_human: "Auto-hide behavior and JSX label rendering in the chip require visual verification."
  - test: "In the sidebar Views group, click a view that was saved with a list binding (listId set)"
    expected: "An expand chevron appears on the view row. Clicking the chevron toggles a nested indented row showing the bound List name. Clicking the nested row activates the list. Multiple views can be expanded independently."
    why_human: "Requires a saved view with listId populated; expand/collapse interaction requires browser test."
---

# Phase 44: Vocabulary Lock & Glossary — Verification Report

**Phase Goal:** Lock the canonical domain vocabulary in code and in-product before v5.0 introduces 5 new terms on top of 12 existing unowned concepts. Ship a glossary, a TERMS registry, a `<Term>` component, resolve the List/View/Workspace conceptual collision, AND surface REVENUE_MODEL as a product dimension.

**Verified:** 2026-04-29
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                           | Status      | Evidence                                                                                                                                                             |
|----|-------------------------------------------------------------------------------------------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | GLOSSARY.md defines every domain term (incl. Contingency / Debt Sale) for a new analyst         | PARTIAL     | GLOSSARY.md exists (118 lines, 5 sections, 12 primary + 4 derived terms). Contingency/Debt Sale absent as standalone entries — only in vocabulary.ts TERMS            |
| 2  | vocabulary.ts exports TERMS registry — 15 terms including revenueModel/contingency/debtSale     | VERIFIED    | vocabulary.ts L57–163: 15 entries confirmed. Smoke test passes: "✓ vocabulary smoke OK"                                                                              |
| 3  | `<Term>` component surfaces definition on hover/focus; applied to KPI, table, breadcrumb, sidebar | VERIFIED  | term.tsx L80–136: full Base UI Popover implementation. Wired to: kpi-summary-cards.tsx, breadcrumb-trail.tsx, app-sidebar.tsx, partner-lists-sidebar-group.tsx, definitions.ts, root-columns.ts |
| 4  | List vs View collision resolved by ADR; UI applies chosen model (View contains List)            | VERIFIED    | docs/adr/0001-list-view-hierarchy.md (114 lines, all required sections). Sidebar nesting wired in app-sidebar.tsx L530–594. Commits 0019037, 325016d confirmed        |
| 5  | REVENUE_MODEL_VALUES enum + COLUMN_CONFIGS entry + PartnerListFilters + TERMS entries           | VERIFIED    | config.ts L58–72: REVENUE_MODEL_VALUES enum + entry. pair.ts: revenueModel on PartnerProductPair, REVENUE_MODEL_ORDER, REVENUE_MODEL_LABELS, displayNameForPair 3-arg. partner-lists/types.ts, schema.ts, filter-evaluator.ts all extended |
| 6  | ADR 0002 documents REVENUE_MODEL as third dimension with sidebar audit                          | VERIFIED    | docs/adr/0002-revenue-model-scoping.md: all sections, cites VOC-06, records 38→42 row audit, three alternatives closed, commit 4be17f1                               |
| 7  | Sidebar pair labels, breadcrumb, Partner Setup, AttributeFilterBar reflect REVENUE_MODEL         | VERIFIED    | app-sidebar.tsx: pair rows split with displayNameForPair 3rd arg, 3-segment key, active-state match. breadcrumb-trail.tsx: revenueModel suffix. partner-setup-sheet.tsx: read-only section with `<Term>`. attribute-filter-bar.tsx: REVENUE_MODEL 4th entry with `<Term>` |
| 8  | VOC-04 marked complete in v4.5-REQUIREMENTS.md                                                  | FAILED      | Code is complete (ADR + sidebar nesting both verified), but requirements file line 56 still shows `[ ] VOC-04` and line 146 still shows "Pending"                    |

**Score:** 6/8 truths fully verified (1 partial, 1 failed — both are documentation tracking issues, not code gaps)

---

## Required Artifacts

| Artifact                                                        | Expected                                            | Status       | Details                                                               |
|-----------------------------------------------------------------|-----------------------------------------------------|--------------|-----------------------------------------------------------------------|
| `docs/GLOSSARY.md`                                              | 12 primary terms + Contingency/Debt Sale            | PARTIAL      | 118 lines, 12 primary + 4 derived. Contingency/Debt Sale absent as glossary entries |
| `src/lib/vocabulary.ts`                                         | TERMS registry, 15 entries                          | VERIFIED     | L57–163: 15 entries (12 original + revenueModel/contingency/debtSale) |
| `src/lib/vocabulary.smoke.ts`                                   | 3 assertions + 15-entry checklist                   | VERIFIED     | Runs clean: "✓ vocabulary smoke OK"                                   |
| `src/components/ui/term.tsx`                                    | Popover primitive with hover/click/keyboard         | VERIFIED     | 136 lines; Base UI Popover, span[role=button], 400ms delay            |
| `docs/adr/0001-list-view-hierarchy.md`                          | ADR with all required sections, cites VOC-04        | VERIFIED     | 114 lines; Status/Context/Decision/Alternatives/Consequences          |
| `docs/adr/0002-revenue-model-scoping.md`                        | ADR with sidebar audit, cites VOC-06                | VERIFIED     | All sections; records 38→42 audit; three alternatives closed          |
| `src/lib/columns/config.ts`                                     | REVENUE_MODEL_VALUES + 7 new COLUMN_CONFIGS entries | VERIFIED     | REVENUE_MODEL enum (L58–62) + entry (L72) + 6 scope-addendum columns (L164–171) |
| `src/lib/partner-config/pair.ts`                                | revenueModel, REVENUE_MODEL_ORDER, 3-segment pairKey | VERIFIED    | revenueModel optional (L60); REVENUE_MODEL_ORDER (L86); pairKey 3-segment (L114); parsePairKey backward-compat; sortPairs; displayNameForPair default arg; REVENUE_MODEL_LABELS; labelForRevenueModel |
| `src/lib/partner-lists/types.ts`                                | AttributeKey + REVENUE_MODEL; PartnerListFilters     | VERIFIED     | L23: 'REVENUE_MODEL' in union; L56: REVENUE_MODEL?: string[]         |
| `src/lib/partner-lists/schema.ts`                               | REVENUE_MODEL zod field, .strict() preserved         | VERIFIED     | L35: z.array(z.string()).optional()                                   |
| `src/lib/partner-lists/filter-evaluator.ts`                     | REVENUE_MODEL predicate with defensive fallback      | VERIFIED     | L71–113: within-array OR, defensive missing-field handling            |
| `src/components/layout/app-sidebar.tsx`                         | View→List nesting + pair-row split + MixedModelChip  | VERIFIED     | viewsExpansionState (15 occurrences of nesting logic); revenueModelsPerPair split; MixedRevenueModelChip exported (L83); isMixedRevenueModelBatch (L57) |
| `src/hooks/use-drill-down.ts`                                   | DrillState.revenueModel + ?rm= URL param            | VERIFIED     | L43: revenueModel: string | null; L83: DRILL_REVENUE_MODEL_PARAM='rm'; drillToPair, drillToBatch, navigateToLevel all handle revenueModel |
| `src/components/navigation/breadcrumb-trail.tsx`                | revenueModel suffix + useSidebarData                | VERIFIED     | L48: useSidebarData; L85–86: suffix when rmCount > 1 && state.revenueModel |
| `src/components/partner-lists/attribute-filter-bar.tsx`         | REVENUE_MODEL 4th entry with `<Term>` label         | VERIFIED     | L79: key REVENUE_MODEL; L80: `<Term name="revenueModel">` label      |
| `src/components/partner-config/partner-setup-sheet.tsx`         | Read-only Revenue Model section with `<Term>`        | VERIFIED     | L137: `<Term name="revenueModel">Revenue Model</Term>` first-instance |
| `.planning/milestones/v4.5-REQUIREMENTS.md`                     | VOC-04 marked complete                              | FAILED       | L56: `[ ] VOC-04` (unchecked); L146: "Pending (List/View resolution ADR)" |

---

## Key Link Verification

| From                            | To                                | Via                                   | Status      | Details                                                                          |
|---------------------------------|-----------------------------------|---------------------------------------|-------------|----------------------------------------------------------------------------------|
| `term.tsx`                      | `vocabulary.ts` TERMS             | `import { TERMS, TermName }`          | WIRED       | L43 import; TERMS[name] lookup in render                                         |
| `kpi-summary-cards.tsx`         | `term.tsx`                        | `<Term name="batch/account">`         | WIRED       | L75, L81: Term wraps on Batches and Accounts labels                              |
| `breadcrumb-trail.tsx`          | `term.tsx`                        | `<Term name="partner/batch">`         | WIRED       | L62, L92, L106: Partners/Partner/Batch term wraps                                |
| `app-sidebar.tsx`               | `term.tsx`                        | `<Term name="view">`                  | WIRED       | L491: Views group label                                                          |
| `partner-lists-sidebar-group.tsx` | `term.tsx`                      | `<Term name="partner/list">`          | WIRED       | L141–142: Partner Lists group label                                              |
| `definitions.ts`                | `term.tsx`                        | `TERM_HEADER_BY_KEY` / `TermHeader`   | WIRED       | L363–367: createElement(Term) render function for PARTNER_NAME + BATCH headers  |
| `root-columns.ts`               | `term.tsx`                        | `TERM_HEADER_BY_KEY` / `TermHeader`   | WIRED       | L102–106: TermHeader for PARTNER_NAME                                            |
| `csv.ts`                        | `column definitions`              | `headerStringFor()` fallback          | WIRED       | L74–94: falls back to config.label when header is render function               |
| `app-sidebar.tsx`               | `pair.ts` displayNameForPair      | 3rd arg `rmCount`                     | WIRED       | L377–389: rmCount from revenueModelsPerPair.get(ppKey); passed as 3rd arg       |
| `data-display.tsx`              | `sidebar-data.tsx` context        | `productsPerPartner + revenueModelsPerPair` Maps | WIRED | L1406–1508: SidebarDataPusher computes triples, pushes via setSidebarData       |
| `breadcrumb-trail.tsx`          | `sidebar-data.tsx` context        | `useSidebarData()`                    | WIRED       | L48: destructures revenueModelsPerPair; used in suffix logic L83–86             |
| `use-drill-down.ts`             | URL                               | `?rm=` via `pushWith`                 | WIRED       | L139–145: pushWith sets/deletes DRILL_REVENUE_MODEL_PARAM                        |
| `attribute-filter-bar.tsx`      | `term.tsx`                        | `<Term name="revenueModel">`          | WIRED       | L80: JSX label wrapping                                                           |
| `partner-setup-sheet.tsx`       | `pair.ts` labelForRevenueModel    | import + call                         | WIRED       | L35: import; L141: labelForRevenueModel(pair.revenueModel)                       |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                          | Status        | Evidence                                                                         |
|-------------|-------------|------------------------------------------------------|---------------|----------------------------------------------------------------------------------|
| VOC-01      | 44-01       | Canonical glossary at docs/GLOSSARY.md               | PARTIAL       | GLOSSARY.md exists (118 lines, 5 sections). Contingency/Debt Sale missing        |
| VOC-02      | 44-01       | TERMS registry at src/lib/vocabulary.ts              | SATISFIED     | 15 entries, smoke passes, TermName type exported                                  |
| VOC-03      | 44-01       | `<Term>` component applied to KPI/table/breadcrumb/sidebar | SATISFIED | term.tsx wired to all 4 surfaces; TermHeader pattern for table headers           |
| VOC-04      | 44-02       | List/View ADR + UI applies chosen model              | SATISFIED (code) / BLOCKED (docs tracking) | ADR 0001 exists, sidebar nesting wired. REQUIREMENTS.md NOT updated   |
| VOC-05      | 44-03       | REVENUE_MODEL plumbing                               | SATISFIED     | REVENUE_MODEL_VALUES, COLUMN_CONFIGS, PartnerListFilters, filter-evaluator, TERMS |
| VOC-06      | 44-03       | ADR documents REVENUE_MODEL as third dimension       | SATISFIED     | ADR 0002 with sidebar audit (38→42), threshold check PASSED                      |
| VOC-07      | 44-04       | UI surfaces REVENUE_MODEL across all consumer surfaces | SATISFIED   | Sidebar split, ?rm= URL, breadcrumb suffix, AttributeFilterBar, Partner Setup, MixedRevenueModelChip substrate |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No stub, placeholder, or empty-implementation patterns found in Phase 44 deliverables. All key files contain substantive implementation. The `MixedRevenueModelChip` is an intentionally unexercised defensive substrate (zero mixed batches exist in current data per ADR 0002 audit) — not a placeholder.

---

## Human Verification Required

### 1. `<Term>` Popover UX

**Test:** Hover over a domain-term label — e.g. "Batches" KPI card, "Partner" breadcrumb prefix, "Views" sidebar group label.
**Expected:** After ~400ms, a popover appears with the term's title, definition, and "See also" footer. Clicking pins it; Esc or click-outside dismisses. No nested-button HTML errors in console.
**Why human:** Popover render timing, animation, and click-to-pin behavior cannot be verified programmatically.

### 2. Multi-Model Partner Sidebar + Drill-Down

**Test:** With live Snowflake data, open the sidebar and find a multi-model partner (Advance Financial, Happy Money, Imprint, or PatientFi). Confirm two rows appear with `-Contingency` / `-DebtSale` suffixes. Click one; check URL and breadcrumb.
**Expected:** URL shows `?rm=CONTINGENCY` (or DEBT_SALE). Breadcrumb shows "Partner: Happy Money-Contingency" (or applicable suffix). Click breadcrumb "All Partners" to clear — URL returns to `/`.
**Why human:** Requires live data with REVENUE_MODEL populated; URL round-trip and suffix rendering need visual confirmation.

### 3. Partner Setup Sheet Revenue Model Section

**Test:** Open the Partner Setup sheet for a multi-model partner pair.
**Expected:** A read-only "Revenue Model" section appears with `text-label uppercase` overline (with `<Term>` dotted underline on hover), `text-body` value ("Contingency" or "Debt Sale"), and `text-caption` help text "Data-derived, not editable".
**Why human:** Requires live data to populate `pair.revenueModel`; type-token rendering and visual layout need human check.

### 4. AttributeFilterBar REVENUE_MODEL Control

**Test:** Open the Create List dialog (or the attribute filter bar in the Partner Lists panel). Observe the attribute chips.
**Expected:** Four attribute controls appear. REVENUE_MODEL chip shows "Revenue Model" label with a dotted underline on hover. If dataset has REVENUE_MODEL values, the control is active; if empty, the chip auto-hides.
**Why human:** JSX label rendering in chip and auto-hide behavior require visual verification.

### 5. Sidebar View → Bound List Nesting

**Test:** Save a view with a partner list active, then reload the sidebar Views group.
**Expected:** The saved view shows an expand chevron. Clicking the chevron reveals an indented List row with list name and "(List)" caption. Clicking the List row activates the list (same as clicking it in the Partner Lists section). Expanding/collapsing multiple views works independently.
**Why human:** Requires a saved view with `listId` populated; interactive expand/collapse needs browser confirmation.

---

## Gaps Summary

Two gaps prevent full status: `passed`:

**Gap 1 — GLOSSARY.md missing Contingency and Debt Sale entries (Partial VOC-01):** The success criterion for VOC-01 explicitly states "Contingency / Debt Sale added" to GLOSSARY.md. Plan 44-03 added both terms to the TERMS registry (vocabulary.ts) with proper one-sentence definitions, but did not append corresponding paragraph-length glossary entries to docs/GLOSSARY.md. The file ended with "Last updated: 2026-04-29" and was not modified after Plan 44-01. Fix: append a "### Revenue Model" section under Partners & Products in GLOSSARY.md with paragraph-depth entries for Revenue Model, Contingency, and Debt Sale, following the existing glossary entry format.

**Gap 2 — v4.5-REQUIREMENTS.md tracking not updated for VOC-04 (documentation):** Code delivery for VOC-04 is complete and verified (ADR 0001, sidebar nesting, commits 0019037/325016d). The v4.5-REQUIREMENTS.md file was not updated after Plan 44-02 shipped. Line 56 shows `[ ] VOC-04` (unchecked) and line 146 shows "Pending". Fix: mark the checkbox and update the matrix row to match VOC-05/06/07 completion entries.

Both gaps are documentation tracking issues rather than functional code gaps. All VOC-01..07 functional behaviors are implemented and wired correctly in the codebase.

---

_Verified: 2026-04-29_
_Verifier: Claude (gsd-verifier)_
