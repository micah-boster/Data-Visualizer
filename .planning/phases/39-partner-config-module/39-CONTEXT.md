# Phase 39: Partner Config Module - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce `(PARTNER_NAME, ACCOUNT_TYPE)` as the canonical unit of analysis everywhere in the app — no cross-product blending for a single partner, ever, blocked at the selection layer. Add a per-pair editable segment list (sub-cohorts like English/Spanish, Bank A/B) persisted in localStorage, with a Partner Setup UI to manage segments (product type stays data-derived and read-only). Extend `PartnerListFilters` with `PRODUCT_TYPE` and `SEGMENT` attribute filters, and give charts/KPIs an optional segment-split dimension.

Scope is the structural plumbing: sidebar restructure, selection-state rewrite, segment config schema/storage, Setup UI, filter/list extension, and segment-aware chart/KPI computation. Snowflake-backed config, bulk config import, and segment-aware projections are explicitly out of scope (deferred to PCFG-08/-09 and Phase 40/49 respectively).

</domain>

<decisions>
## Implementation Decisions

### Segment data binding
- A segment is a **column + value(s) rule**: `{ name, column, values[] }`. Each segment filters to rows where `column IN (values)`.
- Source columns are **existing columns in the data** (e.g., in `FILE` or `ACCOUNT_COHORT` or similar) — no upstream Snowflake ingestion work is assumed. Researcher must probe the actual schema to enumerate which columns are viable segmenting attributes across partners.
- Stored shape (localStorage): `{ name: string, column: string, values: string[] }` per segment, keyed by `(partner, product)` pair.
- Segments for a pair **must partition** the pair's data — mutually exclusive value-sets. Any rows not covered by any configured segment fall into an auto-generated read-only **"Other"** segment (computed at query time, not stored).
- Segment-split totals must equal the pair rollup total — this is the "apples-and-oranges" invariant applied at segment granularity.

### Sidebar split display
- Multi-product partners render as **flat, peer rows with suffixed names**: "Happy Money — 1st Party", "Happy Money — 3rd Party". No parent/child tree, no badge-only label.
- Single-product partners stay **visually unchanged** (name only, no suffix). Product type is revealed on hover via tooltip for consistency.
- There is **no partner-level click target** for multi-product partners — selection is always of a specific pair. This enforces "no cross-product blending" by construction at the sidebar.
- Within a multi-product partner, pairs appear in a **stable product-type order** (canonical ordering across the app — e.g., 1st Party → 3rd Party → Personal → others alphabetical). Order is deterministic, not data-volume-driven.

### Setup UI pattern
- Setup opens in a **right-side slide-over panel**, reachable from the sidebar partner context menu ("Configure segments"). Main view stays visible behind it.
- Editor is a **table with inline-edit rows**: `name | column (dropdown) | values (multi-select) | drag handle | delete`. "Add segment" button at bottom. The **"Other" bucket renders as a locked read-only row** at the end, showing live-computed row-count / coverage against current data scope.
- Edits are **staged**, not autosaved. **Explicit Save commits** to localStorage and re-renders the app; **Cancel discards**. No per-row save.
- Validation:
  - **Block save** on: duplicate segment names (including reserved name "Other"), empty rules, missing column or values.
  - **Warn (but allow force-save)** on: value-set overlap between segments (violates partition invariant) — surface a banner with overlap rows and coverage counts so user can resolve consciously.
- Product type appears as a read-only field at the top of the panel — labelled as data-derived.

### Segment split activation
- Split-by-segment is a **per-view toggle** — each chart and the KPI card block has its own control. A chart can be split while KPIs stay rolled-up, and vice versa. Toggle is **only visible** when the active pair has segments configured.
- **Default view** on selecting a pair is **rolled-up** (pair-level), regardless of whether segments exist. Split is opt-in per interaction.
- In **multi-pair (cross-partner) views**, segment split applies **within each pair independently** — pairs with segments render their segments as series, pairs without segments render as a single rolled-up series. The app does **not** attempt to cross-partner-blend segments.
- In **Chart Builder** (Phase 36), "Segment" becomes a first-class choice in the existing split-by dropdown. It's only enabled when the scoped pair(s) have segments configured. Reuses Chart Builder's existing split-by plumbing — the computation layer resolves "Segment" to each pair's configured `{column, values[]}` rules at query-assembly time.

### Claude's Discretion
- Exact visual treatment of the split sidebar (indentation, chevron/separator style, suffix typography).
- Tooltip visual on single-product rows (delay, placement).
- Slide-over panel width, entrance animation, header layout, whether it pushes content vs overlays.
- Drag-handle interaction details for segment reordering.
- Visual design of the "Other" bucket row (muted? badge?).
- Exact copy for warning banners and validation messages.
- KPI split-view layout (grouped columns? stacked rows? legend placement?).
- Series color assignment for segments (palette, order).
- Whether the per-view toggle is a switch, segmented control, dropdown, or chip — pick what fits the existing control language.

</decisions>

<specifics>
## Specific Ideas

- "Happy Money" is the canonical multi-product example (1st Party vs 3rd Party). Treat it as the test case for every sidebar/selection/filter decision.
- "Snap — Personal" with English/Spanish sub-cohorts is the canonical segment example. The research should confirm whether a language column exists on the Snap data today.
- The read-only "Other" bucket needs to be legible at a glance — the user wants to see immediately when their configured segments don't cover everything. Row-count visible without opening a tooltip.
- Partner context menu is the entry point for Setup — keep it discoverable without adding a separate top-level nav item.
- The enforced-splitting rule (PCFG-04) is a correctness feature, not a UX preference. Research should audit every place the app currently groups by `PARTNER_NAME` alone and list them as mandatory migration sites.

</specifics>

<deferred>
## Deferred Ideas

- **Snowflake-backed partner config storage with change history** — PCFG-08, v4.2+. Ship localStorage first; revisit once daily-use shape is stable.
- **Bulk segment config import (CSV/Excel)** — PCFG-09, v4.2+.
- **Segment-aware projections** — Phase 40 PRJ-05 (dependent on this phase landing).
- **Free-form SQL predicate segments** — rejected; column+value covers the v1 use cases and keeps the stored shape safe.
- **Manual tag-assignment segments** (user taggings rows individually) — rejected; out of scope for a rule-based config.
- **Global page-level split toggle** — rejected in favor of per-view toggles; revisit if users ask for "split everything at once."
- **Split + cross-partner segment blending** (flatten all segments from all partners into one legend) — rejected; stays within per-pair scope.

</deferred>

---

*Phase: 39-partner-config-module*
*Context gathered: 2026-04-24*
