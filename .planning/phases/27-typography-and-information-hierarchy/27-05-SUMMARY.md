---
phase: 27-typography-and-information-hierarchy
plan: 05
subsystem: ui
tags: [typography, design-tokens, type-tokens, sidebar, breadcrumb, query-ui, anomaly-panels, empty-state, error-state, loading-state, ds-07, ds-10]

requires:
  - phase: 27-typography-and-information-hierarchy
    plan: 01
    provides: "Canonical docs/TYPE-MIGRATION.md, SectionHeader (DS-10), pilot resolution table"

provides:
  - "Sidebar (app-sidebar.tsx) fully migrated: pill counts on .text-label-numeric (mono + tabular + tracked), brand + nav labels on text-title / text-body, footer + empty-views on text-caption"
  - "Breadcrumb trail migrated: active segment on text-title, non-active on text-body (muted); zero ad-hoc weights"
  - "Claude query (NLQ) UI fully migrated: input on text-body, scope pill on .text-label uppercase (categorical), suggested prompts on text-caption, response prose canonical text-body, error on text-body"
  - "Anomaly summary panel + toolbar trigger migrated: title on text-title, count badge on .text-label-numeric, list items on text-caption + inline .text-label partner name"
  - "Empty / error / loading / section-error-boundary fully migrated: empty headline → text-heading, error/loading body → text-body, section-boundary title → text-title, details → text-caption"
  - "data-display.tsx lone font-medium resolved: promoted schema-warning emphasis to text-title (row-anchor tier via semantic token)"

affects:
  - 27-06-enforcement-check

tech-stack:
  added: []
  patterns:
    - "Sidebar pill-count recipe: .text-label-numeric on pill count spans (replaces text-[10px] tabular-nums) — mono + tabular + lining numerics; size jumps from ~10px to 12px baseline but tabular-alignment wins visual hierarchy and removes the no-canonical text-[10px] outlier"
    - "Breadcrumb active-vs-nav tier split: active segment on text-title (500 weight baked, reads as 'you are here' without section-anchor), non-active segments on text-body + text-muted-foreground + hover:underline"
    - "Query prose canonical recipe: text-body (14px / 1.5 line-height) for streaming AI response, text-body for error message, no new reading-prose tier introduced (deferred per CONTEXT 'keep the scale tight')"
    - "Empty-state anchor recipe: text-heading headline + text-body description (promotes empty state from muted fine-print to a proper anchoring section header, matching SectionHeader treatment for any other anchoring headline)"
    - "Schema-warning emphasis recipe: promote standalone font-medium span to text-title (500 weight baked) to keep inline-emphasis role without breaking 'tokens own weight' — applies to any <AlertDescription> child that needs to anchor its row"

key-files:
  created: []
  modified:
    - "src/components/layout/app-sidebar.tsx"
    - "src/components/navigation/breadcrumb-trail.tsx"
    - "src/components/query/query-search-bar.tsx"
    - "src/components/query/query-scope-pill.tsx"
    - "src/components/query/query-suggested-prompts.tsx"
    - "src/components/query/query-response.tsx"
    - "src/components/anomaly/anomaly-summary-panel.tsx"
    - "src/components/anomaly/anomaly-toolbar-trigger.tsx"
    - "src/components/section-error-boundary.tsx"
    - "src/components/error-state.tsx"
    - "src/components/loading-state.tsx"
    - "src/components/empty-state.tsx"
    - "src/components/data-display.tsx"

