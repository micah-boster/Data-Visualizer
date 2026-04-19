---
phase: 36-chart-builder
plan: 02
subsystem: charts
tags: [zod, typescript, chart-builder, chart-presets, localStorage, hydration, react-hook, node-strip-types]

requires:
  - phase: 35-chart-schema-migration
    provides: "ChartDefinition discriminated-union + chartDefinitionSchema + DEFAULT_COLLECTION_CURVE + Node --experimental-strip-types smoke harness"
  - phase: 36-chart-builder Plan 01
    provides: "line/scatter/bar variants appended to chartDefinitionSchema (consumed by the smoke test's valid round-trip assertion)"
provides:
  - "ChartPreset entity type (src/lib/chart-presets/types.ts)"
  - "chartPresetSchema + chartPresetsArraySchema zod validators (src/lib/chart-presets/schema.ts)"
  - "loadChartPresets / persistChartPresets + CHART_PRESETS_STORAGE_KEY SSR-safe localStorage CRUD (src/lib/chart-presets/storage.ts)"
  - "BUILTIN_PRESETS catalog (one entry — Collection Curves) referencing DEFAULT_COLLECTION_CURVE (src/lib/chart-presets/defaults.ts)"
  - "useChartPresets React hook — hydration-then-persist CRUD hook mirroring useSavedViews 1:1 (src/hooks/use-chart-presets.ts)"
  - "smoke:chart-presets npm script (9 assertions)"
affects: [36-chart-builder plans 03-05, 37-metabase-sql-import]

tech-stack:
  added: []
  patterns:
    - "Built-in catalog + user-persisted hybrid — code-defined presets merged ahead of localStorage-loaded user presets on every hydration; locked entries never persisted"
    - "Two-layer sanitization on load — drop locked entries (defends against poisoned localStorage fake-built-ins) + drop entries whose full shape fails chartPresetSchema"
    - "structuredClone on save to prevent reference leak from caller state into persisted preset"
    - "Relative .ts imports across the whole slice — chart-presets/* library files use ../views/... with explicit .ts suffixes so Node's native ESM strip-types resolver can follow the graph (path aliases (@/) are unsupported by Node's resolver)"

key-files:
  created:
    - src/lib/chart-presets/types.ts
    - src/lib/chart-presets/schema.ts
    - src/lib/chart-presets/storage.ts
    - src/lib/chart-presets/defaults.ts
    - src/lib/chart-presets/chart-presets.smoke.ts
    - src/hooks/use-chart-presets.ts
  modified:
    - package.json

key-decisions:
  - "BUILTIN_PRESETS contains exactly one entry (Collection Curves) — CONTEXT-capped catalog; Plans 36-04/05 must not add a second built-in speculatively"
  - "Built-in definition IS DEFAULT_COLLECTION_CURVE by reference equality (not a copy) — single source of truth link asserted in smoke"
  - "Built-ins rebuilt from code on every hook hydration; never written to localStorage — a poisoned localStorage carrying fake locked:true entries cannot leak through the sanitizer"
  - "chartPresetSchema intentionally non-strict — future additive fields (updatedAt, description) land without a schema version bump, mirroring Phase 32-02 drill + Phase 34 listId evolution"
  - "Hook deep-copies the definition via structuredClone on savePreset (Pitfall 4 — prevents reference leak to caller state that would corrupt persisted presets if the caller later mutates the definition)"
  - "sanitizeUserPresets drops both locked:true entries AND entries that fail chartPresetSchema — two-layer defense in a single filter pass"
  - "Re-export of chartDefinitionSchema from the hook declined — the plan's contract shape is 7 methods, no schema re-export; consumers should import schemas from @/lib/chart-presets/schema directly"

patterns-established:
  - "Node ESM + Next.js dual-resolution rule: library files that participate in a Node --experimental-strip-types smoke test MUST use relative paths with explicit .ts suffixes (not @/ aliases). Next.js's moduleResolution: bundler still resolves relative .ts imports cleanly in-app, so the app layer is unaffected."
  - "Preset-catalog hybrid pattern: code-defined built-ins + localStorage-persisted user entries, merged at hydration — applicable to any future 'starter + user-extensible' catalog surface (not just chart presets)"

requirements-completed: [CHRT-10, CHRT-11, CHRT-12]

duration: ~3 min
completed: 2026-04-19
---

# Phase 36 Plan 02: Chart Presets Feature Slice Summary

**Shipped the chart-presets data/hook layer — ChartPreset entity + zod schema + SSR-safe localStorage CRUD + BUILTIN_PRESETS catalog + useChartPresets hook with hydration-then-persist pattern — locking the contract Wave 2's PresetMenu will consume, and satisfying CHRT-10/11/12 at the data layer.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-19T13:43:31Z
- **Completed:** 2026-04-19T13:46:19Z
- **Tasks:** 3
- **Files modified:** 1 (+ 6 created = 7 files touched)

