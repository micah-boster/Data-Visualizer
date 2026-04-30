---
phase: 44-vocabulary-lock-glossary
plan: 01
subsystem: ui
tags: [vocabulary, glossary, popover, base-ui, tanstack-table, type-tokens, react]

# Dependency graph
requires:
  - phase: 28-design-tokens
    provides: bg-surface-overlay + shadow-elevation-overlay tokens used by the popover surface
  - phase: 27-type-tokens
    provides: text-title / text-body / text-caption tokens used inside <Term> popover content
provides:
  - "TERMS registry at src/lib/vocabulary.ts — single rename point for the app's user-visible domain vocabulary"
  - "<Term name=\"...\"> primitive at src/components/ui/term.tsx — dotted-underline-on-hover popover wired to TERMS"
  - "docs/GLOSSARY.md — paragraph-length canonical glossary doubling as new-analyst onboarding"
  - "First-instance-per-surface vocabulary wraps on KPI cards, breadcrumb trail, sidebar (Views + Partner Lists), and table headers (PARTNER_NAME + BATCH)"
  - "ColumnConfig.label stays a string; <Term> wrap injected at column-def builder layer (definitions.ts + root-columns.ts) via TermHeader render function — preserves smoke-test runtime"
  - "headerStringFor() helper in src/lib/export/csv.ts — falls back to config.label when columnDef.header is a function, preserving WYSIWYG export contract"
affects: [44-02 list-view-adr, 44-03 partner-product-revenue-model, 44-04 vocabulary-coverage, 45+ v5.0 phases extending TERMS]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Term registry as rename point: TERMS[key].label is a one-line edit and propagates to every <Term name=\"key\"> consumer"
    - "<Term> trigger renders as <span role=\"button\" tabIndex={0}> (Base UI nativeButton={false}) so it composes inside breadcrumb buttons / sidebar menu buttons / sortable table headers without producing nested <button> HTML"
    - "First-instance-per-surface wrapping rule: per CONTEXT.md, only the first occurrence of each domain term per surface is wrapped — subsequent repeats stay plain text"
    - "JSX kept out of src/lib/columns/config.ts: configs file is transitively imported by node --experimental-strip-types smoke tests that cannot parse JSX. <Term> wrap lives at the column-def builder layer (definitions.ts / root-columns.ts) which is only ever bundled by JSX-aware toolchains (Next.js)"

key-files:
  created:
    - "docs/GLOSSARY.md (118 lines, paragraph-length entries grouped by 5 sections)"
    - "src/lib/vocabulary.ts (TERMS registry, 12 terms, TermName type, TermDefinition interface)"
    - "src/lib/vocabulary.smoke.ts (3 assertions: non-empty + sentence-period, seeAlso integrity, exhaustiveness)"
    - "src/components/ui/term.tsx (Term + TermProps; popover + dotted underline + click-to-pin)"
  modified:
    - "src/components/kpi/kpi-summary-cards.tsx (wrap totalBatches → batch, totalAccounts → account)"
    - "src/components/patterns/stat-card.tsx (StatCard.label widened to ReactNode)"
    - "src/components/navigation/breadcrumb-trail.tsx (wrap 'Partners' / 'Partner' / 'Batch' prefixes; values stay plain)"
    - "src/components/layout/app-sidebar.tsx (wrap Views SidebarGroupLabel; Partners group + 'All Partners' button stay plain per audit)"
    - "src/components/partner-lists/partner-lists-sidebar-group.tsx (wrap 'Partner' AND 'Lists' — first sidebar-surface occurrence of both)"
    - "src/lib/columns/definitions.ts (TermHeader render function for PARTNER_NAME + BATCH headers)"
    - "src/lib/columns/root-columns.ts (TermHeader render function for PARTNER_NAME at root level)"
    - "src/lib/export/csv.ts (headerStringFor helper preserving string export when headers become render functions)"

