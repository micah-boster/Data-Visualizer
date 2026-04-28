# Phase 44: Vocabulary Lock & Glossary - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the canonical domain vocabulary in code and in-product before v5.0 introduces 5 new terms (Scorecard, Target, Triangulation, Reconciliation, Divergence) on top of the 12 existing unowned ones (Partner, Product, Batch, Account, Metric, Curve, Anomaly, Norm, List, View, Preset, Percentile). Ship a glossary doc, a `TERMS` registry, a `<Term>` component, resolve the List/View/Workspace conceptual collision, and surface REVENUE_MODEL as a product dimension.

**Sequencing:** Phase 44a ships VOC-01..04 (glossary, registry, `<Term>`, List/View ADR) immediately — not blocked. Phase 44b (split out of this phase) ships VOC-05..07 (REVENUE_MODEL surfacing) once ETL lands `REVENUE_MODEL` on `agg_batch_performance_summary` (~2026-05-03).

</domain>

<decisions>
## Implementation Decisions

### List vs View vs Workspace resolution (VOC-04)
- **View-contains-List explicit hierarchy.** Keep both terms; make the relationship a signposted hierarchy. A View is a UI snapshot (columns, sort, filters, drill scope); a List is a data filter on partners/products/batches that a View contains. ADR documents this choice.
- **Sidebar layout:** Views appear as top-level entries; expanding a View reveals the List(s) it contains. Reinforces the hierarchy visually instead of putting both at the same level with no signpost.
- **No "Workspace" rename.** Today's mental model is preserved; only the relationship is made explicit. Lower churn than a full Workspace merge.

### TERMS registry and rename policy (VOC-02)
- **All terms flexible by design.** The `TERMS` registry at `src/lib/vocabulary.ts` is the rename point. Lock the *concept*, not the *label* — renaming "Metric" → "KPI" (or any other label change) is a one-line edit in the registry. No ADR required for label changes.
- **Per-term metadata shape:** `{ label, definition, synonyms, seeAlso }`. `synonyms` supports informal name lookups (e.g. "curve" / "collection curve" / "recovery curve" → one entry). `seeAlso` powers cross-references between related terms in `<Term>` popovers (e.g. Norm → Anomaly, Curve → Modeled rate).
- **Coverage scope:** All 12 existing terms locked in v4.5 — Partner, Product, Batch, Account, Metric, Curve, Anomaly, Norm, List, View, Preset, Percentile. v5.0 phases extend the registry with their 5 new terms as part of their plan deliverable.

### `<Term>` component UX (VOC-03)
- **Visual treatment:** Subtle dotted underline on hover/focus only — no visual treatment at rest. Term reads as plain text in the UI; the underline is the discoverability cue. Standard pattern from Notion / Linear.
- **Interaction:** Hover popover with click-to-pin. Hovering shows the definition with a short delay; clicking pins the popover open so the user can read while continuing to interact elsewhere. Pinned popover dismisses on Esc or click-outside. Mobile: tap-to-pin (no hover state).
- **Application scope:** First instance per surface, every surface. The first time a term appears on a screen (KPI card label, table header row, breadcrumb segment, sidebar section), it gets `<Term>`. Subsequent repeats on the same surface are plain text. Balances discoverability with visual quiet.

### REVENUE_MODEL surfacing (VOC-05/06/07 — Phase 44b)
- **Scope decision:** REVENUE_MODEL joins the unit-of-analysis as a third dimension. Unit becomes `(partner, product, revenue_model)`. KPIs, curves, and anomaly detection treat Contingency and Debt Sale as different scopes — they never blend. Honors the apples-and-oranges rule (Contingency vs Debt Sale have different economics; mixing them in aggregations corrupts the numbers).
- **Sidebar label format:** Inline suffix — e.g. "Happy Money 3P-Contingency", "Happy Money 3P-DebtSale". Continues the existing pair-label convention; one row per `(partner, product, revenue_model)` combo. Compact, scannable, sortable.
- **Mixed-model batch handler:** The 1/550 batch with mixed revenue models (data-quality outlier from the 549/550 audit) displays under the dominant model with a small warning chip on the batch row. Tooltip on the chip explains the data-quality issue.
- **Phase split:** VOC-05/06/07 ship as a separate **Phase 44b** once ETL adds `REVENUE_MODEL` to `agg_batch_performance_summary`. Phase 44 (this phase) ships VOC-01..04 immediately; cleaner phase boundaries than holding the whole phase open until ETL completes.

### Glossary tone & structure (VOC-01)
- **Audience:** New analyst joining the team, zero domain context. Definitions explain debt-collection terms, Bounce-specific concepts, and computed terms in plain English. Anyone fluent skims past. Doubles as onboarding material.
- **Structure:** Grouped by domain area, alphabetical within each group. Sections: Partners & Products, Batches & Accounts, Metrics & Curves, Detection & Norms, UI Concepts. Helps a new reader build the conceptual map area-by-area instead of memorizing an A-Z list.
- **Entry depth:** Paragraph-length entries — definition + nuance + edge cases for each term. Heavier than the spec's one-sentence default; chosen because the project carries non-trivial domain nuance (apples-and-oranges, cascade tiers, modeled vs actual, censoring on young batches) that one-sentence definitions can't carry without losing meaning. The `TERMS` registry still holds the one-sentence form (the registry is what `<Term>` popovers surface; the glossary is the deeper read).
- **Derived terms marking:** Same section as their primary terms, with an italicized "Derived" tag. Modeled rate, Delta vs modeled, Cascade tier, Anomaly score live next to the primary terms they derive from (in Metrics & Curves and Detection & Norms), not in a separate computed-terms section.

### Claude's Discretion
- ADR filename / directory / format (likely `docs/adr/` or similar — researcher to verify what convention exists)
- `<Term>` popover layout, motion timing, ARIA semantics (follow existing tooltip / popover primitives)
- Exact sidebar markup for nested Views → Lists (follow existing sidebar component patterns)
- Migration handling for existing saved Lists / Views into the nested structure (researcher to assess scope)
- Glossary file format details (Markdown structure, anchor links, table of contents)

</decisions>

<specifics>
## Specific Ideas

- **`<Term>` reference:** Notion / Linear's in-product glossary tooltips — subtle, discoverable, never noisy.
- **Apples-and-oranges rule (project vision):** The unit of analysis is `(partner, product)` today and becomes `(partner, product, revenue_model)` once REVENUE_MODEL lands. KPIs and curves never blend incompatible units. This is load-bearing for the REVENUE_MODEL third-dimension decision.
- **Glossary as onboarding:** The glossary doubles as the first thing a new analyst reads — write so it lands cold, not as a reference for someone already fluent.
- **TERMS registry as rename point:** When future-you wants to rename "Metric" → "KPI" (or whatever else surfaces), the registry is the single edit point. The doc captures concepts; the registry captures labels.

</specifics>

<deferred>
## Deferred Ideas

- **Sidebar IA reorganization** (Workspaces / Partners / Tools restructure) — explicitly deferred per v4.5-REQUIREMENTS line 88 to post-v5.0 (depends on VOC-04 resolution + v5.0 surface count).
- **Term renames themselves** (e.g. "Metric" → "KPI") — out of scope for Phase 44. The phase ships the registry that makes renames cheap; choosing which renames to do is a separate decision.
- **i18n / localization hooks in TERMS** — not in scope; English-only product. Registry shape doesn't preclude future i18n.
- **Tracking / analytics on `<Term>` hovers** — could inform which terms users find unclear; punted for now.

</deferred>

---

*Phase: 44-vocabulary-lock-glossary*
*Context gathered: 2026-04-27*
