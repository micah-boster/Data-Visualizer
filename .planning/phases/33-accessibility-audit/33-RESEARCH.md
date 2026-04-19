# Phase 33: Accessibility Audit — Research

**Researched:** 2026-04-18
**Domain:** WCAG AA baseline on Next.js 16 App Router dashboard (axe-core + Playwright, ARIA, keyboard nav, token contrast)
**Confidence:** HIGH on tooling / infra paths; MEDIUM on exact violation counts until the baseline sweep runs (deferred to Plan 1 by design)

---

<user_constraints>
## User Constraints (from 33-CONTEXT.md)

### Locked Decisions

**Audit scope & pass criteria**
- Scope: Core user-facing views only — Dashboard, drill-downs (partner, batch), saved views, settings. Excludes `/tokens` reference page and any other unlisted/debug routes.
- Severity cutoff: Fix only `critical` and `serious` axe-core violations (matches A11Y-01 literally). Moderate and minor go to a deferred backlog, not this phase.
- Contrast target: WCAG AA strictly. No stretch toward AAA.
- Exceptions policy: If a design token (brand color, surface) fails AA contrast, adjust the canonical token value in `globals.css` (Phase 26 infra) rather than documenting an exception or applying per-component overrides.

**Complex widget depth**
- Recharts charts: Concise `aria-label` describing what the chart shows. Chart data is already mirrored in the sibling table, so SR users use the table. Do NOT attempt full keyboard navigation through data points — Recharts doesn't support it natively and ROI is low.
- Drill-down overlays: Standard modal dialog pattern — focus trap while open, `Escape` closes, focus restored to the trigger element on close. Works with URL-backed nav from Phase 32 (direction-agnostic by design).
- Dense tables: Row-level Tab stops. Each interactive row is one tab stop; `Enter` drills in; `Escape` returns. NOT a full `role="grid"` with cell-by-cell arrow-key nav.
- Hover-revealed content: Anything shown on hover MUST also appear on focus. Chart tooltips fire on data-point focus; popovers open on `Enter`. No hover-only UI for essential info.

**Regression prevention**
- Primary CI gate: axe-core run inside Playwright E2E against core routes. Catches runtime violations (rendered DOM, dynamic ARIA state), not just static source. Mirrors the Phase 26+ guardrail pattern (e.g., `check:motion`).
- Enforcement: BLOCKING after the baseline is green. No advisory mode.
- Manual testing: Keyboard-only walkthrough of Dashboard → drill → saved view as part of verification. No formal VoiceOver pass required.
- Per-component a11y tests: SKIP. Playwright axe on routes + `eslint-plugin-jsx-a11y` (if low-friction) gives enough coverage.

**Remediation strategy**
- Plan grouping: By violation category. Expected plans: (1) CI/baseline setup, (2) ARIA labels & roles, (3) Keyboard nav & focus management, (4) Color contrast & token adjustments.
- Sequence: Baseline first — plan 1 installs axe-core + Playwright a11y setup and captures the current violation list as the baseline.
- Out-of-scope issues: Note in deferred ideas, do not fix.
- Done signal: (a) axe-core CI gate green on all core routes AND (b) a keyboard-only walkthrough completes end-to-end without a mouse.

### Claude's Discretion

- Exact route list for Playwright axe runs (core routes defined; specific URLs flexible)
- Whether to include `eslint-plugin-jsx-a11y` alongside Playwright axe (recommended if low-friction)
- Specific focus indicator styling (must meet WCAG 2.4.7; Phase 31 already shipped `.focus-glow` / `.focus-glow-within`)
- Component-level ARIA patterns for primitives (follow WAI-ARIA Authoring Practices)
- Token value adjustments if contrast fails — Claude picks new value meeting AA while preserving brand intent

### Deferred Ideas (OUT OF SCOPE)

- Moderate/minor axe violations — backlog
- VoiceOver / screen-reader smoke test — future polish pass
- Per-component a11y unit tests — deferred unless E2E coverage proves insufficient
- `/tokens` reference page a11y — out of audit scope
- Full `role="grid"` keyboard model for tables — deferred
- WCAG AAA targets — out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| A11Y-01 | axe-core audit returns zero critical or serious violations | Playwright + `@axe-core/playwright` integration recipe (§ Standard Stack, § Regression Guardrail); baseline-first plan sequencing locked in CONTEXT |
| A11Y-02 | All interactive elements have ARIA labels and roles | Component-by-component audit (§ Current A11Y State), chart `aria-label` pattern, shadcn-primitive gaps, icon-only button inventory |
| A11Y-03 | Full keyboard navigation: Tab, Enter, Escape work throughout | Focus-management approach (§ Focus-Management), Base UI `modal='trap-focus'` built-in, row-level Tab stops recipe for TanStack Virtual tables, drill-trigger `<button>` audit |
| A11Y-04 | Color contrast meets WCAG AA on all surfaces in both themes | Token-level contrast audit approach (§ Contrast Audit), at-risk token inventory, `globals.css` canonical-source remediation policy |

A11Y-05 (prefers-reduced-motion) shipped in Phase 30-01 — see `globals.css:673-690` `@media (prefers-reduced-motion: reduce)` block. **Do not re-implement.**
</phase_requirements>

---

## Executive Summary

Phase 33 delivers a WCAG AA accessibility baseline by (1) introducing a Playwright + `@axe-core/playwright` CI gate against 4–6 core routes in both themes, (2) closing ARIA/keyboard/focus gaps surfaced by that baseline, and (3) retuning any Phase 26 design tokens that fail AA contrast at the canonical source. The exit gate is blocking axe-core CI + a manual keyboard-only walkthrough of Dashboard → partner drill → batch drill → saved view.

The project is well-positioned: Phase 29's component-pattern sweep and Phase 31's `.focus-glow` + `.focus-glow-within` utilities already handle most visible-focus work; Base UI primitives (`@base-ui/react`) ship focus trap via `modal` prop; the sibling data table already satisfies the "SR users can reach chart data" contract for Recharts. The main unknowns are (a) the exact count of critical/serious violations against the live, polished app (baseline-first plan by design) and (b) token-contrast fallout on muted-foreground, caption, state-color, and brand pairs in both themes — these will be enumerated by tooling in Plan 4, not speculated here.

**Primary recommendation:** Adopt `@axe-core/playwright` (the official Deque library) inside a new `playwright.config.ts`, add a single `tests/a11y.spec.ts` that iterates the route list × two themes, wire a `check:a11y` npm script that runs it, and let Plan 1 capture the baseline before any remediation. Do NOT hand-roll focus traps — Base UI Dialog already exposes `modal="trap-focus"` and the Sheet primitive wraps the same root. Do NOT build a per-component a11y test harness (CONTEXT lock).

---

## Current A11Y State (component-by-component spot check)

**Legend:**
- ✅ Already compliant
- ⚠️ Partial / likely gap
- ❌ Known defect (will fail axe)

### Global chrome

