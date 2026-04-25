---
phase: 39-partner-config-module
plan: 02
subsystem: ui
tags: [partner-config, segments, localStorage, zod, context-menu, slide-over, base-ui]

requires:
  - phase: 39-01-pair-migration
    provides: PartnerProductPair, pairKey, parsePairKey, PRODUCT_TYPE_LABELS, labelForProduct, sidebar pair rows + drillToPair, SidebarPair shape
  - phase: 34-partner-lists
    provides: localStorage hook + sanitize-on-load pattern (usePartnerLists), Sheet + staged-edit slide-over recipe (CreateListDialog), PartnerListsProvider single-upstream-hook context pattern
  - phase: 25-design-foundation
    provides: hydration-safe useState + useEffect + hasHydrated.current pattern (Phase 25 Plan D KI-13)

provides:
  - Partner-config domain `src/lib/partner-config/*` — types, schema, storage, evaluator, viable-columns helper, defaults
  - usePartnerConfig hook + PartnerConfigProvider context (single upstream call, distributed via context to whole app)
  - PartnerSetupSheet slide-over editor reachable from per-pair sidebar context menu
  - SegmentEditorTable with forwardRef imperative save() + 4-stage validation pipeline
  - SegmentRow inline-edit primitive (name + column dropdown + values multi-select + up/down reorder + delete)
  - OtherBucketRow locked auto-bucket with live evaluateSegments coverage
  - localStorage key `bounce-dv-partner-config` for per-pair segment lists
  - smoke:segment-evaluator script asserting evaluator invariants (overlap double-count, parity, null-handling)

affects: [39-04-segment-split-charts-kpis, future-pcfg-08-snowflake-storage]

tech-stack:
  added: []
  patterns:
    - "Mirror partner-lists/* substrate wholesale: types → schema → storage → defaults → CRUD hook → context provider. All five layers copy-shape with single-key-array localStorage and additive `.optional()` schema evolution."
    - "forwardRef imperative save() — SegmentEditorTable exposes a `save(): { ok, error? }` handle so SetupSheet's footer button can trigger validation + persistence without prop-drilling staged state. Cleaner than lifting draft state to the parent because every row-level update would otherwise re-render the entire sheet wrapper."
    - "Hydration via parent-driven hydrationKey bump — SetupSheet increments a counter on every false→true open transition; SegmentEditorTable's useEffect reads the latest stored config when the key changes. Avoids re-hydrating mid-edit when the user is staging."
    - "Base UI ContextMenu + render-prop delegation — `ContextMenu.Trigger render={<SidebarMenuButton ... />}` composes refs and event handlers correctly so right-click opens the menu without disturbing click-to-drill semantics or keyboard nav (Pitfall 8 in 39-RESEARCH)."
    - "Centralized evaluator (evaluateSegments) is the single source of truth for the 'Other' bucket count + overlap detection — Setup's coverage counter, Setup's overlap warning banner, and (Plan 04) chart/KPI splits all call the same function on the same pair-scoped row set (Pitfall 7 lock)."
    - "viable-columns heuristic: distinct-value-count between 2 and 20, exclude self-referential pair-axis columns (PARTNER_NAME, ACCOUNT_TYPE) + LENDER_ID + BATCH. Returns [] today against agg_batch_performance_summary so the Setup UI gracefully shows the 'no viable columns yet' empty state — scaffolding ships regardless of ETL readiness."

key-files:
  created:
    - src/lib/partner-config/types.ts
    - src/lib/partner-config/schema.ts
    - src/lib/partner-config/storage.ts
    - src/lib/partner-config/defaults.ts
    - src/lib/partner-config/segment-evaluator.ts
    - src/lib/partner-config/segment-evaluator.smoke.ts
    - src/lib/partner-config/viable-columns.ts
    - src/hooks/use-partner-config.ts
    - src/contexts/partner-config.tsx
    - src/components/partner-config/partner-setup-sheet.tsx
    - src/components/partner-config/segment-editor-table.tsx
    - src/components/partner-config/segment-row.tsx
    - src/components/partner-config/other-bucket-row.tsx
  modified:
    - src/app/layout.tsx
    - src/components/layout/app-sidebar.tsx
    - package.json