key-decisions:
  - "All 12 existing terms locked in registry: partner, product, batch, account, metric, curve, anomaly, norm, list, view, preset, percentile. v5.0 future terms (scorecard/target/triangulation/reconciliation/divergence) explicitly NOT seeded — they ship as one-line appends in v5.0 plans."
  - "Derived terms (Modeled rate, Delta vs modeled, Cascade tier, Anomaly score) live in docs/GLOSSARY.md only — registry covers conceptual primitives that need <Term> popovers. Smoke test asserts exhaustiveness against the 12-term checklist so accidental additions trip CI."
  - "<Term> trigger renders as span[role=button] tabIndex=0 (NOT a native <button>) — needed because <Term> is placed inside breadcrumb buttons, sidebar menu buttons, and sortable table headers, all of which are themselves <button> elements. Nested-button HTML is invalid; span+role preserves keyboard activation (Space built-in, Enter via Base UI)."
  - "TermDefinition.seeAlso typed readonly string[] (not TermName[]) to break the circular reference between TermDefinition and TermName (which is keyof typeof TERMS). Smoke test validates every seeAlso entry resolves to a real TermName at runtime."
  - "Task 4 architectural deviation (Rule 1/3): plan proposed renaming src/lib/columns/config.ts → config.tsx, widening ColumnConfig.label to ReactNode, and shipping a labelText() helper. That path was infeasible — the configs file is transitively imported by ~7 smoke tests run under `node --experimental-strip-types`, which cannot parse JSX. Renaming + embedding <Term> JSX would break parse-metabase-sql.smoke / axis-eligibility.smoke / transitions.smoke / map-to-snapshot.smoke / override.smoke / stale-column.smoke / vocabulary.smoke. Resolution: keep config.ts as plain string-typed TS; inject <Term> at the column-def builder layer (definitions.ts buildColumnDefs + root-columns.ts buildRootColumnDefs) via a TermHeader render function. The contract 'renaming a term is a one-line edit to TERMS[key].label' is preserved — registry remains the single rename point. ColumnConfig shape unchanged so all 16 downstream importers stay byte-identical."
  - "Sidebar first-instance audit: Partner Lists group label renders ABOVE the Partners group (per existing layout invariant in app-sidebar.tsx ~L175). So 'Partner' AND 'Lists' first instances live on partner-lists-sidebar-group.tsx — both wrapped together. Partners SidebarGroupLabel and 'All Partners' menu button are SECOND/THIRD occurrences and stay plain. Views SidebarGroupLabel is the first sidebar-surface instance of `view` — wrapped."
  - "Breadcrumb literal-prefix rule: 'Partner' / 'Batch' prefix words wrapped in <Term>; the drill VALUES (state.partner, state.batch) stay plain text — they are data, not vocabulary. Each segment also carries a plain labelText alias for the button aria-label so screen readers continue to announce the textual breadcrumb without 'See also' clutter."
  - "csv.ts headerStringFor() helper: when columnDef.header is a render function (TermHeader), CSV export now falls back to config.label string ('Partner' / 'Batch') before col.id. Preserves the WYSIWYG export contract — exports stay plain text identical to the visible header label, even though the visible header is now JSX."

patterns-established:
  - "TERMS-registry rename point: changing TERMS[key].label propagates through every <Term name=\"key\"> consumer at render time (cited example in vocabulary.ts module docstring)."
  - "<Term> wrapping is first-instance-per-surface, never global. Each surface (KPI card row, breadcrumb trail, sidebar, table header row) gets one wrap per term."
  - "JSX-free configs + render-function headers: domain-vocabulary JSX lives at the column-def builder, not in the configs registry. Future first-instance term additions on table headers (e.g. 'Curve' as a column header) extend TERM_HEADER_BY_KEY in definitions.ts / root-columns.ts."
  - "Pre-existing react-hooks/set-state-in-effect lint errors on the hydration-safe localStorage-read pattern (POL-02) logged to deferred-items.md per SCOPE BOUNDARY rule — not a 44-01 deliverable."

requirements-completed: [VOC-01, VOC-02, VOC-03]

# Metrics
duration: ~9h 43m wall-clock (across two sessions, includes overnight pause + interleaved 41-05 work; active executor time ~2-3h)
completed: 2026-04-30
---

# Phase 44 Plan 01: Vocabulary Lock & Glossary Summary

**TERMS registry at src/lib/vocabulary.ts (12 domain terms), <Term> popover primitive, GLOSSARY.md, and first-instance wraps on KPI cards / breadcrumbs / sidebar / table headers — all without renaming config.ts to config.tsx.**

## Performance

