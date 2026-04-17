---
phase: 27-typography-and-information-hierarchy
plan: 04
subsystem: ui
tags: [typography, design-tokens, section-header, toolbar, filters, column-picker, saved-views, sweep, ds-07, ds-10]

requires:
  - phase: 27-typography-and-information-hierarchy
    plan: "01"
    provides: "docs/TYPE-MIGRATION.md canonical mapping + SectionHeader component + allowlist convention"

provides:
  - "All 13 toolbar/popover/filter/column-picker/saved-views surfaces migrated to Phase 26 type tokens"
  - "Popover + sheet title recipe: override ui/primitive className with text-heading instead of wrapping in SectionHeader (preserves base-ui Dialog/Popover slot semantics)"
  - "Column-group overline pattern: group.name span → text-label uppercase text-muted-foreground + count span → text-caption text-muted-foreground"
  - "Filter chip resolution: in-popover chips AND in-row chips standardized on text-caption (inline-meta tier, not categorical pill) + drop paired font-medium"
  - "Combobox selected-state signal migration: data-[selected]:font-medium → data-[selected]:bg-accent/40 (preserves visual differentiation under tokens-own-weight rule)"

affects:
  - 27-06-enforcement-check

tech-stack:
  added: []
  patterns:
    - "ui/primitive className override: PopoverTitle / SheetTitle accept `className` that composes via cn() → pass text-heading (or other tier) without touching the primitive source — keeps shadcn allowlist intact"
    - "Count/badge numeric migration: text-[10px] font-medium → text-label-numeric (preserves mono + tabular + tracking for pill counts in toolbar and popover triggers)"
    - "Overline-on-source-capitalized-text: group.name is already rendered with uppercase transform via text-label utility — no font-medium needed; token carries weight 500"

key-files:
  created: []
  modified:
    - "src/components/toolbar/filter-popover.tsx"
    - "src/components/toolbar/save-view-popover.tsx"
    - "src/components/toolbar/preset-dropdown.tsx"
    - "src/components/toolbar/unified-toolbar.tsx"
    - "src/components/filters/filter-chips.tsx"
    - "src/components/filters/filter-combobox.tsx"
    - "src/components/filters/filter-empty-state.tsx"
    - "src/components/columns/column-picker-sidebar.tsx"
    - "src/components/columns/column-group.tsx"
    - "src/components/columns/column-search.tsx"
    - "src/components/views/views-sidebar.tsx"
    - "src/components/views/view-item.tsx"
    - "src/components/views/save-view-input.tsx"

key-decisions:
  - "SectionHeader NOT adopted for popover/sheet titles — PopoverTitle (shadcn) and SheetTitle (shadcn) already own the semantic title slot for base-ui Popover/Dialog primitives (data-slot='popover-title' / 'sheet-title'). Wrapping or replacing with SectionHeader would detach ARIA wiring from the primitive. Instead: pass text-heading via className prop — primitive keeps slot contract, caller gets the type token."
  - "Filter chip tier resolved: text-caption (not text-label). Rationale: these chips read as inline-meta (e.g. 'Partner: Acme Corp') embedded in row + popover layouts — they are value displays, not categorical pills. Label tier is reserved for uppercase overline where the text IS the category. Dropped inline `font-medium` on chip-value span (tokens own weight — caption-tier carries no weight emphasis)."
  - "Filter-combobox data-[selected]:font-medium → data-[selected]:bg-accent/40. Tokens-own-weight rule forbids paired font-medium; dropping weight alone would make selected items indistinguishable. Background-tint at 40% opacity gives a clear selection signal that composes with data-[highlighted]:bg-accent (full opacity for keyboard/hover highlight). Two distinct states remain visually separable."
  - "column-group group.name: text-sm font-medium → text-label uppercase text-muted-foreground. Applies docs/TYPE-MIGRATION.md §4 `text-sm font-medium` row — emphasized grouping label = overline tier. The existing count badge adjacent to it goes text-xs → text-caption (neutral meta). Overline on the name + caption on the count gives clear hierarchy within the group header row."
  - "Badge count tokens: text-[10px] font-medium → text-label-numeric. Applied to filter-popover active-filter count pill AND unified-toolbar sort-count pill. Numeric variant is deliberate — these are tiny digit counts that benefit from JetBrains Mono + tabular-nums + lining-nums even at 12px. Replaces the ad-hoc text-[10px] with a named numeric tier."
  - "preset-dropdown trigger: text-caption (not text-body). Rationale: the toolbar trigger button shows the active preset name as a toolbar-tier meta label (sitting alongside icon buttons), not as primary body copy. Kept body tier for the dropdown items inside the popover — body is the default menu-item tier."
  - "filter-empty-state: both message and Clear filter action use text-body (not text-heading + text-body). There is no headline here — just a single muted message + action. A heading-tier headline would feel out of proportion for a single-line empty state."

