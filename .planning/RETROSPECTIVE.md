# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Within-Partner Comparison

**Shipped:** 2026-04-12
**Phases:** 5 | **Plans:** 9

### What Was Built
- Computation layer (`usePartnerStats`) composing KPI aggregates, metric norms, collection curves, and batch trending
- 6 KPI summary cards with polarity-aware trend arrows at partner drill-down
- Multi-line collection curve chart (Recharts) with recovery rate %, partner average, legend, lazy loading
- Conditional formatting with deviation-based green/red cell tinting via React Context
- Batch-over-batch trending arrows on 5 key metrics in the partner-level table

### What Worked
- Computation-first architecture: building `usePartnerStats` in Phase 10 meant Phases 11-14 were purely UI work consuming pre-computed data
- 4 independent phases (11-14) all depending only on Phase 10 — no serial bottleneck
- Research + plan + verify loop caught the camelCase-to-Snowflake-column-name mismatch before execution
- Immediate browser verification after each phase caught the `compute-kpis.ts` column name bug early

### What Was Inefficient
- Snowflake column names in plan docs didn't match actual data (`TOTAL_NUMBER_OF_ACCOUNTS` vs `TOTAL_ACCOUNTS`, `TOTAL_COLLECTED` vs `TOTAL_COLLECTED_LIFE_TIME`) — executor wrote code matching the plan, required post-execution fix
- `BATCH_AGE_IN_MONTHS` is actually days in Snowflake — the comment says so but the column name is misleading, caused confusion
- Phase 13/14 SUMMARY frontmatter didn't populate `requirements_completed` — caused audit to flag as partial

### Patterns Established
- `usePartnerStats` as composition hook pattern — single entry point, 4 pure computation modules
- React Context for norm distribution (PartnerNormsProvider) — avoids prop drilling through TanStack Table
- `CARD_SPECS` array pattern bridging camelCase keys to Snowflake column names for trend lookup
- Metric polarity system (`getPolarity()`) for context-aware trend coloring

### Key Lessons
1. Always verify Snowflake column names against actual API response data before planning — plan docs are unreliable source of truth for column names
2. Browser verification after each phase is essential — the column name bug would have been invisible without it
3. The audit 3-source cross-reference (VERIFICATION + SUMMARY + REQUIREMENTS) catches documentation gaps even when code is correct

### Cost Observations
- All 5 phases completed in a single day
- Research agents high-confidence on all phases (existing codebase well-documented)
- Single plan per phase for Phase 11 (compact scope) — appropriate, didn't need splitting

---

## Milestone: v4.0 — Design System & Daily-Driver UX

**Shipped:** 2026-04-24
**Phases:** 13 (25-37) | **Plans:** 105 | **LOC:** ~25,875 TypeScript | **Commits:** ~281

### What Was Built
- Full design token system (spacing / type / elevation / motion / surfaces) with CI-enforced 6-guard parity portfolio (check:tokens / surfaces / components / motion / polish / a11y)
- Component pattern library (StatCard, DataPanel, SectionHeader, ToolbarGroup, EmptyState) — legacy components deleted outright, every call site migrated in one atomic move per pattern
- Motion suite (drill cross-fade, chart expand/collapse, hover lifts, button scales, skeleton→content, sidebar lockstep) with global `prefers-reduced-motion` override
- Visual polish (gradient dividers, dark-mode glass highlights, focus glows, border opacity standard, row hover retune, thin scrollbars)
- WCAG AA accessibility baseline — axe-core + Playwright blocking CI gate, ARIA sweep, row-level Tab+Enter+Escape keyboard nav, contrast retune at token source
- URL-backed drill navigation (`?p=&b=` with browser back/forward, optional drill in saved views)
- Flexible chart builder (line/scatter/bar variants, axis pickers, chart presets, backward-compat view migration)
- Metabase SQL Import wizard (parser + mapper + Apply pipeline with 5-round human-verify defect closure)
- Unlisted `/tokens` reference page dogfooding every primitive across 8 live-specimen tabs

