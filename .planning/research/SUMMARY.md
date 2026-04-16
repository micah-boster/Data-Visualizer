# Project Research Summary

**Project:** Bounce Data Visualizer v3.5 — Flexible Charts & Metabase Import
**Domain:** Analytics chart builder + BI tool migration for debt collection batch data
**Researched:** 2026-04-15
**Confidence:** MEDIUM-HIGH

## Executive Summary

v3.5 adds two loosely-coupled features to an existing, stable analytics app: a flexible chart builder that replaces the hardcoded collection curves chart with a configurable axis/type selector, and a Metabase import tool that translates MBQL JSON or native SQL into the app's view configuration system. Both features operate entirely on the existing client-side dataset (477 rows, 61 columns, already fetched via React Query) — no new API routes, no new infrastructure, and only one new dependency (`node-sql-parser`). The recommended approach is to build both features against the existing `COLUMN_CONFIGS` metadata layer, which already carries all the type information needed to drive axis pickers, formatters, and import field mapping.

The chart builder is lower-risk and higher-daily-value: Recharts 3.8.0 is already installed and contains every chart component needed (BarChart, ScatterChart, ComposedChart). The main complexity is a clean type migration — replacing the current `ChartViewState` (hardcoded to collection curve semantics) with a new `ChartDefinition` type, while keeping the existing `CollectionCurveChart` component intact as a preset. The collection curve chart has 300+ lines of specialized domain logic (batch-age truncation, anomaly coloring, recovery rate calculation) that must not be generalized away. A discriminated union + migration layer on the Zod schema protects the 3 default saved views and any user-created views from breakage.

Metabase import is higher-complexity and lower-frequency-of-use (a migration tool, not a daily feature). The key risk is scope creep on MBQL parsing — MBQL uses instance-specific integer field IDs, is acknowledged as "(Incomplete)" in Metabase's own documentation, and gets complex fast. The recommendation is to treat SQL import as the primary path (Metabase exposes SQL for every question via "View the SQL") and MBQL as a secondary structured alternative with a hard-scoped subset. Neither path executes queries against Snowflake — the importer produces `ChartDefinition` + filter objects applied to the already-fetched dataset, reusing the existing saved views infrastructure entirely.

## Key Findings

### Recommended Stack

The existing stack handles everything in v3.5 except SQL parsing. Recharts 3.8.0 (already installed) ships `BarChart`, `ScatterChart`, and `ComposedChart` — confirmed present in `node_modules`. MBQL is just JSON and needs no library; `JSON.parse()` + Zod validation is the complete parser. The only new dependency is `node-sql-parser ^5.4.0` for Metabase native SQL import, which provides a Snowflake-dialect AST. No environment variables, infrastructure, or services are added.

**Core technologies:**
- `recharts ^3.8.0` (existing): BarChart, ScatterChart, ComposedChart for flexible chart types — already integrated with shadcn ChartContainer, no new bundle cost
- `zod ^4.3.6` (existing): MBQL schema validation + ChartDefinition/ViewSnapshot schema — discriminated union with `.transform()` for backward-compat migration
- `node-sql-parser ^5.4.0` (NEW): Snowflake-dialect SQL parsing into traversable AST — 1.2M+ weekly npm downloads, actively maintained, covers the standard SELECT/WHERE/GROUP BY that Metabase generates
- MBQL parsing: custom Zod-validated JSON parser, no npm library (none exist; MBQL is just JSON with known structure)

### Expected Features

**Must have (table stakes):**
- X-axis column selector — filtered by `ColumnConfig.type` (text for categorical, numeric/date for continuous); defaults to BATCH_AGE_IN_MONTHS
- Y-axis column selector (single + multi) — numeric types only (currency, percentage, count, number); dual Y-axis when mixing unit types
- Chart type toggle: line, bar, scatter — each maps to a different Recharts component tree
- Group-by / color-by dimension — splits data into series by categorical column (PARTNER_NAME, ACCOUNT_TYPE, BATCH)
- Collection curves as a preset — one-click to restore existing behavior; fully editable after loading; must preserve anomaly coloring, batch toggles, average line
- Axis formatting from column type — reuse existing `getFormatter()` from `src/lib/formatting/`
- Chart state persistence in views — extend `ChartDefinition` into `ViewSnapshot` with backward-compat migration
- Metabase SQL import — paste SQL, extract columns/filters/sorts, preview, apply as view config
- Translation preview UI — show matched columns (green), skipped columns (yellow), confirm before applying
- Apply import as view configuration — produces a standard `ViewSnapshot`, saveable via existing system

