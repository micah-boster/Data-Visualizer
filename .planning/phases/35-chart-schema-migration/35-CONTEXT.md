# Phase 35: Chart Schema & Migration - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce a `ChartDefinition` type that represents both the existing CollectionCurve preset and future builder-defined charts, and migrate existing `ChartViewState` stored inside `SavedView.snapshot.chartState` (localStorage) into the new shape on read.

**In scope:** Type definitions, legacy-shape detection, migration function, one smoke test with a legacy fixture, replacement of the existing `chartState` slot in `ViewSnapshot`.

**Out of scope:** Chart builder UI, new chart types beyond collection-curve, preset save/load UX, partner-list filtering integration (those belong to Phase 36 / Phase 34 / Phase 37).

**Scope anchor from roadmap:** Small — "~2-3 files, no UI changes."

</domain>

<decisions>
## Implementation Decisions

### Schema shape
- `ChartDefinition` is a **discriminated union by `type`** field
- First variant: `{ type: 'collection-curve', ...presetFields }` — preset fields (`metric`, `hiddenBatches`, `showAverage`, `showAllBatches`) carry over **unchanged** from current `ChartViewState`
- Migration is a rename/rewrap only — no data-semantics changes inside the preset
- Base fields shared across variants: **`type` only**. No shared `id`/`name`/`createdAt` at this phase (Phase 36 can add entity metadata when chart save/load lands)
- `ViewSnapshot.chartState` **replaced in-place** with `ChartDefinition` — single source of truth, no parallel slot

### Migration trigger & versioning
- Migration runs **lazy on read** — each `SavedView` migrates when loaded from localStorage, no boot-time sweep
- Version tracking: **add a version field going forward** on `ChartDefinition` (e.g. `version: 2`); absence of the field signals a legacy record
- Scope of versioning: **on `ChartDefinition` / `chartState`**, not at the `ViewSnapshot` level
- Persistence: **in-memory migration + write-back on next save** — no eager write-back, self-heals as users interact with views
- Migration function is **idempotent** — safe to re-run; passing an already-v2 record returns it unchanged

### Failure handling
- When migration fails (unparseable JSON, missing required fields, unknown type), the SavedView **falls back to a default CollectionCurve preset** — view still loads, chart is recoverable
- Surface: **silent + `console.warn`** — no user-facing toast; migration is infrastructure
- No raw-payload preservation — **legacy shape discarded** on failure (keeps scope tight, avoids localStorage bloat)
- Tolerance: **only unparseable / missing required fields count as failure**; missing optional fields use defaults. Required = `metric`; optional = `hiddenBatches`, `showAverage`, `showAllBatches`

### Old type lifecycle
- `ChartViewState` interface **deleted immediately** in this phase — legacy shape lives as an inline/private type inside the migration function, not exported
- **Forward-only** migration — no downgrade/serialize-back path. Rolling back the code means old builds read new data and hit the failure-fallback path
- Type module location: **keep in `src/lib/views/types.ts`** (colocated with `ViewSnapshot` / `SavedView`) — don't split into `src/lib/charts/types.ts` yet. Revisit in Phase 36 if it grows

### Testing
- **One smoke test with a legacy `ChartViewState` fixture** that round-trips through the migration function — locks the contract Phase 36 will depend on
- Failure-path fixtures (missing `metric`, unknown `type`) should also be covered if the test scaffolding makes it cheap

### Claude's Discretion
- Exact naming (`ChartDefinition` vs `ChartConfig` vs `ChartSpec`)
- Internal helper names / file organization within `src/lib/views/`
- Whether `version` is a number (`2`) or string (`'v2'`)
- Where precisely the migration function is invoked from (SavedView loader) as long as it's the single read-path

</decisions>

<specifics>
## Specific Ideas

- Current `ChartViewState` lives in [src/lib/views/types.ts:17](src/lib/views/types.ts:17) — the rename/rewrap replaces this interface
- `ViewSnapshot.chartState?: ChartViewState` at line 49 becomes `ViewSnapshot.chartState?: ChartDefinition`
- Existing consumers: `src/components/charts/use-curve-chart-state.ts`, `src/components/charts/collection-curve-chart.tsx`, `src/components/data-display.tsx` — Phase 35 should keep their call sites compiling (may require narrowing `chartState.type === 'collection-curve'` at the consumer)
- Phase 36 depends on this — builder preset save/load will plug new `type` variants into the same union
- Phase 34 (Partner Lists) is a dependency in the roadmap note, but the partner-list filter doesn't need to appear on `ChartDefinition` in this phase — it belongs on the view filter slice or on a future chart variant

</specifics>

<deferred>
## Deferred Ideas

- Partner-list filter fields on `ChartDefinition` — Phase 36 / when the builder exposes series filtering
- Chart entity metadata (`id`, `name`, `createdAt`, `updatedAt`) — Phase 36 preset save/load
- `src/lib/charts/types.ts` module split — revisit after Phase 36 if the chart surface grows
- Downgrade / bi-directional migration — not needed given release discipline
- User-facing migration notifications — unnecessary for an infrastructure change
- Snapshot-level versioning — only versioning `chartState` for now

</deferred>

<roadmap_note>
## Roadmap Sync Needed

`.planning/ROADMAP.md` currently ends at Phase 32 but the v4.0 plan includes Phases 33–37. Before `/gsd:plan-phase 35`, add Phases 33–37 to ROADMAP.md so init checks and downstream tooling can find Phase 35.

</roadmap_note>

---

*Phase: 35-chart-schema-migration*
*Context gathered: 2026-04-18*
