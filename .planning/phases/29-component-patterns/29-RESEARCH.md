# Phase 29: Component Patterns — Research

**Researched:** 2026-04-17
**Domain:** React component design patterns (composed patterns on top of Phase 26 tokens, Phase 27 type scale, Phase 28 surfaces)
**Confidence:** HIGH (every finding verified against repo source; no external library research required — patterns compose existing in-repo primitives)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**StatCard**
- Size variants: Single canonical size only. No compact/hero variants. Every stat reads at the same rhythm across the app.
- Value + trend layout: Big number on its own line; trend indicator on a second line below the value, with explanatory text (e.g. `↑ +2.1% vs prior batch`). Cards get slightly taller than today's inline treatment but gain room for the explanatory phrase that currently lives in a tooltip only.
- Trend semantics: Preserve today's polarity-aware color logic from KpiCard (green = good direction, red = bad, muted = flat). Reuse `getPolarity()` from `@/lib/computation/metric-polarity`.
- Label: Uppercase overline (`.text-label uppercase text-muted-foreground`) — matches today and the broader overline system. Support an **optional icon slot** to the left of the label text (Lucide, size-sm, muted) for visual categorization.
- First-class states: Value (default), Loading skeleton (shimmering placeholder; prevents layout shift during first load), Error (error icon + short message inside the card; replaces today's silent card hide), No-data (em-dash, preserved), Insufficient data (em-dash trend + tooltip, preserved), Stale / cached indicator (subtle badge when the stat comes from static cache rather than live Snowflake), Comparison mode (two values side-by-side for cross-partner drill-ins).

**DataPanel**
- Slot contract: `header` — **required** (every panel has a title, no headerless panels); `content` — **required** (the chart/table/body); `footer` — **optional** (not reserved when empty).
- Header implementation: DataPanel composes the existing `SectionHeader` internally. `title`, `eyebrow`, `description`, `actions` props flow through from DataPanel's props to SectionHeader.
- Content sizing: Hands-off. DataPanel does not manage height, overflow, or scroll for its content slot. Charts and tables size themselves. DataPanel is pure visual chrome — surface, padding, and the header.
- Footer use cases (shape default styling): Metadata line (source, timestamp, row count — small muted caption with thin border-top); Action buttons (right-aligned button cluster for export / refresh / expand); Aggregate / total row (summary stats, visually distinct from content). (Not a primary footer use case: centered drill-down link.)

**EmptyState**
- Variants (four first-class): **no-data** (`Database` icon, educational copy); **no-results** (`SearchX` icon, CTA: "Clear filters"); **error** (`AlertTriangle`, red-ish accent, CTA: "Retry" + report link — distinct from StatCard error state, this one is section-scoped); **permissions** (`Lock`, neutral styling, no retry, explanatory copy).
- Visual treatment: Lucide icons, per-variant canonical icon, muted color at medium size. No custom illustrations. No icon-less variant.
- CTA policy: Optional. Each variant ships with a sensible default CTA (no-results → "Clear filters", error → "Retry"). Callers can override via `action` prop or pass `null` to suppress.
- Layout: Self-centered with `min-h-[40vh]` — preserves today's pattern.

**ToolbarGroup**
- Thin vertical divider between button clusters inside the existing `unified-toolbar`.
- Applied where the toolbar today has visually-adjacent-but-semantically-separate button groups (filters vs view controls vs export).
- Planner decides exact divider token (border-border + opacity) and spacing.

**SectionHeader (extension — brief)**
- Today's component lives at `src/components/layout/section-header.tsx` and already supports title / eyebrow / description / actions.
- Extend **only** as concrete gaps appear during DataPanel migration (e.g. a needed size variant, a subtitle-second-line pattern). Don't speculate.

**Migration Strategy**
- Scope: Full migration in Phase 29. Every call site of KpiCard, every ad-hoc empty-state, every ad-hoc panel header moves onto the new patterns.
- Legacy components: Deleted after migration. No parallel support, no `@deprecated` window, no alias re-exports. Files to remove include `src/components/kpi/kpi-card.tsx`, `src/components/empty-state.tsx`, and `src/components/filters/filter-empty-state.tsx` (researcher should confirm exhaustive list).
- Plan breakdown: One plan per pattern (5 plans). Each plan ships the pattern + migrates its call sites + deletes its legacy component.
  1. StatCard (+ migrate KpiCard usages, delete KpiCard)
  2. DataPanel (+ migrate chart/table wrappers)
  3. SectionHeader (extension + adoption during DataPanel migration — may be folded into plan 2 if no independent surface)
  4. ToolbarGroup (+ migrate unified-toolbar clusters)
  5. EmptyState (+ migrate empty-state.tsx and filter-empty-state.tsx, delete both)
- Verification per plan:
  - **Grep guard** (`check:components` npm script, CI-enforced): asserts zero imports of the old component after migration. Modeled on the Phase 27 `check:tokens` guard.
  - **/tokens page patterns section:** the unlisted `/tokens` reference page gains a Component Patterns area with a live example of every variant (StatCard all states, DataPanel all slot combos, EmptyState all 4 variants, ToolbarGroup, SectionHeader). Doubles as design QA.

### Claude's Discretion

- Exact token choices for StatCard trend colors (within the existing success-fg / error-fg / muted-foreground system).
- Skeleton shimmer animation implementation (Phase 30 will formalize motion; ship a minimal version here).
- Icon size token for the optional StatCard label-icon slot.
- Exact vertical rhythm between value and trend-second-line.
- Error copy and permissions copy specifics.
- Whether SectionHeader gets its own plan or folds into the DataPanel plan (decide based on scope size found during research).

### Deferred Ideas (OUT OF SCOPE)

- **StatCard size variants (compact, hero):** not needed yet; revisit only if a real use case appears in feature work.
- **DataPanel content-sizing variants (`panel-chart` vs `panel-table`, max-height + scroll):** deferred until duplicate layout workarounds show up across many panels.
- **EmptyState custom illustrations:** skipped in favor of Lucide icons.
- **Storybook / visual regression tests:** deferred — `/tokens` page documentation + grep guards cover the ground without new tooling.
- **StatCard click-through / interactivity:** not discussed; if needed, add in a future phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DS-18 | StatCard pattern replaces KpiCard with consistent surface, type, and trend display | Single call-site (`kpi-summary-cards.tsx`, 4 `<KpiCard />` invocations); `getPolarity()` at `src/lib/computation/metric-polarity.ts` (stable API, 1:1 drop-in); target surface `bg-surface-raised + shadow-elevation-raised + p-card-padding + rounded-lg` already in use today; trend copy "vs rolling avg of prior batches" already shipped on line 126 of kpi-card.tsx — reuse verbatim; new states (loading skeleton, error, stale, comparison) have no existing implementation in KpiCard — all net-new. |
| DS-19 | DataPanel pattern wraps chart and table sections with header/content/footer slots | Four concrete ad-hoc panel headers to migrate: `comparison-matrix.tsx:71-134`, `trajectory-chart.tsx:125-246`, `collection-curve-chart.tsx:176/191`, `query-search-bar.tsx:127` + `query-response.tsx:44/62/94`. All already use `bg-surface-raised + shadow-elevation-raised + p-card-padding`. DataPanel composes existing `SectionHeader` (see SectionHeader finding below) — four actions props map to the `<Button>` clusters currently in each CardHeader. |
| DS-20 | SectionHeader pattern provides consistent section titles with optional action areas | Already shipped from Phase 27 at `src/components/layout/section-header.tsx`. Current props: `title`, `eyebrow?`, `description?`, `actions?`, `className?`. Server-renderable. Already adopted in `anomaly-detail.tsx:53` and demoed on `/tokens` at `type-specimen.tsx:164-192`. Gaps to watch during DataPanel migration: no `size` variant (title is always `text-heading`), no built-in subtitle-second-line, no icon slot. Add **only** if DataPanel migration surfaces a concrete need. |
| DS-21 | ToolbarGroup pattern separates button clusters with subtle vertical dividers | `unified-toolbar.tsx` already has two ad-hoc dividers at lines 168 and 236 (`<div className="mx-0.5 h-4 w-px bg-border" />`). Comparison-matrix.tsx has a third (line 110: `mx-1 h-4 w-px bg-border`). Clusters, left→right: [Query + Anomalies + Charts-toggle] · [Preset + Heatmap + Columns + Sort + Filters] · [Export + Save-view]. ToolbarGroup replaces the raw divider spans. |
| DS-22 | EmptyState pattern provides consistent zero-data, no-results, and error messaging | Two legacy components (`src/components/empty-state.tsx`, `src/components/filters/filter-empty-state.tsx`) each with ONE import. No-data copy: "No data matches your filters / Try adjusting your filters or refreshing the data" (empty-state.tsx). No-results copy: "No rows match the filter / Clear filter" button (filter-empty-state.tsx). Error variant needed for chart/table fetch-fail surfaces (currently handled by `<ErrorState />` at `src/components/error-state.tsx` — orthogonal, full-page; EmptyState.error is section-scoped per CONTEXT). Permissions variant has no existing call site but is first-class per CONTEXT. |
</phase_requirements>

## Summary

Phase 29 is a composition + migration phase, not a research-heavy one. The app already has every primitive needed (surface tokens, elevation tokens, type tokens, `SectionHeader`, Lucide React, shadcn `Card`, `Skeleton`, `getPolarity()`). The work is: (a) author five tightly-scoped composed components at `src/components/patterns/`, (b) migrate a small, well-identified call-site set, (c) delete the three legacy files, (d) ship `scripts/check-components.sh` modeled exactly on the two existing POSIX grep guards, and (e) extend `/tokens` with a Component Patterns section.

**Scale is small.** KpiCard has **one** importer (4 usages in the same wrapper). EmptyState has **one** importer. FilterEmptyState has **one** importer. DataPanel has roughly **6 ad-hoc panel shells** to migrate (comparison-matrix, trajectory-chart, collection-curve-chart empty + chart, query-search-bar, query-response all three states). ToolbarGroup migrates **3 existing divider spans**. There are no unknown-unknown call sites; every migration is enumerable from the grep output in §Call-Site Inventory.

**Two real gaps surface in CONTEXT.** First, the **stale/cached badge** has no upstream signal today — `isStaticMode()` is server-only and `DataResponse.meta` does not carry a `source` field. StatCard's stale prop can be implemented as a passthrough boolean, but wiring real data behind it requires either a new meta field (`source: 'cache' | 'snowflake'`) plumbed through `DataResponse.meta` **or** a client-side detection heuristic. Second, **comparison-mode data shape** — cross-partner drill-ins today use a heatmap/bar/plain-table view (`PartnerComparisonMatrix`), not side-by-side "partner vs benchmark" StatCards; the data exists (`partnerStats?.norms` = `Record<string, MetricNorm>` via `PartnerNormsProvider`), but no existing UI renders a two-value StatCard pair. See Open Questions.

**Primary recommendation:** Structure Phase 29 as 6 plans — 5 patterns + 1 enforcement. Put patterns at `src/components/patterns/` (new directory); add it to the type-token and surface-token allowlists up front. Treat StatCard stale/comparison as **prop-surface-only** in this phase (component accepts the props and renders correctly when passed), and defer the live data plumbing (new `source` meta field, comparison-view wiring) to a follow-on feature phase. Every pattern lands with its migration + deletion + grep-guard update in the same plan so phase-gate = all patterns migrated + guard green + `/tokens` updated.

## Call-Site Inventory (Exhaustive)

### KpiCard — 1 importer, 4 usages; all contained in the wrapper

| File | Line | Usage |
|------|------|-------|
| `src/components/kpi/kpi-summary-cards.tsx` | 3 | `import { KpiCard } from '@/components/kpi/kpi-card';` |
| `src/components/kpi/kpi-summary-cards.tsx` | 88 | `<KpiCard key={spec.key} label={spec.label} value={formattedValue} />` — plain (no trend) |
| `src/components/kpi/kpi-summary-cards.tsx` | 104 | `<KpiCard ... noData noDataReason="No batches at 12mo yet" />` — 12mo special-case |
| `src/components/kpi/kpi-summary-cards.tsx` | 118 | `<KpiCard ... insufficientData batchCount={trending.batchCount} />` — insufficient history |
| `src/components/kpi/kpi-summary-cards.tsx` | 134 | `<KpiCard ... trend={{ direction, deltaPercent, metric }} />` — normal trend |

**Files to delete:** `src/components/kpi/kpi-card.tsx` (141 LOC). The parent wrapper `kpi-summary-cards.tsx` stays and re-points to `StatCard`. The wrapper also owns a loading-skeleton block at lines 56-65 (ad-hoc `<Skeleton>` grid) — StatCard's `loading` state should replace those.

### EmptyState (legacy) — 1 importer

| File | Line | Usage |
|------|------|-------|
| `src/components/data-display.tsx` | 21 | `import { EmptyState } from '@/components/empty-state';` |
| `src/components/data-display.tsx` | 440 | `if (!data || data.data.length === 0) return <EmptyState />;` |

**File to delete:** `src/components/empty-state.tsx` (17 LOC).

### FilterEmptyState — 1 importer

| File | Line | Usage |
|------|------|-------|
| `src/components/table/data-table.tsx` | 25 | `import { FilterEmptyState } from '@/components/filters/filter-empty-state';` |
| `src/components/table/data-table.tsx` | 342 | `<FilterEmptyState onClearFilters={clearAll} />` |

**File to delete:** `src/components/filters/filter-empty-state.tsx` (26 LOC).

### Ad-hoc panel headers (DataPanel migration targets)

Repeating pattern: `<Card className="... shadow-elevation-raised"> <CardHeader>...<CardTitle>+actions</CardHeader> <CardContent>...</CardContent></Card>` **OR** `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` with an inline `<h3>` + action cluster.

| File | Lines | Current shape | DataPanel migration |
|------|-------|---------------|---------------------|
| `src/components/cross-partner/comparison-matrix.tsx` | 71-134 | shadcn Card + CardHeader(CardTitle "Partner Comparison" + info tooltip + partner-count) + action cluster (3 view-mode buttons + orientation button with inline divider at line 110) + CardContent (3 conditional matrix views) | DataPanel `header` = `{ title, description, actions: <view-toggles + orientation> }`, `content` = matrix views. Consider using DataPanel `eyebrow` for "Cross-Partner"; info tooltip stays inline next to title. |
| `src/components/cross-partner/trajectory-chart.tsx` | 125-246 | shadcn Card + CardHeader(CardTitle "Collection Trajectories") + actions ($ Weighted / Equal Weight toggles) + CardContent (LineChart + caption + legend) | DataPanel `header` = `{ title: "Collection Trajectories", actions }`; `content` = chart + legend; `footer` = caption "Months Since Placement" (OR keep inline). |
| `src/components/charts/collection-curve-chart.tsx` | 176-182 | Ad-hoc `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` — empty-state branch | Replace with `<EmptyState variant="no-data" />` embedded inside a DataPanel, OR just an EmptyState (no-data variant) since this is zero-data not zero-chrome. |
| `src/components/charts/collection-curve-chart.tsx` | 191+ | Ad-hoc `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` + inline h3 "Collection Curves" + action cluster | DataPanel `header` = `{ title: "Collection Curves", actions: <recoveryRate/amount toggles> }`; `content` = chart + legend. |
| `src/components/query/query-search-bar.tsx` | 127 | Ad-hoc `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` — a search bar, not a chart/table | **Judgment call.** Not a typical DataPanel use (no header slot, no title). Either (a) leave as-is — this is a shell, not a panel — or (b) extend DataPanel to allow headerless variant (violates CONTEXT lock: "Every panel has a title. No headerless panels"). Recommendation: **leave as-is**. |
| `src/components/query/query-response.tsx` | 44, 62, 94 | Three ad-hoc `<div className="rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">` — loading / error / ready branches | **Judgment call.** These are response-body shells, not titled panels. Recommendation: **leave as-is** — same reasoning as query-search-bar. |

**Additional repeating `Card` consumers** (may or may not be DataPanel candidates — planner decides): `src/components/kpi/kpi-summary-cards.tsx` has an ad-hoc `<div className="flex h-24 items-center justify-center rounded-lg bg-surface-raised shadow-elevation-raised">` for the zero-batch state (line 71) — candidate for EmptyState embedded with `variant="no-data"` and a tight override.

**Confidence: HIGH** on the 4 primary DataPanel targets (comparison-matrix, trajectory-chart, collection-curve-chart, and one collection-curve-chart empty shell). Query-surface panels flagged as **judgment calls** so the planner can decide based on scope size.

### ToolbarGroup divider migration targets

| File | Line | Current shape | Cluster boundary |
|------|-------|---------------|------------------|
| `src/components/toolbar/unified-toolbar.tsx` | 168 | `<div className="mx-0.5 h-4 w-px bg-border" />` | Between [Query + Anomalies + Charts-toggle] and [Preset + Heatmap + Columns + Sort + Filters] |
| `src/components/toolbar/unified-toolbar.tsx` | 236 | `<div className="mx-0.5 h-4 w-px bg-border" />` | Between [Preset + Heatmap + Columns + Sort + Filters] and [Export + Save-view] |
| `src/components/cross-partner/comparison-matrix.tsx` | 110 | `<span className="mx-1 h-4 w-px bg-border" />` | Between view-mode toggles (heatmap/bar/plain) and orientation swap button. Conditional: only when `viewMode !== 'bar'`. **Within a CardHeader actions cluster** — can be captured by `ToolbarGroup` inside a DataPanel `actions` prop. |

**Cluster count:** 3 clusters in `unified-toolbar`, 2 clusters (conditional) in `comparison-matrix` action area.

**Inventory method:** grepped `h-4 w-px bg-border` across `src/` — the 3 matches above are the only occurrences.

## Pattern-to-Token Integration Map

| Pattern | Surface token | Elevation token | Type tokens (required) | Other tokens |
|---------|---------------|-----------------|------------------------|--------------|
| **StatCard** | `bg-surface-raised` | `shadow-elevation-raised` | `text-display-numeric` (value); `text-label uppercase text-muted-foreground` (label); `text-label-numeric` (trend delta); `text-caption` (stale badge, error copy, trend-second-line explanatory text) | `rounded-lg`, `p-card-padding`, `transition-colors duration-quick ease-default`. Trend colors: `text-success-fg` / `text-error-fg` / `text-muted-foreground`. Skeleton: `animate-pulse bg-muted rounded-md` (shadcn `<Skeleton>`). Icon slot: Lucide at `h-4 w-4 text-muted-foreground`. |
| **DataPanel** | `bg-surface-raised` | `shadow-elevation-raised` | Inherits from `SectionHeader` (`text-heading` title, `.text-label uppercase` eyebrow, `text-caption` description); footer metadata uses `text-caption text-muted-foreground` | `rounded-lg`, `p-card-padding`. Footer border-top: `border-t border-border` + `pt-stack`. Content slot: no tokens — consumer-owned. |
| **SectionHeader (existing)** | none | none | `text-heading` (h2 title), `.text-label uppercase text-muted-foreground` (eyebrow), `text-caption text-muted-foreground` (description) | `gap-stack`, `gap-inline` (action cluster), `gap-1` (internal title/meta stack). |
| **ToolbarGroup** | none (transparent) | none | none | Divider recipe: `mx-0.5 h-4 w-px bg-border` (or `mx-1` in tighter clusters — pick one and normalize). Group wrapper: `flex items-center gap-1`. |
| **EmptyState** | none (transparent — sits inside a DataPanel or page) | none | `text-heading text-foreground` (title line); `text-body text-muted-foreground` (description); action button: shadcn `<Button variant="outline"|"link">` text-body | Layout: `flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center`. Icon: Lucide `h-10 w-10 text-muted-foreground/40` (muted-at-40%-opacity recipe matches empty-state.tsx line 6 verbatim). Error variant adds `text-error-fg` on the icon. |

### Allowlist edit required (both guards)

**Both `scripts/check-type-tokens.sh` and `scripts/check-surfaces.sh` allowlist three directories:** `src/components/ui`, `src/app/tokens`, `src/components/tokens`. A new `src/components/patterns/**` directory is **not** in either allowlist.

This is **fine in principle** — the new pattern files consume semantic tokens only (no raw `text-sm` or `shadow-md`), so they should pass both guards cleanly. Expected outcome: pattern files pass both audits without needing allowlist entries. Confirm at plan time:

- StatCard uses `text-display-numeric`, `text-label`, `text-label-numeric`, `text-caption` → all token classes, not raw `text-*`. ✅
- StatCard uses `shadow-elevation-raised` (semantic). ✅
- DataPanel uses `text-heading` via SectionHeader + `shadow-elevation-raised`. ✅
- EmptyState uses `text-heading` + `text-body`. ✅
- ToolbarGroup is token-free (just `bg-border`, spacing utilities). ✅

**Risk flag:** If any pattern needs an allowlist carve-out (e.g. an `font-medium` paired on a badge), add to both guards at the top-level EXCLUDE_DIRS block. Keep the allowlist as narrow as possible.

## SectionHeader Current State

**File:** `src/components/layout/section-header.tsx` (46 LOC).

**Signature:**
```ts
interface SectionHeaderProps {
  title: string;            // required — renders as <h2 className="text-heading">
  eyebrow?: string;         // optional — renders as <span className=".text-label uppercase text-muted-foreground">
  description?: string;     // optional — renders as <p className="text-caption text-muted-foreground">
  actions?: ReactNode;      // optional — right-aligned slot
  className?: string;       // optional — merged onto wrapper
}
```

**Layout:** `<div className={cn('flex items-start justify-between gap-stack', className)}>` with left-column stack (`flex flex-col gap-1`) for eyebrow/title/description and a right-side `<div className="shrink-0 flex items-center gap-inline">` for actions.

**Server-renderable:** no `'use client'`, no hooks, no handlers. Usable in RSC contexts.

**Current adopters:**
- `src/components/anomaly/anomaly-detail.tsx:53` — `<SectionHeader title={entityName} />`
- `src/components/tokens/type-specimen.tsx:165, 169, 177` — three /tokens demo instances

**Gaps DataPanel migration may expose (flag for planner — don't pre-build):**
1. **No `size` variant.** Title is always `text-heading` (18px). If a nested DataPanel inside a dialog/popover needs a smaller title, SectionHeader would need a `size?: 'default' | 'sm'` with `sm` dropping title to `text-title` (15px). Phase 27 Plan 27-04 explicitly decided *not* to adopt SectionHeader inside Popover/Sheet primitives — so this probably won't appear during DataPanel migration. Leave unbuilt.
2. **No subtitle-second-line.** CONTEXT flags this as a possible gap. No current DataPanel target needs it — `comparison-matrix.tsx` uses a separate inline partner-count span; `trajectory-chart.tsx` has no subtitle. Leave unbuilt.
3. **No icon slot on title.** StatCard takes an icon slot on its label; SectionHeader does not take one on its title. No DataPanel target demands this. Leave unbuilt.
4. **Eyebrow is neutral-only.** Phase 27 Plan 27-01 locked this: colored badges stay as sibling inline elements (`AnomalyDetail` pattern). DataPanel targets don't need colored eyebrows. No extension needed.

**Recommendation:** Start the DataPanel plan assuming SectionHeader ships unchanged. If any of the 4 DataPanel call sites reveals a concrete gap (e.g. trajectory-chart wants a partner count on a second line), extend in-place and keep the extension minimal. CONTEXT Discretion Item: "Whether SectionHeader gets its own plan or folds into the DataPanel plan" — my recommendation is **fold into DataPanel plan**; the extension, if any, is a few lines.

## KpiCard Current Behavior (exhaustive)

Source: `src/components/kpi/kpi-card.tsx`. 141 LOC. Three render paths:

1. **No-data** (line 55): wrapper `<div className={cardClasses}>` with `\u2014` (em-dash) in `text-display-numeric text-muted-foreground`, label in `.text-label uppercase text-muted-foreground`, whole card tooltip-wrapped with `noDataReason ?? 'No data available'`.
2. **Insufficient data** (line 76): value renders normally; trend element is a small tooltip-wrapped em-dash in `text-caption text-muted-foreground`. Tooltip copy: `batchCount === 1 ? '1 batch — no trend yet' : 'Need 3+ batches for trending'`.
3. **Trend** (line 90): arrow (`↑` / `↓` / `—`) + optional `+X.Y%` delta. Color derived from `getPolarity(metric)`:
   - `direction === 'flat'` → `text-muted-foreground`
   - `isPositive` (up + higher_is_better OR down + lower_is_better) → `text-success-fg`
   - else → `text-error-fg`
   - Delta format: `sign + deltaPercent.toFixed(1) + '%'` where `sign = deltaPercent >= 0 ? '+' : ''`
   - Tooltip: **"vs rolling avg of prior batches"** (line 126) — verbatim copy StatCard must preserve.
4. **Default** (line 131): `<span className="text-display-numeric">{value}</span>` + trend element inline baseline, label below in `.text-label uppercase text-muted-foreground`.

**Card chassis recipe** (line 52): `rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default`. StatCard inherits this verbatim — it's the Phase 28 locked recipe.

**States StatCard must ADD (CONTEXT locks, not in KpiCard today):**
- **Loading skeleton** — shimmering placeholder. Size-equivalent blocks for value + label + (optional) trend second line. Use existing `<Skeleton>` at `src/components/ui/skeleton.tsx` (`animate-pulse rounded-md bg-muted`). No new animation — Phase 30 will formalize motion; ship minimal now per CONTEXT Discretion.
- **Error** — error icon + short message inside the card. Replace today's silent "card doesn't render" behavior. Use Lucide `AlertTriangle` or `CircleAlert` (`h-4 w-4 text-error-fg`). Error copy is Claude's Discretion — suggest: "Failed to load" as title line + optional retry action (but CONTEXT doesn't require retry on StatCard.error; keep minimal).
- **Stale / cached badge** — subtle badge when the stat comes from static cache. Suggested recipe: `<span className="text-caption text-muted-foreground inline-flex items-center gap-1">Cached</span>` with a Lucide `Database` icon at `h-3 w-3`. **Upstream signal does NOT exist today — see Pitfall 1 and Open Questions.**
- **Comparison mode** — two values side-by-side (partner vs benchmark). Layout: `grid grid-cols-2 divide-x divide-border` or `flex gap-6`. Each cell: value + label. Trend still on second line. **No existing consumer — flag for future-feature wiring; Phase 29 ships the prop surface only.**

**States StatCard must PRESERVE (1:1):**
- No-data with em-dash (`\u2014`) in `text-display-numeric text-muted-foreground` + tooltip.
- Insufficient data with em-dash trend + tooltip copy ("1 batch — no trend yet" / "Need 3+ batches for trending").
- Polarity-aware trend colors via `getPolarity()` (all 3 branches).
- Trend tooltip "vs rolling avg of prior batches" (verbatim — change would break user mental model).
- Value rendered in `text-display-numeric`, label in `.text-label uppercase text-muted-foreground`.

**Value + trend layout CHANGES (CONTEXT locked):**
- **Today:** value and trend on the same baseline (line 133: `<div className="flex items-baseline">`).
- **New:** value on its own line; trend on a **second line below** with explanatory phrase appended (`↑ +2.1% vs rolling avg of prior batches`). The phrase that currently lives in a tooltip moves to the visible surface. Card grows slightly taller.

## getPolarity Signature (verified)

**Path:** `@/lib/computation/metric-polarity` → resolves to `src/lib/computation/metric-polarity.ts`.

**Signature:**
```ts
export type MetricPolarity = 'higher_is_better' | 'lower_is_better';
export function getPolarity(metric: string): MetricPolarity;
// Defaults to 'higher_is_better' for unknown metrics.
```

**Known metrics:** `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED`, `RAITO_FIRST_TIME_CONVERTED_ACCOUNTS`, `TOTAL_COLLECTED_LIFE_TIME`, `COLLECTION_AFTER_6_MONTH`, `COLLECTION_AFTER_12_MONTH`, `TOTAL_ACCOUNTS_WITH_PAYMENT`, `TOTAL_ACCOUNTS_WITH_PLANS`, `AVG_AMOUNT_PLACED` (lower_is_better), `AVG_EXPERIAN_CA_SCORE`, `OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED`, `OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED`.

**Confidence:** HIGH. Stable API, untouched since Phase 15. Reuse directly in StatCard.

## Stale/Cached Signal Trace

**Current state:** No runtime signal exists for "this data came from static cache" that reaches the UI. Here's the trace:

- `src/lib/static-cache/fallback.ts` exposes `isStaticMode()` — server-only, returns `true` when `SNOWFLAKE_ACCOUNT` or `SNOWFLAKE_USERNAME` env vars are missing.
- `src/app/api/data/route.ts:12` and `src/app/api/accounts/route.ts:23` gate on `isStaticMode()` and serve cached JSON via `getStaticBatchData()` / `getStaticAccountData()`.
- **The response shape is identical whether from Snowflake or cache.** `DataResponse` (at `src/types/data.ts`) has only `data`, `meta: { rowCount, fetchedAt, columns }`, and `schemaWarnings?`. No `source` or `isCached` field.
- `src/contexts/data-freshness.tsx` exposes `fetchedAt` + `isFetching`; header uses them to show a freshness dot but has no "cached vs live" distinction.
- Static-cache JSON files contain real-looking `fetchedAt` timestamps (normalized from the original Snowflake responses), so even `fetchedAt` can't be used as a heuristic — it was set when the cache snapshot was captured, not now.

**Implication for Phase 29:**

Option A (prop-surface-only): StatCard accepts `stale?: boolean` prop and renders the badge when `true`. Don't wire any consumer in Phase 29. Leave it dead-coded but discoverable. Document as "awaits `DataResponse.meta.source` field — future phase."

Option B (ship plumbing now): Add `source: 'cache' | 'snowflake'` to `DataResponse.meta`, thread through `data-freshness` context, expose via a new hook (`useDataSource()`), wire StatCard consumer. Significantly expands scope.

**Recommendation: Option A.** Phase 29's job is patterns, not new data plumbing. Prop surface is correct; wiring is a follow-on. This matches CONTEXT's stated intent: "StatCard renders all first-class states" — rendering is shipped, live signal is deferred. Plan should flag this explicitly.

## Comparison-Mode Data Shape

**Current state:** No existing UI renders a partner vs benchmark StatCard pair.

**Existing comparison surfaces:**
- `PartnerComparisonMatrix` (`src/components/cross-partner/comparison-matrix.tsx`) — heatmap/bar/plain-table of ranked partners; **not** a two-value card pair.
- `CrossPartnerTrajectoryChart` — multi-line chart with portfolio-avg and best-in-class reference lines.
- `PartnerNormsProvider` at `src/contexts/partner-norms.tsx` — exposes `norms: Record<string, MetricNorm> | null` where `MetricNorm = { mean: number; stddev: number; count: number }`. This is the **closest** to a "benchmark" the app has.

**Data-shape recommendation:** StatCard's comparison mode takes two value/label/trend triplets (or one plus an override). Suggested prop surface:

```ts
interface StatCardProps {
  // ... canonical props (label, value, trend, loading, error, stale, noData, insufficientData, icon)
  comparison?: {
    label: string;     // e.g. "Portfolio avg"
    value: string;     // pre-formatted
    trend?: KpiTrend;  // optional second trend
  };
}
```

When `comparison` is set, StatCard renders a two-column grid with the primary value on the left and the comparison value on the right, shared label overline above. **No existing consumer today — ship the prop surface and wire it in a future feature phase.**

**Confidence:** MEDIUM. CONTEXT locks that comparison mode must exist and describes the intent ("two values side-by-side for cross-partner drill-ins"), but the consumer surface that will wire it doesn't exist yet. Design the shape defensively — prefer fully-formatted string values (like today's `value` prop) to avoid formatting/polarity coupling.

## Existing Skeleton Patterns

**Canonical component:** `src/components/ui/skeleton.tsx` (13 LOC):

```tsx
function Skeleton({ className, ...props }) {
  return (
    <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  );
}
```

**Existing StatCard-equivalent skeleton usage:** `kpi-summary-cards.tsx` lines 56-65:

```tsx
{Array.from({ length: 6 }).map((_, i) => (
  <div key={i} className="rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised">
    <Skeleton className="mb-2 h-7 w-20" />
    <Skeleton className="h-4 w-14" />
  </div>
))}
```

**Recommendation:** StatCard's `loading` state reuses `<Skeleton>` from `@/components/ui/skeleton`. Shape: one `h-7 w-20` block for the value + one `h-4 w-14` block for the label (matches today's grid shell). When `trend` is expected, add a second-line `h-3 w-24` skeleton. Keep the `animate-pulse` built-in; Phase 30 will formalize motion.

