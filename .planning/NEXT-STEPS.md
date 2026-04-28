# Next Steps — Post Multi-Lens Audit (2026-04-26)

A living document. Captures: what just shipped, what's next, what's deferred, and what expert reviews remain pending. Read this before starting work to ground the next move.

## What just happened

A multi-lens audit ran across the codebase in late April 2026:

1. **Software-engineering critique** (component size, state management, testing pyramid)
2. **Design-thinking critique** (information architecture, conceptual model, affordance discovery)
3. **Structural / systems critique** (data structures, internal representation, reliability primitives)
4. **Data correctness critique** (statistical defensibility, perceptual encoding, censoring)

Findings were synthesized against the existing roadmap. Most fold into **expanded scope** for already-planned phases (v4.5 Phase 41 Data Correctness, v5.5 Phase 51 Tech Debt Sweep). Two new phases were created from reserved slack slots: **Phase 43 Boundary Hardening** and **Phase 44 Vocabulary Lock**.

Three quick correctness fixes were shipped immediately as **Wave 0** (2026-04-26):
- `MIN_GROUPS = 2` gate on anomaly detection (was `MIN_FLAGS = 2`, double-counted correlated metrics)
- Comparison matrix defaults to bar mode (length/position beats hue for quantitative comparison)
- KPI suppression when 3mo denominator < `MIN_PLACED_DENOMINATOR_DOLLARS = $100K`

Wave 0 changes touch: `compute-anomalies.ts`, `comparison-matrix.tsx`, `compute-kpis.ts`, `kpi-summary-cards.tsx`, `partner-stats.ts` types. Typecheck passes, all 7 smoke tests pass. **Not yet committed** — staged in working directory.

## Recommended start sequence

### Right now (~½ day)
- **Commit Wave 0** as a single `fix(data): wave-0 correctness fixes (MIN_GROUPS, matrix bar default, KPI denominator floor)` commit, OR three smaller commits if you prefer the granularity. Browser-verify the matrix-bar default and the insufficient-data caption before committing if you want extra confidence.

### Next phase to start (Phase 41)
- `/gsd:plan-phase 41` — scaffold the Data Correctness Audit phase. Scope is the expanded version: original DCR-01..06 plus the data-review additions DCR-07..11 (young-batch censoring fix, NULL semantics, polarity audit, runtime invariant, threshold ADRs). 3-4 plans recommended.
- Note: DCR-08 (NULL semantics) is co-implemented with BND-01 (canonical row representation) in Phase 43. Plan 41-c can be a "joint plan" if you want, or hand off DCR-08's parser-level work to Phase 43 entirely. Decide during planning.

### Parallelizable with Phase 41
- **Phase 44 (Vocabulary Lock)** is independent and small (1-2 days for VOC-01..04). Could be a "weekend pass" while Phase 41 is in active execution. `/gsd:plan-phase 44`.
- **VOC-05/06/07 (REVENUE_MODEL surfacing) is blocked on upstream ETL** — column being added to `agg_batch_performance_summary` (~2026-05-03 estimate). Once it lands, ~half a day of app work: extend `ALLOWED_COLUMNS`, mirror `ACCOUNT_TYPE_VALUES` for the new enum, expose in PartnerListFilters, surface in sidebar/breadcrumb. Default scoping: REVENUE_MODEL joins as a third dimension of the canonical unit-of-analysis (`(partner, account_type, revenue_model)`); ADR before implementation if multi-model partner row counts get noisy. Lift the gate once the column is queryable.

