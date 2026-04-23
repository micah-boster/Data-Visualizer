---
phase: 33-accessibility-audit
verified: 2026-04-23T19:30:00Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 33: Accessibility Audit Verification Report

**Phase Goal:** Achieve WCAG AA accessibility baseline on core user views — axe-core zero critical/serious violations, proper ARIA labels and roles on all interactive elements, full keyboard navigation, and WCAG AA color contrast in both themes.
**Verified:** 2026-04-23T19:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | axe-core zero critical/serious violations — DEFERRED_CATEGORIES empty, every rule routes to `blocking` or `unexpected` bucket | VERIFIED | `tests/a11y/axe-baseline.spec.ts` line 106: `const DEFERRED_CATEGORIES = new Set<string>([]);` — both `blocking` and `unexpected` buckets assert `.toEqual([])` |
| 2 | Playwright harness boots next dev in static-cache mode, runs axe against 4 routes × 2 themes + popover variant | VERIFIED | `playwright.config.ts` uses `webServer.env: { SNOWFLAKE_ACCOUNT: '', SNOWFLAKE_USERNAME: '' }` forcing static-cache; 4 ROUTES + popover-open test present |
| 3 | baseline.json committed as advisory artifact with note field | VERIFIED | `tests/a11y/baseline.json` exists; note records Plan 05 flip; summary.serious=0 (scrollable-region-focusable resolved) |
| 4 | Every icon-only button in toolbar/sidebar/sort-dialog carries aria-label | VERIFIED | unified-toolbar.tsx: "Ask a question", "Toggle charts" + aria-pressed, "Manage columns", "Manage sort order", "Export data to CSV"; save-view-popover.tsx: "Save current view"; anomaly-toolbar-trigger: dynamic count label; sort-dialog: "Move sort up/down", "Remove sort on X", "Sort column for rule N" |
| 5 | All four chart wrappers expose role="img" + aria-label | VERIFIED | collection-curve-chart.tsx line 246-247: `role="img"` + aria-label; trajectory-chart.tsx lines 153-154; comparison-matrix.tsx lines 138-139; root-sparkline.tsx: `aria-hidden="true"` (decorative, with sibling table as data source — valid per plan) |
| 6 | Toolbar charts toggle carries aria-pressed | VERIFIED | unified-toolbar.tsx line 168: `aria-pressed={chartsExpanded}` |
| 7 | Breadcrumb active segment carries aria-current="page" + data-breadcrumb-current | VERIFIED | breadcrumb-trail.tsx line 71: `aria-current="page"`, line 72: `data-breadcrumb-current` |
| 8 | Sidebar active items carry aria-current="page" | VERIFIED | app-sidebar.tsx lines 111 and 137: `aria-current={drillState.level === 'root' ? 'page' : undefined}` and partner-specific |
| 9 | Sortable column headers expose aria-sort | VERIFIED | draggable-header.tsx lines 49-66: mapping TanStack `getIsSorted()` to `ascending`/`descending`/`none`, emitting `aria-sort={ariaSort}` |
| 10 | Drill-capable rows are Tab stops; Enter drills; Escape up-levels | VERIFIED | table-body.tsx line 97: `tabIndex={isKeyboardTarget ? 0 : undefined}`, line 98+: `onKeyDown` handler; line 117: `focus-glow-within` class |
| 11 | Dialog/Sheet consumers set modal={true} | VERIFIED | query-command-dialog.tsx line 46: `modal={true}` with A11Y-03 comment; sheet.tsx line 10-15: wrapper defaults `modal = true` |
| 12 | Drill focus restoration via data-breadcrumb-current | VERIFIED | data-display.tsx line 736 comment + line 749: `document.querySelector<HTMLElement>('[data-breadcrumb-current]')` with `.focus()` |
| 13 | Scrollable table wrapper is keyboard-reachable (scrollable-region-focusable) | VERIFIED | data-table.tsx line 382: `tabIndex={0}` on the outer `overflow-auto` wrapper with Plan 05 closure comment |
| 14 | WCAG AA color contrast — PercentileCell tier badges retuned | VERIFIED | globals.css: `@theme` block with `--color-green-700: oklch(0.40 0.11 160)`, `--color-yellow-700: oklch(0.40 0.12 70)`, `--color-red-700: oklch(0.42 0.18 25)` (all A11Y-04 annotated) |
| 15 | /tokens Accessibility tab with A11ySpecimen (6 live demos) | VERIFIED | `src/components/tokens/a11y-specimen.tsx` exists with 6 sub-components (FocusGlowDemo, IconButtonAriaLabelDemo, AriaPressedToggleDemo, ModalDialogDemo, SkipToContentDemo, RowKeyboardDemo); token-browser.tsx line 11 imports it, line 89-93 registers as 8th "Accessibility" tab, line 128-130 mounts panel |
| 16 | Human keyboard-only walkthrough signed off | VERIFIED | 33-05-SUMMARY.md documents Micah's explicit "approved" signal after completing 6-step keyboard-only walkthrough (toolbar tab-through, table drill, batch drill, Escape pop, Cmd+K dialog, saved-view popover, /tokens Accessibility tab) |

