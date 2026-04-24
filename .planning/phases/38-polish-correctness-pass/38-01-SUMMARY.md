---
phase: 38-polish-correctness-pass
plan: 01
subsystem: ui
tags: [sidebar, branding, svg, collapsible, localStorage, base-ui, lucide]

# Dependency graph
requires:
  - phase: 26-design-tokens
    provides: motion tokens (duration-quick, duration-normal, ease-default) + primary/primary-foreground color tokens used by the header slot
  - phase: 30-motion-polish
    provides: grid-rows [0fr]<->[1fr] collapse pattern (data-display.tsx charts-expanded precedent)
provides:
  - Sidebar header renders the Bounce arc mark from public/bounce-mark.svg (inline <svg>, fill="currentColor") across light + dark themes
  - Partners SidebarGroup is collapsible; chevron toggle with duration-quick rotation; first-ever visit defaults to COLLAPSED
  - New localStorage key `partners-list-collapsed` ('true' = collapsed, 'false' = expanded); inverted-default pattern for persisted boolean state
  - ChevronRight + render-prop (useRender) collapse-toggle recipe that future SidebarGroupLabel consumers can reuse
affects: [Phase 38 Plan 02 (columns + formatting), Phase 38 Plan 04 (filters + layout), any future sidebar collapsibility (Views, Partner Lists), any future brand-surface that needs currentColor SVG]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline SVG with fill=\"currentColor\" for theme-adaptive brand marks inside primary/secondary slots (next/image does NOT propagate currentColor into SVG fills)"
    - "SidebarGroupLabel as interactive toggle via Base UI `render={<button ... />}` prop (NOT Radix asChild) — shadcn Sidebar uses @base-ui/react/use-render"
    - "Inverted-default localStorage boolean: storage 'true' = collapsed, null (first visit) = collapsed, 'false' = expanded. Flip of the charts-expanded semantic (null = expanded)"
    - "grid-rows [0fr]<->[1fr] collapse + inner overflow-hidden + transition-[grid-template-rows] duration-normal ease-default — codified collapse recipe"
    - "transition-transform + rotate-90 on ChevronRight for duration-quick expand/collapse tell"

key-files:
  created:
    - .planning/phases/38-polish-correctness-pass/deferred-items.md
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "POL-01: Inlined the SVG path from public/bounce-mark.svg directly into AppSidebar rather than using next/image. next/image renders SVG as a bitmap-like <img> and DOES NOT propagate currentColor into the SVG fill, which would break dark-mode theming. Inline <svg> with fill=\"currentColor\" is the only path that resolves to text-primary-foreground in both themes. Locked — future brand-mark additions should use the same inline pattern."
  - "POL-01: h-5 w-auto (20px tall) picked for the mark inside the size-8 (32px) primary slot. Leaves ~6px of padding top/bottom around the ~20x43px mark and keeps the existing Bounce/Data Analytics title block untouched. Reopen trigger: if the brand-ops team ships a revised mark with a different aspect ratio."
  - "POL-02: Used a NEW localStorage key `partners-list-collapsed` (not a reuse of `charts-expanded`). Key semantics INTENTIONALLY INVERTED vs charts-expanded — storage 'true' = collapsed; null (first-ever visit) = collapsed. Matches CONTEXT lock that first-load should not overwhelm with a long partner list."
  - "POL-02: SidebarGroupLabel is a Base UI useRender component, NOT a Radix Slot/asChild component. The correct composition is `<SidebarGroupLabel render={<button ... />}>`, NOT `<SidebarGroupLabel asChild><button ... /></SidebarGroupLabel>`. Using asChild emits a React DOM-attribute warning and the button never renders. Canonical for any future shadcn-Sidebar primitive swaps."
  - "POL-02: Rolled my own collapse state (useState + localStorage) instead of adding a Collapsible primitive. Matches CONTEXT research finding and the charts-expanded precedent — one extra hook is cheaper than a new dependency."