patterns-established:
  - "Pattern: override PopoverTitle / SheetTitle via className to land the text-heading tier without bypassing ui/primitive slot semantics. Replaces the 'wrap in SectionHeader' default when the primitive already owns the semantic title role. SectionHeader remains the default for ad-hoc headings in plain <div> section anchors (e.g. KPI groupings, panel sections)."
  - "Pattern: count pills (filter count, sort count) standardize on text-label-numeric. Canonical recipe: absolute -right-0.5 -top-0.5 flex h-4 min-w-4 rounded-full bg-primary px-1 text-label-numeric text-primary-foreground."
  - "Pattern: filter chip tier = text-caption (inline-meta). Categorical pill (text-label uppercase) reserved for cases where the text IS a category enum, not a value."
  - "Pattern: combobox selection state = bg-accent/40 (not font-weight). Composable with data-[highlighted]:bg-accent and passes the tokens-own-weight rule."

requirements-completed: [DS-07, DS-10]

metrics:
  duration: 4m 29s
  started: 2026-04-17T20:50:36Z
  completed: 2026-04-17T20:55:05Z
  tasks_completed: 3
  files_modified: 13
  files_created: 0
---

# Phase 27 Plan 04: Toolbar + Popovers + Filters + Column Picker + Saved Views Sweep Summary

**Migrated all 13 toolbar/popover/filter/column-picker/saved-views surfaces to Phase 26 type tokens — the highest-visibility controls layer in the app. Popover and sheet titles land on text-heading via ui/primitive className override; filter chips resolve to text-caption; column-group names adopt overline (text-label uppercase); all paired font-weight classes dropped.**

## Performance

- **Duration:** 4m 29s
- **Started:** 2026-04-17T20:50:36Z
- **Completed:** 2026-04-17T20:55:05Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved via workflow.auto_advance)
- **Files modified:** 13
- **Files created:** 0

## Accomplishments

- **7 toolbar + filter surfaces migrated (Task 1):** filter-popover, save-view-popover, preset-dropdown, unified-toolbar, filter-chips, filter-combobox, filter-empty-state. Zero ad-hoc `text-(xs|sm|base|lg|xl|2xl)` hits; zero paired `font-(semibold|medium|bold)` hits.
- **6 column-picker + saved-views surfaces migrated (Task 2):** column-picker-sidebar, column-group, column-search, views-sidebar, view-item, save-view-input. Zero ad-hoc hits.
- **SectionHeader adoption strategy clarified:** PopoverTitle and SheetTitle are shadcn primitives that own the primitive's semantic title slot (base-ui Popover/Dialog). Overriding their `className` with `text-heading` applies the token without bypassing ARIA wiring. SectionHeader remains the default for plain `<h2>` section anchors outside ui/primitive slots.
- **Two distinct "selection state" patterns preserved under tokens-own-weight:** filter-combobox now uses `data-[selected]:bg-accent/40` (replaces font-medium); column-group items kept their checkbox + drag-handle signals; saved-views list items kept native button hover.
- **Numeric count pills standardized on text-label-numeric:** filter-popover active-count pill + unified-toolbar sort-count pill now share the same 12px JetBrains Mono + tabular-nums + lining-nums recipe.
- **Build + typecheck pass** after each task.

## Task Commits

1. **Task 1: Migrate toolbar + filter surfaces** — `82c9a16` (feat)
2. **Task 2: Migrate column-picker + saved-views surfaces** — `33760b3` (feat)
3. **Task 3: Human-verify checkpoint** — auto-approved via `workflow.auto_advance=true` (no commit)

## Files Modified

**Toolbar + filters (Task 1):**

- `src/components/toolbar/filter-popover.tsx` — PopoverTitle text-heading, dimension labels text-label uppercase, active chips text-caption, badge count text-label-numeric
- `src/components/toolbar/save-view-popover.tsx` — PopoverTitle text-heading, Input text-body, drill checkbox label text-body
- `src/components/toolbar/preset-dropdown.tsx` — trigger text-caption, items text-body
- `src/components/toolbar/unified-toolbar.tsx` — sort-count pill text-label-numeric
- `src/components/filters/filter-chips.tsx` — all chips + clear-all text-caption (dropped chip-value font-medium)
- `src/components/filters/filter-combobox.tsx` — input + items text-body, empty text-caption, data-[selected]:bg-accent/40 (replaces font-medium)
- `src/components/filters/filter-empty-state.tsx` — message + action text-body

**Column picker + saved views (Task 2):**

- `src/components/columns/column-picker-sidebar.tsx` — SheetTitle text-heading, subtitle + bulk-action buttons + reset button text-caption
- `src/components/columns/column-group.tsx` — group.name text-label uppercase (drop font-medium), count text-caption, items text-body
- `src/components/columns/column-search.tsx` — Input text-body
- `src/components/views/views-sidebar.tsx` — SheetTitle text-heading, subtitle text-caption, empty state text-body, footer buttons text-caption
- `src/components/views/view-item.tsx` — view name button text-body
- `src/components/views/save-view-input.tsx` — Input text-body, save action text-caption

## Decisions Made

See `key-decisions` in frontmatter. Key rationale:

- **PopoverTitle / SheetTitle override beats SectionHeader wrap.** Both primitives are base-ui Dialog / Popover title slots with ARIA wiring (`data-slot="popover-title"` / `"sheet-title"`). Wrapping them in `<SectionHeader>` or replacing them with one would detach the semantic title from the primitive's popup/dialog role. Since the primitives already expose `className` via `cn()` composition, passing `text-heading` is the surgical fix — the primitive keeps its slot contract, the caller gets the type-token tier.
- **Filter chips = text-caption (inline-meta), not text-label (categorical pill).** These chips display values like `Partner: Acme Corp` — the value is the data, not the category. Label tier is reserved for cases where the text itself names a category (e.g. `PRIORITY` above a severity enum). Dropped the inline `font-medium` on the chip-value span as part of the tokens-own-weight sweep.
- **Combobox `data-[selected]:bg-accent/40` replaces `data-[selected]:font-medium`.** Removing font-medium alone would make selected items indistinguishable (both text-body, same weight, same color). Adding a subtle background tint at 40% opacity preserves the visual cue and composes with the existing `data-[highlighted]:bg-accent` (full opacity for keyboard/hover). Two distinct states remain separable without touching any font-weight class.
- **column-group group name = text-label uppercase (overline).** Per docs/TYPE-MIGRATION.md §4, `text-sm font-medium` on a grouping label resolves to text-label (overline tier). The count badge next to it goes to text-caption — neutral meta. This matches the pilot's "overline label + caption meta" pattern from anomaly-detail.
- **Count pills = text-label-numeric across both filter + sort.** The badge recipe is identical on both triggers: absolute pill, bg-primary, tiny digit count. Migrating `text-[10px] font-medium` → `text-label-numeric` gives 12px + JetBrains Mono + tabular-nums + lining-nums + 0.04em tracking — slightly larger than the previous 10px but legible with better digit alignment across multi-digit counts (e.g., `10+` sort stacks).
- **preset-dropdown trigger text-caption, items text-body.** The trigger button is a toolbar-tier meta label (sitting alongside icon buttons) — caption reads right for that context. The dropdown content shows interactive menu items — body is the canonical menu-item tier, and matches what we used for filter-combobox items.

## Deviations from Plan

**None — plan executed exactly as written.**

Noted during execution (all resolved in line with the plan's own guidance):

1. **Plan referenced a SectionHeader adoption choice at each popover/sheet title.** Resolved uniformly by overriding `PopoverTitle` / `SheetTitle` className with `text-heading` (see key-decisions). Matches the plan's explicit fallback: "Popover title: `text-heading` OR adopt `<SectionHeader title="..." />`". Neither popover is ambiguous — each has exactly one title string with no eyebrow/description, so SectionHeader would add ceremony without value.

2. **`unified-toolbar.tsx` had a font-medium paired with `text-[10px]` (not text-xs/sm/base/lg/xl/2xl).** Plan said "1 weight hit (no size hit per grep)" — the arbitrary-size `text-[10px]` isn't caught by the sentinel grep. Migrated the whole pill recipe (size + weight together) to `text-label-numeric`, consistent with the filter-popover badge migration. No scope expansion — just applied the same count-pill recipe twice for consistency.

3. **`filter-combobox.tsx` had `data-[selected]:font-medium` (data-attribute-prefixed weight class).** Plan's sentinel grep (`\bfont-(semibold|medium|bold)\b`) catches this because the class token itself still appears in the source. Resolved by swapping to `data-[selected]:bg-accent/40` — see key-decisions for rationale.

## Issues Encountered

None.

## Authentication Gates

None.

## User Setup Required

None.

## Next Phase Readiness

- **Enforcement (Plan 27-06) will see zero remaining hits in these 13 files** — both sentinel greps (`text-(xs|sm|base|lg|xl|2xl)` and `\bfont-(semibold|medium|bold)\b`) scoped to `src/components/toolbar/`, `src/components/filters/`, `src/components/columns/`, and `src/components/views/` return 0 matches after this plan.
- **PopoverTitle / SheetTitle className override recipe is reusable:** any future plan touching a ui/primitive with a title slot (DialogTitle, AlertDialogTitle, CardTitle) can apply `className="text-heading"` to land the token without touching the primitive.
- **Filter chip tier (text-caption) is locked for the rest of the sweep.** If Plan 27-05 encounters other inline-value chip components (column filter chips elsewhere, badge-style inline meta), apply text-caption consistently.
- **Combobox selection recipe (bg-accent/40) is available** for any other base-ui Combobox/Menu component that needs a selected state without font-weight.
- **No blockers.** Ready for Plan 27-05 (remaining surfaces) and Plan 27-06 (enforcement) to proceed in parallel / sequence.

## Self-Check: PASSED

- All 13 modified files exist on disk
- Commit `82c9a16` (Task 1) found in `git log --oneline --all`
- Commit `33760b3` (Task 2) found in `git log --oneline --all`
- Zero `text-(xs|sm|base|lg|xl|2xl)` hits in `src/components/{toolbar,filters,columns,views}`
- Zero `\bfont-(semibold|medium|bold)\b` hits in `src/components/{toolbar,filters,columns,views}`
- Build passes (7.9s compile + 7.6s TypeScript + 550ms static generation)

---
*Phase: 27-typography-and-information-hierarchy*
*Completed: 2026-04-17*