key-decisions:
  - "Open Q #1 (RESEARCH): segments shipped as 'scaffold now, empty-state until ETL lands'. The Setup UI works today; the column dropdown surfaces an empty-state Alert against agg_batch_performance_summary because no viable segmenting columns exist yet. UI is ready to consume future ETL adds (LANGUAGE, BANK_SUBSIDIARY, sub-cohort) without a code change beyond the data."
  - "Open Q #3 (CONTEXT): segment reorder uses up/down arrow buttons for v1, NOT drag-and-drop. Cleaner accessibility (no DnD lib added), simpler implementation, matches the plan's explicit guidance that 'CONTEXT marks drag details as Claude's Discretion.'"
  - "viable-columns heuristic excludes LENDER_ID + BATCH (high-cardinality / self-referential within a pair) on top of PARTNER_NAME + ACCOUNT_TYPE. 2 ≤ distinct ≤ 20 keeps the dropdown meaningful. Sort by column name for stable order."
  - "Overlap = WARNING not BLOCK — first save attempt with overlapping value-sets returns ok=false with an inline banner; second save attempt after the user clicks 'Confirm and save anyway' bypasses the check via a forceWarnAccepted flag. Empty/duplicate/reserved-name failures are HARD blocks (no force-confirm)."
  - "PartnerConfigProvider mounts inside Providers but OUTSIDE SidebarProvider — the sidebar (where the Setup sheet's entry-point lives) and the main panel (where future Plan 04 chart/KPI consumers will live) need to share one hook instance. Provider position mirrors the location PartnerListsProvider would take if mounted at app/layout (currently mounted via providers.tsx, but PartnerConfig has no parallel module — direct mount in layout.tsx is sufficient since there are no other consumers requiring an intermediate provider)."
  - "Imperative save() via forwardRef on SegmentEditorTable instead of lifting draft state to the SheetSetupSheet — keeps row-level updates from re-rendering the wrapper, cleaner separation between 'shell' (header/footer/buttons) and 'body' (the editable table). Pattern not used elsewhere in the codebase but it's the standard React way to expose imperative APIs from a child component."
  - "Sheet hydration via hydrationKey bump on false→true transition (instead of unmounting/remounting the editor) — keeps animation smooth and avoids losing component state churn. The editor's useEffect re-reads stored config when the key changes."
  - "ContextMenu styled via bg-surface-overlay + shadow-elevation-overlay (NOT raw shadow-md). data-[highlighted]:bg-accent for focused item state. text-body for menu items (not text-sm) per AGENTS.md type-token rules."
  - "Toast routing: toast.success on save, toast.error on hard validation failures (empty/duplicate/'Other' reserved), toast.warning on overlap (recoverable). Distinguishes severity for the user."

requirements-completed: [PCFG-05]

duration: 9min
completed: 2026-04-25
---

# Phase 39 Plan 02: Partner Config Module Summary

**Per-pair segment configuration substrate ships — `src/lib/partner-config/*` domain (types/schema/storage/evaluator/viable-columns), `usePartnerConfig` hook + `PartnerConfigProvider` context, `PartnerSetupSheet` slide-over editor reachable via right-click on any sidebar pair row. Save commits to `bounce-dv-partner-config` localStorage; Cancel discards. Validation blocks empty/duplicate/reserved-name segments; overlapping value-sets warn (force-confirm allowed). Empty-state shipped for today's reality on `agg_batch_performance_summary` (no viable segmenting columns yet — scaffold ready for future ETL adds).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-25T03:00:32Z
- **Completed:** 2026-04-25T03:09:26Z
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify, auto-approved per workflow.auto_advance)
- **Files created:** 13 (9 lib/hooks/contexts + 4 components)
- **Files modified:** 3 (app/layout.tsx, app-sidebar.tsx, package.json)

## Accomplishments

- **Data layer (Task 1):**
  - `src/lib/partner-config/types.ts` — `SegmentRule { id, name, column, values[] }`, `PartnerConfigEntry { partner, product, segments, updatedAt }`, `PartnerConfigArray`.
  - `src/lib/partner-config/schema.ts` — Zod with reserved-name 'Other' refine, strict-mode entry schema for additive evolution. Mirrors partner-lists/schema.ts shape exactly.
  - `src/lib/partner-config/storage.ts` — `loadPartnerConfig` (safeParse + empty fallback), `persistPartnerConfig` (try/catch quota errors), key `bounce-dv-partner-config`. Console.warn on corruption.
  - `src/lib/partner-config/segment-evaluator.ts` — pure function: `bySegment` Map, `other` array, `overlapRowCount`. Overlapping rows intentionally double-counted across buckets so the warning banner can surface conflicts.
  - `src/lib/partner-config/segment-evaluator.smoke.ts` — 7 invariant blocks: empty-segments-Other-only, non-overlap sum, overlap double-count, partial coverage, full invariant, numeric/string parity, null-handling.
  - `src/lib/partner-config/viable-columns.ts` — `getViableSegmentColumns(rows)` heuristic returning [] today against batch-summary dataset (driving the Setup empty state). Includes up to 5 sample values per column for dropdown helper text.
  - `src/lib/partner-config/defaults.ts` — `getDefaultPartnerConfig() = []` (extension point for future system-derived seeds).
  - `src/hooks/use-partner-config.ts` — hydration-safe CRUD: `configs`, `getConfig(pair)`, `upsertSegments(pair, segs)`, `deleteConfig(pair)`. `getConfig` returns undefined when no entry — undefined contract drives Plan 04's "fall back to rolled-up" path.
  - `src/contexts/partner-config.tsx` — single upstream hook + `usePartnerConfigContext()`.

