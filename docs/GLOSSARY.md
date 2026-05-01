# Bounce Domain Glossary

This glossary defines every domain term used in the Bounce data visualizer. Written for a new analyst — anyone fluent skims past. The shorter one-sentence form of each entry lives in the `TERMS` registry at `src/lib/vocabulary.ts` and surfaces in-product via `<Term name="...">` hover popovers; this file carries the longer paragraph-with-nuance form. Derived computed terms (Modeled rate, Delta vs modeled, Cascade tier, Anomaly score) live next to the primary terms they derive from, marked with an italicized *Derived* tag.

Two ideas underpin most of what follows:

- **Apples-and-oranges rule.** The unit of analysis is `(partner, product)` — never just `partner`. A given partner (Happy Money, Snap Finance) often runs multiple products with different economics; blending them in aggregates corrupts the numbers. KPIs, curves, anomaly detection, and partner lists all key off the pair, not the partner alone. When v5.0 lands the `REVENUE_MODEL` dimension, the unit becomes `(partner, product, revenue_model)` for the same reason.
- **Cascade tiers.** Many metrics are batch-age-gated: a 12-month collection rate is meaningless on a 4-month-old batch. The KPI cascade and anomaly-eligibility filter both use breakpoints (`< 3mo`, `3–6mo`, `6–12mo`, `≥ 12mo`) to decide which metrics are evaluable for which batches. This shows up in the UI as cards that appear or disappear based on the cohort's max batch age.

## Contents