- **Duration:** ~9h 43m wall-clock (multi-session: Task 1+2 on 2026-04-29 evening, Tasks 3+4 on 2026-04-30 morning, with parallel 41-05 work in between)
- **Started:** 2026-04-29T22:57:37-04:00 (Task 1 commit)
- **Completed:** 2026-04-30T08:40:21-04:00 (Task 4 commit)
- **Tasks:** 4 (each committed atomically)
- **Files modified:** 11 (4 created, 7 modified)

## Accomplishments

- **TERMS registry shipped** at `src/lib/vocabulary.ts` with all 12 existing domain terms (partner, product, batch, account, metric, curve, anomaly, norm, list, view, preset, percentile). Each term carries `{ label, definition, synonyms, seeAlso }`. The single rename point — changing `TERMS.metric.label` from "Metric" to "KPI" propagates through every `<Term name="metric">` consumer with no consumer code change.
- **`<Term>` primitive shipped** at `src/components/ui/term.tsx` — at-rest renders plain inherited text; hover/focus surfaces a subtle dotted underline; ~400ms hover delay opens a popover with title (text-title) / definition (text-body) / "See also: ..." footer (text-caption). Click pins the popover; Esc / click-outside dismisses (Base UI Popover handles both).
- **Canonical glossary** at `docs/GLOSSARY.md` — paragraph-length entries grouped into 5 sections (Partners & Products / Batches & Accounts / Metrics & Curves / Detection & Norms / UI Concepts) with 4 derived-term entries (Modeled rate, Delta vs modeled, Cascade tier, Anomaly score) marked italic in their primary sections. New-analyst tone; doubles as onboarding material.
- **Smoke test** at `src/lib/vocabulary.smoke.ts` — 3 assertions guarding the registry: non-empty label/definition with sentence-period punctuation, seeAlso integrity (no dangling cross-references), exhaustiveness vs the v4.5 hard-coded checklist (catches accidental term removal during refactors).
- **First-instance wrapping** applied to four primary surfaces per CONTEXT.md "Application scope" lock — KPI cards, breadcrumb trail, sidebar, and table headers.

## Task Commits

Each task was committed atomically:

1. **Task 1: TERMS registry + glossary + smoke test** — `60eaa1f` (feat)
2. **Task 2: `<Term>` popover component** — `6f35808` (feat)
3. **Task 3: Wire `<Term>` into KPI cards / breadcrumbs / sidebar** — `1a12e99` (feat)
4. **Task 4: Wire `<Term>` into table headers (PARTNER_NAME + BATCH)** — `326efbd` (feat)

**Plan metadata commit:** _(this commit — pending after summary write)_

## Cross-Resume Note

This plan was executed across two separate executor sessions:

- **Session 1 (2026-04-29 evening):** Tasks 1 + 2 landed (`60eaa1f`, `6f35808`).
- **Session 2 (2026-04-30 morning):** Tasks 3 + 4 landed (`1a12e99`, `326efbd`). The session-2 executor verified session-1 commits via `git log` and disk artefacts before resuming, then executed Tasks 3 + 4 atomically with the documented Rule 1/3 deviation in Task 4.
- **Session 3 (this session):** All four task commits already present and verified. This session created the SUMMARY, updated STATE.md / ROADMAP.md, and marked VOC-01..03 complete in v4.5-REQUIREMENTS.md.

The cross-session resume worked because each task was committed atomically — the session-2 executor read the live disk state (`src/lib/vocabulary.ts` from Task 1, `src/components/ui/term.tsx` from Task 2) to learn the exact API before wiring Task 3 + 4 consumers. No replay or rework was needed.

## Files Created/Modified

**Created (Tasks 1, 2):**

- `docs/GLOSSARY.md` — Canonical glossary, 5 sections, 12 primary terms + 4 derived terms.
- `src/lib/vocabulary.ts` — TERMS registry; exports `TERMS`, `TermName`, `TermDefinition`.
- `src/lib/vocabulary.smoke.ts` — 3-assertion smoke test (`node --experimental-strip-types`-runnable).
- `src/components/ui/term.tsx` — `<Term name="...">` primitive composed from `@base-ui/react/popover`.

**Modified (Task 3 — KPI / breadcrumb / sidebar wires):**