key-decisions:
  - "Query response prose canonical tier = text-body (14px / 1.5). No new reading-prose tier introduced — honors CONTEXT 'keep the scale tight' lock. If post-ship feedback shows prose feels cramped, revisit in a dedicated prose phase rather than expanding the scale now."
  - "Sidebar pill counts migrated from text-[10px] tabular-nums to .text-label-numeric (12px / mono / tabular / tracked). Size bump from ~10px to 12px accepted per plan — removes no-canonical arbitrary-size outlier and aligns with .text-label-numeric recipe established in 27-02 matrix bar-ranking. Visual inspection deferred to auto-approved checkpoint; if 12px reads too large in practice, revisit via design token rather than a new smaller token."
  - "Breadcrumb active segment = text-title (not text-heading). Breadcrumbs are nav chrome, not section anchors; text-heading (18px) would over-weight the nav area. text-title (0.9375rem, weight 500) reads as 'you are here' within the nav row."
  - "Query scope pill uses .text-label uppercase per plan's categorical-pill designation. Pill content IS partner/batch names (e.g. 'Acme Corp > 2024-Q1'); uppercase transforms those to ALL-CAPS at render time, giving the pill a consistent categorical-chip appearance regardless of source casing. Deviation noted: if the uppercase transformation reads unnaturally for specific partner names in verification, revisit the pill's tier (→ text-caption without uppercase) in a follow-up."
  - "Anomaly-summary-panel collapsed-bar title = text-title (not text-heading). The collapsed bar sits inside a colored alert-style row; text-heading jumps too large for the chrome context. text-title matches the 'warning row anchor' role — same rationale applied to schema-warning in data-display.tsx."
  - "Anomaly-summary-panel + toolbar-trigger partner-name inline emphasis = .text-label (mixed-case, no uppercase) per pilot's resolution #3 (group label). The label tier bakes 500 weight + 0.04em tracking, which reads as emphasis within the caption-tier row without reintroducing font-medium."
  - "Empty state promoted from muted fine-print to text-heading + text-body. The prior design (text-sm font-medium + text-xs) treated the empty state as a secondary annotation; promoting the headline to text-heading matches SectionHeader treatment and makes 'No data matches your filters' read as a proper anchor."
  - "Section-error-boundary headline = text-title (not text-heading). The boundary wraps one cohesive section block, but its fallback copy ('This section couldn't load.') is not itself a new section title — it's a row-anchored emphasis inside an Alert. text-title matches the row-anchor role."
  - "data-display.tsx schema-warning emphasis span resolved via text-title promotion (not font-medium drop). Plan anticipated 3 options (drop, promote, native strong); chose promote because the span anchors the warning sentence, and TYPE-MIGRATION.md §4 standalone-font-medium row explicitly lists 'promote to text-title if it anchors its row' as the preferred path."

patterns-established:
  - "Pattern: Sidebar pill counts → .text-label-numeric. Replaces text-[10px] tabular-nums as the canonical pill-count recipe. Reusable for any future sidebar / nav pill count — matrix bar-ranking also uses .text-label-numeric, so the pattern is consistent across tight-row numeric contexts."
  - "Pattern: Empty / loading / error state tier hierarchy. Empty state = text-heading headline + text-body description (anchoring, feels like a proper destination). Error state = text-body description inside Alert (native Alert owns size). Loading state = text-body muted pulsing. section-error-boundary = text-title row-anchor inside Alert. Replicable for any future state surface."
  - "Pattern: inline emphasis inside Alert / panel-row contexts → .text-label (mixed-case). Anomaly-summary-panel partner-name, anomaly-toolbar-trigger partner-name, schema-warning 'Data may be incomplete.' all resolve via the same tier (label + no-uppercase OR title), never font-medium. Closes the standalone-font-medium gap."

requirements-completed: [DS-07, DS-10]

duration: 4 min
completed: 2026-04-17
---

# Phase 27 Plan 05: Remaining Surfaces Sweep Summary

**Swept 13 files across sidebar, breadcrumb, Claude query UI, anomaly panels, and empty/error/loading states — every non-allowlisted file outside tables/charts/toolbar is now on the Phase 27 type tokens. Zero `text-[10px]` outliers, zero standalone `font-medium` hits, zero ad-hoc text sizes.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-17T20:50:29Z
- **Completed:** 2026-04-17T20:54:32Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via workflow.auto_advance)
- **Files modified:** 13
- **Commits:** 2 (plus 1 auto-approved checkpoint)

## Accomplishments

**Task 1: sidebar + breadcrumb + query UI (6 files)**