| Surface | File | State | Notes |
|---------|------|-------|-------|
| `<html lang="en">` | `src/app/layout.tsx:34` | ✅ | |
| Document title | `src/app/layout.tsx:23` | ✅ | "Bounce Data Visualizer" |
| `<main>` landmark | `src/app/layout.tsx:44` | ✅ | Single main region |
| Header landmark | `src/components/layout/header.tsx:32` | ⚠️ | Uses native `<header>`; sticky. Contains SidebarTrigger + ThemeToggle + freshness indicator. No `aria-label` on the region itself — low severity, often auto-labeled by browser. |
| Sidebar landmark | `src/components/ui/sidebar.tsx` | ⚠️ | shadcn sidebar. `SidebarTrigger` has `aria-label="Toggle Sidebar"` (verified ui/sidebar.tsx). Good. |
| Skip-to-content link | — | ❌ | Not present. Low-severity axe issue; may fail `bypass` rule. Easy add in Plan 2. |
| Root page `<Suspense>` fallback | `src/app/page.tsx:7` | ✅ | Rendered by `<LoadingState />` |

### Buttons & icon-only controls

Base UI `<ButtonPrimitive>` (`src/components/ui/button.tsx`) is used everywhere. Variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) are all wired to `:focus-visible` ring + `aria-invalid` styling. Good base.

| Button | File | State | Notes |
|--------|------|-------|-------|
| ThemeToggle | `src/components/theme-toggle.tsx:10` | ✅ | `<span className="sr-only">Toggle theme</span>` |
| Sheet/Dialog close (X) | `src/components/ui/sheet.tsx:75`, `query-command-dialog.tsx:65` | ✅ | `<span className="sr-only">Close</span>` |
| Schema-warning dismiss | `data-display.tsx:594` | ✅ | `<span className="sr-only">Dismiss</span>` |
| Toolbar query `<Sparkles>` | `unified-toolbar.tsx:141` | ⚠️ | Icon-only `<Button size="icon">` with Tooltip only. **Tooltips are not accessible names** — axe-core `button-name` rule will fail. Needs `aria-label` in addition to tooltip. |
| Toolbar charts toggle | `unified-toolbar.tsx:156` | ⚠️ | Same pattern, same gap. Also missing `aria-pressed` for toggle semantics. |
| Toolbar columns / sort | `unified-toolbar.tsx:188, 205` | ⚠️ | Same pattern. |
| Toolbar export | `unified-toolbar.tsx:247` | ⚠️ | Same. |
| Save-view popover trigger | `save-view-popover.tsx:71` | ⚠️ | Same. |
| AnomalyToolbarTrigger | `anomaly-toolbar-trigger.tsx:52` | ⚠️ | Same. Also the badge count span has no `aria-hidden`/grouping. |
| FilterChips remove X | `filters/filter-chips.tsx` | ✅ | Has `aria-label={`Remove ${filter.label} filter`}` (2 sites) |
| ColumnHeaderFilter | `column-header-filter.tsx` | ✅ | Has `aria-label={`Filter ${name}`}` |
| DualPaneTransfer Add/Remove | `partner-lists/dual-pane-transfer.tsx` | ✅ | Has dynamic `aria-label` |
| Sort dialog reorder arrows (up/down/X) | `sort-dialog.tsx:154, 161, 170` | ❌ | Raw `<button>` without `aria-label`. "Move up", "Move down", "Remove sort" need labels. |
| DrillableCell | `navigation/drillable-cell.tsx:15` | ⚠️ | `<button>` with text content (value) — accessible name comes from text. OK, but no `aria-label` context like "Drill into ${value}" so SR users don't hear the action. Low priority. |
| Breadcrumb segments | `breadcrumb-trail.tsx:72-79` | ⚠️ | `<nav aria-label="Drill-down breadcrumb">` is good; current-segment is a `<span>` (not a link). Add `aria-current="page"` semantics. Missing `<ol>` / `<li>` landmark structure — axe may flag but usually MODERATE (below cutoff). |

**Icon-button pattern debt (RECURRING):** The app uses `<Tooltip>` as the only label for at least **6 toolbar icon buttons**. Tooltips don't satisfy `button-name`; this is the single biggest ARIA gap and will account for most axe hits in Plan 2. Remediation: add `aria-label` to every icon-only `<Button size="icon">`, keep the Tooltip for sighted users. Mechanical sweep.

### Dialogs, popovers, sheets (focus management)

The project uses `@base-ui/react` (v1.3.0) for Dialog, Popover, Sheet, Tooltip, and Combobox. Base UI Dialog `Root.Props` exposes `modal?: boolean | 'trap-focus'` (verified in `node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts`) — setting `modal="trap-focus"` (or `modal={true}`) produces a WAI-ARIA Authoring Practices modal dialog with focus trap + restore-focus-on-close + `Escape` close. **This is the standard stack — do not hand-roll a trap.**

| Overlay | File | State | Notes |
|---------|------|-------|-------|
| QueryCommandDialog (Cmd+K) | `query-command-dialog.tsx:42` | ⚠️ | `DialogPrimitive.Root` has no explicit `modal` prop — Base UI default is `true` (trap). Needs verification. `DialogPrimitive.Title` has `className="sr-only"` ✅. |
| Sheet (ColumnPicker, SortDialog, CreateListDialog) | `ui/sheet.tsx:10` | ⚠️ | Uses Base UI `Dialog` under the hood. `SheetTitle` + `SheetDescription` present in consumers (good). `modal` prop not set — again default. Verify Escape closes and focus restores. |
| Popover (save-view, filter, anomaly, etc.) | `ui/popover.tsx:8` | ✅ | Non-modal popovers; Base UI handles dismiss-on-click-outside + Escape + focus-return to trigger. |
| Tooltip | `ui/tooltip.tsx` | ✅ | Phase 29-05 wraps specimens in `TooltipProvider`. Tooltip shows on focus (not just hover) by Base UI default — this satisfies the CONTEXT "hover-revealed must appear on focus" lock. |

**Drill cross-fade wrapper** (`data-display.tsx:612-617`) re-keys on drill identity so React unmounts and remounts the subtree. After remount, React moves focus to nothing by default — focus ends up on `<body>`. This is a known NAV-02 gap. Plan 3 should move focus to the breadcrumb's current segment or a `<h1>` landmark on drill change. Phase 32 did not handle this.

### Forms & inputs

| Input | File | State | Notes |
|-------|------|-------|-------|
| `<Input>` (shadcn, used in SaveViewPopover name field) | `ui/input.tsx` | ⚠️ | Has `focus-glow` (Phase 31). No programmatic label tie unless consumer supplies `<Label htmlFor>`. Verify in each consumer. |
| `<Label>` | `ui/label.tsx` | ✅ | |
| `<Checkbox>` | `ui/checkbox.tsx` (used in CreateListDialog, dual-pane-transfer) | Verify | Need to confirm `<Label>` is associated or `aria-label` present. |
| `<select>` in sort-dialog | `sort-dialog.tsx:128` | ⚠️ | Native `<select>` with no associated `<label>`. Needs `aria-label="Sort column"` or similar. |
| `<Switch>` | `ui/switch.tsx` | Verify | |
| FilterCombobox | `filters/filter-combobox.tsx:33` | ✅ | Has `<label className="sr-only">{label}</label>` inside `Combobox.Root`. Base UI Combobox auto-wires. |
| Multi-select Popover+Checkbox inside AttributeFilterBar | `partner-lists/attribute-filter-bar.tsx` | Verify | Composed ad-hoc; needs label audit in Plan 2. |

### Data surfaces