### Sequenced after Phase 41
- **Phase 43 (Boundary Hardening)** depends on the DCR-08 NULL semantics decision from Phase 41. Run `/gsd:plan-phase 43` once Phase 41 is closed (or once DCR-08's plan ships, depending on your preferred granularity).

### Gated on infrastructure
- **Phase 42 (Security Review)** waits until OAuth lands on Vercel and the deployed surface is real. The audit value is much higher when it can examine the actual deployment context, not the localhost-only state.

### After v4.5 closes
- **v5.0** begins (Phases 45-49: Scorecard Ingestion → Contractual Targets → Triangulation Views → Reconciliation → Dynamic Curve Re-Projection). This is where the actual differentiated business value lives.

## Deferred to later milestones

### v5.5 Phase 50 (post-v5.0)
- Behavioral QA from observed usage
- In-situ research infrastructure (IUR-01..03) — **but build the telemetry + confusion button into v5.0 as it ships, not after**

### v5.5 Phase 51 (post-v5.0)
- Decompose `data-display.tsx` (1458 lines → section components, max <300 lines each)
- State consolidation (5 Contexts + 38 useStates → single Zustand store)
- Test pyramid inversion (Vitest + property-based tests, ≥95% coverage on lib/computation)
- Performance budget enforced in CI (bundle-analyzer, Lighthouse CI)

These are explicitly deferred because they benefit from v5.0 revealing the right seams. Premature decomposition creates abstractions v5.0 then has to rework.

### v6.0 (later)
- First-run onboarding tour
- `?` overlay (press `?` anywhere to surface domain-term definitions on the canvas)
- Filter rail on canvas (replace popover) — depends on v5.0's filter dimensions
- Sidebar IA reorganization (Workspaces / Partners / Tools)
- Mobile/responsive policy ("consult" layout for read-only KPI summary)
- Motion palette deployment (currently plumbed but unused; use deliberately for drill, anomaly badge, KPI value tweens)

## Pending expert reviews

Reviews that *haven't* been run and would surface different findings than the four already done:

| Review | When to run | Why |
|--------|-------------|-----|
| Pure visual design (color, type pairing, spacing rhythm, dark mode tonal balance) | After v5.0 ships | Surface needs to be feature-complete before polish-pass critique is meaningful |
| Performance specialist profile (TTI, memory, bundle composition, hydration cost) | After v5.0 ships | Calibrates DEBT-10 budget numbers against the realistic cargo size |
| Production / SRE readiness (observability, alerting, cost monitoring, backup/DR, runbooks) | Before scaling beyond partnerships team | Currently localhost-only; revisit when OAuth lands and Vercel deploy is real |
| Accessibility specialist deep-dive (NVDA/VoiceOver walkthroughs, contrast, focus management, WCAG 2.2 AA) | After v5.0 design settles | axe-core CI is the floor not the ceiling; needs human testing on real screen readers |
| Security review — full external (pen-test, AI-query fuzzing, contract review) | Before any external-user access ships | Phase 42 covers existing surface + threat model; full external review is a separate engagement |
| Content strategy / microcopy review (button labels, error messages, AI prose, notification copy) | Could fold into Phase 44 or stand alone | Defer unless ambiguity surfaces during v5.0 build |

## Gaps deliberately left for later

These are known issues we're intentionally not fixing now:

- **Account-level architecture has an N+1 ceiling for cross-partner queries.** `useAccountData(partner, batch)` fetches one partner-batch combination at a time. v6.0 NLQ enhancements may surface a need for batched cross-partner account fetching; address then if it bites.
- **Static cache parity with live Snowflake is manually validated, not automated.** Two universes of truth exist. Acceptable while Snowflake credentials remain optional; revisit when offline mode is taken seriously.
- **Saved views still subtly lossy on schema change** (partial fix in BND-03 with versioned envelope; full automatic-repair UX is v6.0).
- **The chart kit lands as a primitive in BND-05.** Full chart-grammar redesign (encoding choices, default chart type per shape, axis defaults) is a v6.0 design pass.
- **Smoke tests still live in the source tree** under `src/lib/**/*.smoke.ts`. Moved into `tests/` and converted to Vitest as part of DEBT-09 in v5.5.
- **Lint baseline has 932 errors / 21,033 warnings** — most are accumulated from auto-rule additions and pre-existing patterns. Triage as part of DEBT-05 in v5.5; not blocking.

## Open data dependencies

| Dependency | Owner | Expected | Blocks |
|------------|-------|----------|--------|
| `REVENUE_MODEL` column on `agg_batch_performance_summary` | Upstream ETL | ~2026-05-03 | VOC-05/06/07 (Phase 44) — REVENUE_MODEL surfacing as product dimension |
| OAuth on Vercel (real deployment surface) | Infra / Vercel auth | TBD | Phase 42 (Security Review) — full audit value depends on the deployed surface being real |

## Files updated in this round

- `.planning/milestones/v4.5-REQUIREMENTS.md` — DCR expansion + new BND-01..06 + new VOC-01..04 + deferred-to-v5.5 + pending-reviews sections
- `.planning/milestones/v4.5-ROADMAP.md` — Phase 41 expanded scope + new Phase 43 + new Phase 44 + updated parallelization map and key decisions
- `.planning/milestones/v5.5-REQUIREMENTS.md` — IUR-01..03 added to Phase 50 + DEBT-07..10 added to Phase 51
- `.planning/milestones/v5.5-ROADMAP.md` — Phase 50 + Phase 51 expanded scope, effort bumped
- `.planning/ROADMAP.md` — milestone summaries updated, progress table reflects new phases and Wave 0
- `.planning/MILESTONES.md` — v4.5 + v5.5 descriptions and key-decision lists updated
- `.planning/NEXT-STEPS.md` — this document (new)

## Source of truth for prioritization

The merged sequence and rationale lives in this conversation. Key framing principle that survives forward:

**Categorize every piece of work as one of:**
- **(a) Ships user value** → v5.0 phases. Don't delay.
- **(b) Load-bears the next milestone** → v4.5 phases (correctness, security, boundary hardening, vocabulary lock). Do before v5.0.
- **(c) Pays back debt informed by use** → v5.5 phases. Don't do early; let v5.0 reveal where to cut.

The work that *feels* most urgent (component decomposition, state consolidation) is mostly (c). The work that's actually most urgent for shipping (a) is the v5.0 phases. The new universe of critique created in late April 2026 mostly belongs in (b) — narrow — and (c) — informed by use.

---

_Created: 2026-04-26 — Captures the merged plan after multi-lens audit. Update as phases complete and as new reviews surface findings._