**Should have (differentiators):**
- User-saveable chart presets alongside the built-in collection curves preset
- Smart column suggestions in axis pickers (surface related columns first based on X selection)
- Inline trend/reference lines (Recharts `<ReferenceLine>`, extends existing "Show Average" pattern)
- Chart export to PNG/SVG for stakeholder sharing
- Metabase MBQL JSON import (secondary path, limited subset: source-table, aggregation, breakout, filter, order-by, limit)
- Saved import mappings (store source query with view for audit trail)

**Defer (v2+):**
- Dashboard grid with multiple simultaneous charts — explicit v4 scope
- Metabase question URL import (requires Metabase API credentials on server)
- Bi-directional Metabase sync — one-way import only is correct scope
- Drag-and-drop chart builder (Tableau-style) — overkill for 2-3 users
- MBQL 5 support — target MBQL 4 (legacy) only via `?legacy-mbql=true` API param

### Architecture Approach

Both features share a single integration surface: the `COLUMN_CONFIGS` metadata layer (61 columns with key, label, type). A new `ChartDefinition` type replaces `ChartViewState` as the serializable chart config that flows through the entire system — produced by `ChartBuilder`, consumed by `UnifiedChart`, persisted in `ViewSnapshot`, and output by `MetabaseImporter`. The collection curve chart (`CollectionCurveChart` + `useCurveChartState`) is kept intact as a preset rendered when `ChartDefinition.preset === 'collection-curves'`, preventing loss of specialized domain logic. The Metabase importer is client-side-only: it parses MBQL or SQL into a `MetabaseQuery` intermediate representation, maps fields to `COLUMN_CONFIGS` keys, and outputs `ChartDefinition` + filter objects — no new API endpoints.

**Major components:**
1. `ChartDefinition` (type in `src/lib/charts/types.ts`) — serializable chart config; single source of truth flowing from builder to renderer to saved views
2. `UnifiedChart` (`src/components/charts/unified-chart.tsx`) — renders LineChart/BarChart/ScatterChart based on ChartDefinition; delegates to existing CollectionCurveChart for the preset
3. `ChartBuilder` (`src/components/charts/chart-builder.tsx`) — axis/type picker UI, populated from COLUMN_CONFIGS, outputs ChartDefinition
4. `pivot-generic.ts` (`src/lib/charts/`) — generic data pivot (groupBy, multi-Y, categorical X) replacing collection-curve-specific pivot
5. `MetabaseImporter` (`src/components/import/metabase-importer.tsx`) — dialog with MBQL/SQL tabs, preview panel, apply action
6. `mbql-translator.ts` + `sql-extractor.ts` (`src/lib/metabase/`) — pure functions producing `MetabaseQuery` intermediate repr; no I/O, fully testable
7. `migrate-chart-state.ts` (`src/lib/views/`) — converts old ChartViewState to ChartDefinition for backward compat on localStorage parse

### Critical Pitfalls

1. **ChartViewState schema break destroys saved views** — The existing Zod schema uses `z.enum(['recoveryRate', 'amount'])` for metric. Any shape change without migration silently drops all 3 default views and any user custom views. Prevention: discriminated union (`{ type: 'curves', ...old } | { type: 'custom', ...new }`) with `.transform()` migration, implemented before any new chart state is persisted.

2. **MBQL parser scope creep** — MBQL uses instance-specific integer field IDs, has acknowledged documentation gaps, and includes foreign key traversals, datetime bucketing, and nested source-queries that map to nothing in the app's schema. Prevention: hard-scope the supported subset (source-table, basic filters, simple aggregations, breakout, order-by, limit); reject `source-query`, `expressions`, `joins`, `binning-strategy` with clear errors; treat SQL import as primary path.

3. **Axis selection without type guards produces nonsense charts** — User picks PARTNER_NAME (text) for Y-axis and gets a blank chart, or mixes TOTAL_AMOUNT_PLACED ($millions) with PENETRATION_RATE (0-1) on the same axis. Prevention: filter axis options by `ColumnConfig.type` before rendering dropdowns; auto-create dual Y-axis for mixed unit types; scatter requires numeric on both axes.

4. **Collection curve regression** — The existing chart has 300+ lines of specialized behavior: batch-age X-axis truncation, anomaly coloring via `getAnomalyLineColor`, recovery rate toggle, per-batch legend with visibility, view snapshot/restore. Generalizing this away loses functionality silently. Prevention: keep `CollectionCurveChart` and `useCurveChartState` entirely intact; the chart area switches between them and `UnifiedChart` based on preset field.