## Accomplishments

- Four-file chart-presets slice mirrors src/lib/partner-lists/* and src/lib/views/* 1:1: types (ChartPreset), schema (chartPresetSchema + chartPresetsArraySchema), storage (loadChartPresets + persistChartPresets + CHART_PRESETS_STORAGE_KEY), defaults (BUILTIN_PRESETS = [Collection Curves]).
- BUILTIN_PRESETS[0].definition === DEFAULT_COLLECTION_CURVE by reference equality — smoke test asserts this link explicitly; any future duplication of the literal fails the smoke.
- useChartPresets hook: empty-init useState for SSR safety, first effect loads user presets + merges BUILTIN_PRESETS ahead-of-user, second effect persists (stripping locked entries so built-ins never write). Seven public methods match the interfaces block verbatim: presets / savePreset / deletePreset / restorePreset / hasPresetWithName / renamePreset / getPreset.
- deletePreset returns undefined for missing OR locked ids (built-in protection asserted at the contract level); renamePreset is a no-op on locked ids.
- Two-layer sanitization on hydration: drops any preset with locked:true (defends against poisoned localStorage fake-built-ins) AND drops any preset whose full shape fails chartPresetSchema.safeParse (self-heal pattern mirroring Phase 34 sanitizeSnapshot).
- savePreset deep-copies the incoming definition via structuredClone — prevents a caller-side reference mutation from corrupting the persisted preset (Pitfall 4).
- smoke:chart-presets wired (9 assertions): BUILTIN_PRESETS length/id/locked/name/reference-equality invariants + every built-in passes chartPresetSchema + malformed-definition rejection + valid line-variant round-trip (proves the Plan 36-01 variants are wired) + CHART_PRESETS_STORAGE_KEY literal guard.
- All 5 check:* guards still green (tokens / components / surfaces / motion / polish). Sibling smokes still pass (smoke:migrate-chart 11/11, smoke:axis-eligibility 15/15).

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold chart-presets slice (types + schema + storage + BUILTIN_PRESETS)** — `fb4cc71` (feat)
2. **Task 2: useChartPresets hook with hydration-then-persist pattern** — `61ba333` (feat)
3. **Task 3: chart-presets smoke test + npm script wiring** — `cbfe80e` (test)

_Task 3 folded in the [Rule 3] blocking fix — import paths flipped from `@/` aliases to relative `../` + explicit `.ts` suffixes so the Node strip-types runtime could resolve the module graph._

## Files Created/Modified

- `src/lib/chart-presets/types.ts` — ChartPreset interface. JSDoc spells out the `builtin:` id prefix convention + locked semantics.
- `src/lib/chart-presets/schema.ts` — chartPresetSchema (non-strict, wraps chartDefinitionSchema) + chartPresetsArraySchema.
- `src/lib/chart-presets/storage.ts` — loadChartPresets + persistChartPresets + CHART_PRESETS_STORAGE_KEY = 'bounce-dv-chart-presets'. SSR-safe try/catch + typeof window guard + safeParse on read. Does NOT include built-ins in the loaded array (merge happens in the hook).
- `src/lib/chart-presets/defaults.ts` — BUILTIN_PRESETS = [{ id: 'builtin:collection-curves', name: 'Collection Curves', locked: true, createdAt: 0, definition: DEFAULT_COLLECTION_CURVE }]. JSDoc reminder that downstream plans must NOT speculatively add a second built-in.
- `src/lib/chart-presets/chart-presets.smoke.ts` — 9-assertion Node strip-types smoke. Covers BUILTIN_PRESETS invariants (including reference equality with DEFAULT_COLLECTION_CURVE), sanitize-drop on malformed definitions, valid line-variant round-trip, storage-key literal.
- `src/hooks/use-chart-presets.ts` — useChartPresets. Mirrors useSavedViews structure (empty-init + hydration effect + persist effect + useCallback CRUD). Contains private sanitizeUserPresets helper (filters by schema + drops locked). Hydration-vs-seed JSDoc warning references Phase 35-02 Pitfall 2.
- `package.json` — added `"smoke:chart-presets": "node --experimental-strip-types src/lib/chart-presets/chart-presets.smoke.ts"` to the scripts block, sitting alongside Plan 01's parallel-landed `smoke:axis-eligibility` entry.

## Decisions Made

See `key-decisions` frontmatter. Key concrete patterns locked for Phase 36 Waves 2-3 consumers:

1. Reference-equality link to DEFAULT_COLLECTION_CURVE is the single-source-of-truth contract — smoke enforces it.
2. Built-in protection lives at the hook layer (delete returns undefined, rename is no-op) AND at the sanitizer (locked:true entries from localStorage are dropped). Two-layer defense.
3. Non-strict schema supports additive evolution — future fields on ChartPreset land without a schema version bump.
4. Node ESM compatibility rule: any library file transitively reachable by a strip-types smoke MUST use relative `.ts` imports, not `@/` aliases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Swapped `@/` path alias imports for relative `.ts` imports in chart-presets library files**
- **Found during:** Task 3 (smoke test first run)
- **Issue:** `npm run smoke:chart-presets` failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/lib' imported from .../defaults.ts`. Node's native ESM resolver (used by `--experimental-strip-types`) does not honor tsconfig path aliases; it resolves the `@/` literal as a real package name.
- **Fix:** Flipped all intra-slice + cross-slice imports in `types.ts`, `schema.ts`, `storage.ts`, `defaults.ts` from `@/lib/...` to `../views/....ts` (cross-slice) and `./sibling.ts` (within-slice). Matches the pattern already established by `src/lib/views/migrate-chart.ts`, which carries the exact same Node-smoke-compatible convention.
- **Files modified:** src/lib/chart-presets/types.ts, src/lib/chart-presets/schema.ts, src/lib/chart-presets/storage.ts, src/lib/chart-presets/defaults.ts
- **Verification:** `npm run smoke:chart-presets` → 9/9 assertions pass. `npx tsc --noEmit` clean (Next.js's `moduleResolution: bundler` resolves relative `.ts` imports fine at build time). `npm run smoke:migrate-chart` + `npm run smoke:axis-eligibility` unaffected.
- **Committed in:** `cbfe80e` (part of Task 3 commit)

**2. [Plan clarification] Did NOT re-export `chartDefinitionSchema` from `useChartPresets`**
- **Found during:** Task 2 (hook drafting)
- **Issue:** Initial hook draft re-exported `chartDefinitionSchema` at the end of the file "for symmetry with usePartnerLists". Plan's interfaces block specifies exactly 7 return-shape methods — no schema re-export.
- **Fix:** Removed the re-export before commit. Consumers that need the schema import it directly from `@/lib/chart-presets/schema`.
- **Files modified:** src/hooks/use-chart-presets.ts (pre-commit edit, no additional commit)
- **Verification:** Hook still type-checks and returns the exact 7-member shape called out in the plan's interfaces block.
- **Committed in:** `61ba333` (Task 2 commit, clean shape)

---

**Total deviations:** 1 auto-fixed (1 blocking) + 1 mid-task self-correction
**Impact on plan:** Neither deviation altered the plan's contract. The Rule 3 fix was necessary for the smoke test to run at all; the re-export self-correction kept the hook's public surface matching the plan's interfaces block verbatim. No scope creep.

## Issues Encountered

- `npx tsc --noEmit` surfaced a pre-existing error in `tests/a11y/baseline-capture.spec.ts(18,29): Cannot find module 'axe-core'` — Phase 33-01 landed before this plan and installed `@axe-core/playwright` as a dev-dep while the spec imports `axe-core` directly. Out of Phase 36 scope; already logged to `.planning/phases/36-chart-builder/deferred-items.md` by Plan 01. This plan's changes introduce zero new tsc errors.

## User Setup Required

None.

## Next Phase Readiness

- Wave 2 (Plans 03, 04, 05) can now `import { useChartPresets } from '@/hooks/use-chart-presets'` and `import { BUILTIN_PRESETS } from '@/lib/chart-presets/defaults'` without further contract edits. The hook returns exactly the 7 methods called out in the plan's interfaces block.
- Plan 36-04 (PresetMenu UI) has a stable, exercised data-layer contract — built-in merge behavior + locked protection are already locked in smoke, so the UI work can focus on menu structure + save-modal UX without worrying about data-layer regressions.
- Plan 36-03 (stale-column warning) can rely on the Phase 35-02 Pitfall 2 note baked into the hook's JSDoc — browser-seeding a stale-column localStorage payload WILL be overwritten by the hydration-then-persist effect, so stale-column coverage must land as a unit assertion, not a browser scenario.
- CHRT-10 + CHRT-11 + CHRT-12 are satisfied at the data/hook layer. Full UI check-off (Presets dropdown rendering + save modal + load-on-click) lands in Plans 36-04 / 36-05.
- Wave 1 Phase 36 is now closed (Plans 01 + 02 both shipped). Wave 2 unblocked.

## Self-Check: PASSED

- `src/lib/chart-presets/types.ts` — FOUND
- `src/lib/chart-presets/schema.ts` — FOUND
- `src/lib/chart-presets/storage.ts` — FOUND
- `src/lib/chart-presets/defaults.ts` — FOUND
- `src/lib/chart-presets/chart-presets.smoke.ts` — FOUND
- `src/hooks/use-chart-presets.ts` — FOUND
- `package.json` — MODIFIED (smoke:chart-presets script present)
- Task 1 commit `fb4cc71` — FOUND
- Task 2 commit `61ba333` — FOUND
- Task 3 commit `cbfe80e` — FOUND

---
*Phase: 36-chart-builder*
*Completed: 2026-04-19*