### What Worked
- **Foundation-before-features ordering** (v3.5 absorbed into v4.0): every feature phase after the design system inherited consistency automatically with zero retrofit
- **6-guard parity portfolio pattern**: each design phase landed with its own grep-based CI guard (modeled on check:tokens) — regressions blocked at `git push` rather than discovered on-screen weeks later
- **Pilot-then-sweep plans within phases**: Phase 26 KPI card / Header / Table row pilots before the Phase 27/28 sweeps let token decisions settle before mass migration
- **Early reduced-motion (A11Y-05 in Phase 30-01)**: shipping the global media query up-front prevented a Phase 33 retrofit across every animated surface
- **Atomic component-deletion plans**: Phase 29 deleted KpiCard / empty-state / filter-empty-state outright (no parallel-support window), forced migration completeness
- **/tokens page as regression detector**: adding a live specimen per phase produced an in-app visual audit board — dark-mode highlight drift and focus glow inconsistency both surfaced there before CI noticed

### What Was Inefficient
- **Phase 37 Metabase Import required 5 defect rounds through the human-verify gate** (dim-filter promotion, imported-view visibility, fixture integrity, toast-popover geometry, enum-aware parser) — the preview wizard surface was too fragmented to catch with pre-UAT smoke alone; each round cost a full plan re-entry
- **Phase 35 human-verify was partial** (Scenario A/B/D deferred) because browser-seeded localStorage was overwritten by the useSavedViews hydration-then-persist effect — no E2E harness forced the deferral, only late-caught by a 5/5 smoke retro
- **8 stale `[~]` partial markers on CHRT-02..10** persisted until milestone-audit caught them — SUMMARY frontmatter `requirements_completed: []` fields left ownership visible only in VERIFICATION.md, invisible to requirements traceability sync
- **Phase 28/29/30 SUMMARY frontmatter gaps** (multiple plans with empty `requirements_completed`) forced the milestone audit to cross-reference VERIFICATION.md files to reconstruct ownership — audit surfaced 11 stale `[ ]` DS-11..17 + NAV-01..04 boxes plus 8 stale `[~]` CHRT markers
- **Phase 36 CHRT-06/09/11/13 needed retroactive human-UAT closure** 2026-04-23 after the initial milestone audit flagged them `satisfied_needs_human_uat` — would have been cheaper to gate the human-verify inside the original plans

### Patterns Established
- **Grep-based CI parity portfolio**: `scripts/check-*.sh` + POSIX grep + npm run wiring, one per design category — repeatable template
- **Pattern-with-specimen**: every new pattern ships with a `/tokens` page live demo in the same PR; /tokens becomes the living design handbook
- **Pilot / Sweep / Enforce**: Wave 1 pilots ≤ 3 call sites, Wave 2 sweeps remaining call sites, Wave 3 deletes legacy + lands guard — used across Phases 27, 28, 29, 30, 31, 33
- **Atomic legacy deletion**: delete old primitives in the same commit that lands new ones — no parallel-support windows, no "migrate later" todos
- **Human-verify checkpoint plan per phase**: dedicated close-out plan (e.g., 30-05, 31-06, 33-05, 37-03) signs off the full phase end-to-end in the browser — catches surface regressions CI can't see
- **Audit-before-archive**: `/gsd:audit-milestone` ran before milestone completion surfaced 60/67 satisfied + 4 needing UAT + 11 stale checkboxes — must-have gate before `/gsd:complete-milestone`
- **Preset vs. generic dispatcher** (ChartPanel): lets presets ship identical-to-current output while generic renderer handles new chart types — backward compat without feature-flag complexity