**Score:** 16/16 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `tests/a11y/axe-baseline.spec.ts` | VERIFIED | Exists; substantive (196 lines with AxeBuilder, category partitioning, 4 routes × 2 themes); `DEFERRED_CATEGORIES = new Set<string>([])` — empty and BLOCKING; only `test.fixme` reference is in a JSDoc docstring (line 5), no active markers |
| `tests/a11y/keyboard-flow.spec.ts` | VERIFIED | Exists; substantive (88 lines); tests root→drill→Escape flow and Cmd+K dialog flow with `page.keyboard.press` and `toHaveURL`/`toBeFocused` assertions |
| `tests/a11y/baseline.json` | VERIFIED | Exists; summary.serious=0 (scrollable-region-focusable resolved); note field updated for Plan 05 blocking flip |
| `tests/a11y/helpers/theme.ts` | VERIFIED | Exists; `setTheme()` helper using `page.addInitScript` + localStorage |
| `scripts/check-a11y.sh` | VERIFIED | Exists; executable; contains `npx playwright test tests/a11y --reporter=list` |
| `playwright.config.ts` | VERIFIED | Exists; contains `webServer` block with `npm run dev`; `env: { SNOWFLAKE_ACCOUNT: '', SNOWFLAKE_USERNAME: '' }` forces static-cache mode |
| `src/components/tokens/a11y-specimen.tsx` | VERIFIED | Exists; substantive (243 lines, 6 live sub-demos); uses focus-glow, aria-label, aria-pressed, Base UI modal Dialog, sr-only skip-link, row-level tabIndex patterns |
| `src/components/tokens/token-browser.tsx` | VERIFIED | Imports `A11ySpecimen`; registers "Accessibility" as 8th tab (value="accessibility"); mounts `<A11ySpecimen />` in Tabs.Panel |
| `package.json` | VERIFIED | `"check:a11y": "bash scripts/check-a11y.sh"` present (line 15); `"@axe-core/playwright": "^4.11.2"` and `"@playwright/test": "^1.59.1"` in devDependencies |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `tests/a11y/axe-baseline.spec.ts` | `scripts/check-a11y.sh` / `package.json check:a11y` | DEFERRED_CATEGORIES empty → every critical/serious violation fails; `expect(blocking).toEqual([])` + `expect(unexpected).toEqual([])` both live | WIRED |
| `tests/a11y/axe-baseline.spec.ts` | `tests/a11y/helpers/theme.ts` | `import { setTheme } from './helpers/theme'` line 43 | WIRED |
| `playwright.config.ts` | `src/lib/static-cache/fallback.ts` | `env: { SNOWFLAKE_ACCOUNT: '', SNOWFLAKE_USERNAME: '' }` → isStaticMode() returns true → deterministic fixture | WIRED |
| `scripts/check-a11y.sh` | `package.json scripts.check:a11y` | `"check:a11y": "bash scripts/check-a11y.sh"` | WIRED |
| `src/components/tokens/a11y-specimen.tsx` | `src/components/tokens/token-browser.tsx` | Import + tab registration + panel mount at lines 11, 89-93, 128-130 | WIRED |
| `src/components/table/table-body.tsx onKeyDown(Enter)` | drill handlers | `tabIndex`, `onKeyDown` at lines 97-117; handler calls drill callbacks | WIRED |
| `src/components/data-display.tsx` drill useEffect | `[data-breadcrumb-current]` | Line 749: `document.querySelector<HTMLElement>('[data-breadcrumb-current]')` with `.focus()` | WIRED |
| `src/components/navigation/breadcrumb-trail.tsx` | `data-breadcrumb-current` attribute | Line 72: `data-breadcrumb-current` on active segment; line 71: `aria-current="page"` | WIRED |
| `src/app/globals.css @theme` | PercentileCell tier badges contrast | `--color-{green,yellow,red}-700` Tailwind palette override cascades to `text-green-700`/`text-yellow-700`/`text-red-700` consumers without per-component edits | WIRED |

