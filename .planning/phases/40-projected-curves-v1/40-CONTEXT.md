# Phase 40: Projected Curves v1 - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Render per-batch modeled projection curves on the main collection-curve chart (sourced from `BOUNCE.FINANCE.CURVES_RESULTS`), and offer "vs modeled curve" as an additional KPI-card delta baseline alongside the existing "vs rolling avg".

**Scope pivot** (captured during discussion): The original ROADMAP wording described a **historical-average-based** projection line computed from the partner's own prior batches. The actual source of truth — `BOUNCE.FINANCE.CURVES_RESULTS` — already contains per-batch pre-modeled projections with 80-month horizons. Computing a historical average on top would be duplicate, weaker signal. **v1 uses the modeled-deal curves directly; no historical-avg computation is performed.** Target-anchored / partner-reported / confidence-band variants remain deferred to v5.0 Phase 49 as originally planned.

**Follow-up required:** `ROADMAP.md` (Phase 40 goal + success criteria) and `milestones/v4.1-REQUIREMENTS.md` (PRJ-01..05 wording) need re-sync to match this scope — the researcher/planner should surface that on the next pass.

</domain>

<decisions>
## Implementation Decisions

### Data source
- Snowflake table: `BOUNCE.FINANCE.CURVES_RESULTS`
- Grain: one row per `(LENDER_ID, BATCH_, PRICING_TYPE, VERSION, COLLECTION_MONTH)`; 80 months of projection per batch
- Canonical projection column for v1: `PROJECTED_FRACTIONAL`
- `PROJECTED_FRACTIONAL_DSC` and `PROJECTED_FRACTIONAL_INTERNAL` are deferred (see Deferred Ideas)
- No historical-average computation on our side — the warehouse is authoritative
- Not every batch has modeled data (observed nulls on older bounce_af batches like `AF_AUG_23`, `AF_SEP_23`) — hide projection for those

### Projection shape + anchor
- **Per-batch rendering**: each displayed batch's actual line is paired with its own dashed modeled line. No synthetic aggregate "partner modeled" line (would be a lossy average on top of genuinely-divergent per-batch curves — 1.8× spread observed at month 6 within `bounce_af`).
- Projection renders as a **full shadow from month 1** through the chart's max displayed age — gives every actual data point a visual "was expected" counterpart, not just a forward tail.
- **Truncate at the chart's max displayed age** (same contract as CHT-01 — no empty whitespace past actuals).
- **Main collection-curve chart only** for v1. Chart Builder custom charts are out of scope.

### Visual treatment
- Dashed line, **same hue as the batch's actual line**, at **~60% opacity** — eye pairs them instantly without extra cognitive load. Satisfies PRJ-03's "subdued color" requirement without losing batch identity.
- Included in the **proximity-hover tooltip**, labeled "Modeled", with **delta vs actual** on the same row (consistent with CHT-02's partner-avg-in-hover pattern).
- **One legend entry per batch** — toggling a batch's actual silently toggles its modeled companion. No doubling of legend entries (avoids re-triggering CHT-04 scroll pain).
- Existing CHT-02 partner-average actuals line is **unchanged** — no modeled counterpart for it.

### KPI baseline UX (PRJ-04)
- **Panel-level selector** at the top of the KPI row: one control switches baseline for all cards ("Compare vs: rolling avg | modeled curve"). Not per-card — keeps the KPI row's story consistent.
- "Vs modeled curve" **joins** "vs rolling avg" as an additional option — does NOT replace it. Rolling avg is still useful for trend-vs-recent-self reads and for scopes without modeled coverage.
- **Default remains "rolling avg"** on load — zero-regression for existing users; modeled is opt-in for now.
- **Baseline-absent state** when the selected scope has no modeled coverage: card renders with the rate value but no delta, labeled "No modeled curve for this scope" and offering a "switch to rolling avg" recovery action. No silent fallbacks (per KPI-02's explicit-baseline-labeling spirit and KPI-04's suppress-misleading-deltas spirit).

### PRJ-05 (segment-aware) note
- With modeled curves now stored at batch level (not segment level), Phase 39's segment split affects only the **actuals side** of the comparison. The same per-batch modeled curve is the benchmark; filtering actuals to a segment and comparing against the batch's modeled curve still works. No segment-specific modeled data is needed from the warehouse for v1.

### Claude's Discretion
- Exact dash pattern (dash length / gap ratio)
- Hover row ordering (actual vs modeled row position) and exact delta format
- Exact copy for the baseline-absent empty state on KPI cards
- Query shape / caching strategy for joining `CURVES_RESULTS` into the existing chart pipeline
- How `LENDER_ID` in `CURVES_RESULTS` maps to the app's partner identity (researcher should confirm the join)
- Handling of multiple `VERSION` rows per batch (latest? specific pinned version?) — researcher should confirm which version is "current"

</decisions>

<specifics>
## Specific Ideas

- The team already has modeled curves from when the deals were priced — `BOUNCE.FINANCE.CURVES_RESULTS` is the canonical source. Don't re-invent a projection formula on top of it.
- Per-batch divergence is real: within `bounce_af`, month-6 projections range roughly 0.28%–0.49% (~1.8× spread) across batches, and AF vs CCB pricing-type variants within the same month materially differ. Per-batch rendering matches how the data is actually modeled.
- Mental model: "how is THIS batch tracking vs what we modeled for it" — not "how is the partner's average tracking vs an aggregate benchmark".
- KPI baseline `vs modeled` answers a prescriptive question (tracking-to-plan); `vs rolling avg` answers a descriptive question (trend-vs-recent-self). Both are useful — keep both.

</specifics>

<deferred>
## Deferred Ideas

- **$ trajectory / absolute-dollar projections** — out of scope for v1 (rate-only). Future phase when dollar-chart views need a projection overlay.
- **`PROJECTED_FRACTIONAL_DSC` and `PROJECTED_FRACTIONAL_INTERNAL` variants** — selector UI / multi-variant rendering deferred. v1 uses `PROJECTED_FRACTIONAL` only.
- **Chart Builder custom-chart projection overlays** — custom charts don't all share batch-age semantics. Future phase; gate by x-axis/y-axis schema when it arrives.
- **Aggregate partner-level modeled line** (mean of per-batch projections) — ruled out for v1 after data showed genuine per-batch divergence. Reconsider only if users specifically ask for a single reference line.
- **Modeled-curve toggle persistence** (localStorage/URL-sync for the KPI baseline selector) — v1 is session-only. Persistence is a later polish.
- **Target-anchored / partner-reported / confidence-band variants** — explicitly slotted for v5.0 Phase 49 (Dynamic Curve Re-Projection). Not v4.1.
- **Per-card baseline override** (mixing baselines across KPI cards) — ruled out for v1 in favor of panel-level consistency. Reconsider if user workflows demand it.
- **ROADMAP + REQUIREMENTS re-sync for Phase 40** (goal wording + PRJ-01 rewording from "rolling historical average" to "modeled curve from CURVES_RESULTS") — not a new phase, but a documentation task the planner should include or flag.

</deferred>

---

*Phase: 40-projected-curves-v1*
*Context gathered: 2026-04-24*
