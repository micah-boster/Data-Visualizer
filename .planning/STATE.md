---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Design System & Daily-Driver UX
status: in_progress
last_updated: "2026-04-17T13:00:00.000Z"
progress:
  total_phases: 28
  completed_phases: 26
  total_plans: 53
  completed_plans: 54
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** Phase 25 — Code Health & Bug Fixes

## Current Position

Phase: 26 (Design Tokens — COMPLETE, awaiting /gsd:verify-work 26) / 32 (URL-Backed Navigation — in progress, parallel track)
Plan: Phase 26 fully shipped (5/5). Next up: Phase 27 (Typography & Hierarchy) and Phase 28 (Surfaces & Elevation) can run in parallel. / 32-02 still awaiting human-verify on Task 4.
Status: 26-05 SHIPPED — Unlisted /tokens reference page (robots.noindex, no nav link) with 5-tab browser (Spacing / Typography / Surfaces & Shadows / Motion / Colors) via @base-ui/react/tabs. Reusable TokenCard primitive with live example + CSS var + Tailwind class + copy-to-clipboard (Copy↔Check icon swap, sonner toast). Every Phase 26 token category covered with live demos (12+5 spacing, 6+3 type, 5 surfaces, 4 shadows, 3 radii, 9 motion combos, accent+state+neutrals+chart+interaction colors). Page's own chrome uses only tokens (dogfooding). User approved light + dark visual verification in own browser. Phase 26 now 5/5 plans complete — all DS-01..DS-06 requirements fully credited across foundation + 3 pilots + reference page. 32-02 Task 4 still paused on parallel track.
Last activity: 2026-04-17 — Shipped 26-05 Task 1 (2c3b05e /tokens route + TokenBrowser shell + TokenCard primitive) and Task 2 (e949294 fill all tab bodies with live demos); human-verify checkpoint approved. Phase 26 complete.