- `src/components/kpi/kpi-summary-cards.tsx` — Wrap `totalBatches` label in `<Term name="batch">Batches</Term>` and `totalAccounts` label in `<Term name="account">Accounts</Term>`. Other KPI labels stay plain.
- `src/components/patterns/stat-card.tsx` — Widen `StatCard.label` and the `IdentityCardSpec.label` / `RateCardSpec.label` types to `ReactNode` so JSX labels render correctly.
- `src/components/navigation/breadcrumb-trail.tsx` — Wrap `'Partners'` (in "All Partners" root segment), `'Partner'` prefix, and `'Batch'` prefix in `<Term>`. Drill values stay plain text. Each segment carries a plain `labelText` alias for `aria-label`.
- `src/components/layout/app-sidebar.tsx` — Wrap Views SidebarGroupLabel content in `<Term name="view">Views</Term>`. Partners group label and "All Partners" menu button left plain (Partner Lists section above is the first sidebar-surface instance of `partner`).
- `src/components/partner-lists/partner-lists-sidebar-group.tsx` — Wrap "Partner Lists" → `<Term name="partner">Partner</Term> <Term name="list">Lists</Term>`. First sidebar-surface occurrence of both `partner` and `list`.

**Modified (Task 4 — table-header wires + CSV export shim):**

- `src/lib/columns/definitions.ts` — Add `TERM_HEADER_BY_KEY` map and `headerForConfig()`. Returns a `() => createElement(Term, ...)` render function for `PARTNER_NAME` + `BATCH`; pass-through `config.label` string for all other configs. Wired into `buildColumnDefs()`.
- `src/lib/columns/root-columns.ts` — Same `TERM_HEADER_BY_KEY` pattern (PARTNER_NAME only — root rows are pair summaries, not batch rows). Wired into `buildRootColumnDefs()`.
- `src/lib/export/csv.ts` — Add `headerStringFor()` helper. When `columnDef.header` is a render function (TermHeader), fall back to `col.columnDef.header` if string OR resolve via `col.id`. CSV exports continue to emit plain "Partner" / "Batch" text identical to the rendered header.

**Restored (Task 4 — incidental):**

- `src/lib/columns/config.ts` — Restored byte-for-byte to its pre-Task-4 content. A parallel agent's `docs(41-05)` commit (`6fc048a`) accidentally swept up a transient `git rm src/lib/columns/config.ts` from the session-2 executor's index when it was paused mid-Task-4. The Task 4 commit restores the file with no schema changes (148 lines).

## First-Instance-Per-Surface Map

| Surface                        | File                                                       | Terms Wrapped                          | Why                                                                                  |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| KPI Cards                      | `src/components/kpi/kpi-summary-cards.tsx`                 | `batch`, `account`                     | "Batches" (totalBatches card) + "Accounts" (totalAccounts card) are first instances. |
| Breadcrumb Trail               | `src/components/navigation/breadcrumb-trail.tsx`           | `partner`, `batch`                     | Literal "Partner" / "Batch" prefixes wrap; values stay plain.                        |
| Sidebar — Partner Lists Group  | `src/components/partner-lists/partner-lists-sidebar-group.tsx` | `partner`, `list`                  | Renders ABOVE Partners group. First sidebar-surface occurrence of both terms.        |
| Sidebar — Views Group          | `src/components/layout/app-sidebar.tsx`                    | `view`                                 | First sidebar-surface occurrence of `view`.                                          |
| Sidebar — Partners Group       | `src/components/layout/app-sidebar.tsx`                    | _(none — plain)_                       | Partner Lists above is already the first instance; this is the second occurrence.    |
| Table Headers (data table)     | `src/lib/columns/definitions.ts`                           | `partner` (PARTNER_NAME), `batch` (BATCH) | First table-header instances of partner + batch on the data table surface.        |
| Table Headers (root level)     | `src/lib/columns/root-columns.ts`                          | `partner` (PARTNER_NAME)               | Root rows are pair summaries, not batch rows — only `partner` applies here.          |

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

- **Registry shape (12 primary terms, no derived terms, no v5.0 seeds)** — Locked by CONTEXT.md "Coverage scope" decision. Smoke-test exhaustiveness assertion guards future drift.
- **`<Term>` trigger as `<span role="button" tabIndex={0}>`, not a native `<button>`** — Required for nested-button HTML safety; Base UI's `nativeButton={false}` + `render` prop preserves keyboard activation (Space built-in via role, Enter wired by Base UI).
- **`TermDefinition.seeAlso` typed `readonly string[]`** — Breaks the circular reference between `TermDefinition` and `TermName`. Smoke test validates entries resolve at runtime.
- **Task 4 deviation (config.ts stays plain TS; `<Term>` injected at column-def builder layer)** — The plan's proposed `config.ts → config.tsx` rename + `ColumnConfig.label: ReactNode` widening was infeasible because ~7 smoke tests transitively import the configs file under `node --experimental-strip-types` (which cannot parse JSX). Resolution preserves the rename-point contract while keeping the smoke runtime intact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `<Term>` trigger rendered as native `<button>`, producing nested-button HTML**