5. **Metabase SQL execution security** — Imported SQL could reference any Snowflake table, include DDL, or bypass the ALLOWED_COLUMNS set. Prevention: never pass through raw SQL; parse to extract columns/filters/sorts; validate source table against allowlist; validate columns against `ALLOWED_COLUMNS`; apply as view config only, never execute.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Chart Schema Foundation
**Rationale:** Pitfall #1 (saved view corruption) must be resolved before any chart state changes reach production. This is a type/schema change with no visible UI, but it gates everything else. Getting the migration layer right first means Phases 2-4 can iterate freely on chart state without breaking localStorage.
**Delivers:** `ChartDefinition` type, Zod union + migration in `viewSnapshotSchema`, `migrateChartViewState()` function, updated `getDefaultViews()`. All existing saved views continue to load correctly after this phase.
**Addresses:** CB-TS-7 (view persistence foundation), backward compat for all future phases
**Avoids:** Pitfall #1 (ChartViewState schema break)

### Phase 2: Generic Chart Renderer
**Rationale:** Build the rendering layer before the builder UI so the builder has a real renderer to develop against. `pivot-generic.ts` and `UnifiedChart` can be validated with hardcoded `ChartDefinition` objects before any picker UI exists.
**Delivers:** `pivot-generic.ts`, `UnifiedChart` (line/bar/scatter rendering), `use-chart-state.ts`, `format-axis.ts`, `presets.ts`. Collection curves preset verified to produce identical output to the existing chart.
**Uses:** Recharts 3.8.0 BarChart, ScatterChart, ComposedChart — no new install needed
**Implements:** UnifiedChart component, generic pivot, ChartDefinition as renderer contract
**Avoids:** Pitfall #5 (curve regression — preset verified before new features added), Pitfall #9 (component-swap-per-chart-type handled by ChartRenderer switch)

### Phase 3: Chart Builder UI + View Integration
**Rationale:** Builder UI depends on a working renderer (Phase 2) and a stable type system (Phase 1). View integration (wiring `ChartDefinition` into `data-display.tsx` and the sidebar) is the last chart step because it touches the most central files.
**Delivers:** `ChartBuilder` component with type/axis/groupby pickers, collection curves preset button, conditional chart rendering in `data-display.tsx`, full save/restore of custom chart configs via existing view system.
**Addresses:** CB-TS-1 (X-axis), CB-TS-2 (Y-axis), CB-TS-3 (chart type), CB-TS-4 (group-by), CB-TS-5 (collection curves preset), CB-TS-6 (axis formatting), CB-TS-7 (view persistence wired up)
**Avoids:** Pitfall #3 (axis type guards built into picker from the start), Pitfall #11 (dynamic imports for SSR)

### Phase 4: Metabase SQL Import
**Rationale:** SQL import is the primary Metabase import path — higher value, simpler implementation, universal format — and is independent of the chart builder except for the `ChartDefinition` types stabilized in Phase 1. Building SQL first validates the import pipeline before tackling MBQL's additional complexity.
**Delivers:** `sql-extractor.ts`, `field-mapper.ts`, `MetabaseImporter` dialog (SQL tab), translation preview UI, apply-as-view-config action, sidebar entry.
**Uses:** `node-sql-parser ^5.4.0` (only new dependency in the entire milestone)
**Implements:** MetabaseImporter component, sql-extractor lib, field-mapper lib
**Addresses:** MI-TS-2 (SQL import), MI-TS-3 (preview), MI-TS-4 (apply as view)
**Avoids:** Pitfall #6 (SQL execution security — parse only, reconstruct or apply as view config, never pass-through), Pitfall #7 (percentage normalization in filter translation)

### Phase 5: Metabase MBQL Import
**Rationale:** MBQL is additive on top of a working import pipeline. Building it last means the dialog chrome, preview UI, and apply logic already exist from Phase 4 — only the translator is new. The risk profile is well-understood by this point and the hard scope limit can be enforced from the start.
**Delivers:** `mbql-translator.ts`, `metabase/types.ts`, MBQL tab in MetabaseImporter dialog, field-ID mapping UI (interactive user resolution for integer field references).
**Addresses:** MI-TS-1 (MBQL import)
**Avoids:** Pitfall #2 (scope creep — supported subset defined before writing translator), Pitfall #10 (field IDs unresolvable — interactive mapping UI with per-instance save)

### Phase Ordering Rationale