| Surface | File | State | Notes |
|---------|------|-------|-------|
| DataTable shell | `table/data-table.tsx` | ⚠️ | Native `<table>` / `<thead>` / `<tbody>` — good baseline. No `<caption>` or `aria-label`. Sortable columns need `aria-sort`. |
| TableBody rows | `table/table-body.tsx:46` | ❌ | `<tr>` only — no `role`, no `tabIndex`, no keyboard handlers. Drilling happens via `DrillableCell` buttons inside specific columns, not by row Enter. CONTEXT locks "row-level Tab stops + Enter drills + Escape returns" — this requires retrofitting each drill-capable row with `tabIndex=0` + `onKeyDown={Enter→drill, Escape→parent-level}` + visible focus style. Plan 3 work. |
| TableHeader sort state | `table/table-header.tsx`, `draggable-header.tsx` | ⚠️ | Drag-to-reorder uses native `dragstart/over/drop` only — no keyboard alternative. Column drag is currently mouse-only; per CONTEXT row-level keyboard is the ceiling, so column drag can stay in deferred backlog (note it). Sort indicator needs `aria-sort="ascending"`/`descending`/`none` on the `<th>`. |
| Virtualized rows (TanStack Virtual) | `table/table-body.tsx:16-24` | ⚠️ | Virtualizer renders only on-screen rows. axe runs against rendered DOM only, so off-screen rows are untested. CONTEXT is fine with this — row-level Tab stops only need to work on mounted rows. Document this limitation in Plan 1. |
| Recharts CollectionCurveChart | `charts/collection-curve-chart.tsx` | ❌ | No `aria-label` on `<ChartContainer>` or `<LineChart>`. No `role="img"`. **CONTEXT remediation:** add `aria-label` describing the chart (e.g. "Collection curve: recovery rate vs. collection month, one line per batch"). Recharts 3.8.0 also supports `accessibilityLayer` prop (verified in `recharts/types/chart/CartesianChart.d.ts`) which adds keyboard tooltip navigation — OPTIONAL nice-to-have; CONTEXT locks "data-point keyboard nav not pursued", so `accessibilityLayer` stays off unless Plan 2 finds it trivial to enable. |
| CrossPartnerTrajectoryChart | `cross-partner/trajectory-chart.tsx` | ❌ | Same gap. |
| PartnerComparisonMatrix | `cross-partner/comparison-matrix.tsx` | ❌ | Same. |
| Sparklines (Root, Partner) | `charts/root-sparkline.tsx`, etc. | ❌ | Inline decorative-ish but still should carry `aria-label` or `aria-hidden`. |

### Sidebar & navigation

| Surface | File | State | Notes |
|---------|------|-------|-------|
| SidebarMenu partner list | `layout/app-sidebar.tsx:126` | ⚠️ | shadcn `SidebarMenuButton` renders as `<button>` with visible text — accessible name is fine. `isActive` styling present; no `aria-current="page"` — add in Plan 2. |
| SidebarMenuAction (delete view, edit list) | `app-sidebar.tsx:194`, `sidebar.tsx:553-570` | ⚠️ | `showOnHover` uses `md:opacity-0` + `group-hover/group-focus-within:opacity-100`. Keyboard tab-in does raise opacity via `group-focus-within` — good. But icon-only `<Trash2>` / `<Edit>` children have no `aria-label`. Must add in Plan 2. |
| PartnerListsSidebarGroup | `partner-lists/partner-lists-sidebar-group.tsx` | Verify | Multiple onClick handlers; check label coverage. |
| Breadcrumb | `navigation/breadcrumb-trail.tsx` | ⚠️ | `<nav aria-label>` present. Missing `aria-current="page"` on active segment. |

---

## Playwright + axe-core integration recipe

### Versions (verified)

| Package | Version (as of 2026-04) | Source |
|---------|-------------------------|--------|
| `@playwright/test` | `^1.50` (recommend 1.50 or latest) | npm |
| `@axe-core/playwright` | `^4.10` (Deque official) | npm — `@axe-core/playwright` is the recommended integration per Deque docs |
| `axe-core` | `^4.10` (peer of the above) | npm |

`axe-playwright` (non-Deque wrapper, 3rd-party) exists and is simpler (`injectAxe`, `checkA11y`) but lags behind. **Recommend `@axe-core/playwright`** — it's the Deque-maintained path, matches current docs, and returns a structured `AxeResults` object (violations array, nodes, impact) that the test can filter by severity.

### Files to add (Plan 1)

```
playwright.config.ts               # minimal config — dev-server webServer, single project, trace: on-first-retry
tests/a11y.spec.ts                 # iterates ROUTES × THEMES, runs AxeBuilder per route, asserts zero critical/serious
tests/helpers/theme.ts             # forces .dark / light via cookie or localStorage before navigation
.github/workflows/a11y.yml         # OPTIONAL — CONTEXT precedent is user-owned; guard lives in npm script, CI wire-on is user flip
```

### Config snippet (recommended — do not deviate)

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

```ts
// tests/a11y.spec.ts (shape — Plan 1 writes the concrete version)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  { name: 'dashboard-root',      url: '/' },
  { name: 'dashboard-partner',   url: '/?p=Affirm' },
  { name: 'dashboard-batch',     url: '/?p=Affirm&b=AFRM_MAR_26_PRI' },
  { name: 'dashboard-filtered',  url: '/?partner=Affirm' },
  // Optional / stretch: a saved view with drill captured
];
const THEMES = ['light', 'dark'] as const;

for (const route of ROUTES) {
  for (const theme of THEMES) {
    test(`a11y: ${route.name} [${theme}]`, async ({ page }) => {
      await page.addInitScript(([t]) => {
        localStorage.setItem('theme', t);                          // next-themes key
      }, [theme]);
      await page.goto(route.url);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('table tbody tr, [data-empty-state]', { timeout: 10_000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
}
```

### Data source for tests (verified)

- `src/lib/static-cache/fallback.ts:53` `isStaticMode()` returns `true` when `SNOWFLAKE_ACCOUNT` / `SNOWFLAKE_USERNAME` are absent.
- `npm run dev` with **no Snowflake env vars set** serves deterministic cached JSON snapshots (Affirm, American First Finance, etc. — see ACCOUNT_CACHE map).
- Playwright tests run against `npm run dev` → `isStaticMode=true` → predictable data with ~5 batches & ~5 partners. No Snowflake-stub work required.
- `ANTHROPIC_API_KEY` absence means the Cmd+K query dialog's submit path will fail if exercised. **Do not** exercise query-submission in axe tests; opening the dialog is enough to audit its a11y.

### Route list (recommended — Plan 1 finalizes)

| Name | URL | Why |
|------|-----|-----|
| dashboard-root | `/` | Root KPI + trajectory + matrix + table; highest surface count |
| dashboard-partner | `/?p=Affirm` | Partner drill: KPI cards + CollectionCurveChart + partner-table |
| dashboard-batch | `/?p=Affirm&b=AFRM_MAR_26_PRI` | Batch drill: sparkline + account-level table |
| dashboard-filtered | `/?partner=Affirm` | Dimension filter (distinct from drill) |
| dashboard-drill-popover-open | `/` + programmatic click | Audit the Cmd+K query dialog and save-view popover in open state |
| dashboard-dark + each of the above | repeat under `theme=dark` | Required by A11Y-04 (both themes) |

4 unique routes × 2 themes = 8 tests. Popover-open audits via `page.click()` + `page.keyboard.press('Escape')` add ~2 more. Well within 30s per test budget.

### Handling dynamic content

