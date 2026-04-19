# Phase 36: Chart Builder - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a generic chart renderer (line, scatter, bar) plus a builder UI for configuring chart type and axes, with collection curves preserved as a built-in preset. Chart configuration persists per saved view via the `ChartDefinition` discriminated union introduced in Phase 35.

**In scope:** Generic renderer for 3 chart types (line/scatter/bar), inline builder toolbar above the chart, chart-type switcher, X/Y axis pickers with per-type column filtering, preset save/load (built-in + user presets), collection-curve preset rendering identically to current `CollectionCurveChart`, persistence of chart config on `ViewSnapshot.chartState`.

**Out of scope:** Group-by / multi-series (CHRT-14 deferred), dual Y-axis (CHRT-15 deferred), edit-mode / confirm-discard flow, new chart types beyond line/scatter/bar, shared/global presets (per-view only), preset sharing across views as first-class entity.

**Scope anchor from roadmap:** Large — "generic renderer + builder UI + collection curve backward compat + view integration. ~10-12 files." Requirements: CHRT-03 through CHRT-13.

</domain>

<decisions>
## Implementation Decisions

### Builder UI surface

- Builder lives in an **inline header toolbar directly above the chart canvas** — zero extra clicks, always visible, composes with the existing `DataPanel` pattern (Phase 29)
- Audience is the **internal partnerships team (power users)** — surface real column names directly, density over hand-holding, no progressive-disclosure / advanced-mode split
- **Always editable** — any change re-renders instantly, no Save button gate, no edit-mode toggle. Matches existing filter/sort behavior
- **Builder toolbar is hidden for the collection-curve preset** — preset keeps its current controls (metric toggle, solo mode, average line, batch visibility). The generic axis/type builder only appears once the user switches away from the preset to line/scatter/bar

### Chart type switch + carryover

