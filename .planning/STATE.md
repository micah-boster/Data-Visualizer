---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Design System & Daily-Driver UX
status: unknown
last_updated: "2026-04-18T13:05:24.381Z"
progress:
  total_phases: 33
  completed_phases: 29
  total_plans: 75
  completed_plans: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16)

**Core value:** Surface abnormal account and batch performance data so the partnerships team can focus energy where it matters most — before problems compound.
**Current focus:** Phase 30 — Micro-Interactions & Motion

## Current Position

Phase: 30 (Micro-Interactions & Motion — ready to plan)
Plan: Not started — Phase 30 ready to plan. CONTEXT.md exists at .planning/phases/30-micro-interactions-and-motion/30-CONTEXT.md; context already gathered during discuss-phase, can go directly to `/gsd:plan-phase 30`.
Status: Ready to plan. Phase 29 closed 2026-04-18 with 5/5 plans shipped + 14/14 verification truths passed + DS-18..22 all mechanically CI-guarded via `npm run check:components`. Auto-advance chain continues into Phase 30.
Last activity: 2026-04-18 — Completed Phase 29 Component Patterns (Wave 1: 29-01..04 parallel; Wave 2: 29-05 inline after executor rate-limit). Verification passed. `phase complete` ran: roadmap_updated + state_updated. Transition proceeding to Phase 30 planning under --auto.