- Wait for `networkidle` then for either `table tbody tr` (data-loaded) or a `[data-empty-state]` selector (EmptyState rendered). This avoids mid-skeleton axe runs that would flag in-flight `aria-busy` correctly but add noise.
- For popover tests: open the popover, `await page.waitForSelector('[data-slot="popover-content"]')` before `AxeBuilder.include('[data-slot="popover-content"]')`.

---

## Focus-management approach (own vs adopt)

**Recommendation: ADOPT what Base UI already provides; do NOT hand-roll a trap.**

### What Base UI `@base-ui/react` gives you for free

Verified by reading `node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts`:

- `<Dialog.Root modal={true | 'trap-focus'}>` — enables focus trap while open, `Escape` close, restore focus to trigger on close. `'trap-focus'` is the variant where the dialog "traps focus within its popup while being non-modal" — useful if you want trap without backdrop pointer lock. Default (`true`) is full modal.
- Sheet primitive (`src/components/ui/sheet.tsx:10`) composes the same Dialog root → same behavior for free.
- Popover primitive (`src/components/ui/popover.tsx`) handles outside-click dismiss, Escape, and return-focus natively.
- Tooltip primitive opens on focus, not just hover — satisfies CONTEXT "hover-revealed must appear on focus".

### What remains to wire (Plan 3)

1. **Explicit `modal` prop on every Dialog/Sheet consumer** (or assert default if verified via test). Files: `query-command-dialog.tsx`, `ui/sheet.tsx` consumers (`sort-dialog`, `column-picker-sidebar`, `create-list-dialog`).
2. **Focus restoration on drill cross-fade.** The re-key in `data-display.tsx:613` destroys the DOM subtree that held focus. Plan 3 adds a `useEffect` keyed on `drillState` that sets focus to the breadcrumb's current `<span>` or a `<h1>` landmark via a ref, matching URL-back and URL-forward identically (CONTEXT "direction-agnostic").
3. **Row-level keyboard** on `table-body.tsx`. For each drill-capable `<tr>`:
   - `tabIndex={0}`
   - `onKeyDown` handling `Enter` → invoke the row's drill handler (same handler as `DrillableCell`)
   - `onKeyDown` handling `Escape` → `navigateToLevel` to parent level
   - Visible focus style — reuse Phase 31 `.focus-glow` with container-level `.focus-glow-within` on `<tr>`, or a row-tint recipe
   - Virtualized rows: focus is preserved because the virtualizer keeps the focused row in the overscan window. Document this.
4. **Escape on drill → parent level** (already present via `use-drill-down` `navigateToLevel`; just bind it at the `<tr>` level).

### Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Focus trap | Custom `useFocusTrap` hook with Tab/Shift+Tab boundary checks | `@base-ui/react` Dialog `modal` prop (already in deps) |
| Focus restoration after dialog close | Manual `lastTriggerRef` + `.focus()` | Base UI Dialog default (restores to opener) |
| Escape-to-close | Custom keyboard listener | Base UI Dialog default |
| Outside-click dismiss (popovers) | Custom ref+listener | Base UI Popover default |
| Focus visible indicator | Hand-rolled ring utility | Phase 31 `.focus-glow` / `.focus-glow-within` (already live) |

---

## Keyboard nav gaps (per dense-UI surface)

### Dashboard → partner drill → batch drill

Current model:
- Drill trigger today is **`DrillableCell` button** (`navigation/drillable-cell.tsx`), not the row itself. Located inside a single cell per drill-capable row.
- Row `<tr>` has no `tabIndex`, no `role`, no keyboard handler.
- Escape at any drill depth is not bound.

CONTEXT requires row-level Tab stops. **Remediation:**
1. Add `tabIndex={0}` + `role` (optional — native `<tr>` inside `<tbody>` is fine) to drill-capable rows.
2. Add `onKeyDown` at `<tr>`: Enter → call `onDrillToPartner(name)` or `onDrillToBatch(...)`; Escape → `onNavigateToLevel(parent)`.
3. Keep `DrillableCell` as the mouse target for sighted users (no regression); the `<tr>` keyboard binding is additive.
4. Visible focus: composite with `.focus-glow-within` on `<tr>` OR emit a `--row-focus-bg` on the hover-bg recipe.

### Toolbar

- All `<Button>` variants already participate in Tab order via Base UI Button.
- `Cmd+K` / `Ctrl+K` is bound globally in `query-command-dialog.tsx:31`. Good.
- ToolbarGroup focus-within recipes (Phase 31 DS-31) already show container focus. Good.
- Missing: `aria-pressed` on toggles (charts visibility, heatmap toggle). Plan 2.

### SortDialog

- Sheet primitive handles trap / Escape / restore.
- Internal reorder buttons (up/down/remove) are raw `<button>` without labels — Plan 2 fix.
- Native `<select>` — add `aria-label`.

### CreateListDialog (Sheet)

- Sheet focuses correctly on open (Base UI default).
- DualPaneTransfer has `aria-label` on Add/Remove buttons ✅.
- Individual row checkboxes need label verification.

### Charts

Locked out of keyboard nav per CONTEXT. Each chart must have `aria-label`; the sibling table carries the data. Plan 2.

---

## Contrast audit approach

### Tooling options (ranked)

1. **axe-core itself** — runs the `color-contrast` rule as part of the default suite. Returns pairs that fail with computed ratios. **This is the primary mechanism** — Plan 1's baseline surfaces all critical/serious contrast failures for free.
2. **Chrome DevTools → Lighthouse a11y audit** — confirmation tool, not CI. Use as human-verify.
3. **Manual token matrix via culori** — generate a grid of (text-token on surface-token) pairs and compute WCAG ratios. Belt-and-braces for token-level auditing. Optional; add only if axe hits raise suspicion that untested pairs exist.

CONTEXT locks "adjust canonical token in globals.css" — so Plan 4's workflow is:
1. Read axe violations from Plan 1 baseline that have `id: 'color-contrast'` + `impact: critical|serious`.
2. For each failing (foreground, background) pair, trace to the token variable that produced it (e.g., `--muted-foreground on --muted`).
3. Bump the token value in `globals.css` `:root` and/or `.dark` until the computed ratio meets AA (4.5:1 for body, 3:1 for large text).
4. Re-run axe → confirm zero hits.

### At-risk token inventory (from globals.css spot-check)

