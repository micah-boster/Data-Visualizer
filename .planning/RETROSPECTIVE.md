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

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 | v3.0 | v3.1 | v4.0 |
|--------|------|------|------|------|------|
| Phases | 9 | 5 | 6 | 4 | 13 |
| Plans | 18 | 9 | 9 | 8 | 105 |
| LOC (total) | ~7,150 | ~9,400 | ~13,566 | ~13,566 | ~25,875 |
| LOC added | ~7,150 | ~2,344 | ~4,166 | ~0 (refactor) | ~12,309 |
| Requirements | 13 | 29 | 28 | — | 67 |
| Timeline | ~1 day | ~1 day | ~3 days | ~1 day | ~12 days |
| Commits | 120 | — | — | — | ~281 |

### Durable Takeaways
- **Design foundation phases compound**: v4.0's 7 design phases (25-31) saved retrofit cost across Phases 32-37 and set the baseline for every future milestone — v4.1 inherits all of it at zero cost
- **Grep-based CI guards scale better than code review**: the 6-guard parity portfolio (tokens / surfaces / components / motion / polish / a11y) is self-enforcing and survives LLM hand-off
- **Human-verify gate position matters**: when it's retroactive it costs N rework rounds (Phase 37); when it's inside the plan it catches issues in one pass (Phase 31, 33)
- **Audit-before-archive is non-negotiable**: `/gsd:audit-milestone` before `/gsd:complete-milestone` surfaced 19+ bookkeeping gaps in v4.0 — bake this into every milestone close
- **`(partner, product)` as unit of analysis** is the load-bearing concept for v4.1+ (PCFG-01..07): v4.0 shipped with the cross-product blending ambiguity still present — addressed in v4.1 Phase 39

---
*Updated: 2026-04-23 — v4.0 appended*