- **Found during:** Task 3 (Wire `<Term>` into breadcrumb / sidebar / table headers — all of which are themselves `<button>` elements at the wrapping level).
- **Issue:** Base UI's `Popover.Trigger` defaults to a native `<button>`. Once `<Term>` was placed inside a breadcrumb button (line ~85 of breadcrumb-trail.tsx), a sidebar menu button (SidebarMenuButton in app-sidebar.tsx), or a sortable table header button, the resulting DOM had nested `<button>` elements — invalid HTML, fails axe accessibility, fails some browsers' click-event delivery.
- **Fix:** Set `nativeButton={false}` on `Popover.Trigger` and pass a `render={<span role="button" tabIndex={0} … />}` so the trigger renders as a span with explicit role/tabindex. Base UI preserves keyboard activation: Space is built-in for `role="button"`, Enter wired by the primitive's keydown handler.
- **Files modified:** `src/components/ui/term.tsx` (component definition).
- **Verification:** `npx tsc --noEmit` clean; manual smoke check that breadcrumb-button hover + sidebar-button hover + table-header hover all surface the popover without console errors.
- **Committed in:** `1a12e99` (Task 3 commit, alongside the wiring changes).

**2. [Rule 1/3 - Bug + Blocking] Plan proposed `config.ts → config.tsx` rename incompatible with smoke-test runtime**