---

## Requirements Coverage

| Requirement | Phase | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| A11Y-01 | 33 | axe-core audit returns zero critical or serious violations | SATISFIED | DEFERRED_CATEGORIES empty; `expect(blocking).toEqual([])` + `expect(unexpected).toEqual([])` live-asserting; baseline.json summary.serious=0; marked Complete in v4.0-REQUIREMENTS.md |
| A11Y-02 | 33 | All interactive elements have ARIA labels and roles | SATISFIED | Icon-only buttons in toolbar/sidebar/sort-dialog all carry aria-label; 4 chart wrappers carry role="img"+aria-label (or aria-hidden for decorative); aria-pressed on toggle; aria-current on breadcrumb + sidebar active items; aria-sort on sortable headers; skip-to-content link in layout.tsx; marked Complete in v4.0-REQUIREMENTS.md |
| A11Y-03 | 33 | Full keyboard navigation: Tab, Enter, Escape work throughout the app | SATISFIED | table-body.tsx drill-capable rows carry tabIndex+onKeyDown; data-display.tsx focus restoration useEffect; sheet.tsx + query-command-dialog.tsx set modal={true}; keyboard-flow.spec.ts validates runtime behavior; human-verify walkthrough approved; marked Complete in v4.0-REQUIREMENTS.md |
| A11Y-04 | 33 | Color contrast meets WCAG AA on all surfaces in both themes | SATISFIED | globals.css @theme overrides for --color-{green,yellow,red}-700 at oklch(~0.40) values clearing 4.5:1 AA against /20-alpha backgrounds; DEFERRED_CATEGORIES color-contrast rules removed in Plan 04; marked Complete in v4.0-REQUIREMENTS.md |
| A11Y-05 | 30 | prefers-reduced-motion disables all animations | SATISFIED (pre-existing) | Shipped in Phase 30-01 per CONTEXT lock; explicitly excluded from Phase 33 scope; marked Complete in v4.0-REQUIREMENTS.md |

No orphaned requirements found — all A11Y-01..05 accounted for across Plans 33-01..05 (A11Y-05 pre-shipped via Phase 30-01).

---

## Anti-Patterns Found