- [Partners & Products](#partners--products)
- [Batches & Accounts](#batches--accounts)
- [Metrics & Curves](#metrics--curves)
- [Detection & Norms](#detection--norms)
- [UI Concepts](#ui-concepts)

## Partners & Products

### Partner

A debt collection lender Bounce works with — Affirm, Happy Money, Snap Finance, and so on. The top level of the unit-of-analysis hierarchy. Each partner is identified by `PARTNER_NAME` in the Snowflake warehouse. Partners can have one or more products underneath them; multi-product partners (Happy Money has both first- and third-party variants) appear in the UI as multiple sidebar rows, never blended into a single "Happy Money" aggregate.

See also: [Product](#product), [Batch](#batch).

### Product

An `ACCOUNT_TYPE` within a partner — `THIRD_PARTY`, `PRE_CHARGE_OFF_FIRST_PARTY`, or `PRE_CHARGE_OFF_THIRD_PARTY`. Paired with a partner forms the canonical unit of analysis: **the apples-and-oranges rule means we never blend products within a partner.** A 1st-party debt collection has different economics from a 3rd-party placement; averaging them produces numbers nobody can interpret. The `(partner, product)` pair shows up as the row identity at the root data table, the drill-state shape, the saved-list filter, and the anomaly-detection cohort definition. Single-product partners look unchanged in the UI; multi-product partners render as `Partner Name (1st Party)` / `Partner Name (3rd Party)` rows.

See also: [Partner](#partner), [Revenue Model](#revenue-model), [Batch](#batch).

### Revenue Model

A third dimension of the unit-of-analysis (`REVENUE_MODEL` in Snowflake) alongside partner and product, with two values: `CONTINGENCY` and `DEBT_SALE`. The economics of contingency placements differ fundamentally from debt-sale placements — the partner is paid differently, recovery incentives differ, and reconciliation cuts at different points — so we never blend them in aggregations. Locked as a third dimension by [ADR 0002](adr/0002-revenue-model-scoping.md). 4 partners (Advance Financial, Happy Money, Imprint, PatientFi) carry both revenue models for the same product and render as two sidebar rows with a `-Contingency` / `-DebtSale` suffix; the other 34 partners are single-model and render unchanged. Mixed-revenue-model batches are not expected in current data (zero observed at audit) but the UI carries a defensive warning chip in case a future ETL anomaly produces one.

See also: [Contingency](#contingency), [Debt Sale](#debt-sale), [Product](#product).

### Contingency

A revenue model where Bounce earns a percentage of collected funds — the partner pays Bounce only when Bounce recovers money. The partner retains ownership of the underlying debt; Bounce acts as a collection agent on that portfolio. Most partners in the platform run on contingency.

See also: [Revenue Model](#revenue-model), [Debt Sale](#debt-sale).

### Debt Sale

A revenue model where the partner sells the debt outright to Bounce; Bounce keeps everything it collects on the purchased portfolio. Economics are upside/downside-symmetric for Bounce (vs. percentage-of-collected for contingency), and the recovery profile is judged against the purchase price rather than against placement balance. About a third of placements run on debt-sale terms.

See also: [Revenue Model](#revenue-model), [Contingency](#contingency).

## Batches & Accounts

### Batch

A monthly placement of accounts from a partner-product pair. Each batch has a placement month and ages forward — M1, M2, M3, ... — accumulating collections over time. Batch identity in Snowflake is `BATCH` (the placement label) plus `BATCH_AGE_IN_MONTHS` (months since placement). One batch typically contains hundreds to thousands of accounts; the batch-level row in the data table is an aggregate over those accounts. Drilling into a batch reveals the per-account detail. Batches younger than their metric horizon are *censored*: a 4-month-old batch has no meaningful 12-month collection rate yet, and the eligibility filter excludes it from any 12-month metric.

See also: [Account](#account), [Curve](#curve).

### Account

A single placed debt instance within a batch — the bottom of the partner > product > batch > account hierarchy. Each account has a placed balance, a payment trajectory, an outreach history (SMS / email / phone), and a set of derived rates (penetration, conversion). When the data table is drilled to batch level, each row is an account.

See also: [Batch](#batch).

## Metrics & Curves

### Metric

A column-shaped value computed per batch — a rate, count, currency amount, or duration in days. Metrics are the unit anomaly detection and trending operate on. Examples: `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` (rate), `TOTAL_AMOUNT_PLACED` (currency), `TOTAL_ACCOUNTS` (count), `AVG_DAYS_BETWEEN_CHARGEOFF_AND_ASSIGNMENT` (days). Each metric has a *polarity* (registered in `src/lib/computation/metric-polarity.ts`): higher-is-better, lower-is-better, or neutral. Polarity drives the directional color tinting on KPI cards, comparison heatmaps, and the trend-arrow color logic. Metrics also have an *aggregation strategy* (sum, dollar-weighted average, none) declared on `ColumnConfig.meta.aggregation` so the table footer and partner-summary surface compute the same number two different ways without diverging — see [docs/AGGREGATION-CONTRACT.md](AGGREGATION-CONTRACT.md).

See also: [Curve](#curve), [Norm](#norm).

#### *Derived: Cascade tier*

The cascade tier is a function of the cohort's max batch age that decides which collection-rate KPI cards render. Breakpoints: `< 3mo` shows "Rate since inception" only; `3–6mo` shows "3mo + since inception"; `6–12mo` shows "3mo + 6mo"; `≥ 12mo` shows "6mo + 12mo". Computed by `selectCascadeTier(maxBatchAgeMonths)` in `src/lib/computation/compute-kpis.ts`. The cascade exists because a 12-month rate on a 4-month-old cohort would be a censored zero — meaningless and misleading.

### Curve

The collection trajectory of a batch over time — what fraction of the placed amount has been recovered at each batch-age month. Each batch produces a curve with one data point per month (`COLLECTION_AFTER_1_MONTH` through `COLLECTION_AFTER_60_MONTH` in Snowflake), representing dollars collected. The collection-curve chart visualizes one curve per batch, with average-curve and modeled-projection overlays. Curves show shape, not just endpoints — a batch can be on track at month 6 but plateau early, which the curve makes visible in a way summary rates can't. Aliases include "collection curve" and "recovery curve" in informal speech.

See also: [Batch](#batch), [Norm](#norm).

#### *Derived: Modeled rate*

The modeled rate is the projected collection rate at a given horizon (month), sourced from `BOUNCE.FINANCE.CURVES_RESULTS.PROJECTED_FRACTIONAL` and merged onto each batch's actual curve. Renders as a dashed line alongside the actual curve; on KPI cards (in `baselineMode === 'modeled'`) it acts as the comparison baseline. Some batches lack modeled coverage (no warehouse projection for that lender / batch); the chart and KPI cards fall back to value-only rendering with a coverage-absent caption rather than silently substituting zero.

#### *Derived: Delta vs modeled*

The signed difference between a batch's actual collection rate and its modeled rate at the same horizon. Renders as a column in the data table (`Δ vs Modeled 6mo`, `Δ vs Modeled 12mo`) with polarity-aware coloring — a positive delta on a higher-is-better metric is green, negative is red, and the color flips for lower-is-better metrics. Computed by `computeModeledDelta(latestCurve, horizon, actualRate, metricKey)`.

## Detection & Norms

### Anomaly

A metric whose value lies more than `Z_THRESHOLD` standard deviations from its peer-group norm — flagged for partnerships team attention. The detector (`compute-anomalies.ts`) computes a z-score per (partner-product, metric) against the mean and standard deviation of the peer group, gates on metric-age eligibility (so a 4-month batch isn't compared against a 12-month metric), and emits a flagged anomaly when `|z| ≥ Z_THRESHOLD`. Anomalies surface in the sidebar with a colored dot, in the anomaly toolbar, and as colored cells in cross-partner comparison views. Polarity matters: a partner whose 6-month collection rate is two standard deviations *above* the peer mean is a positive anomaly (good) — a *below* anomaly is the one that gets eyes.

See also: [Norm](#norm), [Percentile](#percentile).

#### *Derived: Anomaly score*

The numeric z-score itself — magnitude (how many standard deviations from norm) plus sign (above or below). Used internally to rank anomalies and to surface a "severity" on UI cards. The score is computed only when the metric is age-eligible and the cohort meets `MIN_GROUPS` (the minimum peer-group size below which the norm itself is too noisy to make claims about); otherwise it is `null`.

### Norm

The mean and standard deviation of a metric across a peer group, used as the reference distribution for anomaly detection. Peer group is currently "all (partner, product) pairs at this metric's horizon" — a 6-month penetration rate is normed against every other partner's 6-month penetration rate, with batches younger than 6 months excluded. The norm is point-in-time, not a fitted distribution; rolling windows and per-age-bucket norms are explicitly out of scope (see [ADR 008](.planning/adr/008-no-per-age-bucket-norms.md)). Polarity affects how the norm is interpreted but not how it's computed.

See also: [Anomaly](#anomaly), [Percentile](#percentile).

### Percentile

Where a value falls within its peer group's distribution; e.g. P50 is the median and P90 is the top decile. The cross-partner percentile table ranks each (partner, product) pair on the four primary metrics (penetration rate, 6-month collection rate, 12-month collection rate, total collected). Percentiles are *polarity-aware*: for higher-is-better metrics the displayed percentile is the standard "fraction at or below"; for lower-is-better metrics it's flipped (`1 - p`) so high percentiles consistently mean "good" across the UI. Neutral metrics render at 0.5.

See also: [Norm](#norm), [Metric](#metric).

## UI Concepts

### List

A persisted collection of `(partner, product)` pairs the user can activate as a cross-app filter. Two flavors: **attribute-driven** (refreshable rules — "all 1st-party products", "all partners with anomalies this week"), and **hand-picked** (an explicit set of pairs). Attribute-driven lists re-evaluate their rules whenever the data changes, so a new partner that matches the rule shows up automatically. Hand-picked lists stay frozen until the user edits them. Activating a list narrows every surface (table, sidebar, chart) to the included pairs. Auto-derived lists (one per `ACCOUNT_TYPE` value, for example) appear with a Sparkles icon and an "Auto" pill — they re-materialize on next refresh and can't be renamed or meaningfully deleted.

See also: [View](#view).

### View

A UI snapshot — saved column visibility, sort order, dimension filters, and drill scope. Loading a view restores that exact state. Views are the way analysts capture a recurring lens ("Happy Money 1P collections detail", "Anomaly review for the week") without rebuilding it every session. Each view is a JSON blob in localStorage; the schema is intentionally additive-only so future fields layer on without breaking older saved views. A view can reference a list (the activated partner list at save time), but the two are independent — deleting a list doesn't delete every view that referenced it; the view falls back to "no list active".

See also: [List](#list), [Preset](#preset).

### Preset

A bundled column-visibility configuration — the set of which columns are visible by default, plus curated alternatives like "collections-focused" or "outreach-focused". Presets ship with the app (defined in code, not user-editable); they exist so the column picker has sensible starting points instead of forcing every user to hand-build a 60-column subset. Switching presets is non-destructive: the user can still toggle individual columns afterward and save the result as a view.

See also: [View](#view).

---

*Last updated: 2026-04-29. Source of truth for in-product hover popovers: [src/lib/vocabulary.ts](../src/lib/vocabulary.ts).*
