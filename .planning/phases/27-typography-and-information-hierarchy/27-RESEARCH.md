# Phase 27: Typography & Information Hierarchy — Research

**Researched:** 2026-04-17
**Domain:** Typography token migration — applying the 6-tier Phase 26 scale across every text element in a Next.js 16 / Tailwind v4 / shadcn app. Numeric rendering (tabular-nums), overline treatment, shared SectionHeader.
**Confidence:** HIGH on tokens + pilot patterns (first-party, already shipped in Phase 26). MEDIUM on enforcement tooling (ESLint/grep) choice. MEDIUM on Recharts numeric axis styling (verified via community issues).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token mapping rules**
- **Exhaustive migration table first.** Build an upfront ad-hoc-to-token table (e.g., `text-xs → label/caption`, `text-sm → body`, `text-base → title`, `text-lg → title`, `text-xl → heading`, `text-2xl → display`). Apply consistently across the sweep.
- **Tokens own weight and transforms.** Weight (600/500), letter-spacing, and `uppercase` are baked into the token definitions. Drop ad-hoc `font-semibold` / `font-medium` when migrating. `uppercase` lives only on the `label` variant.
- **Outliers: add a token if ≥3 uses.** If the same off-scale size appears in 3+ places (e.g., a giant KPI metric number), introduce a new named token (e.g., `text-metric`). One-offs may stay as documented exceptions, but the default is "promote to a token."
- **Small UI (tooltips, toasts, badges, dialogs, dropdowns) uses standard tokens only.** No separate `ui-small` tier. Dropdown items = `body`, badges/tooltips = `label` or `caption`, dialog titles = `heading`. Keeps the scale tight.

**Overline style**
- **Implemented via the existing `--text-label` token** — don't add a separate `overline` token. `.text-label` is the overline utility.
- **Scope:** KPI card labels + optional section-header eyebrows (category text above the title, e.g., `METRICS`, `COLLECTION CURVES`). Not sprayed across the app.
- **Color:** `muted-foreground`. Overline reads as secondary meta vs. the primary value it labels.
- **Tracking:** keep current `0.04em`. Do not touch unless a visual reason surfaces.

**Section header pattern**
- **Shared `<SectionHeader>` component** with props: `title`, `eyebrow?` (optional overline string), `description?` (optional), `actions?` (ReactNode slot). Minimal version — Phase 29 formalizes the broader component library.
- **Title uses `text-heading`** (1.125rem / 600). Anchors a section cleanly; display stays reserved for page/KPI-level.
- **Actions: ReactNode slot.** Caller passes whatever (button, button group, dropdown). No structured API.
- **Eyebrow rendered via `.text-label`** (muted, uppercase, tracked) above the title when provided.

**Rollout strategy**
- **Pilot → sweep.** Plan 01 delivers the migration table + utilities (tabular-nums helper, updated label semantics, `SectionHeader` skeleton) + one pilot surface (header or KPI cards) to prove the mapping visually. Plan 02+ sweep by surface.
- **Plans grouped by surface, not by token.** One plan per surface: header, KPI cards, table, charts, controls/popovers, remaining. Each plan is independently verifiable visually. Matches Phase 26 cadence.
- **Enforcement: ESLint / grep guard in CI.** After the sweep, a lint rule or simple grep check flags `text-(xs|sm|base|lg|xl|2xl)` and ad-hoc `font-semibold` / `font-medium` outside a short allowlist (e.g., the `/tokens` reference page). Prevents regression mechanically.
- **Tabular figures applied at shared numeric components/classes**, not per-call-site — table body cells, KPI value text, chart axis/tick labels, trend delta text. Single place to verify. Do NOT set tabular-nums globally on `<body>`.

### Claude's Discretion
- Exact surface order inside the sweep plans (pilot choice between header and KPI card can be decided during planning after surveying which has fewer ad-hoc classes).
- Shape of the ESLint rule vs. grep-in-CI (either is fine; pick whichever fits the existing toolchain with least friction).
- Exact migration-table ambiguous cases (e.g., `text-base` → `body` vs. `title`) — resolve with visual diff on the pilot surface, then document the resolution for the rest.
- Whether a `text-metric` outlier token is needed — answer emerges from the audit during the migration-table plan.
- `SectionHeader` internal layout (spacing token, alignment), as long as title/eyebrow/description/actions props hold.