- **Icon segmented control** in the header toolbar (line / scatter / bar icons) — one click, always visible, matches `ToolbarGroup` density
- When switching **between generic types**: **X/Y axes carry** if still valid for the new type; **type-specific options reset** (bar orientation, scatter point sizing, etc. at Claude's discretion per type). If the carried axis is invalid under the new type, **clear it and prompt the user to pick**
- Switching **from collection-curve preset → generic type**: **convert with sensible defaults**. Preset's `metric` field maps to generic Y-axis. X defaults to batch/time. Preset-only fields (`hiddenBatches`, `showAverage`, `showAllBatches`) are discarded on exit. User lands on a rough equivalent and tunes from there
- **Default chart for a view with no `chartState`**: the **collection-curve preset** — preserves current behavior, zero-migration feel for existing views

### Axis column filtering + validation

- **Strict-by-type X-axis eligibility** — line: time/ordinal columns; scatter: numeric; bar: categorical (partner, batch, dimension values). Dropdown only shows valid picks for the current chart type. Source of truth is the existing column registry in `src/lib/columns/`
- **Y-axis: numeric columns only** (percent, count, amount) — drawn from column-format metadata. No synthetic `count(categorical)` options in this phase
- **Stale column refs on load → visible warning banner on the chart**: something like "X-axis column `<name>` not available — using `<fallback>`", plus a fallback render so the chart still appears. This is stronger than Phase 35's silent migration fallback because the error is now user-visible state (a picked column was lost), not an infrastructure rewrap
- **Single-series only this phase** — group-by (CHRT-14) is explicitly deferred. No `groupBy` field on `ChartDefinition` yet; add later without breaking changes

### Preset save/load UX

- **Single `Presets ▾` dropdown** in the chart toolbar. Menu structure: built-ins at top (with lock/badge), user presets below, `Save current as preset…` at the bottom. Mirrors the shipped Saved Views UX
- **Save flow: modal prompt with a name field** (Save / Cancel). Simple and consistent with Saved Views
- **Built-ins are visibly distinct and read-only** — lock icon / badge, can't be renamed or deleted. Collection Curves is the one built-in preset required by CHRT-12; Claude may add others if a second naturally falls out of implementation, otherwise keep the catalog to one
- **Chart config persists per saved view** (CHRT-13) on `ViewSnapshot.chartState` using the `ChartDefinition` union from Phase 35. Presets are reusable shortcuts that apply a `ChartDefinition` — they are not the canonical storage of chart state

### Claude's Discretion

- Exact column-registry integration (how "numeric" / "categorical" / "time" is determined from existing format metadata)
- Rendering library choice for the 3 generic chart types (Recharts is already in the stack — default to it unless a concrete blocker appears)
- Type-specific render options: line interpolation, bar orientation/grouping, scatter point size — any sensible default, no user-facing toggle required this phase
- Empty state before X/Y are picked on a fresh generic chart (`EmptyState` pattern from Phase 29 is the obvious fit)
- Color palette for generic charts — reuse anomaly color language where it makes sense, neutral palette otherwise
- Preset storage location (localStorage key, keyed by user) — follow the pattern used by Saved Views
- Internal naming (`ChartBuilder`, `ChartToolbar`, `PresetMenu`, etc.)
- Tooltip / drill-through parity for scatter and bar — match collection-curve feel at Claude's discretion; full interaction parity is not a phase requirement

</decisions>

<specifics>
## Specific Ideas

- Builder toolbar should feel like the shipped `ToolbarGroup` pattern (Phase 29) — dense, iconic, one row
- Saved Views dropdown is the UX reference for the Presets dropdown — same menu structure, same modal-name flow
- Current `CollectionCurveChart` (src/components/charts/collection-curve-chart.tsx) defines the preset-specific control surface that must survive unchanged (metric toggle, solo mode, average line, batch visibility)
- Column registry in `src/lib/columns/` (notably `account-config.ts`) already carries format metadata — the X/Y eligibility filters should read from that, not hand-maintained lists
- The collection-curve preset rendering must be visually identical to today's output (CHRT-06) — anomaly colors, solo mode, batch visibility, average line
- `ChartDefinition` from Phase 35 is the storage type; this phase adds the `line`, `scatter`, `bar` variants to the union (preset variant already exists)

</specifics>

<deferred>
## Deferred Ideas

- **Group-by / multi-series charts** (CHRT-14) — not in v4.0; add a `groupBy` field to `ChartDefinition` variants when the feature lands
- **Dual Y-axis** (CHRT-15) — not in v4.0
- **Explicit edit-mode / confirm-discard flow** — rejected in favor of always-editable; revisit only if shared/read-only views become a thing
- **Synthetic `count(categorical)` Y-axis options** — useful for bar charts but adds picker complexity
- **Advanced type-specific render toggles** (smooth vs linear line, horizontal bar, scatter point sizing by column) — Claude picks defaults this phase; expose as controls only if demand surfaces
- **Shared / cross-view presets** — all presets scoped per-view via the built-in catalog; no user-level shared preset library
- **Partner-list filter field on `ChartDefinition`** (deferred from Phase 35) — still deferred; partner-list integration belongs on the view filter slice, not on the chart definition. Revisit when multi-series lands
- **Full interaction parity (drill-through + rich tooltips) for scatter and bar** — target feel-parity with collection curves at Claude's discretion; a dedicated parity pass can come later if needed

</deferred>

<roadmap_note>
## Roadmap Sync Needed

`.planning/ROADMAP.md` currently lists Phase 36 in the milestone summary but does not have a full `### Phase 36` detail section (same gap flagged in Phase 35's CONTEXT). `init phase-op 36` returned `phase_found: false`. Before `/gsd:plan-phase 36`, add the Phase 36 detail block (goal, depends-on, effort, requirements, success criteria) so init checks and downstream tooling resolve the phase cleanly. Source material: `.planning/milestones/v4.0-ROADMAP.md` lines 255–268.

</roadmap_note>

---

*Phase: 36-chart-builder*
*Context gathered: 2026-04-18*