- **Found during:** Task 4 (Table-header wiring).
- **Issue:** The plan proposed renaming `src/lib/columns/config.ts` to `config.tsx`, widening `ColumnConfig.label` to `ReactNode`, and shipping a `labelText()` helper. Implementing this broke ~7 smoke tests run under `node --experimental-strip-types` (which cannot parse JSX): `parse-metabase-sql.smoke`, `axis-eligibility.smoke`, `map-to-snapshot.smoke`, `override.smoke`, `transitions.smoke`, `stale-column.smoke`, `vocabulary.smoke` — all transitively import the configs file.
- **Fix:** Keep `config.ts` as plain string-typed TS. Inject `<Term>` at the column-def builder layer (`buildColumnDefs` in `definitions.ts` and `buildRootColumnDefs` in `root-columns.ts`) via a `TermHeader` render function. The configs file stays JSX-free; the column-def builders are only ever bundled by Next.js (full JSX-aware toolchain). The contract "renaming a term's user-visible label is a one-line edit to `TERMS[key].label`" is preserved — registry remains the single rename point, and `<Term>` reads from it. `ColumnConfig` shape is unchanged so all 16 downstream importers stay byte-identical.
- **Files modified:** `src/lib/columns/definitions.ts`, `src/lib/columns/root-columns.ts`, `src/lib/export/csv.ts` (headerStringFor helper for CSV export). `src/lib/columns/config.ts` itself unchanged (restored byte-for-byte after a parallel agent's commit accidentally swept it).
- **Verification:** `npx tsc --noEmit` clean; `node --experimental-strip-types` runs clean for all 7 smoke tests that touch config.ts; `bash scripts/check-type-tokens.sh` clean.
- **Committed in:** `326efbd` (Task 4 commit) with detailed deviation rationale in the commit message.

**3. [Rule 3 - Blocking] `src/lib/columns/config.ts` accidentally deleted by a parallel commit**

- **Found during:** Task 4 (mid-execution, when the session-1 executor was paused on a usage limit).
- **Issue:** A parallel agent's `docs(41-05)` commit (`6fc048a`) running on a different feature swept up a transient `git rm src/lib/columns/config.ts` from the session-2 executor's index when it was paused. Result: file deleted from disk, every importer broken.
- **Fix:** Restored `src/lib/columns/config.ts` byte-for-byte to its pre-deletion content (148 lines, no schema changes) as part of the Task 4 commit.
- **Files modified:** `src/lib/columns/config.ts` (restoration).
- **Verification:** All transitively-importing smoke tests run clean.
- **Committed in:** `326efbd` (Task 4 commit).

---

**Total deviations:** 3 auto-fixed (Rule 1 — bug, Rule 1/3 — bug + blocking, Rule 3 — blocking)
**Impact on plan:** Two architectural rule-1/3 fixes preserved deliverable contracts (rename point still single-edit, configs file still smoke-runnable) while landing the `<Term>` wraps the plan called for. One incidental file-restoration after a parallel-commit collision. No scope creep — first-instance wraps land on every surface the plan + CONTEXT.md called for.

## Issues Encountered

- **Pre-existing lint errors on the hydration-safe localStorage-read pattern** in `app-sidebar.tsx` (POL-02) and `partner-lists-sidebar-group.tsx`. Logged to `.planning/phases/44-vocabulary-lock-glossary/deferred-items.md` per SCOPE BOUNDARY rule. Verified pre-existing via `git stash && npx eslint ...` reproducing the same errors on unmodified files.
- **One pre-existing TypeScript error** in `tests/a11y/baseline-capture.spec.ts` (`Cannot find module 'axe-core'`) — out of scope; module not installed in this branch.
- **Cross-session resume** required the session-2 executor to verify session-1 disk artefacts (`src/lib/vocabulary.ts`, `src/components/ui/term.tsx`) before reading their APIs to wire Task 3 + 4 consumers. The atomic-commit-per-task discipline made this trivially safe.
- **Parallel-agent file-deletion race** during the session-2 pause (see Deviation 3) was self-correcting once detected: restoring config.ts was a single git operation.

## User Setup Required

None — no external service configuration required. `<Term>` popovers are pure-client UI; vocabulary registry is in-bundle.

## Next Phase Readiness

- **Plan 44-02 (List/View ADR + UI nesting)** — `<Term>` primitive is now available for the Views nesting work; `view` and `list` are defined in TERMS so the ADR + UI changes have a vocabulary base to reference. Sidebar already wraps both (`partner`, `list` in Partner Lists group; `view` in Views group), so 44-02's nesting changes can preserve the existing wraps.
- **Plan 44-03 (Partner-Product-RevenueModel scoping)** — Vocabulary substrate ready; new terms (`scorecard`, `target`, etc.) can be appended one-line to TERMS in v5.0 plans. Partner / Product / Batch first-instance wraps already in place — no need to re-wire when 44-03 introduces revenue_model as a third dimension.
- **Plan 44-04 (Vocabulary coverage sweep)** — Smoke-test exhaustiveness assertion (12-term checklist) is the guard for that plan's coverage work. Adding a term means: append to TERMS + append to checklist + add `<Term name="...">` at the new term's first surfaces.
- **Future v5.0 phases** — Adding scorecard/target/triangulation/reconciliation/divergence is a one-line append per term to the TERMS const, no schema change, no consumer code change. The `TermHeader` pattern in definitions.ts / root-columns.ts is the extension point for future first-instance table headers (e.g. "Curve" as a column header).

## Self-Check: PASSED

Verified post-completion:

**Files exist:**
- FOUND: docs/GLOSSARY.md
- FOUND: src/lib/vocabulary.ts
- FOUND: src/lib/vocabulary.smoke.ts
- FOUND: src/components/ui/term.tsx
- FOUND: src/lib/columns/config.ts (restored)
- FOUND: src/lib/columns/definitions.ts (modified)
- FOUND: src/lib/columns/root-columns.ts (modified)
- FOUND: src/lib/export/csv.ts (modified)

**Commits exist:**
- FOUND: 60eaa1f (Task 1)
- FOUND: 6f35808 (Task 2)
- FOUND: 1a12e99 (Task 3)
- FOUND: 326efbd (Task 4)

**Verification gates:**
- PASS: `npx tsc --noEmit` (only pre-existing axe-core error in tests/a11y/baseline-capture.spec.ts, out of scope per deferred-items.md)
- PASS: `node --experimental-strip-types src/lib/vocabulary.smoke.ts` ("✓ vocabulary smoke OK")
- PASS: `bash scripts/check-type-tokens.sh` ("✅ Type tokens enforced — no ad-hoc classes outside allowlist.")

---
*Phase: 44-vocabulary-lock-glossary*
*Completed: 2026-04-30*