| Pair | Files/Locations | Risk | Notes |
|------|-----------------|------|-------|
| `--muted-foreground` on `--muted` / `--surface-base` | Light: `neutral-600 oklch(0.50 0.014 75)` on `0.985 0.008 85` — likely AA-safe (≈6.5:1). Dark: `neutral-600 oklch(0.76 0.012 60)` on `0.16 0.012 60` — verify. | MEDIUM | Heavily used (caption, label, chart legend, helper text). Axe will flag every instance if it fails. |
| `--muted-foreground` on `--surface-raised` | Light `raised oklch(1 0.004 85)` ≈ paper-white — better contrast. Dark `raised 0.22` — verify. | MEDIUM | |
| `.text-caption text-muted-foreground` | Many (breadcrumb inactive segment, freshness indicator, filter chips, empty-state) | HIGH | Smallest text × lowest-contrast foreground — first to fail. |
| `--brand-green` on `--primary-foreground` (buttons) | Light `0.33 0.095 150` on `neutral-50 0.985` — likely AA. Dark `0.62 0.11 150` on `neutral-50 inverted 0.14` — verify. | MEDIUM | `primary-foreground` is `neutral-50` which is 0.14 in dark — this may be intentional (button text is LIGHT on light-mode only). Worth verifying the ButtonPrimitive consumes these correctly. |
| `--state-warning-fg` / `--state-error-fg` | trend-indicator.tsx, anomaly surfaces | MEDIUM | Dark-mode state fg was hand-tuned for contrast on dark surfaces; light-mode may still fail on surface-raised. |
| Recharts axis/tick fill (`--muted-foreground` via chart tick className) | `charts/numeric-tick.tsx` | MEDIUM | Axis labels tend to be small + low-contrast. axe can't check SVG text reliably; spot-check with Lighthouse. |
| `chart-categorical-*` stroke on `surface-raised` | Not text-contrast, not an axe concern directly — decoration. Skip. | — | |
| Focus ring (`--ring = --brand-green-bright`) on interactive-element non-focus bg | `.focus-glow` | — | 3:1 for non-text UI is WCAG 2.4.11 (AA only from WCAG 2.2); loosely enforced. Phase 31 already handles. |
| Placeholder text (`placeholder:text-muted-foreground` in filter-combobox, SaveViewPopover input) | Multiple inputs | HIGH | Placeholders on input bg need 4.5:1. WebKit often dims; likely fails. |

**Plan 4 should NOT speculate fixes** — the baseline from Plan 1 tells us the actual failing pairs. Inventory above is the watchlist.

---

## Regression Guardrail

### Script + CI wiring

- Add `"check:a11y": "playwright test tests/a11y.spec.ts"` to `package.json:scripts` (mirrors `check:motion`, `check:polish`, etc. 5-guard parity pattern).
- Add `"test:e2e": "playwright test"` as a superset escape valve (optional — CONTEXT doesn't lock this).
- **CI wire-on is user-owned** — precedent: Phases 27-06, 28-08, 29-05, 30-05, 31-06 all deferred Vercel/GitHub-Actions wiring. The guard lives as npm script; user flips it on in Vercel build command or a single-line `.github/workflows/` file when ready. Do NOT auto-enable CI inside the phase.

### Blocking behavior

CONTEXT locks **blocking after baseline is green**. Operational sequence:
- Plan 1 installs + captures baseline → baseline may be red. Commit `tests/a11y.baseline.json` if useful, or simply mark the spec `test.fail.fixme` for known violations that plans 2–4 fix.
- Plans 2, 3, 4 fix categories. Each plan's `check:a11y` must be green before merge.
- Phase close-out: `check:a11y` passes on all routes × themes. Remove any remaining `.fixme`. Guard is blocking thereafter.

### Don't lock CI test runner to Snowflake

- `npm run dev` in the Playwright `webServer` auto-falls back to `getStaticBatchData()` when `SNOWFLAKE_ACCOUNT` is unset. **Vercel build doesn't run Playwright** (build-time, no dev server). So "must not break Vercel build" isn't a concern — this suite runs only as the npm guard, not during `next build`.

---

## Risks & Pitfalls

### Pitfall 1 — Recharts `<svg>` accessibility limbo

**What:** Recharts renders charts as SVG. axe's `color-contrast` rule cannot compute contrast on SVG text reliably (it checks HTML only). Some `svg-img-alt` or `role-img-has-label` checks may fire on the `<svg>` root if it has computed `role="img"`.

**Prevention:** Every chart wrapper gets a concise `aria-label` at the `<ChartContainer>` level (or add `role="img" aria-label="..."` on the `<LineChart>`'s parent `<div>`). Sibling table satisfies data access per CONTEXT. Do NOT worry about SVG text contrast — the data table is the SR source of truth.

### Pitfall 2 — Token contrast cascade

**What:** Retuning a token (e.g., `--muted-foreground`) cascades into dozens of components that consume it. A bump that fixes light-mode muted-on-raised may over-lighten it on muted bg. Every pair interacts.

**Prevention:** Plan 4 should:
1. Test a proposed token value against ALL its surface pairings (matrix).
2. Re-run `check:a11y` against BOTH themes after every token change.
3. Commit token bumps atomically (one variable per commit) so regressions are bisectable.

### Pitfall 3 — Vercel build & Playwright browser download

**What:** `@playwright/test` needs to download browser binaries (~100MB) on `npx playwright install`. Vercel's build cache handles this but only if the `postinstall` hook runs `playwright install` (the tests aren't part of `next build`). If they're not run in Vercel, no problem. If they ARE run (user enables CI), cache the browsers.

**Prevention:** Don't trigger `playwright install` in `postinstall`. Leave it to the CI workflow (when user wires). `next build` should not execute Playwright.

### Pitfall 4 — Base UI default `modal` prop uncertainty

**What:** Base UI Dialog `modal` prop defaults to something, but if we don't set it explicitly the trap behavior could be non-deterministic across versions.

**Prevention:** Plan 3 explicitly sets `modal={true}` (or `'trap-focus'`) on every Dialog/Sheet consumer. Document in inline comment "required for A11Y-03 focus trap contract."

### Pitfall 5 — Icon-only Button without `aria-label` is the single biggest hit

**What:** axe's `button-name` rule is CRITICAL. Every icon-only `<Button>` without an `aria-label` (and a Tooltip is NOT a label) will produce one violation per rendered instance. Toolbar alone has 6+ such buttons, multiplied across routes, so the baseline could show 30+ hits just from this.

**Prevention:** Treat icon-button labeling as the Plan 2 headline. Mechanical sweep: find every `<Button size="icon">` (grep `size="icon"|size="icon-sm"|size="icon-xs"`) and ensure EACH has an `aria-label` prop OR a visible-text child OR an explicit `<span className="sr-only">`. Add a `check:a11y-labels` grep guard if desired (optional).

### Pitfall 6 — Phase 32 drill re-key destroys focus

**What:** `data-display.tsx:613` `key={drill-${level}-${partner}-${batch}}` forces subtree remount. Focus on any element inside that subtree ends up on `<body>` after remount. axe doesn't flag this (it's a UX/keyboard-nav issue, not a structural violation), but CONTEXT locks focus restored-on-trigger — so drill-down close (URL back → `navigateToLevel(parent)`) must put focus somewhere sensible.

**Prevention:** Plan 3 adds a `useEffect` keyed on `drillState` that focuses either `document.querySelector('[data-breadcrumb-current]')` or a `<h1>` region. Direction-agnostic (URL back vs URL forward both fire the same effect).

### Pitfall 7 — `/tokens` in-scope test false-positives

**What:** `/tokens` reference page has lots of demo ARIA and decorative markup. If the test config globs `/**` it'll hit `/tokens` and potentially flag demo violations.

**Prevention:** ROUTES list is explicit. Do NOT add `/tokens` to the test array. CONTEXT locks this as out-of-scope.

### Pitfall 8 — Type-token compliance on a11y fixes

**What:** Adding `className` for focus / accessible-name / etc. risks introducing raw `text-sm` / `text-xs` in src/ outside the allowlist. Phase 27 check:tokens guard will reject.

**Prevention:** Every className touch must use the 6 type tokens (`text-display`, `text-heading`, `text-title`, `text-body`, `text-label`, `text-caption`). `sr-only` is fine (already in use). Plan 2 should call this out explicitly so remediation doesn't regress the guard.

