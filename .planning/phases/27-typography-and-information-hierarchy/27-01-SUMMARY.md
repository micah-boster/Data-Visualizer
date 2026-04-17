---
phase: 27-typography-and-information-hierarchy
plan: 01
subsystem: ui
tags: [typography, design-tokens, section-header, tailwind-v4, type-scale, migration-table, ds-07, ds-08, ds-09, ds-10]

requires:
  - phase: 26-design-tokens
    provides: "Shipped 6-tier type scale (text-display/heading/title/body/label/caption) + 3 numeric variants (text-display-numeric / text-body-numeric / text-label-numeric) + typography token system in globals.css"

provides:
  - "Canonical docs/TYPE-MIGRATION.md mapping every ad-hoc Tailwind text-size / font-weight class to a Phase 26 type token, with pilot-resolved ambiguous cases"
  - "Shared src/components/layout/section-header.tsx (DS-10) with locked prop contract { title, eyebrow?, description?, actions?, className? }"
  - "Fully migrated pilot surface (src/components/anomaly/anomaly-detail.tsx) demonstrating the complete migration recipe on 6 text-xs + 1 text-sm font-semibold + 4 font-medium hits"
  - "AGENTS.md 'Type tokens (Phase 27)' rule entry + allowlist (src/components/ui/**, src/app/tokens/**, src/components/tokens/**)"
  - "Decision-locked outcome on text-metric outlier: NOT added (audit found 0 sites using arbitrary sizes ≥ 1.5rem)"

affects:
  - 27-02-kpi-cards-sweep
  - 27-03-charts-sweep
  - 27-04-toolbar-sweep
  - 27-05-remaining-surfaces-sweep
  - 27-06-enforcement-check

tech-stack:
  added: []
  patterns:
    - "Type-token migration recipe: ad-hoc text-(xs|sm|base|lg|xl|2xl) + font-(semibold|medium|bold) → semantic token; weight + uppercase + letter-spacing baked into the token; never paired with ad-hoc modifiers"
    - "SectionHeader adoption: server-renderable component for consistent title/eyebrow/description/actions rhythm; text-heading title + .text-label uppercase eyebrow + text-caption description"
    - "Allowlist convention: src/components/ui/** + src/app/tokens/** + src/components/tokens/** exempt from type-token enforcement"

key-files:
  created:
    - "docs/TYPE-MIGRATION.md"
    - "src/components/layout/section-header.tsx"
  modified:
    - "src/components/anomaly/anomaly-detail.tsx"
    - "AGENTS.md"

key-decisions:
  - "text-sm font-semibold → text-title (not text-body or text-heading): popover severity header needs prominent meta-label weight without section-anchor size"
  - "text-xs font-medium (non-uppercase) → text-label (drop weight): text-label bakes 500 weight + 0.04em tracking; reads as a label tier without forcing uppercase"
  - "Inline numeric values inside caption-tier prose lines NOT upgraded to .text-body-numeric: mixing 0.75rem caption with 0.875rem body-numeric on the same line would create a visible size bump; tabular alignment via numeric variants reserved for pure-numeric cells (table body, KPI value, chart tick)"
  - "text-metric outlier: NOT added — audit of src/ found zero arbitrary text-[Xrem] sites ≥ 1.5rem (only text-[10px] and text-[11px] exist, which belong to caption / Recharts-tick domains)"
  - "SectionHeader adoption in pilot: minimal <SectionHeader title={entityName} /> — promoted entity name from text-caption to text-heading (18px/600), making it the popover's semantic anchor. Severity badge + flag count kept inline above because severity color must remain on the badge span"
  - "SectionHeader is server-renderable (no 'use client', no hooks, no handlers) — keeps it usable in RSC contexts"