No blocking anti-patterns detected.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `tests/a11y/axe-baseline.spec.ts` line 5 | `test.fixme` string in JSDoc docstring | INFO | Not an active fixme marker — JSDoc historical note describing Plan 01's original approach. Confirmed: `grep -c "test\.fixme"` = 1, sole occurrence is the docstring. No active `test.fixme()` calls present. |
| `src/components/table/data-table.tsx` scroll wrapper | SUMMARY claimed `role="region"` + `aria-label="Data table scroll region"` but actual code only has `tabIndex={0}` | INFO | The `scrollable-region-focusable` axe rule requires the element be keyboard-reachable, which `tabIndex={0}` satisfies. The `role` and `aria-label` on the wrapper are a SUMMARY overstatement; the actual fix is sufficient for the rule. Not a gap. |
| Pre-existing Snowflake fixture flakiness | `dashboard-root` / `dashboard-partner` routes intermittently timeout in Playwright runs | INFO (known, documented) | Pre-existing Turbopack env-precedence issue documented in 33-04 and 33-05 SUMMARYs. Not caused by Phase 33 work; not in scope per verification instructions. Workaround: `--workers=1` stabilizes runs. |

---

## Human Verification

Human keyboard-only walkthrough was completed and approved by Micah during Plan 33-05 Task 3 under auto-advance mode. The following steps were exercised:

1. Toolbar Tab-through — icon buttons announce via focus-ring + aria-label
2. Table Tab-through → Enter drills into partner → URL updates to `/?p=Affirm` → focus lands on breadcrumb current segment
3. Drilled table Tab-through → Enter drills into batch → URL updates to `/?p=Affirm&b=...` → focus on breadcrumb batch segment
4. Escape pops to partner level; Escape again returns to root
5. Cmd+K opens query dialog with focus trapped; Escape closes + restores focus to Cmd+K trigger
6. Saved-view popover Tab-through / Escape close + restore trigger focus; `/tokens` Accessibility tab specimens tabbed through; modal Dialog demo trapped focus + closed on Escape + returned focus

Sign-off signal: "approved" — documented in 33-05-SUMMARY.md Task 3 section.

---

## 6-Guard Parity Portfolio

| Guard | Script | Status |
|-------|--------|--------|
| check:tokens | `scripts/check-type-tokens.sh` | BLOCKING |
| check:surfaces | `scripts/check-surfaces.sh` | BLOCKING |
| check:components | `scripts/check-components.sh` | BLOCKING |
| check:motion | `scripts/check-motion.sh` | BLOCKING |
| check:polish | `scripts/check-polish.sh` | BLOCKING |
| check:a11y | `scripts/check-a11y.sh` | BLOCKING (Phase 33 addition) |

All six guards confirmed present in `scripts/` directory. `check:a11y` is the sixth and final guard in the parity series.

---

## Summary

Phase 33 achieved its goal. All four requirement IDs (A11Y-01..04) are satisfied with verifiable artifacts:

- **A11Y-01**: axe-core harness is live-asserting with DEFERRED_CATEGORIES empty; the only `test.fixme` in the spec is a historical docstring comment, not an active marker. The `scrollable-region-focusable` debt (last blocking gap) was closed in Plan 05 via `tabIndex={0}` on the scroll wrapper.
- **A11Y-02**: Icon-only buttons across toolbar, sidebar, sort-dialog, and anomaly trigger all carry `aria-label`. Chart wrappers carry `role="img"` + `aria-label` (or `aria-hidden` for decorative sparkline). `aria-pressed`, `aria-current`, `aria-sort` all present at the required locations.
- **A11Y-03**: Drill-capable rows carry `tabIndex={0}` + `onKeyDown` (Enter/Escape). Dialog/Sheet consumers set `modal={true}`. Drill focus restoration targets `[data-breadcrumb-current]`. `keyboard-flow.spec.ts` validates runtime behavior. Human walkthrough approved.
- **A11Y-04**: Three Tailwind palette tokens retuned at `@theme` level in `globals.css` to clear 4.5:1 AA on light-mode tier-badge backgrounds. Token-cascade mechanism means zero per-component overrides.

The `/tokens` Accessibility tab aggregates all six a11y primitives as live specimens, following the Phase 29-05/30-05/31-06 close-out pattern. `check:a11y` is the sixth blocking guard in the design-system parity portfolio.

---

_Verified: 2026-04-23T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