### Key Lessons
1. **Design-first ordering is the biggest lever**: 7 design phases (25-31) paid for themselves in Phases 32-37, where every feature inherited surfaces/tokens/motion without retrofit — never ship features on an inconsistent base if tokens are ~2 phases away
2. **Grep guards beat code review for regression prevention**: cheap to write, impossible to bypass, catch drift across 100+ file touches — every design category should ship its guard with the pattern
3. **Human-verify gate must be inside the plan, not a cleanup step**: Phase 37's 5-round closure and Phase 35's deferred scenarios both stem from human-verify being optional or retroactive — make it a required plan in Wave N with veto power
4. **SUMMARY frontmatter `requirements_completed` is the audit's primary signal**: empty arrays force cross-referencing and obscure ownership; enforce population in the phase-executor workflow
5. **Partial-marker `[~]` rot is real**: CHRT-02..10 stayed `[~]` for 4 days after Phase 36 shipped because traceability sync wasn't part of the phase-close workflow — make it part of `/gsd:close-phase`
6. **/tokens page dogfooding is a superpower**: the design system's own reference page is the earliest surface where inconsistency becomes visible — keep it sacred, add a tab per phase
7. **Absorb deferred milestones early**: v3.5 absorbed into v4.0 before any v3.5 work started — catching the ordering mistake before execution saved a full migration cycle

### Cost Observations
- ~281 commits across 12 days (2026-04-12 → 2026-04-24)
- 13 phases / 105 plans / 67 requirements — ~15x scope vs v3.1 (8 plans) and ~6x vs v3.0 (9 plans), entire milestone at once vs previous incremental cuts
- Phase 37 Metabase Import burned 5 defect rounds × ~1 plan re-entry each on the human-verify gate — single largest phase-level cost overrun
- Milestone audit caught 11 stale `[ ]` checkboxes + 8 stale `[~]` markers + 4 human-UAT gaps — bookkeeping drift cost a half-day of retroactive sync 2026-04-23
- /tokens page grew to 8 tabs (Tokens / Typography / Surfaces / Components / Motion / Polish / Accessibility / aggregators) — added ~1 plan of specimen work per design phase, paid back 10x in regression catching

---

## Milestone: v4.5 — Correctness & Foundation

**Shipped:** 2026-05-02
**Phases:** 4 (41 / 42a / 43 / 44; 42b OAuth-deferred) | **Plans:** 15

### What Was Built

- Eight statistical-threshold ADRs with global no-partner-overrides convention + inline `// ADR:` callsite comments — every magic number in `src/lib/computation/` is now decision-recorded
- `docs/METRIC-AUDIT.md` (130-line living doc, 36 audit rows × 3 scopes) — every visible number now has a Snowflake-equivalence row; this is what v5.0 triangulation will read to know which metrics are app-vs-Snowflake equal
- 9 new `*.smoke.ts` regression scripts — three-way invariant pattern: direct math === pair summary === KPI card, asserted at root + `(partner, product)` scopes
- `BatchRow` / `AccountRow` typed substrate at the parser boundary — branded `BatchAgeMonths`, `number | null` for rate-shaped fields, long-format `CurvePoint[]` baked in. 8 compute files migrated; three duplicate `coerceAgeMonths` helpers collapsed to one
- `createVersionedStore<T>` persistence with `_meta: { schemaVersion, savedAt }` envelope, migration chain, verified writes (read-back-and-compare), cross-tab `storage` event sync. 5 modules wrapped at schemaVersion 1
- Snowflake reliability primitives — `executeWithReliability` with retry (1s/2s backoff, 3 attempts) + circuit breaker (5 fails / 60s degraded mode using stale React Query cache) + `Server-Timing` queue/execute split + `X-Request-Id` correlation + sanitized client errors. `<DegradedBanner>` and `(stale)` badge surface stale-data state
- `<ChartFrame>` primitive composing all four current charts (Curve / Trajectory / Matrix / Sparkline) with title / legend / tooltip / state union (ready / loading / fetching / empty / error) / stale-column chip / polarity context. `<StaleColumnWarning>` deleted (absorbed)
- Tuned caching (`revalidate=3600` + `unstable_cache(..., {tags:['batch-data']})`), `/api/revalidate` POST endpoint with shared-secret auth for ETL, `<RefreshButton>` with locked single client cache-bust path, ⌘R interceptor, ADR 009
- `TERMS` registry + `<Term>` popover primitive + `docs/GLOSSARY.md` — first-instance-per-surface vocabulary wraps on KPI cards / breadcrumbs / sidebar / table headers. 15 entries (12 existing + revenueModel/contingency/debtSale)
- ADR 0001 List-View hierarchy (View-contains-List explicit; rejects Workspace merge + List-demotion), ADR 0002 REVENUE_MODEL third-dimension scoping (38→42 sidebar rows; ZERO mixed-model batches in audit)
- REVENUE_MODEL surfaced as third unit-of-analysis dimension `(partner, product, revenue_model)` — 3-segment `pairKey` (legacy 2-segment still parsed), AttributeFilterBar 4th attribute, `?rm=` URL round-trip, breadcrumb suffix, Partner Setup read-only Revenue Model section, defensive `MixedRevenueModelChip` substrate
- SEC-04 forward threat model for v5.0 Phase 45 — 5 surfaces × 13 LOCK mitigations seeding the Phase 45 ADR backlog. Load-bearing for v5.0 architecture
- 9→0 dependency advisories via pnpm-workspace overrides; Dependabot security-only config; v5.5 DEBT major-upgrade backlog (TanStack v9, Vitest v4, ESLint v10, TypeScript v6) captured