patterns-established:
  - "Pattern: docs/TYPE-MIGRATION.md is the single source of truth for all sweep plans 27-02..27-05. Ambiguous cases resolved during the pilot are appended to §10 and become canonical for the rest of the sweep"
  - "Pattern: SectionHeader is the default for section-anchoring headings. Ad-hoc <h2 className='text-xl'> is now a migration target, not a valid path"
  - "Pattern: severity / state-color badges stay as inline spans (NOT SectionHeader eyebrow) when their color must remain on the text. Eyebrow is for neutral-meta overline text only"
  - "Pattern: pilot-before-sweep cadence matches Phase 26 Plan 01. Lock the recipe on one representative surface, capture resolutions in the migration table, then spread across Wave 2 plans"

requirements-completed: [DS-07, DS-08, DS-09, DS-10]

duration: 4 min
completed: 2026-04-17
---

# Phase 27 Plan 01: Migration Table + SectionHeader + Anomaly-Detail Pilot Summary

**Published the canonical ad-hoc-to-token migration table, shipped the shared SectionHeader component (DS-10), and migrated the 11-hit anomaly-detail.tsx pilot end-to-end — proving the full Phase 27 recipe on a real surface before Wave 2 sweeps.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-17T20:32:59Z
- **Completed:** 2026-04-17T20:37:17Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via workflow.auto_advance)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- **docs/TYPE-MIGRATION.md** published with all 10 sections: 6 tokens, 3 numeric variants, ad-hoc → token table with pilot-resolved ambiguous cases, weight policy, uppercase policy, numeric policy, allowlist, text-metric audit (= NO), 6 resolutions documented under Ambiguous Cases.
- **SectionHeader (DS-10) shipped** at `src/components/layout/section-header.tsx` with locked prop contract `{ title, eyebrow?, description?, actions?, className? }`. Server-renderable (no `'use client'`, no hooks).
- **Pilot fully migrated:** `anomaly-detail.tsx` now has zero hits on `text-(xs|sm|base|lg|xl|2xl)` and zero hits on `\bfont-(semibold|medium|bold)\b`. All six `text-xs` + one `text-sm font-semibold` + four `font-medium` classes resolved via the migration table.
- **SectionHeader adopted** at one real call site in the pilot (entity-name anchor). Promotes entity name from caption-tier to heading-tier (text-heading, 18px, weight 600).
- **AGENTS.md** flags the Phase 27 type-token rule + allowlist + SectionHeader reference for all future agents touching the codebase.

## Task Commits

1. **Task 1: Migration table + SectionHeader + pilot migration** — `12dc748` (feat)
2. **Task 2: Adopt SectionHeader in anomaly-detail pilot** — `5bb1683` (feat)
3. **Task 3: Human-verify checkpoint** — auto-approved via `workflow.auto_advance=true` (no commit; orchestrator will spawn continuation)

**Plan metadata:** (pending final docs commit after SUMMARY write)

## Files Created/Modified

- `docs/TYPE-MIGRATION.md` (created, 60+ lines) — canonical migration table with all 10 sections
- `src/components/layout/section-header.tsx` (created, 40 lines) — DS-10 SectionHeader component with locked prop contract
- `src/components/anomaly/anomaly-detail.tsx` (modified) — migrated all 11 ad-hoc text/weight hits to tokens; adopted SectionHeader at entity-name site
- `AGENTS.md` (modified) — appended "Type tokens (Phase 27)" rule entry; preserved existing Next.js advisory block

## Decisions Made

See `key-decisions` in frontmatter. Key rationale:

- **text-sm font-semibold → text-title (not text-heading or text-body).** The severity header at the top of the anomaly popover is a prominent inline meta-label. `text-body font-semibold` would break the "tokens own weight" rule; `text-heading` (18px) jumps too large for a popover constrained to `max-w-xs`. `text-title` (0.9375rem, weight 500) reads prominent without being section-anchoring.
- **text-xs font-medium (non-uppercase) → text-label.** Group labels like "LIQUIDITY METRICS" are conceptually overline-adjacent but the text is already uppercased at the data layer. Promoting to `text-label` (bakes 500 weight + 0.04em tracking) and dropping `font-medium` gives a label tier without forcing `uppercase` transformation.
- **Inline numeric values in caption-tier lines NOT upgraded to `.text-body-numeric`.** Mixing 0.75rem caption with 0.875rem body-numeric on the same line would create a visible size bump. Deferred: a future pass can re-layout the popover in a numeric-aware grid. Numeric variants remain reserved for pure-numeric cells (table body, KPI value, chart tick).
- **text-metric outlier: NOT added.** Audit of `src/` found zero arbitrary `text-[Xrem]` sites ≥ 1.5rem. The only arbitrary-size hits are `text-[10px]` / `text-[11px]`, all of which are smaller than the standard scale (caption / Recharts-tick territory). Decision-locked: do not reopen until 3+ surfaces demand a size strictly larger than 1.5rem.
- **SectionHeader adoption site: entity name (minimal).** The severity badge + flag count stay as inline spans because the severity color (via `SEVERITY_COLORS[severity]`) must remain on the badge text. Wrapping with `<SectionHeader eyebrow={...}>` would lose the severity color. Entity name becomes the `title` prop — promoted to `text-heading`, which matches its semantic role as the popover's anchor.
- **SectionHeader is server-renderable.** No `'use client'` directive, no hooks, no event handlers. Consumers in RSC contexts can adopt it without opting into client rendering.

## Deviations from Plan

None - plan executed exactly as written.

The plan anticipated the 6 `text-xs` + 4 `font-medium` hits via grep survey; the actual pilot file also contained a `text-sm font-semibold` on the severity header (line 41), which the plan's migration table already covers under the "text-sm font-medium" and "text-2xl font-semibold" rows. The pilot resolution (→ `text-title`) was added to §4 and §10 of TYPE-MIGRATION.md as explicitly anticipated by the plan's Step C.2 instruction: "Resolve ambiguous cases by choosing the semantically correct token and appending the resolution to docs/TYPE-MIGRATION.md section 10."

## Issues Encountered

None.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Migration table is the single source of truth.** Plans 27-02..27-05 must read `docs/TYPE-MIGRATION.md` before sweeping and append any new ambiguous-case resolutions to §10.
- **SectionHeader is ready for wider adoption.** Wave 2 consumers:
  - 27-02 (KPI cards): already uses the overline + display-numeric pattern; SectionHeader may anchor KPI section groupings.
  - 27-03 (charts): chart section headers + eyebrow categories (e.g., "METRICS", "COLLECTION CURVES") map directly onto SectionHeader.
  - 27-04 (toolbar): toolbar group titles are prime SectionHeader candidates.
- **Grep guard for 27-06 enforcement:** the two sentinel commands that passed on the pilot file will also be the CI enforcement commands:
  - `rg -n 'text-(xs|sm|base|lg|xl|2xl)' src/ --glob='!components/ui/**' --glob='!app/tokens/**' --glob='!components/tokens/**'` → must be 0 hits after all sweep plans ship.
  - `rg -n '\bfont-(semibold|medium|bold)\b' src/ --glob='!components/ui/**' --glob='!app/tokens/**' --glob='!components/tokens/**'` → must be 0 hits after all sweep plans ship.
- **Visual verification** was auto-approved under `workflow.auto_advance=true`. Light + dark visual sanity still recommended before the full Wave 2 sweep merges (matches the project's `feedback_testing` memory — never push CSS changes blind).
- **No blockers.** Ready for Plan 27-02 kick-off.

## Self-Check: PASSED

- `docs/TYPE-MIGRATION.md` exists on disk
- `src/components/layout/section-header.tsx` exists on disk
- `src/components/anomaly/anomaly-detail.tsx` exists on disk
- `AGENTS.md` exists on disk
- Commit `12dc748` (Task 1) found in `git log --oneline --all`
- Commit `5bb1683` (Task 2) found in `git log --oneline --all`

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
