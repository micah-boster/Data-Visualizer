---
phase: 31-visual-polish-pass
plan: 03
subsystem: ui
tags: [scrollbar, design-system, css-tokens, tailwind-v4]

requires:
  - phase: 26-design-tokens
    provides: neutral-scale + :root/.dark token blocks that scrollbar tokens slot into
  - phase: 31-visual-polish-pass
    provides: surface + focus-glow precedent establishing the @layer utilities pattern reused here

provides:
  - .thin-scrollbar utility (Firefox scrollbar-width/color + WebKit ::-webkit-scrollbar/-thumb/-thumb:hover)
  - --scrollbar-track / --scrollbar-thumb / --scrollbar-thumb-hover semantic tokens in :root + .dark
  - 6 named scroll containers opted into themed thin scrollbar (table, sidebar, filter combobox, sort dialog, query response, curve legend)
  - Document/body scroll restored to OS default per CONTEXT scope lock

affects: [31-04-visual-polish, 31-05-visual-polish, 31-06-visual-polish]

tech-stack:
  added: []
  patterns:
    - "Scoped opt-in utility recipe — tokens in :root/.dark + utility class in @layer utilities + explicit application per named container (mirrors .hover-lift + .focus-glow precedent)"
    - "Cross-browser scrollbar styling coexistence — Firefox scrollbar-width/color declared on the same selector as WebKit ::-webkit-scrollbar rules"

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/table/data-table.tsx
    - src/components/ui/sidebar.tsx
    - src/components/filters/filter-combobox.tsx
    - src/components/table/sort-dialog.tsx
    - src/components/query/query-response.tsx
    - src/components/charts/curve-legend.tsx

key-decisions:
  - "DS-34 shipped as scope narrowing (not visual retune) — global ::-webkit-scrollbar removed so document/body scroll falls back to OS default; themed thin scrollbar is opt-in per named container"
  - "Sidebar reconciled from legacy `no-scrollbar` opt-out to `thin-scrollbar` opt-in — CONTEXT names sidebar as in-scope; the opt-out predated Phase 31 scope narrowing and would have left the sidebar with no scrollbar at all after global rules were removed"
  - "--scrollbar-track stays transparent (mode-agnostic — declared only in :root, inherited by .dark) — thumb + thumb-hover are the only light/dark-distinct values"
  - "Utility lives in the existing @layer utilities block alongside .hover-lift and .focus-glow — consistent with Phase 30 + Phase 31-02 precedent"

patterns-established:
  - "Scoped opt-in scrollbar recipe — three --scrollbar-* tokens + .thin-scrollbar utility + explicit className application per named overflow container"
  - "Legacy no-scrollbar → thin-scrollbar reconciliation: when scope narrowing removes a global rule, audit existing opt-outs and flip them to opt-ins if the container is in the new named-container set"

requirements-completed: [DS-34]

duration: ~5 min
completed: 2026-04-18
---

# Phase 31 Plan 03: Scrollbar Scope Narrowing (DS-34) Summary

**Removed global `::-webkit-scrollbar` rules and replaced with `.thin-scrollbar` utility + 3 semantic tokens, applied opt-in to 6 named scroll containers — document/body scroll now uses OS default.**

## Performance

- **Duration:** ~5 min (active execution)
- **Started:** 2026-04-19T00:05:54Z
- **Completed:** 2026-04-19T01:45:30Z (wall-clock window spans idle time)
- **Tasks:** 3
- **Files modified:** 7 (1 CSS, 6 component files)

## Accomplishments

- Removed the global `@layer base` `::-webkit-scrollbar` block at the bottom of `globals.css` — document/body scroll is now themed by the OS/browser, not the app
- Introduced three semantic tokens (`--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover`) in `:root` and `.dark` — thumb uses `--neutral-500 @ 30%/45%` in light and `oklch(1 0 0) @ 20%/35%` in dark
- Added `.thin-scrollbar` utility inside the existing `@layer utilities` block — combines Firefox `scrollbar-width: thin` + `scrollbar-color` declarations with WebKit `::-webkit-scrollbar` / track / thumb / thumb:hover rules on the same class
- Opted 6 named containers in: data-table scroll wrapper, SidebarContent, filter-combobox Popup, sort-dialog body, query-response body, curve-legend list
- Reconciled sidebar from legacy `no-scrollbar` (opt-out) to `thin-scrollbar` (opt-in) — sidebar is a named in-scope container per 31-CONTEXT + 31-RESEARCH