### What Worked

- **Pre-staged milestone roadmap.** v4.5-ROADMAP.md was scoped tightly 2026-04-21 then expanded 2026-04-26 after the multi-lens audit — having the audit findings absorbed *before* execution started meant zero rework during the milestone (vs v4.0's 11 stale checkboxes / 8 stale markers caught at audit time)
- **Phase 42 split when conditions changed.** OAuth slipped — instead of letting Phase 42 block close, splitting it 2026-04-30 into 42a (load-bearing, do now) and 42b (OAuth-dependent, defer) preserved the SEC-04 deliverable that Phase 45 depends on while letting v4.5 close cleanly
- **Vitest installed surgically in Plan 41-02** rather than as a standalone v5.5 DEBT-09 prep task — every later phase that wanted unit-test coverage (BND-04 reliability tests, 11 cases) just used it. Single install, no separate "set up testing" plan
- **Three-way invariant smoke pattern.** `direct math === pair summary === KPI card` asserted at root + `(partner, product)` scopes — catches DCR-01 regressions structurally, not just by parity. 9 such smokes shipped
- **Living-document protocol** for the threat model and audit doc — strike-through over delete, dated update entries, ADRs are the formal record while the doc is running narrative. Phase 45+ extends in place rather than forking
- **REVENUE_MODEL ETL landed before Phase 44 scope creep** (2026-04-29; Phase 44 finished 2026-05-01). The 552-row dataset audit *during* planning surfaced ZERO mixed-model batches, which simplified the UI substrate (defensive chip but unexercised)

### What Was Inefficient

- **CLI clobber on archival.** `gsd-tools milestone complete` did a generic copy of `.planning/ROADMAP.md` → `milestones/v4.5-ROADMAP.md`, overwriting the carefully pre-staged milestone-specific roadmap. Required a git-recover + manual re-stamp. Cost ~10 min on close. Bake into a future GSD update: detect pre-existing milestone-specific archive and merge instead of overwrite
- **DCR-11 tracking-line drift.** Eight ADRs shipped under Plan 41-04 with inline callsite comments — but the requirement-line checkbox in `v4.5-REQUIREMENTS.md` stayed `[ ]` because the evidence was claimed against the plan rather than re-claimed against DCR-11 directly. Cosmetic but caught at close. Pattern: when a plan delivers requirement evidence under a different identifier (plan number) than the requirement ID, ALSO flip the requirement-line checkbox at close
- **Inline ROADMAP.md phase details linger after milestone close.** v4.1's Phase 38/39/40/40.1 details were still inline in main ROADMAP.md when v4.5 closed. The collapse-to-`<details>` pattern works but only if the previous milestone's close enforces it. Keep the convention strict: after milestone close, no inline phase details for shipped milestones
- **Phase 42b deferral creates a parallel tracking surface.** SEC-02/SEC-05 are now in PROJECT.md Active section AND in milestones/v4.5-REQUIREMENTS.md AND in `<details>` block in ROADMAP.md. When OAuth lands, three places need updating. Future deferred-phase splits should pick a single source of truth

### Patterns Established

- **Branded primitive types at the parser boundary.** `BatchAgeMonths = number & { __brand: 'months' }` — units are a type, not a comment. Three duplicate `coerceAgeMonths` collapsed because the type system enforced the canonical helper as the single producer
- **Per-column aggregation strategy declared on `ColumnDef`.** `meta.aggregation: 'sum' | 'avgWeighted' | 'none' | 'range'` + `meta.aggregationWeight` — adding a new column requires picking a strategy explicitly, can't accidentally re-break the seed bug pattern
- **Polarity context published via React.createContext + `useChartFramePolarity()`.** Chart bodies read direction-aware coloring without prop-threading; default `'neutral'` when called outside a ChartFrame
- **`MissingMigratorError` policy: dev throws / prod drops with `console.error`.** Loud failure when a developer forgets a migrator, recoverable failure in prod. Storage version conflicts can no longer silently corrupt state
- **`X-Request-Id` correlation header on every API response (success + error)** + `Server-Timing: queue;dur, execute;dur` split — request-level ops debugging tractable without server logs
- **First-instance-per-surface vocabulary wrap.** `<Term>` is applied once per surface (KPI section / breadcrumb trail / sidebar Views group / table header row), not on every occurrence. Definitions surface contextually without becoming visual noise
- **ADR comment shape: `// ADR: .planning/adr/NNN-kebab-name.md` directly above the constant or function.** Inline link from code to decision record — grep finds them all, IDE click-through works, decisions don't drift from the constants they govern

### Key Lessons

1. **Pre-stage the milestone roadmap before activation, not at activation.** v4.5-ROADMAP.md was drafted 2026-04-19 (placeholder), retooled 2026-04-21 (correctness + security scope), expanded 2026-04-26 (multi-lens audit absorbed), split 2026-04-30 (Phase 42 → 42a/42b). The roadmap surviving four edits before any execution started meant execution itself was almost rework-free
2. **A "load-bearing" deliverable inside a phase that's otherwise blocked is grounds for splitting the phase.** Phase 42 had ~70% OAuth-independent value (SEC-04 was the load-bearer for Phase 45). Splitting cost ~30 min of doc work and unblocked v4.5; not splitting would have either blocked v4.5 close or shipped v5.0 without the threat model
3. **The "degrades when deferred" lens scopes a milestone tightly.** v4.5 explicitly held only the work that *gets harder* if delayed past v5.0 — boundary hardening, vocabulary lock, correctness audit, security architecture. Behavioral QA, component decomposition, state consolidation, test pyramid inversion all *grow* in value with post-v5.0 observation, so they were deferred to v5.5. Milestone scope conversations are sharper when "would deferring this make it worse, or better?" is the framing question
4. **Living docs > one-shot reports.** `docs/METRIC-AUDIT.md`, `docs/POLARITY-AUDIT.md`, the SEC-04 threat model — all written as living documents with dated update entries and strike-through over delete. Phase 45+ will extend SEC-04 in place; the metric-audit doc will get new rows as v5.0 metrics land. One-shot reports get stale; living docs accumulate value
5. **Defensive substrate when audit shows zero current cases is still worth shipping.** REVENUE_MODEL audit found ZERO mixed-model batches today — but `MixedRevenueModelChip` + `isMixedRevenueModelBatch` ship anyway as defensive substrate. ETL anomalies in the future have a UI to land on. Cost: half a day. Cost of retrofitting later when an anomaly first surfaces in production: a panicked patch

### Cost Observations

- 64 commits across 5 days (2026-04-27 → 2026-05-01)
- 4 phases / 15 plans / 28 in-scope requirements (25 closed, 2 OAuth-deferred, 1 tracking-line pending) — tighter than v4.0 (105 plans / 67 reqs) by design; v4.5 is a hardening pass not a feature ship
- LOC delta +8,198 / −740 — most growth in `src/lib/data/` (typed substrate), `src/lib/persistence/` (versioned-storage), `src/lib/snowflake/` (reliability), `src/components/charts/chart-frame.tsx`. Removals concentrated in compute layer (duplicate `coerceAgeMonths` × 3 + bag-of-strings dispatchers)
- Vitest install + 11 reliability test cases + young-batch-censoring test = first unit tests in the codebase. v5.5 DEBT-09 expansion seed
- Phase 41 finished 2026-04-30, Phases 43 + 44 + 42a all finished within 2026-05-01 — the parallelization map (41 → 43, 42a/44 fully parallel) held up; closes overlapped by hours not days

---

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 | v3.0 | v3.1 | v4.0 | v4.1 | v4.5 |
|--------|------|------|------|------|------|------|------|
| Phases | 9 | 5 | 6 | 4 | 13 | 4 | 4 (+1 deferred) |
| Plans | 18 | 9 | 9 | 8 | 105 | 14 | 15 |
| LOC (total) | ~7,150 | ~9,400 | ~13,566 | ~13,566 | ~25,875 | ~32,887 (est) | ~41,085 |
| LOC added | ~7,150 | ~2,344 | ~4,166 | ~0 (refactor) | ~12,309 | ~7,012 (est) | ~7,458 |
| Requirements | 13 | 29 | 28 | — | 67 | 35 | 28 (25 closed / 2 deferred / 1 tracking-line) |
| Timeline | ~1 day | ~1 day | ~3 days | ~1 day | ~12 days | ~3 days | ~5 days |
| Commits | 120 | — | — | — | ~281 | — | 64 |

### Durable Takeaways
- **Design foundation phases compound**: v4.0's 7 design phases (25-31) saved retrofit cost across Phases 32-37 and set the baseline for every future milestone — v4.1 + v4.5 inherit all of it at zero cost
- **Grep-based CI guards scale better than code review**: the 6-guard parity portfolio (tokens / surfaces / components / motion / polish / a11y) is self-enforcing and survives LLM hand-off
- **Human-verify gate position matters**: when it's retroactive it costs N rework rounds (Phase 37); when it's inside the plan it catches issues in one pass (Phase 31, 33)
- **Audit-before-archive is non-negotiable**: `/gsd:audit-milestone` before `/gsd:complete-milestone` surfaced 19+ bookkeeping gaps in v4.0; skipped at v4.5 close (no audit file existed) — added as a v5.0 close prerequisite
- **`(partner, product)` as unit of analysis** is the load-bearing concept for v4.1+ (PCFG-01..07); v4.5 extended this to `(partner, product, revenue_model)` per ADR 0002
- **Pre-stage milestone roadmaps and let them survive multiple revision rounds before activation** (v4.5 pattern). The roadmap surviving four edits before any execution started meant execution itself was almost rework-free
- **The "degrades when deferred" lens scopes a milestone tightly** (v4.5 pattern). "Would deferring this make it worse, or better?" — work that gets *worse* with delay belongs in the current milestone; work that gets *better* with observation belongs after the next ship
- **Living docs (`docs/METRIC-AUDIT.md`, `docs/POLARITY-AUDIT.md`, SEC-04 threat model) accumulate value across milestones** — strike-through over delete, dated update entries, ADRs as the formal record. One-shot reports go stale
- **Inline ADR comments (`// ADR: .planning/adr/NNN-...md`) prevent decisions from drifting from the constants they govern** — grep finds them all, decisions live next to code

---
*Updated: 2026-05-02 — v4.5 appended (Correctness & Foundation: 4 phases, 15 plans, 25/28 requirements, +8,198 LOC, 5 days)*