- **Setup UI (Task 2):**
  - `partner-setup-sheet.tsx` — Sheet wrapper, header shows partner name (in `<strong>`) + read-only Product field with "Data-derived, not editable" caption. Cancel/Save footer; toast.success / toast.error / toast.warning routing. hydrationKey bumps on open transition.
  - `segment-editor-table.tsx` — forwardRef imperative `save()` with 4-stage validation pipeline: empty-fields → duplicate-names → reserved-'Other' → overlap-warn-with-force-confirm. Empty-state Alert when no viable columns. Header row + segment rows + Add segment button + OtherBucketRow.
  - `segment-row.tsx` — Input + column Popover (single-select, shows sample values per option) + values multi-select Popover (Checkbox grid; disabled until column picked) + up/down reorder buttons + delete. Mirrors `AttributeFilterBar.AttributeMultiSelect` shape.
  - `other-bucket-row.tsx` — locked auto-bucket; calls `evaluateSegments` for live coverage; overlap pill via `text-warning-fg` when count > 0.

- **Wire-up (Task 3):**
  - `app/layout.tsx` — `<PartnerConfigProvider>` wraps SidebarProvider so sidebar + main panel share one hook instance.
  - `app-sidebar.tsx` — every pair row's `SidebarMenuButton` is wrapped in `ContextMenu.Root` via `render` prop delegation. Right-click opens a Base UI menu with "Configure segments" item. Click-to-drill on the trigger preserved. Setup sheet mount + state at sidebar root.

## Task Commits

1. **Task 1: Data layer** — `b492062` (feat)
2. **Task 2: Setup UI** — `d098d7b` (feat)
3. **Task 3: Wire sidebar + provider** — `fc8b464` (feat)
4. **Task 4: Visual verify checkpoint** — auto-approved per `workflow.auto_advance`; build verification via the pre-existing globals.css workaround (typecheck + check:tokens + check:surfaces all green).

## Files Created/Modified

### Created (13)
- `src/lib/partner-config/types.ts` — SegmentRule, PartnerConfigEntry, PartnerConfigArray
- `src/lib/partner-config/schema.ts` — Zod schemas with reserved-name refine
- `src/lib/partner-config/storage.ts` — load/persist + PARTNER_CONFIG_STORAGE_KEY
- `src/lib/partner-config/defaults.ts` — getDefaultPartnerConfig()
- `src/lib/partner-config/segment-evaluator.ts` — pure evaluator
- `src/lib/partner-config/segment-evaluator.smoke.ts` — 7 invariant blocks
- `src/lib/partner-config/viable-columns.ts` — column-enumeration heuristic
- `src/hooks/use-partner-config.ts` — hydration-safe CRUD hook
- `src/contexts/partner-config.tsx` — Provider + context hook
- `src/components/partner-config/partner-setup-sheet.tsx` — slide-over Sheet
- `src/components/partner-config/segment-editor-table.tsx` — forwardRef table
- `src/components/partner-config/segment-row.tsx` — single inline-edit row
- `src/components/partner-config/other-bucket-row.tsx` — locked auto-bucket

### Modified (3)
- `src/app/layout.tsx` — mount PartnerConfigProvider
- `src/components/layout/app-sidebar.tsx` — ContextMenu wrap + Setup sheet state/mount
- `package.json` — `smoke:segment-evaluator` script

## Decisions Made

See key-decisions in frontmatter. Highlights:

- **Open Q #1 resolved (scaffold now, empty-state until ETL lands):** The dataset's batch-summary shape has no viable segmenting columns today. Rather than block PCFG-05 on data work, the Setup UI surfaces a clear empty-state explanation and the entire scaffolding (schema, storage, hook, context, UI primitives, evaluator) ships ready to consume future ETL adds. Zero changes needed on the segment-config side when LANGUAGE / BANK_SUBSIDIARY / sub-cohort columns appear — the column dropdown auto-detects them via `getViableSegmentColumns`.
- **Open Q #3 resolved (up/down buttons):** Reorder uses ChevronUp / ChevronDown from lucide-react. CONTEXT explicitly marked drag-handle details as Claude's Discretion. Up/down keyboard accessible by default, no DnD lib dep added.
- **Overlap is a WARNING, not a BLOCK:** Empty/duplicate/'Other' failures are hard blocks. Overlapping value-sets surface a banner the user can confirm to proceed — recognizes that some real-world segmentations may legitimately overlap (e.g., during a transition period) even though the partition invariant is the goal.
- **Imperative save via forwardRef:** Cleaner than lifting draft state to the parent Sheet. Row-level updates don't re-render the whole sheet wrapper.
- **hydrationKey pattern for fresh-open re-hydrate:** Bumps on every false→true open transition; the editor's useEffect picks up storage changes. Avoids re-hydrating mid-edit when the user is staging changes.
- **Base UI ContextMenu render-prop delegation:** `<ContextMenu.Trigger render={<SidebarMenuButton ... />}>` composes refs + event handlers correctly so right-click opens the menu without disturbing click-to-drill or keyboard nav. Documented as Pitfall 8 in 39-RESEARCH.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1, 2, 3 each landed with their planned files + diffs. The plan's task-level structure matched the natural commit boundaries 1:1.