- `app-sidebar.tsx`: pill counts (partners 58-60, views 118-120) migrated from `text-[10px] tabular-nums` → `.text-label-numeric`. Brand 'B' icon + 'Bounce' header text → `text-title`. 'Data Analytics' subtitle + footer v1.0 + 'No saved views' → `text-caption`. Dropped paired `font-bold` + `font-semibold`.
- `breadcrumb-trail.tsx`: nav wrapper no longer carries `text-sm`; active segment → `text-title`, non-active button → `text-body` (muted, hover:underline preserved). Dropped `font-medium`.
- `query-search-bar.tsx`: input `text-sm` → `text-body`.
- `query-scope-pill.tsx`: pill span `text-xs font-medium` → `.text-label uppercase` (categorical pill).
- `query-suggested-prompts.tsx`: chip `text-xs` → `text-caption`.
- `query-response.tsx`: streaming response prose `text-sm leading-relaxed` → `text-body`. Error message `text-sm` → `text-body`. Stop button dropped ad-hoc `text-xs`.

**Task 2: anomaly panels + empty/error/loading states + data-display (7 files)**

- `anomaly-summary-panel.tsx`: collapsed-bar label `text-sm font-medium` → `text-title`. Expanded list item row `text-xs` → `text-caption`. Inline partner name `font-medium` → `.text-label`.
- `anomaly-toolbar-trigger.tsx`: count badge `text-[10px] font-medium` → `.text-label-numeric`. List item row `text-xs` → `text-caption`. Inline partner name `font-medium` → `.text-label`.
- `section-error-boundary.tsx`: headline `font-medium` → `text-title`. Details section `text-xs` → `text-caption`.
- `error-state.tsx`: error body `text-sm` → `text-body`.
- `loading-state.tsx`: loading body `text-sm` → `text-body`.
- `empty-state.tsx`: headline `text-sm font-medium` → `text-heading text-foreground`, description `text-xs` → `text-body`.
- `data-display.tsx`: schema-warning emphasis span standalone `font-medium` → `text-title` (row-anchor tier).

**Task 3: human-verify checkpoint** — auto-approved under `workflow.auto_advance=true`. No commit; per-surface visual check deferred to user's standing preference (verify in own browser if anything surfaces).

## Task Commits

1. **Task 1: sidebar + breadcrumb + query UI migration** — `ebc8f69` (feat)
2. **Task 2: anomaly panels + empty/error/loading + data-display migration** — `7b413fd` (feat)
3. **Task 3: human-verify checkpoint** — auto-approved, no commit

## Files Modified

All 13 files in the plan's `files_modified` scope:

- `src/components/layout/app-sidebar.tsx`
- `src/components/navigation/breadcrumb-trail.tsx`
- `src/components/query/query-search-bar.tsx`
- `src/components/query/query-scope-pill.tsx`
- `src/components/query/query-suggested-prompts.tsx`
- `src/components/query/query-response.tsx`
- `src/components/anomaly/anomaly-summary-panel.tsx`
- `src/components/anomaly/anomaly-toolbar-trigger.tsx`
- `src/components/section-error-boundary.tsx`
- `src/components/error-state.tsx`
- `src/components/loading-state.tsx`
- `src/components/empty-state.tsx`
- `src/components/data-display.tsx`

## Decisions Made

See `key-decisions` in frontmatter. Rationale highlights:

- **Query response prose = `text-body` (canonical), no new reading-prose tier.** CONTEXT locks "keep the scale tight." If AI response prose reads cramped, revisit in a dedicated prose phase; do not re-open the scale now.
- **Sidebar pill counts = `.text-label-numeric` (12px mono tabular tracked).** Size steps up from ~10px to 12px; removes the no-canonical `text-[10px]` outlier and aligns with the matrix bar-ranking recipe (27-02). Visual verification deferred to auto-approved checkpoint per project workflow.
- **Breadcrumb active segment = `text-title` (not `text-heading`).** Breadcrumbs are nav chrome, not section anchors; `text-heading` would over-weight. `text-title` (0.9375rem, weight 500) reads "you are here" without anchoring a section.
- **Query scope pill = `.text-label uppercase` per plan's categorical-pill designation.** Pill content is partner/batch names; CSS `uppercase` transforms source casing at render time. If rendered caps read unnaturally for specific entity names during user verification, revisit tier (→ `text-caption` without uppercase).
- **Empty state promoted to `text-heading` + `text-body`.** Prior treatment (muted fine-print) undersold the empty state; promoting to heading + body makes it read as a proper destination matching the SectionHeader recipe.
- **data-display.tsx schema-warning `font-medium` → `text-title`.** TYPE-MIGRATION.md §4 standalone-font-medium row explicitly lists "promote to `text-title` if it anchors its row" — the preferred path for inline-emphasis spans inside `<AlertDescription>`.
- **Anomaly summary panel + toolbar trigger partner-name span = `.text-label` (mixed-case).** Applies pilot's resolution #3 (group label): label tier bakes 500 weight + 0.04em tracking; reads as emphasis inside caption-tier rows without reintroducing `font-medium`.