### Deferred Ideas (OUT OF SCOPE)
- **Component library formalization (StatCard, DataPanel, ToolbarGroup, EmptyState)** — Phase 29. `SectionHeader` lands here as a minimal version and will be reviewed/hardened in 29.
- **Surface/elevation application (cards float, tables recede, header shadow)** — Phase 28.
- **Motion / micro-interactions on typography (hover lifts, transitions)** — Phase 30.
- **Accessibility audit of type contrast, reading order, heading structure** — Phase 33.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-07 | Every text element uses a named type scale token — no ad-hoc font size classes | Six tokens already shipped (`--text-display/heading/title/body/label/caption`) in Phase 26 with `--line-height` / `--font-weight` / `--letter-spacing` sub-tokens. Tailwind v4's `--text-*` namespace auto-emits the utilities. Audit found 131 ad-hoc `text-(xs|sm|base|lg|xl|2xl)` occurrences across 55 files. Pilot recipes in `kpi-card.tsx`, `header.tsx`, `table-body.tsx` demonstrate the complete migration pattern. See Standard Stack § Typography Scale and Architecture Patterns § Migration Recipe. |
| DS-08 | All numeric displays use tabular figures (tabular-nums) — table cells, KPI values, chart axes, trend indicators | Three numeric utility variants already shipped: `.text-display-numeric` (Inter, tabular-nums + lining-nums), `.text-body-numeric` (JetBrains Mono), `.text-label-numeric` (JetBrains Mono). Table body already applies via column-type branch (`isNumeric ? 'text-body-numeric text-right' : 'text-body'`) in `table-body.tsx:65`. Chart axes use Recharts `tick={{ }}` prop — see Pattern 4. See Code Examples § Numeric cell pattern. |
| DS-09 | KPI card labels use overline style (uppercase, tracked, smaller) visually distinct from body text | `--text-label` token bakes `letter-spacing: 0.04em` + `font-weight: 500` + size `0.75rem`. Live usage in `kpi-card.tsx:133`: `text-label uppercase text-muted-foreground`. Decision-locked: no separate `overline` token — the `.text-label` class IS the overline utility. See Pattern 2 § Overline. |
| DS-10 | Section headers have consistent heading treatment with optional action slots | No existing `SectionHeader` component in repo — must be created. shadcn's `CardTitle`/`CardHeader` used in only 2 places (trajectory-chart, comparison-matrix). Decision locks the prop contract: `title`, `eyebrow?`, `description?`, `actions?: ReactNode`. Title uses `text-heading`, eyebrow uses `.text-label`. See Pattern 3. |
</phase_requirements>

## Summary