## Issues Encountered

### Pre-existing `npm run build` CSS failure (deferred — phase-wide)

`npm run build` continues to fail on the same pre-existing `CssSyntaxError: Missed semicolon` in `src/app/globals.css` produced by `@tailwindcss/postcss` v4.2.2 inside Turbopack — first flagged in 39-01-SUMMARY.md and `.planning/phases/39-partner-config-module/deferred-items.md`. None of the Phase 39-02 changes modify CSS.

Per the auto_advance directive in this run, build verification was satisfied via:
- `npx tsc --noEmit` — clean (excluding pre-existing axe-core deferred error)
- `npm run check:tokens` — clean (no ad-hoc text sizes / weight utilities in src/)
- `npm run check:surfaces` — clean (no raw shadow utilities or card-frame combos)
- `npm run smoke:segment-evaluator` — passes 7 invariant blocks

The build failure is unrelated to PCFG-05 and continues to live in the deferred-items log.

### Lint warnings on hydration pattern (accepted by precedent)

`use-partner-config.ts` and `partner-setup-sheet.tsx` produce `react-hooks/set-state-in-effect` lint warnings on the established hydration-safe pattern (`useState([]) + useEffect(() => setStoredX(load()), [])`). The same warnings exist on `use-partner-lists.ts`, `use-saved-views.ts`, and other established hooks — this is the documented Phase 25 Plan D KI-13 deferred pattern (reading localStorage during render breaks SSR; the alternative is worse). Following precedent.

## User Setup Required

None — partner config is purely client-side localStorage; no external service configuration.

## Next Phase Readiness

- **Plan 39-04 (Segment-split charts/KPIs) ready to start:**
  - `usePartnerConfigContext().getConfig(pair)` returns `PartnerConfigEntry | undefined`. The undefined contract is the documented "fall back to rolled-up" signal.
  - `evaluateSegments(rows, segments)` is the single source of truth for segment-row-set assignment. Plan 04's chart-side and KPI-side splits MUST call this same function on the SAME pair-scoped + filter-applied rows so the Setup UI's "Other" coverage counter reconciles with what the chart/KPI shows.
  - `getViableSegmentColumns` already filters self-referential columns — the Setup empty state today shows nothing in the dropdown, but Plan 04 doesn't need this helper directly (it's UI-only).
- **Plan 39-03 (Partner Lists extension):** parallel wave — already completed by parallel agent (`d33ccdb`, `1f298c6`); no shared file conflicts encountered (39-02 owns partner-config domain + sidebar context-menu + layout provider mount, 39-03 owns partner-lists domain extensions).
- **Future PCFG-08 (Snowflake-backed config storage):** `loadPartnerConfig` + `persistPartnerConfig` are the two replacement points; the schema + types + evaluator carry over unchanged.

## Self-Check: PASSED

- All 13 created files exist on disk:
  - `src/lib/partner-config/types.ts` ✓
  - `src/lib/partner-config/schema.ts` ✓
  - `src/lib/partner-config/storage.ts` ✓
  - `src/lib/partner-config/defaults.ts` ✓
  - `src/lib/partner-config/segment-evaluator.ts` ✓
  - `src/lib/partner-config/segment-evaluator.smoke.ts` ✓
  - `src/lib/partner-config/viable-columns.ts` ✓
  - `src/hooks/use-partner-config.ts` ✓
  - `src/contexts/partner-config.tsx` ✓
  - `src/components/partner-config/partner-setup-sheet.tsx` ✓
  - `src/components/partner-config/segment-editor-table.tsx` ✓
  - `src/components/partner-config/segment-row.tsx` ✓
  - `src/components/partner-config/other-bucket-row.tsx` ✓
- Per-task commits exist in git log: `b492062` (Task 1) ✓, `d098d7b` (Task 2) ✓, `fc8b464` (Task 3) ✓
- Smoke test passes: `npm run smoke:segment-evaluator` ✓ (7 invariant blocks)
- Typecheck clean (excluding pre-existing axe-core deferred error) ✓
- check:tokens clean ✓
- check:surfaces clean ✓

---

*Phase: 39-partner-config-module*
*Completed: 2026-04-25*
