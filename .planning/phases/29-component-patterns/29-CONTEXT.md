# Phase 29: Component Patterns - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Create five reusable composed patterns — **StatCard**, **DataPanel**, **SectionHeader** (extended), **ToolbarGroup**, **EmptyState** — that standardize common UI shapes on top of the Phase 26 design tokens, Phase 27 type scale, and Phase 28 surface system. Migrate every existing call site in the app to the new patterns during this phase; delete the legacy components.

**In scope:**
- New components: `StatCard`, `DataPanel`, `ToolbarGroup`, `EmptyState` (new).
- Extensions: `SectionHeader` (already exists from Phase 27 — extend as gaps emerge during DataPanel migration).
- Full migration of existing usages (KpiCard → StatCard, ad-hoc empty states → EmptyState, ad-hoc panel headers → DataPanel).
- Deletion of legacy components once call sites are zero.

**Out of scope (other phases):**
- Motion / hover lift / press feedback on these patterns → Phase 30.
- Visual polish (gradient dividers, focus glows, dark-mode hairlines) → Phase 31.
- Accessibility audit (ARIA, keyboard nav, reduced motion) → Phase 33.
- New features built on these patterns → feature phases (34+).

</domain>

<decisions>
## Implementation Decisions

### StatCard

- **Size variants:** Single canonical size only. No compact/hero variants. Every stat reads at the same rhythm across the app.
- **Value + trend layout:** Big number on its own line; trend indicator on a second line below the value, with explanatory text (e.g. `↑ +2.1% vs prior batch`). Cards get slightly taller than today's inline treatment but gain room for the explanatory phrase that currently lives in a tooltip only.
- **Trend semantics:** Preserve today's polarity-aware color logic from KpiCard (green = good direction, red = bad, muted = flat). Reuse `getPolarity()` from `@/lib/computation/metric-polarity`.
- **Label:** Uppercase overline (`.text-label uppercase text-muted-foreground`) — matches today and the broader overline system. Support an **optional icon slot** to the left of the label text (Lucide, size-sm, muted) for visual categorization.
- **First-class states:**
  - **Value** (default — stat renders normally)
  - **Loading skeleton** (shimmering placeholder; prevents layout shift during first load)
  - **Error** (error icon + short message inside the card; replaces today's silent card hide)
  - **No-data** (em-dash, preserved from current KpiCard)
  - **Insufficient data** (em-dash trend + tooltip, preserved)
  - **Stale / cached indicator** (subtle badge when the stat comes from static cache rather than live Snowflake)
  - **Comparison mode** (two values side-by-side for cross-partner drill-ins; used when the view compares a partner to a benchmark average)

### DataPanel

- **Slot contract:**
  - `header` — **required**. Every panel has a title. No headerless panels.
  - `content` — **required**. The chart/table/body.
  - `footer` — **optional**. Not reserved when empty.
- **Header implementation:** DataPanel composes the existing `SectionHeader` internally. `title`, `eyebrow`, `description`, `actions` props flow through from DataPanel's props to SectionHeader. One less component to maintain; visual rhythm of panels matches page-level section headers.
- **Content sizing:** Hands-off. DataPanel does not manage height, overflow, or scroll for its content slot. Charts and tables size themselves. DataPanel is pure visual chrome — surface, padding, and the header. Revisit if concrete pain appears.
- **Footer use cases (shape default styling):**
  - Metadata line (source, timestamp, row count — small muted caption with thin border-top)
  - Action buttons (right-aligned button cluster for export / refresh / expand)
  - Aggregate / total row (summary stats, visually distinct from content)
  - (Not a primary footer use case: centered drill-down link.)

### EmptyState

- **Variants (four first-class):**
  - **no-data** — Zero-data first-load (no batches exist yet). Educational copy; icon: `Database`.
  - **no-results** — Filters too narrow (today's default case). CTA: "Clear filters". Icon: `SearchX`.
  - **error** — Fetch failed / Snowflake error / cache corrupt. Red-ish accent. CTA: "Retry" + report link. Icon: `AlertTriangle`. Distinct from StatCard error state — this one is section-scoped.
  - **permissions** — User lacks access. Neutral styling; no retry. Explanatory copy. Icon: `Lock`.
- **Visual treatment:** Lucide icons, per-variant canonical icon, muted color at medium size. No custom illustrations. No icon-less variant.
- **CTA policy:** Optional. Each variant ships with a sensible default CTA (no-results → "Clear filters", error → "Retry"). Callers can override via `action` prop or pass `null` to suppress.
- **Layout:** Self-centered with `min-h-[40vh]` — preserves today's pattern. Caller just drops it in; component handles its own vertical centering.

### ToolbarGroup (default behavior — brief)

- Thin vertical divider between button clusters inside the existing `unified-toolbar`.
- Applied where the toolbar today has visually-adjacent-but-semantically-separate button groups (filters vs view controls vs export).
- Planner decides exact divider token (border-border + opacity) and spacing.

### SectionHeader (extension — brief)

- Today's component lives at `src/components/layout/section-header.tsx` and already supports title / eyebrow / description / actions.
- Extend **only** as concrete gaps appear during DataPanel migration (e.g. a needed size variant, a subtitle-second-line pattern). Don't speculate.

### Migration Strategy

- **Scope:** Full migration in Phase 29. Every call site of KpiCard, every ad-hoc empty-state, every ad-hoc panel header moves onto the new patterns.
- **Legacy components:** Deleted after migration. No parallel support, no `@deprecated` window, no alias re-exports. Files to remove include `src/components/kpi/kpi-card.tsx`, `src/components/empty-state.tsx`, and `src/components/filters/filter-empty-state.tsx` (researcher should confirm exhaustive list).
- **Plan breakdown:** One plan per pattern (5 plans). Each plan ships the pattern + migrates its call sites + deletes its legacy component. Plans are independently reviewable.
  1. StatCard (+ migrate KpiCard usages, delete KpiCard)
  2. DataPanel (+ migrate chart/table wrappers)
  3. SectionHeader (extension + adoption during DataPanel migration — may be folded into plan 2 if no independent surface)
  4. ToolbarGroup (+ migrate unified-toolbar clusters)
  5. EmptyState (+ migrate empty-state.tsx and filter-empty-state.tsx, delete both)
- **Verification per plan:**
  - **Grep guard** (`check:components` npm script, CI-enforced): asserts zero imports of the old component after migration. Modeled on the Phase 27 `check:tokens` guard.
  - **/tokens page patterns section:** the unlisted `/tokens` reference page gains a Component Patterns area with a live example of every variant (StatCard all states, DataPanel all slot combos, EmptyState all 4 variants, ToolbarGroup, SectionHeader). Doubles as design QA.

### Claude's Discretion

- Exact token choices for StatCard trend colors (within the existing success-fg / error-fg / muted-foreground system).
- Skeleton shimmer animation implementation (Phase 30 will formalize motion; ship a minimal version here).
- Icon size token for the optional StatCard label-icon slot.
- Exact vertical rhythm between value and trend-second-line.
- Error copy and permissions copy specifics.
- Whether SectionHeader gets its own plan or folds into the DataPanel plan (decide based on scope size found during research).

</decisions>

<specifics>
## Specific Ideas

- Trend phrase ("vs prior batch") should match the existing tooltip copy on KpiCard so users see consistent language.
- StatCard comparison mode is specifically for cross-partner drill-ins where a partner's metric is shown alongside the aggregate benchmark — this is an existing design pattern in the cross-partner views.
- EmptyState variants should look related but visually distinguishable at a glance — same layout, different canonical icon and accent.
- The verification approach mirrors Phase 27's successful pattern: a CI grep guard plus live documentation on the `/tokens` page. Worth leaning into — it's working.
- Zero tolerance for parallel-support / deprecation windows. The codebase should have one way to display a stat, one way to wrap a data section, one way to show empty.

</specifics>

<deferred>
## Deferred Ideas

- **StatCard size variants (compact, hero):** not needed yet; revisit only if a real use case appears in feature work.
- **DataPanel content-sizing variants (`panel-chart` vs `panel-table`, max-height + scroll):** deferred until duplicate layout workarounds show up across many panels.
- **EmptyState custom illustrations:** skipped in favor of Lucide icons. Could be revisited as a brand-polish phase if the app ever gets a visual identity sprint.
- **Storybook / visual regression tests:** deferred — `/tokens` page documentation + grep guards cover the ground without new tooling.
- **StatCard click-through / interactivity:** not discussed; if needed, add in a future phase.

</deferred>

---

*Phase: 29-component-patterns*
*Context gathered: 2026-04-17*