Phase 26 already shipped the typography tokens, the numeric utility classes, and three pilot surfaces (KPI card, header, table row) that demonstrate the complete migration recipe. Phase 27 is 95% mechanical — a surface-by-surface sweep of the remaining ad-hoc `text-*` / `font-*` classes across **55 files (131 text-size hits, 63 font-weight hits)**, plus a small amount of new surface area: a `SectionHeader` component (DS-10) and an enforcement check (grep in CI or ESLint rule) to prevent regression. The type scale is already complete; no new tokens are expected unless the `text-metric` outlier audit surfaces ≥3 uses of an off-scale display size (CONTEXT Claude's Discretion item).

The critical wins come from disciplined application, not invention: every migration call-site should (a) drop its ad-hoc `text-xs/sm/lg` class, (b) drop any ad-hoc `font-semibold` / `font-medium` (weight is baked into the token), (c) use `uppercase` only alongside `.text-label`, and (d) use the numeric variants (`text-body-numeric`, `text-display-numeric`, `text-label-numeric`) for any cell/axis/value holding digits. The 3 pilot files are the reference implementation — the planner should structure each sweep plan to parallel the surface-by-surface cadence Phase 26 used (one plan per surface, each plan ending with visual verification in light + dark mode).

One risk: **trend-indicator.tsx still uses Tailwind emerald/red classes** (lines 48–50) instead of the `text-success-fg` / `text-error-fg` tokens that `kpi-card.tsx` adopted in Plan 26-02. This is a state-color issue, not a type issue — but because the file also uses `text-xs font-medium` (line 83), it will be touched during Phase 27. The planner should either (a) expand scope to migrate those colors too OR (b) explicitly defer and flag. Recommendation: migrate in the same pass — the file is small and the token swap is one-to-one.

**Primary recommendation:** Ship Plan 27-01 as "migration table + `SectionHeader` + one pilot surface" (exactly the shape Phase 26 Plan 01 used), then sweep surface-by-surface in Plans 27-02 through 27-06. Close with Plan 27-07 enforcement (grep in CI is simpler than a custom ESLint rule for this flat-config v9 project with no existing Tailwind lint plugin). Every sweep plan must end with both-modes visual verification — `feedback_testing` memory makes this non-negotiable.

## Standard Stack

### Core (already installed — no new deps)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4 (4.2.2) | CSS-first type scale via `@theme` `--text-*` namespace | Already wired — tokens emit `text-display / text-heading / text-title / text-body / text-label / text-caption` utilities |
| next | 16.2.3 | App Router + `next/font/google` for Inter + JetBrains Mono | Already serving Inter (UI) + JetBrains Mono (numeric) |
| recharts | 3.8.0 | Chart rendering — axis tick customization surface | Tick text styling goes through `tick` prop / custom tick components |
| @tanstack/react-table | 8.21.3 | Table columns — cell renderer is where per-type numeric/text branch lives | Already branching on `meta.type` in `table-body.tsx` |
| shadcn | 4.2.0 | Primitives (Button, Tooltip, Dialog, Popover, DropdownMenu) | Their text classes (`text-sm`, `text-base`) should migrate to tokens in-place; keep shadcn API stable |
| eslint | ^9 (flat config) | Lint toolchain at `eslint.config.mjs` | Host for enforcement rule if we go the ESLint route |

### Typography Scale (first-party, shipped Phase 26)

| Token | Size | Line-height | Weight | Letter-spacing | Intended Use |
|-------|------|-------------|--------|----------------|--------------|
| `text-display` | 1.5rem (24px) | 1.2 | 600 | — | Page-level / KPI-level value (used on KpiCard value via `text-display-numeric`) |
| `text-heading` | 1.125rem (18px) | 1.35 | 600 | — | Section titles (`<SectionHeader>` default), dialog titles |
| `text-title` | 0.9375rem (15px) | 1.4 | 500 | — | Sub-section titles, card headers, emphasized inline labels |
| `text-body` | 0.875rem (14px) | 1.5 | (inherit 400) | — | Default body, table text cells, dropdown/menu items |
| `text-label` | 0.75rem (12px) | 1.4 | 500 | 0.04em | Overline (needs `uppercase` + `text-muted-foreground` in className) — KPI labels, eyebrow text, pill/badge captions |
| `text-caption` | 0.75rem (12px) | 1.4 | (inherit 400) | — | Helper text, timestamps, fine print, tooltip body |

### Numeric variants (first-party utility classes — `@layer utilities` in globals.css:488-508)

| Class | Size | Family | Features | Use When |
|-------|------|--------|----------|----------|
| `.text-display-numeric` | `--text-display` | **Inter** (sans) | tabular-nums + lining-nums | Big metric values (KPI card value) — inherits sans so hierarchy reads |
| `.text-body-numeric` | `--text-body` | **JetBrains Mono** | tabular-nums + lining-nums | Table data cells, inline metric values, trend deltas |
| `.text-label-numeric` | `--text-label` | **JetBrains Mono** | tabular-nums + lining-nums + 0.04em tracking | Chart axis ticks (when styled via Recharts `tick` custom component), footer totals, micro-metrics |

### Supporting (no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | — | `cn()` helper at `@/lib/utils` | All conditional className composition in `SectionHeader` and migrated components |
| tw-animate-css | ^1.4.0 | Animation utilities (already used) | Not needed for Phase 27 — motion is Phase 30 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single `SectionHeader` component | Extend shadcn's `<CardHeader>` / `<CardTitle>` | shadcn primitives are card-scoped (wrap `<div data-slot=card>`), coupled to card surface. `SectionHeader` must work outside cards (panel headings, sidebar sections). Keep them separate. |
| Grep-in-CI enforcement | `eslint-plugin-tailwindcss` / `oxlint-tailwindcss` custom rules | These plugins focus on class ordering / conflict detection / arbitrary-value normalization. Neither ships a "forbid this size class" rule out of the box — you'd write a custom rule either way. Grep is simpler and runs in < 1 second. |
| Recharts `tick={{ fontSize }}` style prop | Recharts custom `<Tick>` component | Custom tick component gives full SVG control (can apply `fontFamily: 'var(--font-mono)'` + `style={{ fontVariantNumeric: 'tabular-nums' }}`). `tick={{ }}` is a plain style object (no className); CSS classes don't propagate. Use custom component for axis labels that need tabular-nums. |
| New `--text-metric` token | Reuse `text-display-numeric` | If audit surfaces 3+ uses of an even-larger metric display (e.g., 2rem), add a token. Otherwise KPI card's `text-display-numeric` at 1.5rem already covers the hero case. Decide during the migration-table audit. |

**Installation:** `npm install` (nothing new). All tools already in `package.json`.

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── components/
│   ├── layout/
│   │   └── section-header.tsx   # NEW (DS-10) — shared SectionHeader component
│   └── [existing]                # ~55 files to sweep — see Migration Recipe
├── app/
│   └── globals.css               # NO CHANGES expected (scale + utility classes already shipped)
│                                 # ONLY if text-metric outlier token is added
└── lib/
    └── [existing]
```

Optionally add `src/components/tokens/type-specimen.tsx` section updates if the `/tokens` page needs to also demonstrate `<SectionHeader>` and the numeric variants in situ. Low priority.

Enforcement (Plan 27-last):
```
scripts/
└── check-type-tokens.sh          # NEW — grep guard for CI (simplest path)
```
*(OR — extend `eslint.config.mjs` with a custom `no-restricted-syntax` / `no-restricted-classes` rule. Both equivalent; grep wins on simplicity.)*

### Pattern 1: The Migration Recipe (applied at every call site)

**What:** Replace ad-hoc size + weight with a single token utility. Drop redundant weight classes because tokens carry weight.

**Verified against:** `src/components/kpi/kpi-card.tsx` (Phase 26-02 pilot), `src/components/layout/header.tsx` (Phase 26-03 pilot), `src/components/table/table-body.tsx` (Phase 26-04 pilot).

**Migration table (Claude's Discretion refines this on the pilot):**

| Ad-hoc class pattern | → Token | Notes |
|----------------------|---------|-------|
| `text-2xl font-semibold` | `text-display` | Weight baked in. Page titles, big headings. |
| `text-xl font-semibold` | `text-heading` | Section titles (or use `<SectionHeader>` instead). |
| `text-lg font-medium` | `text-title` | Ambiguous — may be `text-heading` when it anchors a section; resolve on pilot. |
| `text-base` / `text-base font-medium` | `text-title` or `text-body` | **Ambiguous** — default to `text-title` for emphasized labels, `text-body` for read-through prose. Resolve on pilot. |
| `text-sm` | `text-body` | The most common migration. ~40+ sites. |
| `text-sm font-medium` | `text-body` + `font-medium` removed | If emphasis is needed, consider `text-title`. |
| `text-xs` | `text-caption` or `text-label` | **`text-label` ONLY when paired with `uppercase`** (overline); all other uses → `text-caption`. |
| `text-xs font-medium uppercase` | `text-label uppercase` | Overline pattern. Weight + tracking baked in. |
| `text-[10px]` | `text-caption` + custom class (see axis) | Axis ticks require custom; don't inline. |
| `tabular-nums` (standalone) | replace class with numeric variant | If the element holds digits only, upgrade to `text-body-numeric` / `text-display-numeric` / `text-label-numeric`. |

**Example migration:**

```tsx
// BEFORE (header-like display)
<h2 className="text-xl font-semibold text-foreground">Partner Performance</h2>

// AFTER
<h2 className="text-heading text-foreground">Partner Performance</h2>
// — weight 600 and line-height 1.35 baked in via `--text-heading--font-weight` / `--text-heading--line-height`
```

```tsx
// BEFORE (KPI label — pre-pilot)
<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
  Collection Rate
</div>

// AFTER (Phase 26-02 shipped this)
<div className="text-label uppercase text-muted-foreground">
  Collection Rate
</div>
```

```tsx
// BEFORE (trend-indicator.tsx:83 — this site is pending in Phase 27)
<span className={`text-xs font-medium ${colorClass}`}>{arrow}</span>

// AFTER
<span className={`text-caption font-medium ${colorClass}`}>{arrow}</span>
// OR if the value text itself also lives here, consider text-label-numeric for tabular alignment
```

### Pattern 2: Overline via `.text-label`

**What:** Uppercase, letter-spaced, muted small text labeling a value.

**Decision:** No separate `overline` token. `.text-label` + `uppercase` + `text-muted-foreground` = overline.

**Canonical uses:**
- KPI card label under the value (`kpi-card.tsx:59, 133`)
- `SectionHeader` eyebrow (new, Phase 27)
- Optional category text in cross-partner matrix headers

**Anti-use:** Don't sprinkle overline on every muted span. It's for the specific "secondary meta-label anchoring a primary value" role.

```tsx
// Canonical overline
<span className="text-label uppercase text-muted-foreground">Collection Rate</span>
```

### Pattern 3: `<SectionHeader>` component (DS-10)

**What:** Shared component for section titles with optional eyebrow + description + actions slot.

**Prop contract (locked in CONTEXT):**

```tsx
interface SectionHeaderProps {
  title: string;
  eyebrow?: string;         // Optional overline string above title (renders with .text-label uppercase text-muted-foreground)
  description?: string;     // Optional text-caption text-muted-foreground below title
  actions?: React.ReactNode;// Button / button-group / dropdown — right-aligned
}
```

**Sketch implementation (for planner reference):**

```tsx
// src/components/layout/section-header.tsx
'use client';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, eyebrow, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-stack', className)}>
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-label uppercase text-muted-foreground">{eyebrow}</span>
        )}
        <h2 className="text-heading text-foreground">{title}</h2>
        {description && (
          <p className="text-caption text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-inline">{actions}</div>}
    </div>
  );
}
```

**Caller examples:**

```tsx
<SectionHeader title="Collection Curves" />

