---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Design System & Daily-Driver UX
status: in_progress
last_updated: "2026-04-16T22:30:00.000Z"
progress:
  total_phases: 28
  completed_phases: 25
  total_plans: 50
  completed_plans: 49
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** Phase 25 — Code Health & Bug Fixes

## Current Position

Phase: 32 (URL-Backed Navigation — in progress)
Plan: 32-02 (awaiting human-verify checkpoint)
Status: Tasks 1-3 of 32-02 shipped (commits e078f4d, ce0345e, a8ce5b8). Awaiting user approval on Task 4 checkpoint (9 end-to-end scenarios: drill checkbox visibility, save with/without drill, load drilled/non-drilled views, back button, legacy views).
Last activity: 2026-04-17 — Shipped 32-02 Tasks 1-3: optional drill field in ViewSnapshot/zod schema + 'Include drill state' checkbox in SaveViewPopover + router.push drill URL in handleLoadView + canIncludeDrill threaded data-display→DataTable→UnifiedToolbar→SaveViewPopover. TSC clean, pre-existing lint warnings logged to deferred-items.md.

Progress: [█████░░░░░] 33% (v4.0: Phase 25 shipped, Phase 32-01 shipped; 11 phases + 1 plan remaining)

## Shipped Milestones

| Milestone | Phases | Plans | Shipped |
|-----------|--------|-------|---------|
| v1.0 MVP | 1-9 | 18 | 2026-04-12 |
| v2.0 Within-Partner Comparison | 10-14 | 9 | 2026-04-12 |
| v3.0 Intelligence & Cross-Partner Comparison | 15-20 | 9 | 2026-04-14 |
| v3.1 Stabilization & Code Quality | 21-24 | 8 | 2026-04-14 |

## Accumulated Context

### Decisions

- [v4.0]: v3.5 absorbed into v4.0 — no work started on v3.5, design foundation should come before features
- [v4.0]: Order is code health -> design tokens -> surfaces -> component patterns -> micro-interactions -> polish -> then features
- [v4.0]: URL-backed navigation runs as independent track (Phase 32), not blocked by design work
- [v4.0]: Chart Renderer and Builder merged into single phase (Phase 36) for tighter feedback loop
- [v4.0]: Accessibility audit placed after visual polish (Phase 33) to audit the final state
- [v4.0]: Phase 25 Partner Lists discussion context preserved, moved to Phase 34
- [v3.5 carried]: Partner Lists added as foundational filtering primitive that charts build on
- [v3.5 carried]: MBQL import deferred to v4.5+ — underdocumented format, SQL import first
- [v3.5 carried]: Chart builder operates on client-side dataset only — no new API routes
- [v3.5 carried]: CollectionCurveChart kept intact as preset — 300+ lines of domain logic preserved
- [Phase 25]: Removed _metric parameter entirely; Next.js ESLint config does not honor underscore-prefix convention for unused params
- [Phase 25]: Research doc had incorrect symbol locations for KpiAggregates/TableState/Updater; fixed at actual file locations per baseline lint
- [Phase 25 Plan D]: Scoped KI-12 opt-out to a single eslint-disable-next-line rather than function-level 'use no memo' — preserves Compiler optimization of other memos in useDataTable (columnPinning, meta)
- [Phase 25 Plan D]: KI-14 site 3 (setActivePresetRef) uses useEffect assignment over useEffectEvent — simpler, safe because consumers only fire from post-commit user handlers; click-verified in the browser
- [Phase 25 Plan D]: KI-13 sites 2/3 (localStorage hydration) and KI-14 sites 1/2 (TanStack v8 workaround) are intentional patterns with inline justification comments; not fixed until upstream migration
- [Phase 25-02]: Used react-error-boundary v6 (not hand-rolled) — ~1KB, ships resetKeys + FallbackComponent matching locked UX contract
- [Phase 25-02]: Per-section granularity locked (chart + table each wrapped); NOT per-card, NOT app-wide
- [Phase 25-02]: resetKeys={[data]} — stable TanStack Query reference, auto-resets on new query result without coupling to refetch
- [Phase 25-02]: Generic fallback copy "This section couldn't load." works for both mount sites; no per-section prop added
- [Phase 25]: [Phase 25 Plan C]: filter-before-aggregate via filteredRawData memo in data-display.tsx — upstream of buildPartnerSummaryRows; threaded through 6 consumers (+1 beyond plan's 5: QueryCommandDialogWithContext); sidebar intentionally kept on data.data for navigation integrity
- [Phase 25]: [Phase 25 Plan C]: Task 1 checkpoint auto-decision: option-b (visual-only, no test runner install) — honors CONTEXT.md locked 'don't absorb test-infra setup' boundary; plan itself flagged option-a as contradicting this
- [Phase 25 Plan C scope extension]: Relaxed trajectory-chart `rankedPartners.length < 2` guard to `=== 0` and suppressed best-in-class overlay when only 1 partner — single-partner filter now renders chart with one line + portfolio avg (commit d9aa14b). Pre-existing UX gap caught during KI-07 verification.
- [Phase 32-01]: Drill param names are `p` and `b` (not `partner`/`batch`) — distinct from FILTER_PARAMS in use-filter-state.ts to avoid URL slot collision. Rationale documented in use-drill-down.ts JSDoc.
- [Phase 32-01]: `router.push` with `{ scroll: false }` (NOT `router.replace`) for all drill transitions — each drill creates a history entry so browser back pops exactly one level (NAV-02 contract).
- [Phase 32-01]: Stale deep-links handled by validation effect in data-display.tsx — sonner toast + `navigateToLevel` step-up (partner-missing → root, batch-missing → partner). Non-destructive, no error page.
- [Phase 32-01]: Filter params (?partner=X) and drill params (?p=X) are intentionally orthogonal URL axes — coexist by design when user filters to a partner AND drills into that same partner. Removing either would break Phase 25 filter-before-aggregate contract.
- [Phase 32-01]: Next.js 16.2.0-16.2.2 useSearchParams stale-params regression did NOT surface — project is on 16.2.3, past the regression window.
- [Phase 32-01]: `use-filter-state.ts` left untouched — Phase 25 regression guard honored. Verified via git diff 61e239c..0d21652.
- [Phase 32-01]: Public-API-first rewrite — all 13 existing useDrillDown consumers required zero edits. Pattern: preserve exported types and function shapes when swapping hook internals.

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- ANTHROPIC_API_KEY needs to be provisioned in Vercel env vars
- Visual UAT of remaining 25-03 scenarios (ACCOUNT_TYPE filter proves upstream-of-aggregate, drilldown cascade preserves root filter, zero-match FilterEmptyState + Clear filter click) — primary scenario (single-partner filter) verified this session and surfaced the trajectory-chart <2 partners guard (fixed in d9aa14b)
- [UX — future phase] Drilled-in view should surface per-batch KPI cards prominently at top (summary stats for the selected batch when drilled into partner/batch levels). Parallels the root-level KPI cards and would make the drill experience feel symmetrical. Candidate for Phase 28 (surfaces) or a dedicated polish phase.

### Blockers/Concerns

- Dual Y-axis interaction with shadcn ChartContainer unverified (flag for Phase 36)

## Session Continuity

Last session: 2026-04-16
Stopped at: Completed 32-01-PLAN.md (NAV-01, NAV-02, NAV-03 closed — URL-backed drill hook + stale-param toast shipped, user approved all 8 human-verify scenarios)
Resume with: `/gsd:execute-phase 32` to continue with Plan 32-02 (URL persistence follow-up / breadcrumb / saved-view wiring on top of the URL-backed drill foundation)