Progress: [████████████████████] 74/75 plans (99% — v1.0 milestone)

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
- [Phase 32-02]: Additive zod .optional() schema evolution pattern — ViewSnapshot.drill?: { partner?, batch? } landed with zero localStorage migration. Legacy pre-Plan-02 saved views loaded with no zod errors (scenario 8 verified). Reusable pattern: any future ViewSnapshot extension should use the same .optional() approach to preserve user-stored data across schema changes.
- [Phase 32-02]: Two-API URL update in a single handler proven safe — window.history.replaceState (filters, non-history-worthy) and router.push (drill, history-worthy) coexist in handleLoadView without interfering. Order: filters first, drill second, so the new history entry captures the replaced filter URL as its Back destination. Precedent for any future handler that needs to mutate both axes simultaneously.
- [Phase 32-02]: canIncludeDrill threading required an extra prop layer through DataTable — data-display renders DataTable (not UnifiedToolbar directly), so DataTable's props had to be widened to pass canIncludeDrill + options-bag onSave/onReplace signatures through. Plan's <output> section anticipated only 5 modified files; actual was 6. No scope expansion, just accurate layering.
- [Phase 32-02]: Sonner toast copy on handleSaveView left as generic "View saved" — NOT suffixed with "(includes drill state)". Rationale: the checkbox itself is the opt-in signal, and the subsequent load flow (URL acquires ?p=&b=) serves as the receipt. Adding conditional suffixes would set an inconsistent precedent for the app's toast copy. Reopen trigger: users unable to tell which saved views are deep links — revisit via sidebar annotation rather than transient toast.
- [Phase 32-02]: Drill capture gated on BOTH options.includeDrill AND drillState.level !== 'root' — defensive second check prevents writing snapshot.drill = {} if user opens popover while drilled, ticks the checkbox, then navigates to root before submitting. Eliminates an unlikely but possible empty-drill race.
- [Phase 27-01]: text-sm font-semibold → text-title (not text-heading or text-body) resolved on pilot — popover severity headers need prominent-but-not-section-anchoring tier. Text-heading at 18px jumps too large inside max-w-xs popovers; text-body font-semibold breaks the "tokens own weight" rule. Canonical resolution appended to docs/TYPE-MIGRATION.md §4 + §10; downstream sweeps must apply the same.
- [Phase 27-01]: text-xs font-medium (non-uppercase) → text-label — drops font-medium, relies on .text-label's baked 500 weight + 0.04em tracking; reads as label tier without forcing uppercase transformation. Applies when data source is already capitalized (e.g. `group.label` in anomaly popover).
- [Phase 27-01]: text-metric outlier token NOT added — audit found zero arbitrary text-[Xrem] sites ≥ 1.5rem across src/. Only arbitrary-size hits are text-[10px]/text-[11px] which belong to caption / Recharts-tick domains. Decision-locked: do not reopen until 3+ surfaces demand size strictly larger than text-display.
- [Phase 27-01]: Inline numeric values inside caption-tier prose lines NOT upgraded to .text-body-numeric — mixing 0.75rem caption with 0.875rem body-numeric on same line creates a visible size bump. Numeric variants reserved for pure-numeric cells (table body, KPI value, chart tick). Deferred: future pass can re-layout popovers in numeric-aware grids.
- [Phase 27-01]: SectionHeader is server-renderable (no 'use client', no hooks, no handlers) — keeps it usable in RSC contexts for all future adopters.
- [Phase 27-01]: SectionHeader eyebrow prop is NEUTRAL meta text only — when a badge color must remain on the text (e.g. severity badges via SEVERITY_COLORS), keep the badge as a sibling inline element, not an eyebrow. Pilot adoption: entity name → SectionHeader title, severity badge + flag count → inline spans above.
- [Phase 27-02]: NumericTick (src/components/charts/numeric-tick.tsx) is the canonical Recharts custom-tick for this codebase — optional-typed x/y/payload + null guard pattern is the shape for any future custom tick (Recharts injects positional props at runtime; strict-typed-required fails the JSX <Component /> type check)
- [Phase 27-02]: Recharts axis label style moves from className to inline style objects — className with Tailwind arbitrary values (text-[11px]) propagates to SVG <text> inconsistently; style={{ fontSize, fill }} is explicit and matches the NumericTick pattern
- [Phase 27-02]: Matrix numeric cell tier split by row-density: text-body-numeric for heatmap + plain-table (standard h-row), text-label-numeric for bar-ranking (h-5 tight rows). Same-tier cells in the same table preserve digit alignment; cross-view consistency is visual hierarchy, not absolute size
- [Phase 27-02]: Matrix column headers standardized on .text-label uppercase text-muted-foreground (overline) — replaces previous bare font-medium text-muted-foreground and aligns with the kpi-card label recipe shipped in 26-02
- [Phase 27-05]: Query response prose canonical tier = text-body (14px / 1.5 line-height) — no new reading-prose tier introduced; revisit in dedicated prose phase only if feedback demands. Honors CONTEXT 'keep the scale tight' lock
- [Phase 27-05]: Sidebar pill counts migrated from text-[10px] tabular-nums to .text-label-numeric (12px / mono / tabular / tracked). Removes no-canonical arbitrary-size outlier and aligns with matrix bar-ranking recipe (27-02). Size bump from ~10px to 12px accepted per plan
- [Phase 27-05]: Breadcrumb active segment = text-title (not text-heading). Breadcrumbs are nav chrome, not section anchors; text-heading (18px) would over-weight. text-title (0.9375rem weight 500) reads 'you are here' without anchoring
- [Phase 27-05]: Empty state promoted from muted fine-print (text-sm font-medium + text-xs) to text-heading + text-body. Prior treatment undersold the state; promoting to heading tier makes 'No data matches your filters' read as a proper destination
- [Phase 27-05]: data-display.tsx schema-warning standalone font-medium resolved via text-title promotion per TYPE-MIGRATION.md §4 'promote to text-title if it anchors its row'. Row-anchor tier inside AlertDescription keeps inline emphasis via semantic token
- [Phase 27-05]: Anomaly-summary-panel + toolbar-trigger partner-name inline emphasis = .text-label (mixed-case). Applies 27-01 pilot resolution #3 — label tier bakes 500 weight + 0.04em tracking, reads as emphasis without reintroducing font-medium. Anomaly title = text-title (not text-heading) — lives inside colored alert row chrome, not a section anchor
- [Phase 27-04]: SectionHeader NOT adopted for popover/sheet titles — override PopoverTitle/SheetTitle className with text-heading instead. Primitives own the slot semantics (data-slot='popover-title' / 'sheet-title' ARIA wiring); wrapping them in SectionHeader would detach ARIA from the primitive.
- [Phase 27-04]: Filter chips resolved to text-caption (inline-meta tier), not text-label (categorical pill). Chips display values ('Partner: Acme Corp'), not category names. Label/overline reserved for cases where the text IS the category enum.
- [Phase 27-04]: Combobox data-[selected]:font-medium replaced with data-[selected]:bg-accent/40. Tokens-own-weight rule forbids paired font-medium; bg tint preserves visual selected state and composes with data-[highlighted]:bg-accent.
- [Phase 27-04]: Count-pill recipe standardized on text-label-numeric (filter count, sort count). Replaces text-[10px] font-medium — gains JetBrains Mono + tabular-nums + lining-nums at 12px for multi-digit legibility.
- [Phase 27-03]: Pitfall-4 scoped state-color migration — when a typography sweep touches a file with a pending state-color todo (trend-indicator emerald/red → text-success-fg/text-error-fg), fold it in during the same pass. Other files touched in the plan keep existing state colors to preserve scope discipline
- [Phase 27-03]: Tight-pill numeric badge recipe: .text-label-numeric (not .text-body-numeric) for h-4/h-5 circular badges containing digits — preserves 0.75rem pill height while gaining mono + tabular-nums + lining-nums. Unifies sort-dialog trigger/draft pills, sort-indicator pill, percentile-cell pill
- [Phase 27-03]: Table-footer aggregate ternary: isNumeric ? text-label-numeric : text-caption — single-class replacement for the text-xs + font-mono + tabular-nums triple. text-muted-foreground travels on the wrapper td className so both branches inherit
- [Phase 27-03]: Trend arrow span uses text-caption font-medium (NOT a numeric variant) — arrow glyph ↑/↓/— is a unicode character, not a digit. Numeric variants reserved for digit-bearing spans per docs/TYPE-MIGRATION.md §7. Exception for font-medium pairing granted because arrow is glyph-only and weight carries trend-direction semantic
- [Phase 27-03]: Filter popover type rhythm: field inputs + value-list rows = text-body; field labels above inputs = text-body; tight action buttons (Apply/Clear/Select All) = text-caption; helper/truncation text = text-caption. Reusable across future filter popovers
- [Phase 27]: [Phase 27-06]: POSIX grep -rE over ripgrep for the check-type-tokens.sh guard — ripgrep not universally installed (missing on this dev machine + Vercel build image not guaranteed). 63-line bash script with find + grep -rE runs in <1s on src/ with zero install footprint.
- [Phase 27]: [Phase 27-06]: Scope-expansion font-medium gap closures — kpi-card.tsx:117 trend delta dropped font-medium (text-label-numeric bakes 500 baked); trend-indicator.tsx:83 arrow span swapped text-caption font-medium → text-label (same weight 500 baked, preserves prominence, closes Phase 27-03 glyph-arrow exception). Honors TYPE-MIGRATION.md §5 Exception: NONE.
- [Phase 27]: [Phase 27-06]: CI wiring (Vercel build step / pre-commit hook / GitHub Actions) deliberately deferred — guard + npm script live, but enabling in CI is a one-line user-owned change per plan's project_constraints.
- [Phase 29-04]: Sibling <ToolbarDivider /> pattern locked over ToolbarGroup wrapper (resolved decision #5) — less invasive, preserves isRoot conditional rendering shape
- [Phase 29-04]: No conditional guards on migrated dividers — Pitfall 5 analysis: Columns/Sort always render (left); Export/SaveView always render (right); zero stray-divider risk
- [Phase 29-04]: comparison-matrix.tsx:110 mx-1 divider intentionally out of scope — Plan 29-05 check:components guard will audit (allowlist+justification OR separate sweep)
- [Phase 29-04]: Specimen file (patterns-specimen-toolbar.tsx) NOT wired into token-browser.tsx — Plan 29-05 aggregator owns wiring; each plan scoped to own file(s)
- [Phase 29-03]: EmptyState pattern variant is chosen by TRIGGER CONDITION, not legacy copy. data-display.tsx:440 (dataset empty) = 'no-data'; data-table.tsx:342 (filters excluded all rows) = 'no-results'. Codifies Pitfall 3 from 29-RESEARCH.
- [Phase 29-03]: Three-state action override surface (undefined=default CTA, null=suppress, ReactNode=override) ships on EmptyState. Reusable for other composed patterns needing 'default vs suppress vs override' slot semantics.
- [Phase 29-03]: Strict migrate-then-delete ordering (Pitfall 8 avoidance): all legacy imports migrated and grep-verified zero before rm. Zero parallel-support window; no alias re-exports, no @deprecated.
- [Phase 29-03]: Copy-semantic realignment at data-display.tsx:440: legacy rendered SearchX + 'No data matches your filters' for a dataset-empty trigger. New default Database + 'No data yet' restores semantic-to-trigger alignment. Filter-miss copy now lives exclusively on no-results variant.
- [Phase 29-01]: StatCard trend delta uses .text-label-numeric alone (no paired font-medium) — keeps check:tokens green while preserving mono + tabular-nums digit alignment. Follows Phase 27-06 weight-policy precedent.
- [Phase 29-01]: StatCard stale + comparison props ship as prop surface only (Pitfalls 1 & 2 deferred). stale awaits DataResponse.meta.source plumbing; comparison awaits a cross-partner drill-in consumer. Documented inline via JSDoc above each prop.
- [Phase 29-01]: Trend explanatory phrase "vs rolling avg of prior batches" promoted from KpiCard tooltip-only affordance to visible second-line chrome. Cards grow slightly taller per CONTEXT layout lock; users no longer need to hover to see the baseline comparison.
- [Phase 29-01]: StatCard helper sub-components (LabelRow, TrendLine, InsufficientTrendLine) kept file-local rather than exported — shared recipe inside the pattern, not a public surface. Keeps the pattern API minimal (StatCard + StatCardProps + StatCardTrend) and concentrates token discipline in a single file.
- [Phase 29-05]: check:components guard allowlists `src/components/patterns/**`, `src/components/tokens/**`, `src/app/tokens/**` for the ad-hoc-divider recipe check. Patterns/ owns the canonical recipe; tokens/ + app/tokens/ legitimately reference it as documentation text inside `<code>` JSX. Legacy-import check is NOT allowlisted for these dirs — patterns themselves must not import legacy.
- [Phase 29-05]: comparison-matrix divider margin normalized `mx-1` → `mx-0.5` as ToolbarDivider adopts the canonical recipe. 2px-per-side delta accepted per resolved decision #5 (app-wide divider consistency over preserving original margin). Visual-equivalent at typical button-cluster densities; reopen only if a concrete regression surfaces.
- [Phase 29-05]: Wave 2 executor agent rate-limited at spawn; orchestrator executed inline. Atomic per-task commits (97b6c0b, 789b890, 2925bf3) preserved — same commit shape the executor would have produced. Pattern: when a subagent fails before work starts, orchestrator-inline fallback is acceptable for single-plan waves; for multi-plan waves, retry spawn first.
- [Phase 29-05]: ComponentPatternsSpecimen wraps all 4 specimens in a single TooltipProvider at the aggregator layer — StatCard's no-data/insufficient-data states use Tooltip primitives (29-RESEARCH Pitfall 7). Per-specimen TooltipProvider would have been redundant; parent-layer wrap is the pattern.
- [Phase 29-05]: CI wiring (Vercel build / pre-commit / GitHub Actions) deliberately deferred per Phase 27-06 + 28-08 precedent. Three guards now ship (check:tokens, check:surfaces, check:components) — user flips them on via a single build-command edit when ready.

### Pending Todos

- Snowflake credentials need to be provisioned in Vercel env vars
- ANTHROPIC_API_KEY needs to be provisioned in Vercel env vars
- Visual UAT of remaining 25-03 scenarios (ACCOUNT_TYPE filter proves upstream-of-aggregate, drilldown cascade preserves root filter, zero-match FilterEmptyState + Clear filter click) — primary scenario (single-partner filter) verified this session and surfaced the trajectory-chart <2 partners guard (fixed in d9aa14b)
- [UX — future phase] Drilled-in view should surface per-batch KPI cards prominently at top (summary stats for the selected batch when drilled into partner/batch levels). Parallels the root-level KPI cards and would make the drill experience feel symmetrical. Candidate for Phase 28 (surfaces) or a dedicated polish phase.
- [Phase 29-01 follow-up] Extend DataResponse.meta with `source: 'cache' | 'snowflake'` and thread through data-freshness context so StatCard.stale has a live signal. Today the prop is a pure surface (Pitfall 1) — no consumer passes stale={true} outside the /tokens specimen.
- [Phase 29-01 follow-up] Wire StatCard.comparison into a cross-partner drill-in feature when one is designed. PartnerNormsProvider already exposes Record<string, MetricNorm>; the comparison-value/label strings can derive from norms.mean once a UI shell exists (Pitfall 2).

### Blockers/Concerns

- Dual Y-axis interaction with shadcn ChartContainer unverified (flag for Phase 36)

## Session Continuity

Last session: 2026-04-18
Stopped at: Phase 29 complete, transitioning to Phase 30. All 5 plans shipped; verification 14/14 passed; 4-check enforcement suite green. Phase 30 CONTEXT.md already exists — auto-advance goes directly to `/gsd:plan-phase 30` (skipping discuss-phase).
Resume file: None

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 27 | 06 | ~55 min | 3 | 5 | 2026-04-17 |
| 29 | 04 | ~2 min | 2 | 3 | 2026-04-18 |
| 29 | 03 | ~3 min | 2 | 4 | 2026-04-18 |
| 29 | 01 | ~15 min | 3 | 4 | 2026-04-18 |
| 29 | 02 | ~3 min | 3 | 5 | 2026-04-18 |
| 29 | 05 | ~15 min | 3 | 4 | 2026-04-18 |