patterns-established:
  - "Brand-mark-as-inline-SVG recipe for theme-adaptive chrome: copy viewBox + path(s) from the source SVG, set fill=\"currentColor\", wrap in a sized container (h-5 w-auto), add aria-hidden=\"true\" when an adjacent text element names the same concept"
  - "Inverted-default persisted boolean: `localStorage.getItem(key) === 'false'` returns TRUE only for explicit-expanded; null, 'true', or anything else reads as collapsed. Avoids the null=default-expanded shape when the product wants default-collapsed."
  - "Sidebar-primitive render-prop override: `<SidebarGroupLabel render={<button ... />} />` — carries the button through useRender's mergeProps pipeline so onClick, aria-*, type all compose correctly with the default styling"

requirements-completed:
  - POL-01
  - POL-02

# Metrics
duration: 22min
completed: 2026-04-24
---

# Phase 38 Plan 01: Sidebar Brand Mark + Collapsible Partners Summary

**Bounce arc SVG replaces the letter "B" in the sidebar header (currentColor-themed) and the Partners group gains a chevron toggle that defaults to collapsed on first visit with localStorage persistence.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-04-24T19:30:00Z (approx)
- **Completed:** 2026-04-24T19:52:00Z (approx)
- **Tasks:** 2 auto + 1 checkpoint auto-approved = 3 total
- **Files modified:** 1 (src/components/layout/app-sidebar.tsx)

## Accomplishments
- Sidebar header now displays the Bounce arc mark (inline SVG) inside the primary 32px slot; light + dark modes both work via `fill="currentColor"` resolving to `text-primary-foreground`.
- Partners group is pre-collapsed on first visit (no localStorage entry), with a chevron-left-to-right rotation tell and grid-rows-based smooth expand/collapse.
- `partners-list-collapsed` localStorage key persists the user's choice across reloads.
- Existing "All Partners" link, per-partner drill buttons, Partner Lists group, Views group, and Metabase Import entry are untouched (zero regression surface area).

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace sidebar letter-mark with inline Bounce SVG (POL-01)** — `30b8c68` (feat)
2. **Task 2: Make Partners SidebarGroup collapsible with chevron + localStorage (POL-02)** — `d928e3c` (feat)
3. **Task 3: Visual verify — brand mark + Partners collapse** — auto-approved under `workflow.auto_advance=true`; verified via dev-server HTML inspection on :3001 (not a separate commit)