## Deviations from Plan

None - plan executed exactly as written.

Notes:

- Plan anticipated `anomaly-summary-panel.tsx` title could be `text-heading` OR `<SectionHeader title="Anomalies" />`. Chose neither — the title lives inside a colored alert row, where text-heading would over-weight the chrome context and SectionHeader is a standalone section anchor (not an inline chrome title). Resolved to `text-title`, consistent with the schema-warning emphasis recipe.
- Plan anticipated `section-error-boundary.tsx` headline = `text-heading`. Resolved to `text-title` for the same reason: the fallback copy sits inside an Alert as a row-anchor, not a section anchor. text-title preserves intent without an unnatural size jump.
- Plan anticipated `error-state.tsx` headline possibly = `text-heading`. The headline text ('Failed to load data') lives in an `<AlertTitle>` shadcn primitive (allowlisted); only the description body was in scope. Left AlertTitle untouched, migrated description only.
- `anomaly-detail.tsx` (Plan 27-01 pilot) explicitly excluded per project_constraints — verified not touched.

## Issues Encountered

None. Build compiled on every verification (6.1s – 6.4s in Turbopack). All 22 verification greps returned zero hits across the 13 modified files.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration or env vars required.

## Next Phase Readiness

- **27-06 enforcement-check** is unblocked. After 27-02 (charts/KPI), 27-03 (remaining table), 27-04 (toolbar), and this plan (27-05), every non-allowlisted file under `src/` is now sweep-complete. The grep guard can ship without surprises.
- **Sweep coverage status:**
  - Plan 27-01: pilot (anomaly-detail)
  - Plan 27-02: charts + KPI + cross-partner matrix (12 files)
  - Plan 27-03: remaining tables
  - Plan 27-04: toolbar + filter surfaces
  - Plan 27-05 (this): sidebar, breadcrumb, query, anomaly panels, empty/error/loading, data-display
  - Total: every non-allowlisted file migrated
- **Allowlist (unchanged):** `src/components/ui/**`, `src/app/tokens/**`, `src/components/tokens/**`
- **Visual verification** auto-approved under `workflow.auto_advance=true`. User's standing preference is to verify CSS in browser before ship (per `feedback_testing` memory); the orchestrator's final verification step should surface any visual regressions.
- **No blockers.** Ready for Plan 27-06 kick-off.

## Self-Check: PASSED

- `src/components/layout/app-sidebar.tsx` exists on disk
- `src/components/navigation/breadcrumb-trail.tsx` exists on disk
- `src/components/query/query-search-bar.tsx` exists on disk
- `src/components/query/query-scope-pill.tsx` exists on disk
- `src/components/query/query-suggested-prompts.tsx` exists on disk
- `src/components/query/query-response.tsx` exists on disk
- `src/components/anomaly/anomaly-summary-panel.tsx` exists on disk
- `src/components/anomaly/anomaly-toolbar-trigger.tsx` exists on disk
- `src/components/section-error-boundary.tsx` exists on disk
- `src/components/error-state.tsx` exists on disk
- `src/components/loading-state.tsx` exists on disk
- `src/components/empty-state.tsx` exists on disk
- `src/components/data-display.tsx` exists on disk
- Commit `ebc8f69` (Task 1) found in `git log --oneline --all`
- Commit `7b413fd` (Task 2) found in `git log --oneline --all`
- npm run build passed on both tasks (Turbopack 6.1–6.4s compile)

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