<SectionHeader
  eyebrow="Metrics"
  title="Partner Performance"
  description="Rolling 12-month comparison across partners"
  actions={<Button variant="outline" size="sm">Export</Button>}
/>
```

**When NOT to use:** Inline labels above a single field (those stay as native labels). Dialog titles (use `<DialogTitle>` from shadcn, migrate the className to `text-heading`).

### Pattern 4: Tabular figures — applied at the shared component level

**What:** Every numeric display path gets tabular-nums via a shared class or component, never per-call-site.

**Consolidated application points** (do these in the sweep, don't sprinkle):

| Surface | File | Current state | Phase 27 action |
|---------|------|---------------|-----------------|
| Table body cells | `src/components/table/table-body.tsx:65` | ✅ already branching on `meta.type` | no change needed |
| Table footer aggregates | `src/components/table/table-footer.tsx:82` | `tabular-nums` + `text-xs` | swap `text-xs` → `text-label-numeric` (which includes tabular + mono) — remove duplicate class |
| KPI card value | `src/components/kpi/kpi-card.tsx:130` | ✅ `text-display-numeric` | no change |
| KPI trend delta | `src/components/kpi/kpi-card.tsx:117` | ✅ `text-label-numeric` | no change |
| Row-level trend indicator | `src/components/table/trend-indicator.tsx:83` | ❌ `text-xs font-medium` | swap to `text-caption` + keep `font-medium` OR `text-label-numeric`; also address emerald/red → state tokens |
| Chart axis ticks (Recharts) | `src/components/charts/collection-curve-chart.tsx:227, 235` | ❌ `className="text-[10px]"` on XAxis | use `tick={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}` OR custom tick component with `font-variant-numeric: tabular-nums` — see anti-pattern below |
| Chart tooltip value | `src/components/ui/chart.tsx:256` | ✅ `font-mono font-medium tabular-nums` | swap to `text-label-numeric font-medium` — consolidate |
| Sidebar pill counts | `src/components/layout/app-sidebar.tsx:59, 119` | ❌ `text-[10px] tabular-nums` | swap to `text-caption` + numeric variant OR define a dedicated pill utility — discuss in pilot |
| Cross-partner matrix cells | `src/components/cross-partner/matrix-*.tsx` | `tabular-nums` + `text-xs` | swap to `text-body-numeric` or `text-label-numeric` based on row-height constraint |

### Pattern 5: Recharts tick styling (numeric axis labels)

**What:** Recharts tick text is rendered as SVG `<text>`; CSS classes applied to `<XAxis>` don't reliably propagate. Use the `tick` prop with a style object OR a custom tick component.

**Verified:** Recharts 3.x `<XAxis tick={{ fontSize }}>` is a style object, not a className slot. For `font-variant-numeric`, use a custom component.

```tsx
// Simple path: inline style
<XAxis
  type="number"
  dataKey="month"
  tick={{
    fontSize: 11,
    fontFamily: 'var(--font-mono), ui-monospace, monospace',
  }}
  tickFormatter={(m) => `${m}`}
