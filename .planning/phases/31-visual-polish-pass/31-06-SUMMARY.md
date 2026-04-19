---
phase: 31-visual-polish-pass
plan: 06
subsystem: ui
tags: [enforcement, grep-guard, tokens-page, visual-polish, human-verify, phase-close-out]

# Dependency graph
requires:
  - phase: 31-01
    provides: --border 8% retune + dark glass-highlight inset bump — live token values the Polish tab specimens reflect
  - phase: 31-02
    provides: .focus-glow + .focus-glow-within utilities — Focus Glow sub-demo consumes verbatim
  - phase: 31-03
    provides: .thin-scrollbar utility + 3 scrollbar tokens — Scrollbar sub-demo consumes verbatim
  - phase: 31-04
    provides: validated --hover-bg (ships unchanged, final call deferred to this plan's human-verify) — Row Hover sub-demo wires the exact table-body.tsx recipe
  - phase: 31-05
    provides: .divider-horizontal-fade + .divider-vertical-fade utilities + SectionDivider wrapper + ToolbarDivider swap — Gradient Divider sub-demo consumes verbatim
  - phase: 29-05
    provides: check:components grep-guard shape + /tokens TabsList pattern — check-polish.sh and the 7th "polish" tab mirror this precedent 1:1
  - phase: 30-05
    provides: check:motion allowlist shape (ui/ + tokens/ + app/tokens/ + globals.css) — check:polish allowlist is identical
provides:
  - "scripts/check-polish.sh — 8 POSIX grep negative checks for DS-29..DS-34 regressions, modeled on scripts/check-motion.sh"
  - "npm run check:polish — script alias in package.json alongside check:tokens / check:surfaces / check:components / check:motion"
  - "src/components/tokens/visual-polish-specimen.tsx — single aggregator component rendering 6 sub-demos for DS-29..DS-34 treatments"
  - "/tokens 7th tab value=\"polish\" — wired into token-browser.tsx Tabs + TabsContent"
  - "Human-verify sign-off on the full Phase 31 visual polish pass end-to-end (light + dark + reduced-motion + 5 guards + build)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "5th design-system grep guard (tokens + surfaces + components + motion + polish) — same POSIX shape, same allowlist, same FAIL=0 pattern — fully replicable for any future DS-* sweep"
    - "Aggregator specimen pattern: one exported component wrapping N inline sub-demos under a single `space-y-section` wrapper + SectionHeader per sub-demo — mirrors ComponentPatternsSpecimen (29-05) + MotionSpecimen (30-05) — now 3× repeated, canonical"
    - "'OLD vs NEW' side-by-side comparison recipe inside allowlisted /tokens specimens — legal to hand-write the OLD raw-literal color for historical reference, because specimen dir is allowlisted in every check:* guard"
    - "Phase close-out = enforcement-first: the regression guard lands BEFORE the human-verify checkpoint so the guard itself is part of what gets ratified"

key-files:
  created:
    - "scripts/check-polish.sh — 117-line POSIX bash guard with 8 negative checks, exit codes, ✅/❌ messaging"
    - "src/components/tokens/visual-polish-specimen.tsx — 322-line aggregator exporting VisualPolishSpecimen; 6 inline sub-demos"
  modified:
    - "package.json — added `check:polish` npm script alias alongside the 4 existing check:* aliases"
    - "src/components/tokens/token-browser.tsx — imported VisualPolishSpecimen; added 7th Tabs.Tab + Tabs.Panel with value=\"polish\"; updated header doc"

key-decisions:
  - "Guard allowlist matches check:motion verbatim (ui/ + tokens/ + app/tokens/ + globals.css) — every DS-* enforcement uses the same 'design-system primitives and /tokens documentation surface are legal to hand-write; app code is not' rule"
  - "8 negative checks (not 7) — bonus check #8 is transition-shadow-on-focus-glow (31-RESEARCH §DS-31 Pitfall 1). Easy single-grep implementation; lands in the guard rather than deferred as manual-review"
  - "Border-Standard specimen hand-writes the OLD 15% border as a raw color-mix literal — legal because src/components/tokens/** is allowlisted. Inline comment + label in the JSX flags the intent so no future reviewer thinks it's a regression"
  - "Row Hover demo uses the EXACT table-body.tsx recipe (h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg) — not an approximation. Locks in the Phase 30 wiring site as the single source of truth and makes /tokens the canonical preview of production behavior"
  - "Focus Glow demo wraps input + button + ToolbarGroup in a single sub-demo to showcase both .focus-glow (per-element) and .focus-glow-within (cluster-level). Caption explicitly instructs 'tab through' so human-verify is frictionless"
  - "Glass Highlight demo uses a forced `.dark` wrapper for the dark-mode card — side-by-side in one view regardless of the user's theme setting. Labels 'Light (no analog)' and 'Dark (~7% top edge)' per 31-01 decision (no light-mode analog)"
  - "No aggregator SUMMARY.md content in this plan — placeholder only. /gsd:verify-phase 31 owns the full Phase 31 roll-up; this plan scopes to its own 3 tasks + the human-verify outcome"
  - "Polish tab positioned as the 7th (rightmost) tab in /tokens — chronological order (colors → typography → spacing → motion → patterns → components → polish) so the most recent additions sit at the right edge, matching Phase 29-05 + 30-05 precedent"

patterns-established:
  - "5-guard parity: tokens + surfaces + components + motion + polish — complete design-system grep-guard coverage for the Phase 26-31 arc"
  - "Aggregator specimen layout recipe: `<div className='space-y-section'>` → N sub-demos each with SectionHeader title + live specimen + optional caption. Triple-proven (29-05, 30-05, 31-06). Canonical shape for any future DS-* specimen aggregator"
  - "Phase close-out checklist: (1) regression guard shipped + green, (2) /tokens specimen shipped + renders in both modes, (3) human-verify sign-off in browser across all requirements + guards + build. Phase 29-05 and Phase 30-05 established this; 31-06 locks it in as the standard"

requirements-completed: [DS-29, DS-30, DS-31, DS-32, DS-33, DS-34]

# Metrics
duration: ~6 min (excluding human-verify wait)
completed: 2026-04-18
---

# Phase 31 Plan 06: Visual Polish Enforcement + /tokens Aggregator + Human-Verify Summary

**Phase 31 close-out: scripts/check-polish.sh POSIX grep guard (8 negative checks) + npm run check:polish alias + /tokens 7th "Polish" tab with VisualPolishSpecimen (6 sub-demos for DS-29..DS-34) + human-verify sign-off on the full visual polish pass end-to-end.**

## Performance

- **Duration:** ~6 min (Tasks 1 + 2 inline; human-verify wait excluded)
- **Tasks:** 3 (guard, specimen, human-verify)
- **Files created:** 2 (scripts/check-polish.sh, src/components/tokens/visual-polish-specimen.tsx)
- **Files modified:** 2 (package.json, src/components/tokens/token-browser.tsx)

## Accomplishments

### Task 1 — scripts/check-polish.sh + npm run check:polish alias

- New POSIX bash script (117 lines) modeled verbatim on scripts/check-motion.sh: `#!/usr/bin/env bash`, `set -euo pipefail`, `files_to_check()` function with the standard allowlist (excludes src/components/ui/, src/components/tokens/, src/app/tokens/, src/app/globals.css), `FAIL=0` accumulator, per-check `if grep ... then FAIL=1 fi` pattern, `✅`/`❌` exit messaging.
- **8 negative checks shipped** (one more than the plan's baseline 7, bonus check #8 added):
  1. Raw border hex/rgb/oklch color literals (`border-\[(#|rgb|oklch|var\()`)
  2. Border-opacity overrides on design tokens (`border-(border|input|sidebar-border)/[0-9]+`)
  3. Raw Tailwind palette border colors (20-color alternation)
  4. Raw focus-visible ring recipes (`focus-visible:ring-\[|focus:ring-[0-9]`)
  5. Unscoped `::-webkit-scrollbar` outside allowlist
  6. Raw `linear-gradient(to (right|bottom), transparent, ...)` divider patterns
  7. Raw inset top-edge shadow hardcodes (`inset[_ ]0[_ ]1px[_ ]0[_ ]0[_ ](rgb|oklch)`)
  8. `transition-shadow` / `transition-[box-shadow]` on same line as `.focus-glow` / `.focus-glow-within` (31-RESEARCH §DS-31 Pitfall 1)
- `package.json` scripts block gained a single-line `"check:polish": "bash scripts/check-polish.sh"` entry alongside the 4 existing check:* aliases.
- Script is executable (`chmod +x`) and runs in **<0.2s** on the current tree. Exits 0 — no regressions after 31-01..31-05.

### Task 2 — VisualPolishSpecimen + /tokens Polish tab

- New component `src/components/tokens/visual-polish-specimen.tsx` (322 lines): one exported `VisualPolishSpecimen` function wrapping 6 inline sub-demos under a single `<div className="space-y-section">` container. Each sub-demo carries a SectionHeader title and, where helpful, a text-caption instruction row.
- **6 sub-demos:**
  1. **Gradient Divider (DS-29)** — three stacked placeholder rows separated by `<SectionDivider />` + a small horizontal ToolbarGroup with `ToolbarDivider` between two buttons to show the vertical gradient-fade side-by-side with the horizontal.
  2. **Glass Highlight (DS-30)** — two `surface-raised` cards side-by-side, the right one inside a forced `.dark` wrapper labeled "Dark (~7% top edge)"; left labeled "Light (no analog)". Uses real elevation tokens — no hand-rolled styles.
  3. **Focus Glow (DS-31)** — an input + a button + a ToolbarGroup wrapper carrying `focus-glow-within`, plus a text-caption instructing "Tab through to see the glow." Demonstrates both per-element `.focus-glow` and cluster-level `.focus-glow-within`.
  4. **Border Standard (DS-32)** — two cards side-by-side: left labeled "OLD 15%" using a raw `color-mix(in oklch, var(--neutral-500) 15%, transparent)` literal (legal inside allowlisted /tokens dir), right labeled "NEW 8%" using `border-border`. Makes the 31-01 retune visually undeniable.
  5. **Row Hover (DS-33)** — a static 3-row table using the EXACT Phase 30 table-body.tsx recipe (`h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg`). User hovers to confirm tint intensity matches 31-04 finding.
  6. **Scrollbar (DS-34)** — two scroll containers side-by-side, left with `thin-scrollbar` class + stuffed with overflow content, right with default OS scrollbar. Demonstrates the opt-in model shipped in 31-03.
- `src/components/tokens/token-browser.tsx` modified: imported `VisualPolishSpecimen` at the top; added `<Tabs.Tab value="polish">Polish</Tabs.Tab>` as the 7th tab in TabsList; added `<Tabs.Panel value="polish"><VisualPolishSpecimen /></Tabs.Panel>` in the content area. Header doc string updated to include Polish.

### Task 3 — Human-verify checkpoint

- User opened `http://localhost:3000/tokens?tab=polish` in light mode, exercised all 6 demos, toggled dark mode, re-exercised all 6 demos, navigated to the main data-display page, tabbed through real UI, toggled `prefers-reduced-motion: reduce`, and ran all 5 guards + the Next.js build.
- **All 11 checks passed on first pass:**
  - ✅ /tokens Polish tab — 6 light-mode sub-demos read as intended (gradient fade, glass highlight dark-only, focus glow, OLD-vs-NEW border standard delta visible, row hover tint, scrollbar opt-in).
  - ✅ /tokens Polish tab — 6 dark-mode sub-demos re-verified (glass highlight visible on main surfaces, gradient adapted to dark-mode --border, focus glow in --ring green, scrollbar thumb adapts).
  - ✅ Main data-display page — gradient dividers visible at KPI↔charts and charts↔table junctions in both modes; ToolbarGroup dividers render as faint vertical gradients; cards read near-borderless; focus glow everywhere it should be, hard outlines nowhere; table row hover transitions smoothly; body scrollbar = OS default, table/sidebar/filter popup = themed thin.
  - ✅ Reduced-motion — row hover transition-duration drops to 0ms, colors still change (correct); focus glow is instant (no transition); no regressions.
  - ✅ All 5 guards (`npm run check:tokens`, `check:surfaces`, `check:components`, `check:motion`, `check:polish`) exit 0.
  - ✅ `npm run build` compiles cleanly with zero type errors.
- **User response:** approved. Phase 31 visual polish pass ratified end-to-end.

## Task Commits

1. **Task 1 — scripts/check-polish.sh + npm run check:polish alias** — `0ff822e` (feat)
2. **Task 2 — VisualPolishSpecimen + /tokens Polish tab** — `dcfdce2` (feat)
3. **Task 3 — Human-verify checkpoint** — no commit (approval only; scope-final docs commit follows)

## Files Created/Modified

- `scripts/check-polish.sh` (new, 117 lines, executable) — POSIX bash guard with 8 negative checks + allowlist + exit messaging.
- `src/components/tokens/visual-polish-specimen.tsx` (new, 322 lines) — `VisualPolishSpecimen` aggregator + 6 inline sub-demos.
- `package.json` (+1 line) — `check:polish` script alias.
- `src/components/tokens/token-browser.tsx` (+15 lines / -3 lines) — import + 7th tab trigger + 7th tab panel + header doc update.

## Decisions Made

- **8 checks over 7** — bonus transition-shadow-on-focus-glow check (Pitfall 1 from 31-RESEARCH §DS-31) was trivially expressible as a single `grep -nE` against lines containing both `.focus-glow(-within)?` and `transition[-:][^;]*shadow`. No reason to defer as manual-review.
- **Guard allowlist = check:motion allowlist** — `src/components/ui/`, `src/components/tokens/`, `src/app/tokens/`, `src/app/globals.css`. Every DS-* enforcement already converged on this shape; 5-guard parity is complete and symmetric.
- **Border Standard demo uses a raw color-mix literal** — legal because `src/components/tokens/**` is allowlisted in check:polish (as in every other check:* guard). JSX label "OLD 15%" + inline comment flag the intent. Makes the 31-01 retune tangible instead of abstract.
- **Row Hover demo uses the EXACT production recipe** — not a stylistic approximation. `h-[var(--row-height)] transition-colors duration-quick ease-default hover:bg-hover-bg` — same arbitrary-value height, same Phase 30 motion wiring, same Phase 26 hover token. /tokens becomes the canonical visual preview of the production table-body.tsx wire-up.
- **Polish tab slot = 7th (rightmost)** — chronological order by shipping date (colors → typography → spacing → motion → patterns → components → polish). Mirrors 29-05 + 30-05 precedent; newest additions live at the right edge.
- **Phase aggregator SUMMARY.md is a placeholder only** — the final milestone-level roll-up is owned by `/gsd:verify-phase 31`. This plan's SUMMARY.md is scoped to its own 3 tasks + the human-verify outcome.
- **No additional follow-up todos filed** — all 6 DS-* requirements ratified in one human-verify session; no gap flagged for a future pass.

## Deviations from Plan

None — plan executed exactly as written.

The plan's Task 1 specified 7 negative checks plus an optional 8th "bonus — land if easy"; the bonus check landed. Task 2's 6 sub-demo layout and /tokens tab wiring matched the plan's interfaces verbatim. Task 3's human-verify 11-check matrix passed on first pass with no regressions requiring auto-fix.

No auto-fixes (Rules 1-3), no architectural decisions (Rule 4), no authentication gates, no scope expansion. The dev server was started to support the human-verify checkpoint and has been terminated as part of the close-out.

## Issues Encountered

None. All 11 human-verify checks passed on first pass; all 5 guards and `npm run build` green throughout.

The only live footprint: the backgrounded dev server from Task 2 (bash id bduag3xwy) — terminated during close-out via `lsof -ti:3000 | xargs kill -9`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 31 is complete.** All 6 DS-29..DS-34 requirements ratified; `check:polish` live; /tokens has 7 tabs dogfooding every design-system token set.
- **5-guard parity achieved:** tokens + surfaces + components + motion + polish. Any future DS-* sweep can ship its enforcement guard using the same POSIX shape and allowlist with ~60 min of work.
- **Phase 33 (Accessibility Audit)** can now audit the final polished state — focus-glow is live, reduced-motion is wired at the global media query layer (Phase 30), surface contrast ratios stable after 31-01's border retune.
- **`/gsd:verify-phase 31`** will produce the final milestone-level roll-up consuming the 6 plan-level SUMMARY.md files in this phase directory.

## Self-Check: PASSED

- FOUND: scripts/check-polish.sh (executable, 117 lines).
- FOUND: `check:polish` entry in package.json scripts block.
- FOUND: src/components/tokens/visual-polish-specimen.tsx (322 lines; exports VisualPolishSpecimen).
- FOUND: `value="polish"` + `VisualPolishSpecimen` references in src/components/tokens/token-browser.tsx.
- FOUND: commit 0ff822e in git log (Task 1).
- FOUND: commit dcfdce2 in git log (Task 2).
- FOUND: dev server terminated (port 3000 clear).

---
*Phase: 31-visual-polish-pass*
*Completed: 2026-04-18*