## Task Commits

1. **Task 1: Replace globals.css global ::-webkit-scrollbar with scoped .thin-scrollbar utility** — `d446aaa` (feat)
2. **Task 2: Apply .thin-scrollbar to 6 named scroll containers** — `12e5788` (feat)
3. **Task 3: Verify build + existing guards + body-scroll sanity check** — verification-only, no commit (all 4 guards + `npm run build` green)

**Plan metadata:** (pending docs commit after SUMMARY + STATE updates)

## Files Created/Modified

- `src/app/globals.css` — 3 scrollbar tokens added to `:root` + 2 to `.dark`; `.thin-scrollbar` utility added inside `@layer utilities`; legacy global `@layer base { ::-webkit-scrollbar ... }` block replaced with a comment explaining the scope narrowing
- `src/components/table/data-table.tsx:347` — outer scroll wrapper gains `thin-scrollbar`
- `src/components/ui/sidebar.tsx:374` — `SidebarContent` swaps `no-scrollbar` → `thin-scrollbar`
- `src/components/filters/filter-combobox.tsx:45` — `Combobox.Popup` gains `thin-scrollbar`
- `src/components/table/sort-dialog.tsx:116` — dialog body gains `thin-scrollbar`
- `src/components/query/query-response.tsx:94` — response body gains `thin-scrollbar`
- `src/components/charts/curve-legend.tsx:33` — legend list gains `thin-scrollbar`

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **DS-34 is scope narrowing, not visual retune.** The pre-plan global rules were already visually acceptable (thin, 8px, neutral); the problem CONTEXT flagged was that they applied to the whole page. Removing global + adding the scoped utility resolves the scope issue and incidentally bumps width 8px → 10px per plan spec.
- **Sidebar's `no-scrollbar` was NOT a "keep clean" decision to preserve.** It predated Phase 31's scope narrowing, when the global rules were themeing the sidebar automatically and the designer wanted the sidebar to hide its scrollbar entirely. Post-plan, with global rules gone, keeping `no-scrollbar` would have meant a scroll-but-no-scrollbar UX (accessibility regression). Flipping to `thin-scrollbar` matches CONTEXT's "in-scope named container" list.
- **`--scrollbar-track` stays transparent in both modes** — declared in `:root` only, inherited by `.dark`. Only the thumb + thumb-hover values differ between modes.

## Deviations from Plan

None — plan executed exactly as written. All three tasks' verification predicates passed on the first attempt; no deviation rules triggered.

## Issues Encountered

None. Build + all 4 guards (`check:tokens`, `check:surfaces`, `check:components`, `check:motion`) green on first run.

## User Setup Required

None — pure CSS + className changes, no external services or env vars.

## Next Phase Readiness

- **Ready for Plan 31-04.** DS-34 closed; remaining polish plans are untouched.
- **Visual verification deferred to 31-06 human-verify** per plan's Task 3 note. Standing user preference ("test visually first") applies — recommend opening the app in both light and dark modes to confirm:
  1. Body/document scroll uses OS default (no themed thin bar on the page edge)
  2. Table, sidebar, filter dropdown, sort dialog, query response, and curve legend all render the themed thin bar when they overflow
  3. Dark-mode thumb reads as soft white-on-warm-black; light-mode thumb reads as subtle neutral
- **Grep invariants to preserve** in future plans: `grep -cE "^\s*::-webkit-scrollbar" src/app/globals.css` should stay at 0 (all scrollbar rules are scoped under `.thin-scrollbar`). New scroll containers should opt in explicitly rather than regressing to globals.

---
*Phase: 31-visual-polish-pass*
*Completed: 2026-04-18*

## Self-Check: PASSED

- All 7 modified files exist on disk
- Both task commits present in git log (d446aaa, 12e5788)
- SUMMARY.md written to correct path