Progress: [██████░░░░] 42% (v4.0: Phase 25 + Phase 26 shipped, Phase 32-01 shipped; 11 remaining phases + remaining plans)

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
- [Phase 26-01]: Tailwind v4 namespace-driven naming locked in — `--spacing-*` (not `--space-*`) and `--ease-*` (not `--easing-*`) so utilities auto-emit. Semantic aliases reference numeric primitives. Rationale comment block placed inline in globals.css.
- [Phase 26-01]: Dark-mode surface-raised (0.22) > surface-base (0.16) > surface-inset (0.12) — intentional inversion of shadcn's raised-is-darker convention per CONTEXT lock. Light mode keeps conventional raised-is-lighter.
- [Phase 26-01]: shadcn vars re-mapped in place (background/card/popover/primary/border/ring/sidebar/chart-1..8) inside both :root and .dark blocks — zero consumer edits required, preserves the contract with every existing ui/ component.
- [Phase 26-01]: Font variable retarget via `@theme inline` (`--font-sans: var(--font-inter)`, `--font-mono: var(--font-jetbrains-mono)`) means downstream font-sans/font-mono utilities automatically pick up Inter + JetBrains Mono — future font swaps also need zero consumer edits.
- [Phase 26-01]: Preview screenshots unavailable in headless runner (Snowflake auth timeouts). User verified in own browser and approved — matches standing preference to verify CSS visually before pushing. No code impact.
- [Phase 26-01]: `--radius: 0.625rem` kept as legacy alias alongside new `--radius-sm/md/lg` — shadcn primitives reference `var(--radius)`, removing would regress.
- [Phase 26-02]: Added text-display-numeric (sans family) alongside text-body-numeric / text-label-numeric (mono family) — KPI values need large display-tier type but still benefit from tabular-nums + lining-nums for vertical digit alignment across stacked cards. Three numeric variants rather than two.
- [Phase 26-02]: Trend delta colors migrated from Tailwind emerald/red palette to semantic text-success-fg / text-error-fg tokens — aligns with state-color token system shipped in 26-01, removes duplicate light/dark class lists. [Rule 2 - Missing Critical deviation] strengthens pilot coverage.
- [Phase 26-02]: Preview screenshots unavailable (Snowflake auth timeouts, recurring Phase 26 constraint). User verified light + dark in own browser per standing preference. No code impact.
- [Phase 26-02]: kpi-card.tsx consumes semantic tokens only (surface-raised, shadow-sm, text-success-fg, text-error-fg) — never raw brand/accent vars — so post-plan brand palette swap (accent-warm → brand-green, commit d2f0a16) passed through transparently. Future pilots should preserve this discipline.
- [Phase 26-03]: Dropped border-b in favor of shadow-xs alone on the header — visual verification in both modes confirmed the subtle multi-layer shadow carries the "chrome floats above content" hierarchy without the hard border line. Foreshadows DS-11 (Phase 28) and establishes the shadow-for-separation > border-for-separation precedent where hierarchy is the goal.
- [Phase 26-03]: Removed backdrop-blur-sm from the header — Phase 26 surface-raised is an opaque token by design. Blur-glass aesthetic, if desired, should be reintroduced in Phase 28 as a translucent surface variant rather than hand-rolled blur classes.
- [Phase 26-03]: Amber stale-state colors left unmigrated in header.tsx — state-color migration is cross-cutting work owned by a later dedicated phase. Scoping pilots to surface/shadow/spacing/type (and deferring state colors) keeps pilot boundaries clean.
- [Phase 26-03]: header.tsx has no title/heading text element — only a freshness indicator (text-xs → text-caption) and a theme toggle. Plan anticipated both title-exists and no-title outcomes; neither counted as a deviation.
- [Phase 26-03]: Persistent-chrome token recipe established: bg-surface-raised + shadow-xs + px-page-gutter + gap-inline/gap-stack. Distinct from the card recipe (26-02: shadow-sm + border + p-card-padding + rounded-lg). Reusable for toolbars, app-bottom bars, and any sticky chrome.
- [Phase 26-04]: Density variant pattern proven — [data-density="dense"|"sparse"] attribute on the wrapper + globals.css @layer base selector block assigning --row-height / --row-padding-y / --row-padding-x → consumers use arbitrary Tailwind h-[var(--row-height)] / px-[var(--row-padding-x)] / py-[var(--row-padding-y)]. Scope-local (not body/html), composable, Pattern 3 from 26-RESEARCH. Replicable for list/grid/panel components with density modes.
- [Phase 26-04]: Background-owner for scroll containers lives on the outer scroll wrapper (data-table.tsx), not on <tbody>. Keeps header + body + footer visually unified under surface-inset and provides a single cascade root for data-density. Resolves Task 1 Pre-step Blocker 4.
- [Phase 26-04]: TanStack Virtual estimateSize hardcoded to 32 (dense default) with inline comment flagging that sparse visual wiring requires dynamic estimateSize via data-density prop — deferred until a density-toggle UI phase. Deliberate deferral matches plan's own project_constraints.
- [Phase 26-04]: Numeric vs text cell typography split at render time — text-body-numeric (JetBrains Mono + tabular-nums + lining-nums) for number columns, text-body (Inter) for text columns. Digits align vertically across rows. Proves DS-02 on the highest-data-density surface in the app.
- [Phase 26-04]: Third pilot in a row consuming semantic tokens only (surface-inset, density, text-body, text-body-numeric, hover-bg, duration-quick, ease-default) — never brand or chart tokens. Post-plan brand palette swap (d2f0a16) passed through transparently. Semantic-token discipline is working; future pilots should preserve it.
- [Phase 26-05]: No shadcn Tabs wrapper in repo — `@base-ui/react/tabs` used directly for /tokens. This is now the canonical tabs import path in this codebase until a wrapper is added. Future plans that need tabs should use @base-ui directly or add a ui/tabs.tsx shadcn wrapper first.
- [Phase 26-05]: Tailwind v4 content scanner cannot see template-literal classes (e.g. `bg-neutral-${n}`, `bg-chart-${i}`). Dynamic swatches switched to inline `style={{ backgroundColor: 'var(--X)' }}` during execution. Documented workaround for any future token demo / palette surface computing colors at render time.
- [Phase 26-05]: /tokens dogfoods the token system — page's own chrome uses only tokens (bg-surface-base, p-card-padding, gap-section, text-display, shadow-xs). Serves as both live documentation AND a self-verification surface: if /tokens renders correctly in both modes, the token system is provably complete. Unlisted (robots.noindex, no nav link) — bookmarkable direct URL only.
- [Phase 26-05]: Unlisted reference-page pattern established — metadata.robots = { index: false, follow: false } + deliberate no-nav-link. Reusable for future internal dev surfaces (e.g., /components, /playground, /debug).

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- ANTHROPIC_API_KEY needs to be provisioned in Vercel env vars
- Visual UAT of remaining 25-03 scenarios (ACCOUNT_TYPE filter proves upstream-of-aggregate, drilldown cascade preserves root filter, zero-match FilterEmptyState + Clear filter click) — primary scenario (single-partner filter) verified this session and surfaced the trajectory-chart <2 partners guard (fixed in d9aa14b)
- [UX — future phase] Drilled-in view should surface per-batch KPI cards prominently at top (summary stats for the selected batch when drilled into partner/batch levels). Parallels the root-level KPI cards and would make the drill experience feel symmetrical. Candidate for Phase 28 (surfaces) or a dedicated polish phase.

### Blockers/Concerns

- Dual Y-axis interaction with shadcn ChartContainer unverified (flag for Phase 36)

## Session Continuity

Last session: 2026-04-17
Stopped at: Completed 26-05-PLAN.md — Phase 26 Design Tokens is now fully shipped (5/5 plans). Unlisted /tokens reference page live at localhost:3000/tokens with 5-tab browser covering every Phase 26 token category, TokenCard + copy-to-clipboard, user-verified in both modes. All DS-01..DS-06 requirements fully credited. 32-02 still paused at Task 4 checkpoint (independent parallel track).
Resume with: `/gsd:verify-work 26` to verify Phase 26 before transition, then `/gsd:plan-phase 27` (Typography & Hierarchy) and/or `/gsd:plan-phase 28` (Surfaces & Elevation) — both can run in parallel. Alternatively, `/gsd:execute-phase 32` to resume the parallel URL-navigation track with 32-02 Task 4.