- Schema migration first (Phase 1) because it is the critical-path gate. Every subsequent phase writes chart state to localStorage; the migration layer must exist before any of that state is persisted.
- Renderer before builder (Phase 2 before 3) because the builder needs a live preview target. Developing the builder against a mock leads to integration surprises late.
- Chart builder before Metabase import (Phases 2-3 before 4-5) because the chart builder has daily-use value immediately, while import is an occasional migration tool. `ChartDefinition` (produced by the builder) is also the output target for the importer — the type must stabilize first.
- SQL import before MBQL import (Phase 4 before 5) because SQL is simpler, better documented, and the primary path Metabase users actually use. MBQL adds complexity on top of a proven pipeline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (MBQL Import):** MBQL documentation is acknowledged incomplete. Before writing `mbql-translator.ts`, validate the exact field reference format for MBQL 4 (`?legacy-mbql=true`) against a real Metabase export from Bounce's instance if possible. The supported subset is documented but filter clause nesting edge cases may surface.
- **Phase 3 (Chart Builder — dual Y-axis):** Recharts dual Y-axis with `yAxisId` and mixed formatters needs hands-on verification. Its interaction with the shadcn `ChartContainer` wrapper under React 19 is unverified in research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema Migration):** Zod discriminated union + transform is a well-established pattern. The migration function is straightforward field mapping from known old shape to known new shape.
- **Phase 2 (Generic Renderer):** Recharts BarChart, ScatterChart, ComposedChart have extensive examples and are already running in production. No novel patterns.
- **Phase 4 (SQL Import):** `node-sql-parser` has extensive documentation and Metabase-generated SQL uses standard SELECT/WHERE/GROUP BY/ORDER BY. Low uncertainty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only new dependency (`node-sql-parser`) is well-documented with 1.2M+ weekly downloads and Snowflake dialect confirmed. All chart components verified present in node_modules via filesystem inspection. |
| Features | MEDIUM-HIGH | Chart builder patterns are well-established. Metabase import is niche but feasible given known MBQL schema and SQL-first approach. |
| Architecture | HIGH | Based on direct codebase analysis of all integration points — actual file contents read and cross-referenced, not inferred. |
| Pitfalls | HIGH | Derived from both codebase inspection and documented Metabase community pain points. Schema migration pitfall verified by reading actual Zod schemas in `src/lib/views/schema.ts`. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **MBQL 4 field reference format in practice:** The interactive mapping UI approach is sound in theory but untested against a real Bounce Metabase export. During Phase 5 planning, validate what a real `?legacy-mbql=true` export looks like before committing to the mapping UI design.
- **node-sql-parser Snowflake dialect depth:** Confirmed for standard SELECT/WHERE/GROUP BY, but Snowflake-specific syntax (QUALIFY, LATERAL FLATTEN, window functions) is unverified. Low risk for Metabase-generated SQL; flag for any user-pasted SQL from outside Metabase.
- **Dual Y-axis with shadcn ChartContainer:** Recharts `yAxisId` dual-axis support is documented but its interaction with the shadcn wrapper's CSS variable theming is unverified. Needs a quick proof-of-concept in Phase 2 or early Phase 3.
- **`node-sql-parser` AST shape for Snowflake dialect:** The exact AST structure for Snowflake-flavored queries needs verification during Phase 4 implementation to ensure the extractor maps correctly to `MetabaseQuery` filter and aggregation fields.

## Sources

### Primary (HIGH confidence)
- Codebase filesystem inspection — `node_modules/recharts/lib/chart/{BarChart,ScatterChart,ComposedChart}.js` confirmed present; `src/lib/views/schema.ts`, `src/lib/views/types.ts`, `src/lib/columns/config.ts`, `src/components/charts/collection-curve-chart.tsx`, `src/components/charts/use-curve-chart-state.ts` all read directly
- [Recharts examples gallery](https://recharts.github.io/en-US/examples/) — scatter, bar, composed chart examples
- [MBQL Reference — Metabase GitHub Wiki](https://github.com/metabase/metabase/wiki/(Incomplete)-MBQL-Reference) — aggregation types, filter clauses, field references

### Secondary (MEDIUM confidence)
- [node-sql-parser GitHub](https://github.com/taozhi8833998/node-sql-parser) — Snowflake dialect support, AST structure, 1.2M+ weekly downloads
- [Metabase API Documentation](https://www.metabase.com/docs/latest/api) — Card endpoints, dataset_query structure, MBQL 4 vs 5 via legacy param
- [Metabase native query format discussion](https://discourse.metabase.com/t/native-sql-query-question-json-data-get/9329) — native SQL query JSON structure

### Tertiary (LOW confidence)
- [MBQL to SQL translation discussion](https://discourse.metabase.com/t/mbql-sql-translation/11752) — community confirmation of MBQL complexity and field ID opacity
- [MBQL document structure issue](https://github.com/metabase/metabase/issues/2457) — Metabase acknowledges documentation gaps; confirms integer field IDs are instance-specific

---
*Research completed: 2026-04-15*
*Ready for roadmap: yes*