### Pitfall 9 — Baseline dependence on Snowflake static data only covering "Affirm" partner

**What:** The static cache (`src/lib/static-cache/fallback.ts:44`) has 5 batches across 2 partners (Affirm, American First Finance). The ROUTES list should only drill into partners/batches that exist in the cache. Test URLs that reference non-cached combos will land on the stale-deeplink toast path (`data-display.tsx:247-276`) and the drill auto-collapses to root — audit becomes non-deterministic.

**Prevention:** Route list uses only known-good URLs: `/?p=Affirm`, `/?p=Affirm&b=AFRM_MAR_26_PRI`. Audit the toast path separately (open the toast state by URL-forcing an unknown partner, then audit the toast).

---

## Plan grouping recommendation

**Validate the 4-plan CONTEXT breakdown — it's correct.** Recommend no alternative.

| # | Name | Scope | Why this order |
|---|------|-------|----------------|
| **33-01** | CI + axe-core baseline | Install `@playwright/test` + `@axe-core/playwright`; add `playwright.config.ts`, `tests/a11y.spec.ts` (route × theme matrix), `check:a11y` npm script; capture & commit baseline violations (as `.fixme` markers or a `baseline.json`) | Baseline first so plans 2–4 have concrete remediation lists, not speculation. Mirrors Phase 26-01 / 27-01 / 29-01 "foundation before sweep" precedent. |
| **33-02** | ARIA labels & roles | Icon-only `<Button>` `aria-label` sweep (~20–30 sites); chart `aria-label` on 4 chart wrappers; `aria-pressed` on toggles; `aria-current="page"` on breadcrumb + sidebar active; `aria-sort` on sortable columns; sort-dialog + sidebar-menu-action label fills; verify Dialog/Sheet `modal` prop explicit | Biggest volume, mechanical, independent of focus logic. |
| **33-03** | Keyboard nav & focus management | Row-level Tab + Enter + Escape on table-body; drill re-key focus restoration; Dialog/Sheet `modal="trap-focus"` assertions; skip-to-content link (optional) | Depends on Plan 2 having stabilized ARIA so focus indicators land in a semantically correct DOM. |
| **33-04** | Color contrast & token adjustments | Enumerate axe `color-contrast` violations; retune failing tokens in `globals.css` `:root` / `.dark`; re-verify with axe both themes; human-verify in browser | Runs last because token bumps can invalidate visual decisions from Phase 26/31 — isolate it. |
| **33-05 (optional enforcement)** | Close-out + 6-guard parity | `/tokens` "Accessibility" tab with live focus-ring / keyboard-nav / contrast demos; human-verify sign-off; consider optional `eslint-plugin-jsx-a11y` dev-only add | Mirrors Phase 29-05 / 31-06 aggregator close-out. Optional — CONTEXT's 4-plan grouping is also fine without it. |

The 5th plan is a nice-to-have. Phase 31 established the pattern of a close-out aggregator + `/tokens` tab; repeating it for Phase 33 would bring the guard portfolio to 6 (`tokens`, `surfaces`, `components`, `motion`, `polish`, `a11y`). Defer to user preference.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| `@playwright/test` | `^1.50` | E2E runner hosting the a11y suite | Official Microsoft runner; bundles browser install; matches `@axe-core/playwright` |
| `@axe-core/playwright` | `^4.10` | axe-core integration for Playwright | Deque-maintained (authors of axe-core); returns structured `AxeResults`; latest-featured |
| `axe-core` | `^4.10` | Underlying a11y rule engine | Peer dep of the above; industry standard |

### Already in repo (don't add — leverage)

| Library | Version | Purpose |
|---------|---------|---------|
| `@base-ui/react` | `^1.3.0` | Dialog `modal` / Sheet trap / Popover focus return — ALL native |
| `next-themes` | `^0.4.6` | Theme switching for AxeBuilder two-theme sweep |
| `react` | `19.2.4` | `useRef` + `useEffect` for focus restoration |

### Alternatives considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@axe-core/playwright` | `axe-playwright` (non-Deque wrapper) | Simpler API (`injectAxe`/`checkA11y`) but lags releases; community-maintained, not Deque |
| Playwright runner | `jest-axe` + React Testing Library unit a11y | Unit-only, misses rendered DOM state & dynamic ARIA; CONTEXT explicitly skips per-component tests |
| `@axe-core/playwright` baseline.json comparison | `axe-core/puppeteer` | Puppeteer is a dev tool; Playwright is the test runner. No reason to pick puppeteer here. |
| Auto-focus on drill via `autoFocus` prop | Imperative `.focus()` in `useEffect` | autoFocus doesn't re-fire on re-render with same mount; `useEffect` keyed on drillState does |

### Installation

```bash
npm install --save-dev @playwright/test @axe-core/playwright
npx playwright install chromium         # one-time; users on fresh clones run this
```

Optional (decide in Plan 1):
```bash
npm install --save-dev eslint-plugin-jsx-a11y
```
Add `"plugin:jsx-a11y/recommended"` to `eslint.config` via `eslint-config-next`-compatible shape. Low-friction if it slots into the existing ESLint setup; skip if it conflicts.

---

## Architecture Patterns

### Pattern 1: Route × theme axe iteration

One `for/for` loop over ROUTES × THEMES emits one test per combination. Failures isolate to a single route+theme. Good signal-to-noise.

### Pattern 2: Focus-restore effect on drill change

```tsx
useEffect(() => {
  const el = document.querySelector('[data-breadcrumb-current]') as HTMLElement | null;
  el?.focus();
}, [drillState.level, drillState.partner, drillState.batch]);
```

Runs on every drill transition (URL back, forward, programmatic). Matches CONTEXT "direction-agnostic."

### Pattern 3: Row-level keyboard recipe

```tsx
<tr
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && onDrill) { e.preventDefault(); onDrill(); }
    if (e.key === 'Escape' && onNavigateToLevel) { e.preventDefault(); onNavigateToLevel(parentLevel); }
  }}
  className="... focus-glow-within ..."
>
```

No `role="row"` override — native `<tr>` inside `<tbody>` carries implicit row semantics. Focus glow reuses Phase 31 utility.

### Pattern 4: Icon-button labeling recipe

```tsx
<Button variant="ghost" size="icon" aria-label="Save view">
  <Save className="h-4 w-4" />
</Button>
<Tooltip>…</Tooltip>
```

`aria-label` for SR; Tooltip for sighted hint. Both coexist.

### Anti-patterns to avoid

- **Tooltip-only icon buttons** (current state): Fails `button-name`. Always pair with `aria-label`.
- **Custom focus trap hook**: Don't. Base UI Dialog handles it.
- **Per-component contrast overrides** (e.g., `className="text-foreground/90"` as a one-off contrast fix): Violates CONTEXT. Adjust `globals.css` token.
- **`role="grid"` on the data table**: Overkill per CONTEXT; row-Tab model is the ceiling.
- **`role="button"` on `<div>`**: Use a real `<button>` (ButtonPrimitive). All current drill affordances already do.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap | `useFocusTrap` custom hook | Base UI Dialog `modal={true}` | Battle-tested; handles edge cases (tab wrap, shift+tab, portal) |
| Focus restoration to trigger on close | Manual `lastTriggerRef` | Base UI Dialog default | Built-in |
| Outside-click dismiss for popover | Custom ref+listener | Base UI Popover default | Built-in |
| A11y test harness | jsdom + axe unit tests per component | `@axe-core/playwright` on rendered routes | CONTEXT skips per-component; E2E hits the composed DOM |
| Contrast computation | Custom WCAG ratio calculator | axe `color-contrast` rule | Computed and reported by axe automatically |
| Skip-to-content link | Custom scroll-into-view link | `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` + `<main id="main">` | Single-line fix |