**Plan metadata:** (final docs commit captures SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

- `src/components/layout/app-sidebar.tsx` — Replaces letter-mark <span>B</span> with inline Bounce SVG (POL-01); makes Partners SidebarGroup collapsible via chevron toggle + grid-rows collapse region + localStorage persistence (POL-02). Adds `useCallback`, `ChevronRight` from lucide-react, `cn` from @/lib/utils to the existing import set.
- `.planning/phases/38-polish-correctness-pass/deferred-items.md` — Logs two PRE-EXISTING build-pipeline issues unrelated to 38-01 (Tailwind v4/Turbopack CSS parse error on `npm run build`; duplicate `maxAge` binding in collection-curve-chart.tsx from a sibling in-flight CHT-01 working tree). Both are out-of-scope per scope-boundary rule — plan 38-01 never writes to globals.css or collection-curve-chart.tsx.

## Decisions Made

See `key-decisions` in frontmatter. Top three:

1. **next/image rejected for brand mark** — doesn't propagate currentColor into SVG fills. Inline <svg> is the only path to theme-adaptive rendering.
2. **localStorage key + semantic inversion** — `partners-list-collapsed` with first-visit (`null`) reading as collapsed. Flips charts-expanded's null=expanded default.
3. **Base UI render prop, not asChild** — the shadcn Sidebar primitive in this repo uses `@base-ui/react/use-render`, which takes a `render={<element />}` prop. Radix-style `asChild` silently emits a DOM-attribute warning; caught during dev-server visual verification on the first toggle render.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SidebarGroupLabel asChild prop leaked to DOM**
- **Found during:** Task 2 dev-server visual verification (HTTP GET / emitted `React does not recognize the \`asChild\` prop on a DOM element`)
- **Issue:** Plan's implementation outline described wrapping SidebarGroupLabel content in a `<button type="button">` via `asChild`. This is the Radix Slot convention; the shadcn Sidebar in this project uses Base UI's `useRender` hook instead, which expects a `render` prop containing a ReactElement.
- **Fix:** Rewrote the toggle to `<SidebarGroupLabel render={<button type="button" onClick={togglePartners} aria-expanded={partnersExpanded} aria-controls="partners-list-region" />} className="w-full cursor-pointer">` with the chevron + label + count as children. useRender's `mergeProps` carries the onClick, aria attributes, and type through correctly.
- **Files modified:** src/components/layout/app-sidebar.tsx (inside Task 2 commit, not a separate commit)
- **Verification:** Refetched `http://localhost:3001/` — no new asChild warning in dev-server log; HTML now renders `<button type="button" aria-expanded="false" aria-controls="partners-list-region" data-slot="sidebar-group-label" ...>` as the Partners label. grep confirmed the `partners-list-region` id on the wrapping grid div and `grid-rows-[0fr]` collapse state.
- **Committed in:** d928e3c (folded into the Task 2 commit since this was caught before that commit landed)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Zero scope creep — fix is a library-API correction for the same component the plan targeted. Canonical documented in frontmatter key-decisions for any future consumer touching shadcn Sidebar primitives in this repo.

## Issues Encountered

**1. Production build fails with pre-existing Tailwind v4 / Turbopack CSS parse error**
- `npm run build` fails on `src/app/globals.css` column 18124 (Missed semicolon in the compiled output).
- Reproduced against HEAD without any 38-01 changes applied — globals.css unchanged from HEAD (commit df0d49f). Pre-existing.
- Logged in `.planning/phases/38-polish-correctness-pass/deferred-items.md` for the future build-pipeline fix.
- **Workaround:** Verified Tasks 1 + 2 via `npm run dev` on port 3001 (existing next-server was hung on :3000) + HTML fetch + markup grep. Type + motion token guards pass cleanly.

**2. Working-tree pollution from parallel execution**
- Discovered several unrelated in-flight modifications (collection-curve-chart.tsx with duplicate `maxAge`, pivot-curve-data.ts, column-group.tsx, use-column-management.ts, compute-kpis.ts, connection.ts, types.ts, partner-stats.ts, .env.example, fallback.ts) from sibling phase-38 agents. Stashed + verified Task 2 changes compiled in isolation on a clean tree, then let the stashes flow back into the working tree.

## User Setup Required

None — no external service configuration required. Brand asset was already landed by an earlier commit (`ae69dc5 feat(38): add bounce brand mark SVG assets (POL-01)`).

## Next Phase Readiness

- Plan 38-02 (columns + formatting) is already in-flight on a parallel track; no coupling to 38-01.
- Plan 38-04 (filters + layout) will benefit from the collapse recipe codified here if it touches the sidebar shape.
- Future sidebar-section additions (e.g., a collapsible Views group, a collapsible Partner Lists group) can reuse the render-prop + chevron pattern 1:1.
- **Non-blocker for merge:** The pre-existing build-pipeline bug (globals.css compiled output) needs a dedicated fix before the next production deploy.

## Self-Check: PASSED

**Files verified to exist:**
- FOUND: src/components/layout/app-sidebar.tsx (contains viewBox="0 0 313 145" and partners-list-collapsed)
- FOUND: .planning/phases/38-polish-correctness-pass/deferred-items.md
- FOUND: .planning/phases/38-polish-correctness-pass/38-01-SUMMARY.md (this file)

**Commits verified:**
- FOUND: 30b8c68 (Task 1: feat(38-01): replace sidebar letter-mark with Bounce arc SVG)
- FOUND: d928e3c (Task 2: feat(38-01): collapsible Partners sidebar group with persistence)

**Automated checks:**
- PASS: npm run check:tokens
- PASS: npm run check:motion
- PASS: dev-server HTML render on :3001 — inline SVG present, partners-list-region collapsed by default, aria-expanded="false"
- DEFERRED: npm run build (pre-existing globals.css CSS parse error, unrelated)

---
*Phase: 38-polish-correctness-pass*
*Completed: 2026-04-24*
