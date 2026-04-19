# Phase 37: Metabase SQL Import - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users paste Metabase-exported SQL into an import dialog, see a preview of how it maps to the app's view configuration (columns, filters, sort, chart), and apply it as a ViewSnapshot on the existing loaded dataset. The SQL is **never executed against Snowflake** — parsing extracts intent only. Column references are constrained to the existing allow-list (`COLUMN_CONFIGS`), preventing injection by construction.

**Scope anchor from roadmap** (Phase 37 success criteria, META-01..05):
1. Paste Metabase SQL in an import dialog accessible from the sidebar.
2. Preview matched columns, skipped columns, extracted filters, sort order.
3. Apply creates a ViewSnapshot with correct table columns, filters, and chart config.
4. Allow-list enforcement — no SQL injection, no references outside `COLUMN_CONFIGS`.

**Explicitly out of scope** (deferred to v4.5+ per v4.0-REQUIREMENTS):
- META-06: MBQL JSON import
- META-07: Interactive field-ID mapper for Metabase numeric IDs
- URL-based import (requires Metabase API creds)
- Fuzzy column matching
- Executing imported SQL against Snowflake
- Dashboard import / bi-directional sync

</domain>

<decisions>
## Implementation Decisions

### Dialog & paste flow
- Entry point: dedicated sidebar button with an import icon (Lucide `Database` or `FileInput`) and visible label "Import from Metabase" — discoverability matters even though the tool is used occasionally.
- Dialog shape: right-side Sheet (~60% viewport width), keeps the current table/chart visible behind it for context. Uses the app's existing Sheet component (shadcn).
- Layout: two-step wizard — Step 1 is the SQL paste area with a Parse button; Step 2 is the preview with Back / Apply actions.
- Preview trigger: explicit Parse button. No auto-parse on paste, no live parsing on keystroke. Avoids flickering error/success states and pairs naturally with the wizard.

### Preview presentation
- Structure: sectioned by category — **Columns / Filters / Sort / Chart** — each section lists matched and skipped items.
- Signaling: color + icon per row (green check = matched, amber warning = skipped, red x = error). Icon + label together — color is never the only signal (accessibility).
- Skipped item detail: name + one-line reason (e.g., `total_collected — column not in schema`, `WHERE status = 'active' — unsupported operator`). One line per item; no expandable panels.
- Chart preview: text description only (e.g., `Line chart — X: batch_month, Y: recovery_rate`). No mini-chart rendering. User tweaks the chart in the chart builder after Apply.

### Apply outcome
- Apply target: replaces the current view as an **unsaved working view** in-memory. User saves it via the existing Saved Views flow if they want to keep it. Keeps Import and Save as separate, composable concepts.
- Drill context: **resets to root** on Apply. Any active partner/batch drill is cleared — imported SQL implies a fresh top-level view.
- Original SQL retained: yes — extend `ViewSnapshot` with an optional `sourceQuery` field (SQL string + import timestamp). Research reference: MI-D-2. Creates an audit trail ("this view came from Metabase SQL, imported on X") and paves the way for future re-sync features.
- Post-apply: Sheet auto-closes. Toast shows a summary (e.g., `View imported — 8 columns, 3 filters, 2 skipped`) with an Undo action that restores the previous view state.

### Edge case policy
- Unknown columns: **silent skip**, listed in the preview under the relevant section with reason `column not in schema`. No fuzzy matching (explicitly deferred per META-07).
- Unsupported SQL constructs (JOINs, subqueries, CTEs, aggregations, GROUP BY, window functions): **partial import with warnings**. Parse what maps to `ViewSnapshot` (SELECT / WHERE / ORDER BY on the known primary table), skip the rest, list each skipped construct in the preview with a one-line reason. User can still Apply the partial result. Aligns with research's "80% case" guidance.
- Filter translation fidelity: **exact matches only**. Translate `column = value`, `column IN (...)`, `column BETWEEN x AND y`, `column IS NULL`. Skip relative dates (`NOW() - INTERVAL 30 DAY`), nested OR/AND beyond one level, CASE expressions — each listed with a reason. Scope-matches what the app's filter schema already supports; complex filter translation deferred.
- Parse errors: error card replaces the preview area on Step 2 — clear message, SQL snippet with line/column if the parser provides them, "Back to edit" button. Sheet stays open. No modal alerts, no data loss, easy to iterate.