---

## Code Examples

### axe baseline assertion

```ts
// Source: https://github.com/dequelabs/axe-core-npm/tree/main/packages/playwright
const results = await new AxeBuilder({ page }).analyze();
const criticalAndSerious = results.violations.filter(
  (v) => v.impact === 'critical' || v.impact === 'serious',
);
expect(criticalAndSerious).toEqual([]);
```

### Verified Base UI Dialog trap

```tsx
// Source: node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts line ~35
<DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Popup>
      <DialogPrimitive.Title className="sr-only">Ask a question about your data</DialogPrimitive.Title>
      {/* content */}
      <DialogPrimitive.Close>Close</DialogPrimitive.Close>
    </DialogPrimitive.Popup>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
```

### Recharts chart aria-label

```tsx
// Source: Recharts 3.8.0 supports both role="img" + aria-label on SVG root,
// and accessibilityLayer prop for optional keyboard tooltip nav.
<ChartContainer
  config={chartConfig}
  className="h-[40vh] w-full"
  role="img"
  aria-label={`Collection curves for ${partnerName}: recovery rate vs. collection month, one line per batch (${curves.length} batches)`}
>
  <LineChart data={pivotedData} /* ... */>
    …
  </LineChart>
</ChartContainer>
```

---

## Validation Architecture

### Test framework

| Property | Value |
|----------|-------|
| Framework | `@playwright/test` 1.50+ + `@axe-core/playwright` 4.10+ |
| Config file | `playwright.config.ts` (NEW — Plan 1 creates) |
| Quick run command | `npm run check:a11y` (NEW — Plan 1 adds) |
| Full suite command | `npx playwright test` (superset if `test:e2e` added) |

### Success-criterion signals

| Success criterion | Signal | Sampling | Automation | Blocker threshold |
|-------------------|--------|----------|------------|-------------------|
| A11Y-01 — Zero critical/serious axe violations on core routes | `AxeBuilder.analyze()` returns `violations.filter(v => ['critical','serious'].includes(v.impact)).length === 0` | 4–6 routes × 2 themes (8–12 test cases per run) | Playwright assertion via `expect(blocking).toEqual([])` | Any test case emits a single critical/serious → fail CI |
| A11Y-02 — Interactive elements have ARIA labels/roles | axe rules: `button-name`, `link-name`, `aria-required-attr`, `aria-valid-attr`, `role-img-alt`, `svg-img-alt` subset | Same 4–6 routes × 2 themes + popover-open variants | Playwright assertion (same fail path) | Any rule above flagged critical/serious → fail |
| A11Y-03 — Keyboard nav (Tab / Enter / Escape) works throughout | **Two signals**: (a) axe `tabindex`, `focus-order-semantics` rules; (b) Playwright interaction test: `await page.keyboard.press('Tab')` × N, `page.keyboard.press('Enter')`, assert URL updates on drill; `page.keyboard.press('Escape')`, assert URL reverts | Dashboard → partner drill → batch drill → saved-view flow (one interaction test); popover Escape-to-close (per overlay) | Playwright: axe + explicit keyboard interaction script + URL assertions | Any keyboard path fails to advance / close → fail; supplemented by CONTEXT manual walkthrough as human-verify gate |
| A11Y-04 — Color contrast meets WCAG AA on all surfaces in both themes | axe `color-contrast` rule (`critical|serious` impact) | Same 4–6 routes × 2 themes — both themes MANDATORY | Playwright assertion (same path) + optional manual Lighthouse spot-check | Any `color-contrast` violation surfaces → fail; remediation occurs in `globals.css` at token level |

### Sampling strategy

- **Per task commit:** `npm run check:a11y` (8–12 test cases; ~30–60s total). Lightweight enough for local pre-commit.
- **Per wave merge:** Same, plus manual keyboard-only walkthrough of Dashboard → drill → saved view.
- **Phase gate:** `check:a11y` green on ALL routes × themes + keyboard walkthrough complete + `/tokens` a11y tab (if shipped) human-verified.

### Interaction-test (keyboard flow) sampling

One dedicated test case per plan's `tests/a11y.spec.ts`:

```ts
test('keyboard: root → drill → back → sidebar view', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('table tbody tr');
  // Tab to first drillable row
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?p=/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/^\/$|^\/\?$/);
  // etc.
});
```

### Blocker thresholds

- Any `critical` or `serious` axe violation on a tested route × theme → red test case → CI red → blocks merge.
- Keyboard interaction test fails to advance via `Enter` or collapse via `Escape` → red → blocks merge.
- CONTEXT's manual walkthrough not completed at phase close → phase verification blocked.

### Wave 0 Gaps (infrastructure to add in Plan 1 before assertions can run)

- [ ] `playwright.config.ts` — single project, chromium only (WebKit/Firefox optional), webServer boots `npm run dev`
- [ ] `tests/a11y.spec.ts` — route × theme loop + keyboard interaction test
- [ ] `tests/helpers/theme.ts` (optional) — shared `setTheme()` helper
- [ ] `package.json` — add `@playwright/test`, `@axe-core/playwright` to `devDependencies`; add `check:a11y` script
- [ ] `.gitignore` — add `test-results/`, `playwright-report/`, `playwright/.cache/` if not already
- [ ] Optional: `.github/workflows/a11y.yml` (user flips on)
- [ ] Optional: `eslint-plugin-jsx-a11y` — evaluate in Plan 1; ship if low-friction

### Framework install (Wave 0, first actions of Plan 1)

```bash
npm install --save-dev @playwright/test @axe-core/playwright
npx playwright install chromium
```

---

## State of the Art

| Old approach | Current approach | When changed |
|--------------|------------------|--------------|
| `axe-puppeteer` / `jest-axe` unit tests | `@axe-core/playwright` E2E runs | axe-core 4.x (2023) — official Deque path since |
| Manual `useFocusTrap` hooks | Headless UI primitives (Base UI, Radix) with `modal` prop | 2022+ — WAI-ARIA Authoring Practices stabilized; headless libs absorbed trap behavior |
| WCAG 2.1 | WCAG 2.2 (published 2023-10) | Current target; CONTEXT locks 2.1 AA which is a subset; 2.2 additions (focus-appearance, consistent-help) optional |
| `color-contrast` rule ignoring SVG | Same — axe can't reliably compute SVG text contrast | Unchanged; workaround is `aria-label` + sibling table |

---

## Open Questions