After migration, the `kpi-summary-cards.tsx` loading-branch block (lines 55-66) gets replaced by a grid of `<StatCard loading />` — same visual result, one fewer code shape to maintain.

**Confidence:** HIGH.

## Existing Empty-State Copy

**`src/components/empty-state.tsx` (no-data variant):**
- Icon: `<SearchX className="h-10 w-10 text-muted-foreground/40" />`
- Title: **"No data matches your filters"**
- Description: **"Try adjusting your filters or refreshing the data"**
- Layout: `flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center`

**`src/components/filters/filter-empty-state.tsx` (no-results variant):**
- No icon today.
- Message: **"No rows match the filter"** (text-body, text-muted-foreground)
- CTA: `<button ...>Clear filter</button>` (text-body text-primary, hover:underline)
- Layout: `flex flex-col items-center justify-center py-16 text-center`

**Copy mismatch to resolve:** The current `EmptyState` uses the `SearchX` icon but shows "No data matches your filters" copy — this is **really** a no-results state, not a no-data state. CONTEXT's no-data variant should get **new copy** like "No batches loaded yet" with the `Database` icon. The existing copy "No data matches your filters" migrates cleanly into the **no-results** variant.

**Suggested variant defaults (Claude's Discretion):**

| Variant | Icon | Default title | Default description | Default CTA |
|---------|------|---------------|---------------------|-------------|
| `no-data` | `Database` (h-10 w-10 text-muted-foreground/40) | "No data yet" | "Data will appear here once batches load." | none (or null) |
| `no-results` | `SearchX` (h-10 w-10 text-muted-foreground/40) | "No data matches your filters" | "Try adjusting your filters or refreshing the data." | "Clear filters" (calls `action` prop) |
| `error` | `AlertTriangle` (h-10 w-10 text-error-fg/70) | "Something went wrong" | "We couldn't load this section. Please try again." | "Retry" (calls `action` prop) |
| `permissions` | `Lock` (h-10 w-10 text-muted-foreground/40) | "No access" | "You don't have permission to view this section." | none |

**Call-site migration:**
- `data-display.tsx:440` `<EmptyState />` → `<EmptyState variant="no-results" onAction={/* no clear-action at this level */} />` OR keep it `no-data` if the semantic intent was "there is no data in the dataset at all" (zero-batch initial-load). Given the check is `!data || data.data.length === 0` (after `isLoading`/`isError` are handled), the semantic is **no-data** — dataset is empty. Recommend migrating to `<EmptyState variant="no-data" />` with the new copy.
- `data-table.tsx:342` `<FilterEmptyState onClearFilters={clearAll} />` → `<EmptyState variant="no-results" onAction={clearAll} />` (preserves today's "Clear filter" behavior).

**Confidence:** HIGH on the existing copy; MEDIUM on the new defaults (Claude's Discretion per CONTEXT).

## `/tokens` Page Structure

**Entry point:** `src/app/tokens/page.tsx` (21 LOC). Sets `metadata.robots = { index: false, follow: false }` (unlisted). Renders `<TokenBrowser />`.

**Main browser:** `src/components/tokens/token-browser.tsx` (99 LOC). Uses `@base-ui/react/tabs` (NOT shadcn — no shadcn Tabs wrapper in repo; this is the canonical tabs choice until one is added).

**Current 5 tabs:**
1. Spacing → `<SpacingRuler />`
2. Typography → `<TypeSpecimen />` (already contains a `SectionHeader (DS-10)` demo section at lines 153-193)
3. Surfaces & Shadows → `<ColorSwatch category="surfaces" />` + `<ShadowSample />`
4. Motion → `<MotionDemo />`
5. Colors → `<ColorSwatch category="accent-state/neutrals/chart/interaction" />`

**Section pattern (observed in `type-specimen.tsx:153-193`):**
```tsx
<section className="flex flex-col gap-stack">
  <h2 className="text-heading">Component Name (DS-XX)</h2>
  <p className="text-body text-muted-foreground">Description with inline <code>props</code>.</p>
  <div className="flex flex-col gap-stack p-card-padding bg-surface-raised rounded-lg">
    <ComponentDemo />
  </div>
  {/* ... more demo blocks */}
</section>
```

**Phase 29 addition:** Add a new top-level tab **"Component Patterns"** (6th tab) to `TokenBrowser`. New panel renders a `<ComponentPatternsSpecimen />` (new file at `src/components/tokens/component-patterns-specimen.tsx`) with one section per pattern, each following the established `<section>` pattern above. Every pattern variant gets a live demo:

- **StatCard:** value, loading, error, no-data, insufficient-data, stale, comparison (7 demos — one per state).
- **DataPanel:** header-only, header+content, header+content+footer (metadata line), header+content+footer (action cluster), header+content+footer (aggregate row). All with live SectionHeader variations.
- **SectionHeader:** already demoed in type-specimen.tsx; optionally move that section under the new "Component Patterns" tab for co-location, OR leave it and cross-link.
- **ToolbarGroup:** 3-cluster demo mirroring the actual unified-toolbar shape.
- **EmptyState:** 4 variants (no-data, no-results, error, permissions) with and without CTA overrides.

**Allowlist status:** `src/app/tokens` and `src/components/tokens` are already in BOTH grep guards' EXCLUDE_DIRS lists. No allowlist edit needed for this section of work.

**Confidence:** HIGH.

## Existing Grep-Guard Pattern (for check:components)

**Templates:** `scripts/check-type-tokens.sh` (64 lines) and `scripts/check-surfaces.sh` (87 lines). Both:
- Shebang: `#!/usr/bin/env bash`
- Flags: `set -euo pipefail`
- Use POSIX `find` + `grep -nE` (NOT ripgrep — see STATE.md decision, ripgrep not guaranteed in CI / on Vercel build image)
- EXCLUDE_DIRS array: `src/components/ui`, `src/app/tokens`, `src/components/tokens`
- Build file list via `find src -type f \( -name '*.ts' -o -name '*.tsx' -o ... \) -not -path 'src/components/ui/*' -not -path 'src/app/tokens/*' -not -path 'src/components/tokens/*'`
- Run multiple checks sequentially; accumulate `FAIL=1`; exit 1 at end if any check tripped
- Print "✅ ..." on clean pass

**npm wiring (`package.json`):**
```json
"check:tokens": "bash scripts/check-type-tokens.sh",
"check:surfaces": "bash scripts/check-surfaces.sh"
```

**CI wiring status:** Per STATE.md Phase 27-06 decision, CI wiring (Vercel build step / pre-commit / GitHub Actions) is **user-owned, one-line change, not shipped by Claude**. Same pattern applies to Phase 29.

**`scripts/check-components.sh` design (recommended):**

```bash
#!/usr/bin/env bash
set -euo pipefail
# Phase 29 component-pattern enforcement.
# Asserts zero imports of legacy components after full migration.
# Mirrors check-type-tokens.sh / check-surfaces.sh POSIX pattern.

FAIL=0

files_to_check() {
  find src -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \)
}

echo "Checking for imports of deleted legacy components…"
# Legacy: kpi-card, empty-state, filter-empty-state
LEGACY_HITS=$(files_to_check | xargs grep -nE \
  "from ['\"]@/components/(kpi/kpi-card|empty-state|filters/filter-empty-state)['\"]" \
  2>/dev/null || true)
if [ -n "$LEGACY_HITS" ]; then
  echo "$LEGACY_HITS"
  echo "❌ Found imports of deleted legacy components. Use StatCard / EmptyState from @/components/patterns/." 1>&2
  FAIL=1
fi

echo ""
echo "Checking for ad-hoc vertical dividers in toolbars…"
# Catches the exact pattern ToolbarGroup is meant to replace.
# Allowlisted: src/components/patterns itself (the ToolbarGroup definition).
DIVIDER_HITS=$(files_to_check \
  | grep -v '^src/components/patterns/' \
  | xargs grep -nE 'h-4 w-px bg-border' 2>/dev/null || true)
if [ -n "$DIVIDER_HITS" ]; then
  echo "$DIVIDER_HITS"
  echo "❌ Found ad-hoc vertical dividers. Use <ToolbarGroup> from @/components/patterns/toolbar-group." 1>&2
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then exit 1; fi
echo "✅ Component patterns enforced — no legacy imports, no ad-hoc toolbar dividers."
```

**`package.json` additions:**
```json
"check:components": "bash scripts/check-components.sh"
```

**Allowlist decisions (document inline in the script):**
- `src/components/patterns/**` is the new home for patterns — NOT excluded (patterns themselves shouldn't import legacy).
- `src/components/tokens/**` (demo surface) is also NOT excluded — if the /tokens page wants to show a "deprecated" example it should be a comment, not an actual import.
- `src/components/ui/**` is NOT excluded — shadcn primitives shouldn't reach for these legacy components.

**Confidence:** HIGH.

## Lucide Icons Inventory

**Package:** `lucide-react@1.8.0` (verified via `node_modules/lucide-react/package.json`). NOTE: Lucide React's namespace is independent and the 1.8.0 branch is current for this project — not to be confused with the older `0.x` series you may see elsewhere. The repo uses lucide-react in 41 files.

**Required icons for Phase 29:**
- **EmptyState variants:** `Database` (no-data), `SearchX` (no-results — already used in empty-state.tsx), `AlertTriangle` (error — already used in 4 files incl. empty-state-error context), `Lock` (permissions).
- **StatCard states:** `AlertTriangle` or `CircleAlert` for error state (reuse existing `AlertTriangle` for consistency); `Database` for stale/cached badge (or `Archive` / `Clock` / `CloudOff` — Claude's Discretion).
- **Optional StatCard label-icon slot:** caller-provided Lucide icon (any). The StatCard API accepts `icon?: LucideIcon` or `icon?: ReactNode`. Recommend accepting `ReactNode` for flexibility (matches how shadcn `Button` takes icons).

All icons are in lucide-react's default export. No new dependency needed.

**Confidence:** HIGH.

## Test Architecture

**Test framework installed:** None. There's no `jest`, `vitest`, `@testing-library/*`, `playwright`, or equivalent in `package.json` dependencies or devDependencies. No `test` script. Existing script invocations:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "check:tokens": "bash scripts/check-type-tokens.sh",
  "check:surfaces": "bash scripts/check-surfaces.sh"
}
```

**Per CONTEXT:** Phase 29 does NOT add unit tests. The grep guard + `/tokens` live demos + `npm run build` are the test surface. This matches Phase 27's and Phase 28's pattern exactly.

**Execution:** `npm run check:components` is invoked manually by developers (or in CI once wired). `npm run build` proves the migration compiles and there are no dangling imports. Visual QA happens on `/tokens` and on the migrated routes (home + partner drill + batch drill).

**Phase 28 precedent:** scripts/check-surfaces.sh was wired into CI as a user-owned follow-up. Phase 29 should ship the script + npm alias; CI enablement is user-owned.

**Confidence:** HIGH.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── patterns/                         # NEW — component patterns live here
│   │   ├── stat-card.tsx                 # StatCard (canonical stat display)
│   │   ├── data-panel.tsx                # DataPanel (surface wrapper)
│   │   ├── empty-state.tsx               # EmptyState (4 variants — REPLACES src/components/empty-state.tsx)
│   │   ├── toolbar-group.tsx             # ToolbarGroup (divider-wrapped button clusters)
│   │   └── index.ts                      # re-exports for ergonomic imports
│   ├── layout/
│   │   └── section-header.tsx            # existing (Phase 27) — extend ONLY if DataPanel needs it
│   ├── kpi/
│   │   ├── kpi-card.tsx                  # DELETED in this phase
│   │   └── kpi-summary-cards.tsx         # KEEP — re-points to StatCard
│   ├── empty-state.tsx                   # DELETED in this phase
│   ├── filters/
│   │   └── filter-empty-state.tsx        # DELETED in this phase
│   └── tokens/
│       └── component-patterns-specimen.tsx  # NEW — /tokens "Component Patterns" tab content
└── ...

scripts/
├── check-type-tokens.sh                  # existing
├── check-surfaces.sh                     # existing
└── check-components.sh                   # NEW
```

### Pattern 1: Composed component over primitive export

**What:** Each pattern is a single default-export function component that composes shadcn primitives + existing tokens. No class-variance-authority overhead unless variants multiply.

**When to use:** For all five Phase 29 patterns.

**Example:**
```tsx
// Source: derived from src/components/kpi/kpi-card.tsx + CONTEXT locks
'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { getPolarity } from '@/lib/computation/metric-polarity';

export interface StatCardTrend {
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  metric: string;              // Snowflake metric name for polarity lookup
}

export interface StatCardProps {
  label: string;
  value: string;
  trend?: StatCardTrend | null;
  icon?: ReactNode;            // optional label-icon slot (Lucide or custom)
  loading?: boolean;
  error?: { message?: string } | boolean;
  noData?: boolean;
  noDataReason?: string;
  insufficientData?: boolean;
  batchCount?: number;
  stale?: boolean;             // prop surface only — upstream signal TBD (see RESEARCH Pitfall 1)
  comparison?: { label: string; value: string; trend?: StatCardTrend };
}

// Canonical chassis (same recipe as today's KpiCard — Phase 28 locked)
const CARD_CLASSES =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';

export function StatCard(props: StatCardProps) {
  if (props.loading) {
    return (
      <div className={CARD_CLASSES}>
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-4 w-14" />
      </div>
    );
  }
  // ... error / noData / insufficientData / comparison / default branches
}
```

### Pattern 2: Composition over wrapping for DataPanel

**What:** DataPanel internally renders `<SectionHeader {...headerProps}>` — it does NOT fork or duplicate SectionHeader's logic. Header props pass through.

**When to use:** For DataPanel — any time you'd reach for shadcn `<Card>` + `<CardHeader>` + `<CardContent>`, use `<DataPanel>` instead.

**Example:**
```tsx
// Source: derived from existing shadcn Card pattern + CONTEXT locks
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/layout/section-header';

interface DataPanelProps {
  title: string;                     // required — flows to SectionHeader
  eyebrow?: string;                  // flows to SectionHeader
  description?: string;              // flows to SectionHeader
  actions?: ReactNode;               // flows to SectionHeader
  children: ReactNode;               // content slot — required
  footer?: ReactNode;                // optional footer slot
  className?: string;
  contentClassName?: string;
}

export function DataPanel({
  title, eyebrow, description, actions, children, footer, className, contentClassName,
}: DataPanelProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised',
        className
      )}
    >
      <SectionHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
      <div className={cn('mt-stack', contentClassName)}>{children}</div>
      {footer && (
        <div className="mt-stack pt-stack border-t border-border">{footer}</div>
      )}
    </div>
  );
}
```

### Pattern 3: ToolbarGroup as pure wrapper

**What:** ToolbarGroup is a thin flex wrapper that renders its children inline. Adjacent ToolbarGroups are separated by a shared divider recipe. No magic — one token for spacing, one for divider.

**When to use:** Inside any toolbar (`unified-toolbar`, DataPanel `actions`, comparison-matrix header).

**Example:**
```tsx
// Source: derived from src/components/toolbar/unified-toolbar.tsx:168, :236, :135
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarGroupProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>{children}</div>
  );
}

// Usage: place <ToolbarGroup> siblings separated by a shared divider.
// Recipe inline in the parent toolbar — no wrapping "ToolbarRow".
// <ToolbarGroup>...</ToolbarGroup>
// <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />  {/* or a constant */}
// <ToolbarGroup>...</ToolbarGroup>
```

**Alternative:** Ship a `<ToolbarDivider />` sibling component for the divider itself so the grep guard can target it exactly. Recommended — keeps the pattern self-contained.

### Anti-Patterns to Avoid

- **Do not fork `SectionHeader` inside DataPanel.** Compose it. If DataPanel grows a feature SectionHeader doesn't support, extend SectionHeader — don't duplicate.
- **Do not re-introduce raw shadow utilities** (`shadow-sm`, `shadow-md`, etc.) in pattern files. Phase 28's `check:surfaces` guard will catch this. Use `shadow-elevation-raised`.
- **Do not ship parallel-support aliases** (e.g. `KpiCard = StatCard`). CONTEXT explicitly forbids this: "no parallel support, no `@deprecated` window, no alias re-exports."
- **Do not move pattern logic into the /tokens demo file.** The demo file consumes the patterns; patterns live in `src/components/patterns/`.
- **Do not add `size` variants to StatCard.** CONTEXT locks single canonical size.
- **Do not manage scroll/height in DataPanel content slot.** CONTEXT explicit: "Hands-off. DataPanel does not manage height, overflow, or scroll."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trend polarity color logic | Hand-roll a direction+metric → color function | Import `getPolarity()` from `@/lib/computation/metric-polarity` | Single source of truth; 11 known metrics + default; tested-in-use since Phase 15. |
| Skeleton animation | Custom `@keyframes` or framer-motion shimmer | `<Skeleton>` from `@/components/ui/skeleton` | Already uses `animate-pulse bg-muted rounded-md`. Phase 30 will formalize; don't pre-invent. |
| SectionHeader composition | Fork SectionHeader inside DataPanel | Compose `<SectionHeader {...headerProps}>` | Single source of truth for heading rhythm; extension in one place reaches all call sites. |
| Tooltip primitives | Hand-roll popover for trend tooltips | `@/components/ui/tooltip` (shadcn) | Already used in KpiCard; consistent keyboard + portal behavior. |
| Divider recipe | Invent a divider variant per toolbar | Single `h-4 w-px bg-border` string (or a small `<ToolbarDivider />` sibling component) | Three existing sites use the same recipe; normalize. |
| Icon library | ASCII glyphs or custom SVG | `lucide-react` | Already in repo with 41 importers; `Database`, `SearchX`, `AlertTriangle`, `Lock` all present. |
| Grep guard shell tooling | ripgrep-based or Node-based guard | POSIX `find | xargs grep -nE` following `check-type-tokens.sh` / `check-surfaces.sh` | Per STATE.md Phase 27 decision: ripgrep not guaranteed in CI / Vercel build. |
| Em-dash for no-data / insufficient | Hand-written `"—"` string | Unicode escape `'\u2014'` (preserves today's behavior) | Matches existing KpiCard code exactly; avoids codepoint-linter flags. |

**Key insight:** Phase 29 adds **no new dependencies**. Everything needed is already in the repo — this is pure composition work.

## Common Pitfalls

### Pitfall 1: Stale-badge prop ships without live signal
**What goes wrong:** StatCard accepts a `stale?: boolean` prop, the CI passes, `/tokens` demo looks great, but no production call site ever passes `stale={true}` because the data layer has no signal.
**Why it happens:** `DataResponse.meta` doesn't include a `source` field; `isStaticMode()` is server-only; the cache-vs-live distinction is invisible to the UI tree.
**How to avoid:** Document explicitly in the StatCard plan that `stale` is a prop surface only in Phase 29. Consumers wire `stale={false}` everywhere; the /tokens demo shows `stale={true}` for visual QA. Add a follow-up TODO to STATE.md's Pending Todos: "Extend DataResponse.meta with `source: 'cache' | 'snowflake'` and thread through data-freshness context so StatCard.stale has a live signal."
**Warning signs:** Reviewer asks "where does `stale` come from?" and finds no answer. Add an inline comment above the prop.

### Pitfall 2: Comparison-mode prop shape doesn't match future consumer
**What goes wrong:** Comparison mode ships with one shape, a future cross-partner feature phase needs a different shape (e.g. n values instead of 2, or a different trend representation), and we end up with a breaking rename.
**Why it happens:** No existing consumer exists; the shape is inferred from CONTEXT's one-line description.
**How to avoid:** Keep the comparison API minimal and string-biased (`value: string`, not `value: number`). Match StatCard's existing value-as-formatted-string convention. Ship the 2-value case only; extension to n-value is a future refactor.
**Warning signs:** Plan starts discussing "what if there are 3 benchmarks?" — stop, lock the 2-value contract per CONTEXT.

### Pitfall 3: EmptyState `no-data` vs `no-results` confusion
**What goes wrong:** Migrators pick the wrong variant. `data-display.tsx:440` currently uses the legacy EmptyState which says "No data matches your filters" (semantically no-results) but renders when the dataset itself is empty (semantically no-data).
**Why it happens:** The legacy EmptyState conflates the two cases; copy says results-like, trigger condition says data-like.
**How to avoid:** In the migration task, read each call site and classify by trigger condition, not by existing copy. Zero-length dataset = `no-data`. Filter produced zero rows = `no-results`. Fetch failed = `error` (but Phase 29's error variant is section-scoped — the full-page `<ErrorState>` fallback stays).
**Warning signs:** Copy review finds a `no-data` variant used where filters are active. Trace back to trigger condition.

### Pitfall 4: DataPanel swallows shadcn `Card`'s `size="sm"` behavior
**What goes wrong:** Today's shadcn `<Card>` in `comparison-matrix.tsx` and `trajectory-chart.tsx` implicitly uses `size="default"` (py-4). DataPanel's `p-card-padding` may not match pixel-for-pixel. Visual regression.
**Why it happens:** `shadcn Card` padding recipe (`gap-4 py-4` + `CardContent px-4`) is different from `p-card-padding` (4-sided uniform).
**How to avoid:** Visual QA on each migrated panel. Compare before/after screenshots. Adjust DataPanel internal spacing to match today if a regression appears. CONTEXT's "DataPanel is pure visual chrome" gives room to tune.
**Warning signs:** `/tokens` demo looks tighter or looser than the existing matrix/chart cards in the live app.

### Pitfall 5: ToolbarGroup breaks conditional rendering in unified-toolbar
**What goes wrong:** `unified-toolbar.tsx` conditionally renders several buttons (`PresetDropdown`, `HeatmapToggle`, `FilterPopover`) based on `isRoot`. Naive ToolbarGroup wrapping may render empty groups or dividers next to nothing.
**Why it happens:** Divider recipe is independent of its neighbor groups; when a group is empty, the divider remains.
**How to avoid:** Either render `<ToolbarGroup>` only when at least one child is present, or move the divider inside ToolbarGroup's "leading" prop so it hides with the group. Safer: check children with `React.Children.count`.
**Warning signs:** Non-root drill level shows a stray divider with no buttons on one side.

### Pitfall 6: type-token / surface-token guards fail on pattern files
**What goes wrong:** Pattern files use a paired `font-medium` somewhere (e.g. on a trend arrow) and `check:tokens` fails even though the pattern is correct.
**Why it happens:** Phase 27 strict weight policy forbids paired weights. Arrow glyphs historically had a carve-out; see STATE.md Phase 27-03 trend-arrow decision and Phase 27-06 closure.
**How to avoid:** Compose trend arrow as `text-label` (which bakes weight 500) — never pair `text-caption font-medium` or equivalent. Follow the Phase 27-06 pattern that closed kpi-card trend-delta and trend-indicator arrow.
**Warning signs:** `npm run check:tokens` reports a hit inside `src/components/patterns/`. Fix by dropping the paired weight; never add `patterns/` to the allowlist.

### Pitfall 7: /tokens Component Patterns section crashes without providers
**What goes wrong:** StatCard uses `Tooltip` (wraps `TooltipProvider`?); comparison-matrix-shaped DataPanel demo needs `CrossPartnerContext`.
**Why it happens:** Real call sites have providers up the tree; /tokens does not.
**How to avoid:** Each /tokens demo passes fully-formatted props — no provider-dependent data. StatCard on /tokens uses hardcoded trend metrics (`metric: 'PENETRATION_RATE_POSSIBLE_AND_CONFIRMED'`). DataPanel on /tokens wraps a placeholder div, not a real chart. Tooltip primitive may need a `TooltipProvider` wrapped around the StatCard demo section — check at wire-up.
**Warning signs:** /tokens page throws "must be used within a XProvider".

### Pitfall 8: Deleting legacy files mid-migration leaves dangling imports
**What goes wrong:** A plan deletes `src/components/empty-state.tsx` before every importer is migrated; `npm run build` fails.
**Why it happens:** Plans execute tasks in waves; delete task runs before migration task completes.
**How to avoid:** Within each pattern plan, strict ordering: (1) ship pattern file, (2) migrate every importer, (3) `npm run build` green, (4) delete legacy file, (5) run grep guard, (6) `npm run build` green again. Don't split delete into a separate plan.
**Warning signs:** `npm run build` fails with "Cannot find module '@/components/empty-state'".

## Code Examples (Verified Patterns)

### Canonical stat card chassis
```tsx
// Source: src/components/kpi/kpi-card.tsx:52
const CARD_CLASSES =
  'rounded-lg bg-surface-raised p-card-padding shadow-elevation-raised transition-colors duration-quick ease-default';
```

### Polarity-aware trend color recipe
```tsx
// Source: src/components/kpi/kpi-card.tsx:98-110
const polarity = getPolarity(trend.metric);
const isPositive =
  (trend.direction === 'up' && polarity === 'higher_is_better') ||
  (trend.direction === 'down' && polarity === 'lower_is_better');

let colorClass: string;
if (trend.direction === 'flat') {
  colorClass = 'text-muted-foreground';
} else if (isPositive) {
  colorClass = 'text-success-fg';
} else {
  colorClass = 'text-error-fg';
}
```

### Em-dash no-data pattern (verbatim)
```tsx
// Source: src/components/kpi/kpi-card.tsx:58-68
<Tooltip>
  <TooltipTrigger className="block w-full text-left">
    <div className="text-display-numeric text-muted-foreground">
      {'\u2014'}
    </div>
    <div className="text-label uppercase text-muted-foreground">{label}</div>
  </TooltipTrigger>
  <TooltipContent>{noDataReason ?? 'No data available'}</TooltipContent>
</Tooltip>
```

### Insufficient-data trend tooltip (verbatim copy)
```tsx
// Source: src/components/kpi/kpi-card.tsx:77-88
const tooltipText =
  batchCount === 1
    ? '1 batch \u2014 no trend yet'
    : 'Need 3+ batches for trending';
```

### Empty-state layout (reuse verbatim)
```tsx
// Source: src/components/empty-state.tsx:5-16
<div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
  <SearchX className="h-10 w-10 text-muted-foreground/40" />
  <div className="space-y-1">
    <p className="text-heading text-foreground">...</p>
    <p className="text-body text-muted-foreground">...</p>
  </div>
</div>
```

### Vertical toolbar divider (3 existing sites)
```tsx
// Source: src/components/toolbar/unified-toolbar.tsx:168 and :236
<div className="mx-0.5 h-4 w-px bg-border" />

// Source: src/components/cross-partner/comparison-matrix.tsx:110 (tighter margin)
<span className="mx-1 h-4 w-px bg-border" />
```

### SectionHeader signature (existing — reuse as-is)
```tsx
// Source: src/components/layout/section-header.tsx:16-22
interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}
```

### POSIX grep guard structure
```bash
# Source: scripts/check-type-tokens.sh + scripts/check-surfaces.sh
#!/usr/bin/env bash
set -euo pipefail
FAIL=0
files_to_check() {
  find src -type f \( -name '*.ts' -o -name '*.tsx' -o ... \)
}
HITS=$(files_to_check | xargs grep -nE 'PATTERN' 2>/dev/null || true)
if [ -n "$HITS" ]; then echo "$HITS"; echo "❌ …" 1>&2; FAIL=1; fi
if [ "$FAIL" -eq 1 ]; then exit 1; fi
echo "✅ …"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `KpiCard` with inline value+trend | `StatCard` with value + trend-on-second-line + explanatory phrase | Phase 29 | Cards grow slightly taller; explanatory text moves from tooltip to visible surface. |
| Two empty-state files with inconsistent icons/copy | Single `EmptyState` with 4 variants (no-data, no-results, error, permissions) | Phase 29 | One mental model; sensible defaults; per-variant CTA. |
| Ad-hoc `<Card>` + `<CardHeader>` + `<CardTitle>` + action cluster | `<DataPanel header={...} actions={...}>` composing `SectionHeader` | Phase 29 | Consistent panel rhythm; SectionHeader extensions reach every panel at once. |
| Inline `<div className="mx-0.5 h-4 w-px bg-border" />` dividers | `<ToolbarGroup>` wrappers with a shared divider recipe | Phase 29 | Grep-guardable; visually uniform. |
| No CI enforcement of component-pattern usage | `scripts/check-components.sh` POSIX grep guard | Phase 29 | Mirrors Phase 27/28 enforcement precedent; zero-install. |

**Deprecated/outdated:**
- `src/components/kpi/kpi-card.tsx` → deleted, replaced by `src/components/patterns/stat-card.tsx`.
- `src/components/empty-state.tsx` → deleted, replaced by `src/components/patterns/empty-state.tsx`.
- `src/components/filters/filter-empty-state.tsx` → deleted, replaced by `<EmptyState variant="no-results" onAction={...} />`.

## Open Questions

1. **Should StatCard `stale` be a prop surface only, or should Phase 29 ship the full data plumbing?**
   - What we know: No runtime signal exists; `DataResponse.meta` has no `source` field; `isStaticMode()` is server-only.
   - What's unclear: Whether the user wants the plumbing done now or deferred.
   - Recommendation: Ship prop surface only (Option A above). Add a Pending Todo in STATE.md for the plumbing. Let planner decide; this is a ~1-day follow-up if user prefers Option B.

2. **Where does StatCard comparison mode get wired live?**
   - What we know: Data exists (`partnerStats?.norms`). No UI consumes side-by-side StatCards today.
   - What's unclear: Whether a cross-partner drill-in view in Phase 29 will be the first consumer, or whether it's reserved for a future feature phase.
   - Recommendation: Ship prop surface only. No Phase 29 call site uses `comparison`. /tokens demo shows it. Document as "awaits cross-partner drill-in UI — future phase."

3. **Query-surface panels (`query-search-bar`, `query-response`) — DataPanel or leave as-is?**
   - What we know: These are the two remaining `rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding` shells not claimed by a DataPanel migration. They're headerless.
   - What's unclear: CONTEXT locks "Every panel has a title. No headerless panels." → these cannot become DataPanels without violating the contract.
   - Recommendation: Leave as-is. They're shells, not panels. Add a `check:surfaces` allowlist note if any post-Phase-29 refactor rethinks this.

4. **Does `/tokens` need a dedicated "Component Patterns" tab, or should patterns slot into existing tabs?**
   - What we know: 5 tabs today (Spacing / Typography / Surfaces & Shadows / Motion / Colors); `SectionHeader` demo already lives under Typography.
   - What's unclear: UX preference — does a 6th tab feel right or overstuffed?
   - Recommendation: 6th tab labeled "Component Patterns". Move `SectionHeader (DS-10)` section from Typography into the new tab for co-location. If user prefers fewer tabs, nest patterns inside a new "Components" top-level section inside Typography-adjacent layout — but 6 tabs is cleaner.

5. **Does `ToolbarGroup` own its divider, or is divider a sibling `<ToolbarDivider />`?**
   - What we know: 3 existing divider sites. Some conditional (comparison-matrix at bar mode hides divider).
   - What's unclear: Ergonomics of "ToolbarGroup with optional trailing divider prop" vs "ToolbarDivider sibling component".
   - Recommendation: Ship `<ToolbarGroup>` + sibling `<ToolbarDivider />` (two tiny components). Grep guard targets `h-4 w-px bg-border` outside patterns directory. Sibling pattern lets conditional rendering stay readable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed. Existing enforcement = POSIX grep guards + `npm run build` + manual `/tokens` visual QA |
| Config file | none — see Wave 0 / N/A (no test framework) |
| Quick run command | `npm run check:components` (new) + `npm run build` |
| Full suite command | `npm run check:tokens && npm run check:surfaces && npm run check:components && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DS-18 | StatCard renders all first-class states at canonical size with polarity-aware trend on second line | grep + visual | `npm run check:components` (zero imports of `kpi-card`) + `/tokens` visual QA of 7 states | ❌ — script to add in Phase 29 Plan |
| DS-19 | DataPanel exposes header/content/footer slots; header composes SectionHeader | grep + visual + build | `npm run build` (migration compiles) + `/tokens` visual QA of slot combos | ✅ `npm run build` exists |
| DS-20 | SectionHeader is extended only where DataPanel surfaces a gap | visual | `/tokens` visual QA + diff review of section-header.tsx | N/A — tracked via PR diff |
| DS-21 | ToolbarGroup separates clusters in unified-toolbar with subtle divider | grep + visual | `npm run check:components` (zero ad-hoc `h-4 w-px bg-border` outside patterns) + app visual QA | ❌ — script to add in Phase 29 Plan |
| DS-22 | EmptyState ships 4 variants each with canonical Lucide icon and sensible default CTA | grep + visual | `npm run check:components` (zero imports of legacy `empty-state` / `filter-empty-state`) + `/tokens` visual QA of 4 variants × 2 CTA-override cases | ❌ — script to add in Phase 29 Plan |

**Test categorization:** All Phase 29 validation is a mix of (a) grep-guard CI gates (deterministic, fast, scriptable) and (b) visual smoke tests against `/tokens` and the running app (manual, user-verified per the project's standing preference for visual confirmation before push). Unit tests are NOT added — matches Phase 27/28 precedent and CONTEXT lock.

### Sampling Rate
- **Per task commit:** `npm run check:components` (fast; pure grep)
- **Per wave merge:** `npm run check:tokens && npm run check:surfaces && npm run check:components && npm run build`
- **Phase gate:** Full suite green + `/tokens` visual QA + migrated-routes smoke (home, partner drill, batch drill) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/check-components.sh` — new POSIX grep guard (template in §Existing Grep-Guard Pattern above). Covers DS-18, DS-21, DS-22 via detecting legacy imports and ad-hoc dividers.
- [ ] `package.json` `scripts.check:components` — new npm alias.
- [ ] `src/components/patterns/` — new directory (needs at least a placeholder so the first plan's file has a home).
- [ ] `src/components/tokens/component-patterns-specimen.tsx` — new file for `/tokens` Component Patterns tab.
- [ ] `TokenBrowser` — add 6th tab "Component Patterns" (edit `src/components/tokens/token-browser.tsx`).
- [ ] Pending Todo in STATE.md: "Extend DataResponse.meta with `source: 'cache' | 'snowflake'` to give StatCard.stale a live signal."
- [ ] Pending Todo in STATE.md: "Wire StatCard.comparison prop at first cross-partner drill-in consumer."

*No test framework install required — project-wide decision per CONTEXT and Phase 27/28 precedent.*

## Sources

### Primary (HIGH confidence)
- `src/components/kpi/kpi-card.tsx` — full behavior map (states, recipes, polarity, tooltip copy)
- `src/components/kpi/kpi-summary-cards.tsx` — KpiCard consumer inventory (only importer)
- `src/components/empty-state.tsx` + `src/components/filters/filter-empty-state.tsx` — legacy empty-state source
- `src/components/layout/section-header.tsx` — SectionHeader current signature + layout
- `src/components/toolbar/unified-toolbar.tsx` — toolbar cluster boundaries (lines 168, 236)
- `src/components/cross-partner/comparison-matrix.tsx` — DataPanel target (lines 71-134) + divider (line 110)
- `src/components/cross-partner/trajectory-chart.tsx` — DataPanel target (lines 125-246)
- `src/components/charts/collection-curve-chart.tsx` — DataPanel target (lines 176, 191)
- `src/components/query/query-search-bar.tsx` + `src/components/query/query-response.tsx` — judgment-call panels (headerless shells)
- `src/components/ui/skeleton.tsx` — existing Skeleton primitive (canonical)
- `src/components/ui/card.tsx` — shadcn Card recipe (for pixel-parity matching)
- `src/lib/computation/metric-polarity.ts` — `getPolarity()` full export
- `src/lib/static-cache/fallback.ts` + `src/app/api/data/route.ts` + `src/types/data.ts` — confirmed absence of runtime `source` signal
- `src/contexts/data-freshness.tsx` + `src/components/layout/header.tsx` — freshness context (no "cached" flag)
- `src/contexts/partner-norms.tsx` + `src/types/partner-stats.ts` — MetricNorm data for comparison mode
- `scripts/check-type-tokens.sh` + `scripts/check-surfaces.sh` — grep-guard template + allowlist
- `package.json` — script wiring + lucide-react@1.8.0 verification
- `node_modules/lucide-react/package.json` — installed version confirmed
- `src/app/tokens/page.tsx` + `src/components/tokens/token-browser.tsx` + `src/components/tokens/type-specimen.tsx` — /tokens structure + section pattern
- `.planning/STATE.md` — Phase 27/28 decisions (ripgrep unavailability, CI-wiring-is-user-owned, etc.)

### Secondary (MEDIUM confidence)
- CONTEXT.md locks for default variant copy/icons (Claude's Discretion — recommendations documented above but final copy is planner's / user's call)
- StatCard comparison-mode prop shape (inferred from MetricNorm data; no existing consumer to verify against)

### Tertiary (LOW confidence)
- None. Every claim in this document ties to a concrete file + line number or to a CONTEXT.md lock.

## Metadata

**Confidence breakdown:**
- Call-site inventory: HIGH — exhaustive grep across `src/`, triple-verified (import statement + JSX usage + file path)
- Token integration: HIGH — every token mentioned has grep-verified prior usage in repo
- Pitfalls: HIGH — all 8 pitfalls derive from concrete repo files or CONTEXT locks
- Stale-signal trace: HIGH — confirmed absence across 3 layers (types, API route, context)
- Comparison-mode shape: MEDIUM — no existing consumer; shape recommended defensively

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — codebase is stable and phase scope is small; revisit if any of the Open Questions get answered in a way that changes scope)