/>

// Strict numeric path (when tabular alignment matters)
function NumericTick({ x, y, payload }: { x: number; y: number; payload: { value: string | number } }) {
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor="middle"
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums lining-nums',
        fill: 'var(--muted-foreground)',
      }}
    >
      {payload.value}
    </text>
  );
}

<XAxis tick={<NumericTick />} />
```

**Source:** Recharts issues #628, #1471, #3979, #5236 (cited in Sources — all confirm `tick={{ }}` is the supported prop; `className` on XAxis doesn't style tick text).

### Anti-Patterns to Avoid

- **Stacking `text-body text-sm`.** Both emit `font-size`; later wins, but the intent is unclear. Pick one — if you need the token, use only the token.
- **Redundant weight after a token.** `text-heading font-semibold` — the token already specifies 600. `font-semibold` is a no-op at best and contradicts the "tokens own weight" rule.
- **`uppercase` without `.text-label`.** Uppercase without tracked letter-spacing reads as shouting. Only use `uppercase` on `.text-label` (which bakes 0.04em tracking).
- **Global `tabular-nums` on `<body>`.** Breaks prose (forces even spacing on all text). CONTEXT explicitly forbids this. Apply at shared component level only.
- **Using `font-mono` alone for numbers.** Use `text-body-numeric` / `text-label-numeric` — they bake mono + tabular + lining features, avoiding per-call-site drift.
- **Migrating shadcn primitives' internal classes.** `src/components/ui/button.tsx`, `ui/alert.tsx`, `ui/sheet.tsx`, `ui/card.tsx`, `ui/label.tsx`, `ui/input.tsx`, `ui/popover.tsx`, `ui/tooltip.tsx`, `ui/chart.tsx`, `ui/sidebar.tsx` all have internal `text-sm` / `text-xs` / `font-medium` — these are **allowlist candidates**. Migrating them risks drifting from upstream. Decide per file: if the shadcn component is shadcn-copied untouched, leave it and allowlist; if already modified, sweep it.
- **Chart axis `className="text-[10px]"`.** Doesn't even propagate to Recharts' internal `<text>`. Use `tick={{ }}` prop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| New "overline" token | Separate `--text-overline` var | Existing `.text-label uppercase text-muted-foreground` composition | Decision-locked. One extra token for no benefit. |
| Numeric cell utility class | Custom `.my-numeric` helper | `.text-body-numeric` / `.text-display-numeric` / `.text-label-numeric` | Shipped Phase 26. Has tabular + lining + family. |
| Weight per call-site | `text-heading font-bold` | Rely on `--text-heading--font-weight: 600` | Token owns weight. Adding `font-bold` is 700 and breaks Linear-tight weight scale. |
| Custom "section title wrapper" | Ad-hoc `<div className="mb-4"><h2>...` | `<SectionHeader>` | Ensures every section has the same rhythm and eyebrow handling. |
| Bespoke chart axis label styling | SVG styles per chart | Custom `<NumericTick>` component reused across charts | Pattern 5 reusable across collection-curve-chart + future charts (CHRT-03..06). |
| Custom ESLint AST rule for `text-xs` | Write a JSX attribute parser | Grep-in-CI (`ripgrep -n 'text-(xs\|sm\|base\|lg\|xl\|2xl)' src/ --glob='!ui/'`) | Flat-config v9 + no existing Tailwind lint plugin = custom rule = high setup cost. Grep runs in < 1s and is language-agnostic. |

**Key insight:** Phase 26 already paid the cost of building the primitives. Phase 27's only new primitive is `<SectionHeader>`. Resist the temptation to introduce new tokens, wrappers, or helpers. The win is discipline, not invention.

## Common Pitfalls

### Pitfall 1: Touching files that import shadcn primitives without migrating primitives first

**What goes wrong:** You migrate a caller from `text-sm` to `text-body`, but it wraps a shadcn `<Button>` or `<DialogTitle>` whose internal `text-sm` is still present. The caller looks migrated; the primitive leaks old values.

**Why it happens:** shadcn primitives at `src/components/ui/*` ship with their own hard-coded text classes. They're not automatically tokenized.

**How to avoid:** For the first sweep plan, make a **primitive-policy call**: either (a) migrate the ~10 shadcn-derivative files with `text-*` (button, alert, sheet, card, label, input, popover, tooltip, chart, sidebar) and commit to maintaining them (drift risk from shadcn updates), OR (b) allowlist them in the grep/lint check and accept they stay on raw Tailwind classes. Recommended: **allowlist**. shadcn's internal text-sizes are still within tokens' approximate sizes, and migrating them couples us to an upstream fork decision.

**Warning signs:** A "migrated" dialog still feels inconsistent in light/dark. Audit shows migrated caller + un-migrated primitive wrapping it.

### Pitfall 2: Ambiguous mappings (`text-base`, `text-lg`) resolved inconsistently across the sweep

**What goes wrong:** One dev (or one pass) resolves `text-base font-medium` → `text-title`; a later pass resolves the same pattern → `text-body`. Visual rhythm drifts.

**Why it happens:** The 6-tier scale is intentionally tight. `text-base` (Tailwind 16px) sits between `text-body` (14px) and `text-title` (15px) — neither is an exact match.

**How to avoid:** Plan 27-01 (pilot + migration table) must publish the resolved mapping table and pin it into the `/tokens` page or `AGENTS.md` as the canonical source. Every sweep plan references the table. Spot-disagreements resolved with visual diff and a note back into the table.

**Warning signs:** `git log` on `text-base` removals shows two different token replacements in different commits.

### Pitfall 3: Visual verification skipped because "it's just a class rename"

**What goes wrong:** You batch-migrate 20 files, push, and only then discover the heading hierarchy flattened because `text-xl` (20px) → `text-heading` (18px) is a real 2px shrink visible across the app.

**Why it happens:** The token scale doesn't map 1:1 onto Tailwind's defaults. Some sites will genuinely look different.

**How to avoid:** Every sweep plan ends with a light+dark visual pass (`feedback_testing` memory is non-negotiable here). Capture the pilot surface's before/after side-by-side as the reference for other surfaces.

**Warning signs:** User feedback says "something feels off" without pointing at a specific element — usually means a heading collapsed a tier.

### Pitfall 4: `trend-indicator.tsx` emerald/red colors forgotten during the table sweep

**What goes wrong:** You migrate typography in `trend-indicator.tsx` but leave `text-emerald-600 dark:text-emerald-400` / `text-red-500 dark:text-red-400` (lines 48–50). The KPI card uses `text-success-fg` / `text-error-fg` since 26-02. The app ships with two different "positive-trend-green" values.

**Why it happens:** Phase 26 Plan 03 noted state-color migration was a "cross-cutting work owned by a later dedicated phase." Phase 27 is that later phase for files it touches.

**How to avoid:** When Phase 27's table sweep touches `trend-indicator.tsx`, do the `emerald`/`red` → `text-success-fg`/`text-error-fg` swap in the same pass. Scope expansion is justified: the file is small (~110 lines) and the swap is one-to-one. Document in the plan's Out of Scope section what you're NOT doing (broader state-color migration in header.tsx amber stale-indicator etc. stays deferred).

**Warning signs:** Grep for `text-(emerald|red|amber|green|blue)-` after the sweep. Hits outside `ui/` or the allowlist = missed migration.

### Pitfall 5: `gap-1.5`, `px-2.5`, `h-7` arbitrary spacing survives the sweep

**What goes wrong:** Phase 27 is typography-only, but hands touch every file. It's tempting to also fix `gap-1.5` → `gap-inline`, but spacing alignment is not Phase 27's job and unfocused diffs get rejected at review.

**How to avoid:** Plans explicitly scope to text-size, font-weight, letter-spacing, text-transform, tabular-nums. Other concerns go in a follow-up issue. State this in each plan's Out of Scope.

**Warning signs:** Plan diff touches `gap-*`, `p-*`, `m-*`, `h-*`. Back it out unless it's directly intertwined.

## Code Examples

Verified patterns from first-party shipped code (all from Phase 26 pilots) plus Phase 27 target patterns.

### Overline pattern (verified — `kpi-card.tsx:133`)
```tsx
<div className="text-label uppercase text-muted-foreground">{label}</div>
```

### Display numeric value (verified — `kpi-card.tsx:130`)
```tsx
<span className="text-display-numeric">{value}</span>
```

### Table body cell branch (verified — `table-body.tsx:65`)
```tsx
<td
  className={`overflow-hidden text-ellipsis whitespace-nowrap px-[var(--row-padding-x)] py-[var(--row-padding-y)] ${
    isNumeric ? 'text-body-numeric text-right' : 'text-body'
  }`}
>
```

### SectionHeader usage (new — Phase 27 target)
```tsx
<SectionHeader
  eyebrow="Analysis"
  title="Collection Curves"
  description="Per-batch projected vs. actual collection trajectory"
  actions={
    <>
      <Button variant="outline" size="sm">Reset</Button>
      <Button variant="default" size="sm">Save</Button>
    </>
  }
/>
```

### Enforcement grep (new — Plan 27-last)
```bash
# scripts/check-type-tokens.sh
#!/usr/bin/env bash
set -euo pipefail

# Allowlist: shadcn primitives (copied upstream verbatim) and the tokens reference page.
EXCLUDES='src/components/ui src/app/tokens src/components/tokens'

# Fail on ad-hoc text sizes
if rg -n --glob '!*.css' --glob '!*.md' "text-(xs|sm|base|lg|xl|2xl|3xl|4xl)" src/ $(printf ' --glob=!%s' $EXCLUDES); then
  echo "❌ Found ad-hoc text-size classes. Use text-display / text-heading / text-title / text-body / text-label / text-caption."
  exit 1
fi

# Fail on ad-hoc font-weight (tokens own weight)
if rg -n --glob '!*.css' --glob '!*.md' "\bfont-(semibold|medium|bold|light|thin|extrabold|black)\b" src/ $(printf ' --glob=!%s' $EXCLUDES); then
  echo "❌ Found ad-hoc font-weight classes. Tokens own weight — drop the utility."
  exit 1
fi

echo "✅ Type tokens enforced."
```

Wire into `package.json` scripts as `"check:tokens": "bash scripts/check-type-tokens.sh"` and add to CI (or the dev workflow).

*Alternative — ESLint custom rule via `no-restricted-syntax` on `Literal` nodes in JSX attributes* — workable but heavier; pick grep unless ESLint is already wired into a pre-commit hook.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` + JS theme | Tailwind v4 `@theme` in globals.css | Tailwind 4.0 (Jan 2025) | Project already on v4.2.2 — our type tokens ship via `--text-*` namespace |
| Per-call-site `tabular-nums` class | Dedicated `.text-*-numeric` utility variants | Phase 26-02 (Apr 2026) | Single source of truth; avoids drift |
| Hand-rolled `section-title` wrappers | Shared `<SectionHeader>` | Phase 27 (this phase) | One prop contract, one visual rhythm |
| Emerald/red Tailwind palette for trend colors | `text-success-fg` / `text-error-fg` state tokens | Phase 26-02 (KPI card) | Still pending in `trend-indicator.tsx` — sweep in Phase 27 table plan |

**Deprecated/outdated:**
- Ad-hoc `text-xs/sm/base/lg/xl/2xl` in app code (will fail CI after Plan 27-last).
- `font-semibold` / `font-medium` after a type token (no-op at best, drift at worst).
- `className="text-[10px]"` on Recharts XAxis (does nothing — use `tick` prop).

## Open Questions

1. **Is `text-metric` needed?**
   - What we know: `text-display-numeric` at 1.5rem (24px) is the current max. KPI card uses it. `/tokens` page showcases it.
   - What's unclear: If any "hero metric" surface demands 2rem+ (e.g., a future dashboard landing). Audit hasn't found one yet.
   - Recommendation: Plan 27-01 performs the audit. If ≥3 sites want an off-scale larger display, add `--text-metric` (e.g., 2rem / 1.15 / 600) and a paired `.text-metric-numeric` variant. Otherwise don't.

2. **shadcn primitive migration — fork or allowlist?**
   - What we know: 10 files under `src/components/ui/` have `text-sm` / `text-xs` / `font-medium`. shadcn's own CLI may overwrite on `shadcn add ...` updates.
   - What's unclear: How often the team runs `shadcn add` (check session history — last usage?).
   - Recommendation: Default to **allowlist**. Document in `AGENTS.md` that ui/ is excluded from the type-token rule. If shadcn primitives ever get materially modified for other reasons, revisit.

3. **Will Plan 27-01's pilot be the header or the KPI cards?**
   - What we know: Both are mostly-migrated already (Phase 26-02 for KPI, 26-03 for header). Remaining text sites in header: freshness indicator (`text-caption` — done), theme toggle button (shadcn-allowlist). Remaining in KPI card: zero after 26-02.
   - What's unclear: Whether pilot should instead target a **fully un-migrated** surface (e.g., the `views-sidebar.tsx` or `anomaly-detail.tsx` which have 4–6 `text-xs` / `text-sm` hits each).
   - Recommendation: Pick an un-migrated surface as pilot because Phase 26 pilots are nearly done. Best candidate: `anomaly-detail.tsx` (6 `text-xs` + 4 `font-medium` — dense and representative). Confirm during planning.

4. **Does the `/tokens` page need updating?**
   - What we know: `/tokens` ships type specimens (`src/components/tokens/type-specimen.tsx`) including numeric variants.
   - What's unclear: Whether to add a live `<SectionHeader>` demo and an "in-use" section showing the overline + title + description pattern.
   - Recommendation: Low priority. If Plan 27-01's pilot is clean, capture the demo code and optionally add in Plan 27-last alongside the enforcement check.

## Validation Architecture

**Nyquist validation:** Not in config (`.planning/config.json` has no `workflow.nyquist_validation` key — defaults to false). Section skipped per research protocol.

**Alternative verification (per project convention):**
- Per task: manual visual check in both light and dark mode before commit (`feedback_testing` memory).
- Per plan merge: `npm run lint` (ESLint) + Next.js build (`npm run build`).
- Phase gate: grep script from Plan 27-last passes in CI (once written).

## Sources

### Primary (HIGH confidence — first-party code, shipped and verified)
- `src/app/globals.css:48-71, 488-508` — Typography tokens + numeric utility classes
- `src/components/kpi/kpi-card.tsx` — Phase 26-02 pilot, canonical overline + display-numeric example
- `src/components/layout/header.tsx` — Phase 26-03 pilot, caption + muted-foreground pattern
- `src/components/table/table-body.tsx` — Phase 26-04 pilot, `isNumeric ? text-body-numeric : text-body` branch
- `.planning/phases/26-design-tokens/26-RESEARCH.md` — Phase 26 research (parent design work, fully shipped)
- `.planning/STATE.md` — decision log confirming `/tokens` page, numeric utility variants, and per-pilot token recipes

### Secondary (MEDIUM confidence — verified with official docs + community issues)
- Tailwind CSS v4 `@theme` + `--text-*` namespace ([tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4), [frontendtools.tech best practices](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)) — confirms `--text-{name}` auto-emits `text-{name}` utilities and supports `--line-height` / `--font-weight` / `--letter-spacing` sub-properties.
- Recharts 3.x `tick` prop styling — GitHub issues [#628](https://github.com/recharts/recharts/issues/628), [#1359](https://github.com/recharts/recharts/issues/1359), [#1471](https://github.com/recharts/recharts/issues/1471), [#3979](https://github.com/recharts/recharts/issues/3979), [#5236](https://github.com/recharts/recharts/issues/5236) — confirm `className` on `<XAxis>` doesn't propagate to tick text; `tick={{ style }}` and custom tick component are the supported paths.
- oxlint-tailwindcss plugin ([earezki.com article](https://earezki.com/ai-news/2026-03-23-oxlint-tailwindcss-the-linting-plugin-tailwind-v4-needed/)) — confirms no off-the-shelf "forbid size class" rule exists in ecosystem; custom rule or grep needed either way.
- eslint-plugin-tailwindcss ([npm](https://www.npmjs.com/package/eslint-plugin-tailwindcss)) — focuses on class ordering/conflict, not enforcement-by-allowlist.

### Tertiary (LOW confidence — heuristic / workflow)
- Mapping `text-base` → `text-title` vs `text-body` is a judgment call; the pilot resolves ambiguity. Flag: revisit if pilot surfaces 3+ inconsistent interpretations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phase 26 shipped every type token and numeric variant; no new libraries; pilots prove the recipe works in 3 live surfaces.
- Architecture (SectionHeader, migration recipe, tabular application): HIGH — prop contract is locked in CONTEXT; pilot recipes are first-party verified.
- Enforcement mechanism: MEDIUM — grep vs ESLint is a judgment call; grep is recommended but either works.
- Recharts numeric ticks: MEDIUM — multiple community confirmations, no first-party test yet in this repo. Pattern 5 should be verified on the pilot chart touch.
- Pitfalls: HIGH — all grounded in observed repo state (ad-hoc class counts, shadcn primitive internals, trend-indicator emerald color pending).

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — typography domain is stable; Tailwind v4 and Recharts 3.x are mature).

**Files surveyed this research:**
- `.planning/phases/27-typography-and-information-hierarchy/27-CONTEXT.md`
- `.planning/REQUIREMENTS.md`, `.planning/milestones/v4.0-REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`
- `.planning/phases/26-design-tokens/26-RESEARCH.md` (first 150 lines)
- `src/app/globals.css` (full), `src/app/tokens/page.tsx`
- `src/components/kpi/kpi-card.tsx`, `src/components/kpi/kpi-summary-cards.tsx`
- `src/components/layout/header.tsx`
- `src/components/table/table-body.tsx`, `src/components/table/trend-indicator.tsx`
- `src/components/charts/collection-curve-chart.tsx` (axis region)
- `src/components/ui/chart.tsx` (tooltip region)
- `package.json`, `eslint.config.mjs`
- Grep sweeps: `text-(xs|sm|base|lg|xl|2xl)` (131 hits / 55 files), `font-(semibold|medium|bold|light)` (63 hits / 37 files), `tabular-nums` (15 hits / 12 files)

**What I might have missed:**
- The `views-sidebar.tsx`, `anomaly-detail.tsx`, and `cross-partner/*` clusters have the densest ad-hoc text concentration — the planner should sample one or two during plan sequencing to confirm no surprise patterns (e.g., custom heading levels not yet identified).
- `query/*` (Claude chat UI) has several `text-sm` uses that may want a distinct reading-prose treatment — flag for the pilot to decide if body is right for prose-length AI responses.