### Claude's Discretion
- Specific SQL parser library choice — research phase should evaluate `node-sql-parser` (flagged in `FEATURES.md`: 1M+ weekly downloads, Snowflake dialect support) vs a regex-based approach for the supported subset. Decision lands in research/planning.
- Exact Lucide icon for the sidebar button (`Database`, `FileInput`, `Import`, or similar).
- Chart type inference heuristic from SQL (e.g., `GROUP BY` → bar, date column on X → line, two numeric columns → scatter). Default rules to be proposed during planning; user said chart config will be tweaked in the builder post-apply, so this is low-risk.
- Axis inference rules (which column becomes X, which becomes Y).
- Toast duration + exact Undo window.
- Sheet width breakpoints for smaller viewports.
- Keyboard shortcut (if any) to trigger Import from anywhere.
- Behavior if the user has unsaved changes on the current view at Apply time — likely a lightweight confirm prompt, but defer to planning.

</decisions>

<specifics>
## Specific Ideas

- **Audit trail via `sourceQuery`**: storing the original SQL alongside the ViewSnapshot is the key differentiator for this phase. Without it, imported views become indistinguishable from hand-built ones; with it, users can answer "where did this come from?" and re-import when the Metabase query evolves.
- **Trust-building preview**: the preview is not cosmetic — it's the mechanism that makes import feel safe. Green/amber color coding, one-line reasons for every skipped item, and section-by-section grouping all exist to let the user audit the translation in under 10 seconds before committing.
- **Research-guided parser choice**: `FEATURES.md` already recommends `node-sql-parser` over a regex-only approach for the SQL subset. Research should confirm this still holds and evaluate Snowflake dialect quirks against the app's column schema.
- **80% case bias**: migration tool, not daily driver. Partial imports with clear skip reasons are strictly better than hard failures — the team using this will fix up the remaining 20% manually in the UI.
- **Migration tool, not sync partner**: one-way import only. No writing back to Metabase, no URL-based fetch (deferred), no scheduled re-sync.

</specifics>

<deferred>
## Deferred Ideas

- **MBQL JSON import (META-06)**: explicitly deferred to v4.5+. SQL import lands first because SQL is universal and covers Metabase "native queries" — the higher-value path per research's prioritization.
- **Field-ID mapper (META-07)**: interactive UI for resolving Metabase numeric field IDs to column names. Only needed once MBQL import ships. Deferred with META-06.
- **Metabase URL import (MI-D-1)**: paste a Metabase question URL, app fetches the query via Metabase API. Requires `METABASE_URL` + `METABASE_API_KEY` env vars and network access. Stretch goal; not needed for Phase 37.
- **Fuzzy column matching (MI-D-3)**: suggest close matches when a SQL column name doesn't exactly match `COLUMN_CONFIGS`. Only worth building if the team reports column-mismatch friction in practice.
- **Best-effort complex filter translation**: relative dates, nested OR/AND, CASE expressions. Could come later if exact-match translation proves too restrictive.
- **Side-by-side "current vs imported" preview**: diff-style preview against the active view. Interesting but much more UI; current sectioned preview is sufficient for the import use case.
- **Export current view as SQL**: the inverse operation. Would make the tool bidirectional in a read-only sense. Not in Phase 37 scope.
- **Mini live-chart preview**: rendering an actual small chart in the preview before Apply. Rejected for Phase 37 in favor of a text description; could revisit if users report the text preview doesn't build enough trust.

</deferred>

---

*Phase: 37-metabase-sql-import*
*Context gathered: 2026-04-19*