1. **Do we enable `eslint-plugin-jsx-a11y`?**
   - Known: CONTEXT says "optional if low-friction"; jsx-a11y plugin is static-source linting and catches ~30% of axe-findable issues at write time, but has historical friction with Base UI primitives (rules complain about `<span onClick>` even when it's inside a `Button` render prop).
   - Unclear: Whether the current `eslint-config-next` v16 setup composes cleanly with `plugin:jsx-a11y/recommended`.
   - Recommendation: **Try it in Plan 1 for 10 minutes.** If it lints cleanly after the ARIA sweep in Plan 2, keep. If it flags false positives on Base UI render props, drop.

2. **Does the Phase 32 URL back from batch level → partner level currently restore focus?**
   - Known: `router.push({ scroll: false })` prevents scroll jump; drill re-key forces remount; focus lands on body.
   - Unclear: Whether any users have encountered this in the wild (Micah uses mouse primarily per user profile).
   - Recommendation: Plan 3 fixes it preemptively; verify in manual walkthrough.

3. **Should axe tests run against a saved view with `?drill=&list=` applied?**
   - Known: Static-cache data + saved-views localStorage both work in `npm run dev` mode.
   - Unclear: Whether the added test runtime (localStorage seeding via `page.addInitScript`) is worth the coverage.
   - Recommendation: Defer. Baseline 4 core routes first; if saved-view specific surfaces (e.g. list-filter pane) show unique ARIA patterns, add a dedicated test.

4. **If `accessibilityLayer` on Recharts is easy to enable, should we?**
   - Known: Recharts 3.8.0 exposes `accessibilityLayer={true}` on Cartesian/Polar chart roots; this adds basic keyboard tooltip iteration.
   - CONTEXT lock: "data-point keyboard nav not pursued." This *could* be read as "do NOT enable accessibilityLayer." Ask user before enabling.
   - Recommendation: Plan 2 tries `accessibilityLayer={true}` in one chart; if it causes no regression and produces no axe hits, consider ship. Otherwise, leave off. Flag to user.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts` — Dialog `modal` prop signature verified
- `node_modules/recharts/types/chart/CartesianChart.d.ts` — `accessibilityLayer` prop confirmed
- `src/app/globals.css` — token definitions (read in full), A11Y-05 media query, `.focus-glow` / `.focus-glow-within` utilities
- `src/lib/static-cache/fallback.ts` — `isStaticMode()` confirmed, deterministic data available for tests
- `src/components/**` — component-by-component audit done via Read/Grep on 15+ files
- 33-CONTEXT.md — decisions copied verbatim into `<user_constraints>`
- AGENTS.md + CLAUDE.md — type-token rules, non-standard-Next.js warning
- Phase 31-RESEARCH.md — precedent for guard-script structure + `/tokens` aggregator pattern
- STATE.md — precedent that guard CI wire-on is user-owned (Phases 27-06, 28-08, 29-05, 30-05, 31-06)

### Secondary (MEDIUM confidence — ecosystem knowledge verified against Context7 / official docs not loaded this session)

- Deque `@axe-core/playwright` is the official Playwright integration (npm listing, Deque GitHub repo `axe-core-npm`). Version `4.10.x` current as of 2026-04.
- `@playwright/test` 1.50+ `webServer` config handles auto-boot of `next dev`.
- WCAG 2.1 AA contrast ratio: 4.5:1 normal text, 3:1 large text (18pt+ or 14pt bold). Referenced for at-risk token inventory.

### Tertiary (LOW — not verified this session)

- Exact current axe-core default ruleset tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`). These four are the standard AA sweep; `best-practice` tag would add moderate-impact rules we don't want.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Base UI is already in deps and verified to ship focus trap; `@axe-core/playwright` is the unambiguous Deque-official path.
- Architecture (plan sequencing, recipes): HIGH — CONTEXT locks grouping; recipes match Phase 26–31 precedent closely.
- Current a11y state: MEDIUM — spot-check is representative, but full axe baseline (Plan 1) is the authoritative enumeration. Expect 20–60 initial violations concentrated in icon-button labeling + contrast.
- Contrast at-risk inventory: MEDIUM — based on oklch reading of `globals.css` tokens; exact ratios not computed. Plan 4 will enumerate via axe.
- Risk catalog: HIGH — drawn from verified code paths + real infra constraints.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (baseline findings may drift if UI changes in the meantime; stack recommendations stable longer)

---

## RESEARCH COMPLETE

**Phase:** 33 — Accessibility Audit
**Confidence:** HIGH on paths & recipes; MEDIUM on exact baseline violation counts (deferred to Plan 1 by design)

### Key Findings

- **Stack: `@playwright/test` + `@axe-core/playwright` (Deque official).** Route × theme matrix (4–6 routes × 2 themes ≈ 8–12 test cases) inside a single `tests/a11y.spec.ts`. `check:a11y` npm script mirrors the 5-guard parity pattern (tokens, surfaces, components, motion, polish).
- **Base UI Dialog `modal` prop ships focus trap + Escape close + restore-to-trigger natively** (verified in `node_modules/@base-ui/react/dialog/root/DialogRoot.d.ts`). Do NOT hand-roll a `useFocusTrap` hook. Sheet, Popover, Tooltip primitives also give correct keyboard behavior for free. Only explicit work remaining is (a) setting `modal` explicitly on every consumer, (b) row-level keyboard on `<tr>`, (c) focus restoration after drill re-key.
- **Biggest ARIA debt is icon-only buttons without `aria-label`** — Tooltip alone doesn't satisfy `button-name`. ~6+ toolbar buttons + sidebar menu actions + sort-dialog arrows. Mechanical sweep in Plan 2 will absorb the bulk of critical/serious hits.
- **Static-cache fallback makes Playwright tests deterministic.** `isStaticMode()` in `src/lib/static-cache/fallback.ts:53` returns true when `SNOWFLAKE_ACCOUNT` is unset — so `npm run dev` + Playwright `webServer` gets 5 batches across 2 partners (Affirm, AFF) with no Snowflake plumbing. No fixture work needed.
- **4-plan grouping from CONTEXT is correct.** Baseline first (Plan 1) → ARIA labels & roles (Plan 2) → Keyboard/focus (Plan 3) → Token contrast in `globals.css` (Plan 4). Optional Plan 5 close-out for 6-guard parity + `/tokens` Accessibility tab if user wants aggregator precedent.
- **Type-token compliance risk.** Any a11y className change must honor the 6 named tokens (AGENTS.md). `sr-only` is allow-listed; don't introduce raw `text-xs`/`text-sm`.

### File Created

`/Users/micah/Desktop/CODE/DATA VISUALIZER/.planning/phases/33-accessibility-audit/33-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Deque-official Playwright path verified; Base UI already in deps |
| Architecture | HIGH | CONTEXT locks plan grouping; recipes follow Phase 26–31 precedent |
| Pitfalls | HIGH | Drawn from verified code paths (Phase 32 drill re-key, icon-button grep, globals.css token read) |
| Current a11y state | MEDIUM | Spot-check representative; exact violation count requires Plan 1 baseline |
| Contrast at-risk pairs | MEDIUM | oklch inspection only; axe computes authoritative ratios in Plan 4 |

### Open Questions

1. Enable `eslint-plugin-jsx-a11y` in Plan 1? Trial for 10 minutes; keep if clean against Base UI render-prop pattern, drop otherwise.
2. Recharts `accessibilityLayer={true}` — flag to user; CONTEXT lock ambiguous (data-point keyboard nav not pursued, but accessibilityLayer enables tooltip iteration cheaply).
3. Audit saved-view state (list-filter + drill hydrated from localStorage) — defer unless baseline shows unique ARIA patterns.
4. Drill re-key focus restoration destination — breadcrumb current segment recommended; could also be `<h1>` if one is added.

### Ready for Planning

Research complete. Planner can now create the 4-plan (optionally 5-plan) breakdown with concrete acceptance criteria per plan.
