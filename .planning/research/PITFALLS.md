# Pitfalls Research: Bounce Data Visualizer

> Internal data analytics dashboard connecting React/Next.js to Snowflake for a debt collection company's partnerships team. Key concerns: Snowflake query performance, large datasets, saved view persistence, anomaly detection thresholds.

---

## Pitfall 1: Snowflake Cold Warehouse Latency Killing UX

**Risk Level:** Critical
**Phase Relevance:** Phase 1 (data layer), carries through all phases

### The Problem

Snowflake warehouses auto-suspend after idle periods. The first query after suspension triggers a cold start that takes 5-30 seconds depending on warehouse size. With only 2-3 users hitting the dashboard sporadically throughout the day, the warehouse will be cold *most of the time*. Users will experience the dashboard as "slow" even though subsequent queries are fast.

### Warning Signs

- First dashboard load of the day takes 10x longer than subsequent loads
- Users start refreshing the page thinking it is broken
- Complaints about "the dashboard being slow" that are hard to reproduce because developer testing keeps the warehouse warm

### Prevention Strategy

- **Set warehouse auto-suspend to 5-10 minutes** (not the default 10 minutes or lower) to balance cost vs. cold start frequency during work hours
- **Implement a server-side caching layer** (Redis or even in-memory with Next.js API routes) for the most common queries — the `agg_batch_performance_summary` table data does not change in real-time so caching for 15-60 minutes is safe
- **Add a loading skeleton UI** from day one so cold starts feel responsive rather than broken
- **Pre-warm with a lightweight scheduled query** (a cron job that runs `SELECT 1` every 4 minutes during business hours) if cost allows
- **Show "data as of [timestamp]"** so users understand they are seeing cached data, not a stuck query

---

## Pitfall 2: Fetching All 61 Columns When Users Need 8

**Risk Level:** High
**Phase Relevance:** Phase 1 (API design), Phase 2 (table views)

### The Problem

The `agg_batch_performance_summary` table has 61 columns. The natural instinct is to run `SELECT *` and let the frontend decide what to show. This is catastrophic for performance and bandwidth: Snowflake charges by data scanned, wide result sets serialize slowly over the wire, and the frontend chokes parsing massive JSON payloads when there are thousands of rows across 61 columns.

### Warning Signs

- API responses exceed 1MB for routine table views
- Snowflake credit consumption grows faster than expected
- Browser memory usage spikes when loading the dashboard
- Network tab shows response times dominated by transfer time, not query time

### Prevention Strategy

- **Design the API to accept a column list** — every query should specify exactly which columns to fetch, driven by the current view configuration
- **Define "column groups"** (e.g., collection_curves, penetration_rates, engagement_metrics, demographics) that map to logical sets of 5-10 columns users typically view together
- **Never use SELECT * in production queries** — enforce this as a code review rule from the start
- **Paginate server-side** — return 50-100 rows per request, not the full dataset
- **Add response size monitoring** in the API layer to catch regressions early

---

## Pitfall 3: Saved Views That Break When Schema Changes

**Risk Level:** High
**Phase Relevance:** Phase 2 (saved views), ongoing maintenance

### The Problem

Saved views store column selections, sort orders, filters, and layout configurations. When Snowflake table schemas evolve (columns renamed, added, removed, types changed), saved views that reference old column names silently break. Users see blank columns, error states, or worse — wrong data in the wrong column. This is especially dangerous because the project explicitly plans to add more tables over time (`master_accounts`, `master_outbound_interactions`, payment tables).

### Warning Signs

- Users report "my saved view stopped working" after a data team change
- Columns in a saved view show null/empty when the underlying data exists
- Filter configurations silently match nothing because a column was renamed
- Different users see different results from "the same" saved view

### Prevention Strategy

- **Store saved views with column metadata** — include column name, expected type, and a schema version identifier, not just column names
- **Validate saved views on load** — when a view is opened, compare its column references against the current schema and surface clear warnings for any mismatches rather than rendering broken data
- **Build a schema migration utility** — when a column is renamed or removed, provide a way to bulk-update affected saved views
- **Add a "view health check" indicator** that shows green/yellow/red based on whether all referenced columns still exist
- **Version your API schemas** from day one so frontend and backend expectations are explicit

---

## Pitfall 4: Hardcoded Anomaly Thresholds That Nobody Updates

**Risk Level:** High
**Phase Relevance:** Phase 3 (anomaly highlighting), ongoing

### The Problem

"Metrics outside normal thresholds" requires defining what "normal" means. The common mistake is hardcoding thresholds (e.g., penetration rate below 5% is bad, collection curve deviation above 15% is an anomaly). These hardcoded values become stale as the portfolio changes, new partners onboard with different baselines, and market conditions shift. After a few months, either everything is flagged (threshold too tight) or nothing is (threshold too loose), and users stop trusting the anomaly indicators entirely.

### Warning Signs

- More than 30% of rows are flagged as anomalous (threshold too loose relative to data)
- Anomaly indicators have not been adjusted since initial deployment
- Users say "I just ignore the red highlights now"
- New partners with legitimately different performance profiles are always flagged

### Prevention Strategy

- **Use relative thresholds, not absolute** — flag metrics that deviate more than N standard deviations from the peer group (same account type, similar vintage) rather than a fixed number
- **Make thresholds user-configurable per view** — let the partnerships team adjust sensitivity by metric, partner, or account type
- **Implement threshold presets** (conservative, moderate, aggressive) rather than requiring users to set exact numbers
- **Store thresholds separately from code** — in a configuration table or the saved view definition, not hardcoded in the React components or API
- **Add a "threshold tuning" interface early** — even if simple (a slider per metric), this avoids the situation where changing a threshold requires a code deploy
- **Log threshold hit rates** — if a threshold flags more than 40% or fewer than 1% of records, surface that as a signal to recalibrate

---

## Pitfall 5: Building the Full Dashboard Before Validating the Data Layer

**Risk Level:** Critical
**Phase Relevance:** Phase 1 (foundation)

### The Problem

Teams often jump to building beautiful charts and interactive tables before confirming that the underlying data is correct, complete, and query-able at the needed granularity. With Snowflake as the source, there are specific risks: the `agg_batch_performance_summary` table may have NULL values in key columns, aggregation levels may not match what the UI assumes, date fields may have timezone inconsistencies, and joins across the planned additional tables may produce unexpected duplicates or fan-outs.

### Warning Signs

- Frontend shows nonsensical numbers that "look right" in Snowflake but wrong in the UI due to aggregation mismatches
- Charts show gaps or spikes caused by NULL handling differences between Snowflake SQL and JavaScript
- Collection curve data points are missing for certain months because the source table skips zero-value periods
- Period-over-period calculations produce NaN or Infinity when the prior period value is zero or NULL

### Prevention Strategy

- **Build and validate the data layer in isolation first** — write and test every Snowflake query before building any UI, with assertions on expected row counts, NULL rates, and value ranges
- **Create a data validation checklist** for `agg_batch_performance_summary`: NULL rates per column, distinct value counts for categorical columns, min/max/mean for numeric columns, date range coverage
- **Handle division-by-zero and NULL explicitly** in every calculation — define a project-wide convention (e.g., NULL prior period = show "N/A", zero denominator = show 0% not Infinity)
- **Test with real Snowflake data from day one**, not mock data — mock data hides schema surprises
- **Document assumed aggregation levels** — is each row a batch? A batch-month? A partner-batch-month? Verify this assumption before building any group-by logic in the UI

---

## Pitfall 6: Snowflake Query Cost Spiraling from Unoptimized Queries

**Risk Level:** Medium-High
**Phase Relevance:** Phase 1 (API design), ongoing

### The Problem

Snowflake bills by compute time (credits). Every unoptimized query costs real money. Common causes: queries without WHERE clauses scanning full tables, repeated identical queries that could be cached, JOINs across large tables without partition pruning, and the auto-scaling warehouse responding to concurrent queries by spinning up additional clusters. With a small team, costs start low and the problem is invisible — until the table grows or additional tables are added and monthly bills spike.

### Warning Signs

- Snowflake credit usage grows month-over-month without a corresponding increase in users or data
- Query history shows the same expensive query running dozens of times per day
- Warehouse auto-scaling kicks in regularly despite having only 2-3 users
- No query monitoring or cost alerting is configured

### Prevention Strategy

- **Use Snowflake's query profiling** (`QUERY_HISTORY` view) from day one to track the most expensive queries
- **Set a Snowflake resource monitor** with alerts at 75% and a hard stop at 100% of monthly budget
- **Implement server-side query result caching** — the data refreshes in batches, so cache validity can be tied to the last batch load timestamp
- **Use clustering keys** if table scans become expensive on `agg_batch_performance_summary`
- **Design the API to batch related queries** — one round-trip that returns table data + summary stats, not separate calls for each widget
- **Use Snowflake's RESULT_SCAN** for follow-up queries against the same result set within a session

---

## Pitfall 7: Client-Side State Management Becoming Unmanageable

**Risk Level:** Medium
**Phase Relevance:** Phase 2 (interactive tables), Phase 3 (saved views)

### The Problem

An interactive dashboard has complex interrelated state: active filters, sort orders, selected columns, column widths, row selection, comparison mode, time period, anomaly threshold settings, and which saved view is active. The common mistake is managing this with scattered `useState` hooks across components, leading to state synchronization bugs (filter changes that do not propagate to the chart, sort state that resets when switching tabs, saved views that do not capture all current settings).

### Warning Signs

- Changing a filter updates the table but not the summary stats above it
- The URL does not reflect the current view state (users cannot share links to specific views)
- "Save View" captures most but not all of the current configuration
- Undo/redo is impossible because there is no centralized state history

### Prevention Strategy

- **Choose a state management approach on day one** — for this scale, URL-based state (query params) combined with a single state store (Zustand, Jotai, or React Context with useReducer) is appropriate
- **Define the view state schema upfront** as a TypeScript type — every piece of UI state that constitutes a "view" should be in one serializable object
- **Derive URL from state** — every meaningful state change should update the URL so views are shareable and bookmarkable
- **Make saved views a serialization of this state object** — no separate "save" logic, just persist the state blob
- **Test state round-trips** — serialize state to URL, deserialize back, confirm equality. Do this in unit tests from the start

---

## Pitfall 8: Period-over-Period Calculations That Silently Produce Wrong Results

**Risk Level:** High
**Phase Relevance:** Phase 2-3 (change tracking, anomaly detection)

### The Problem

MoM (month-over-month), WoW (week-over-week), and batch-over-batch comparisons are a core feature. These calculations are deceptively tricky with real debt collection data: months have different numbers of days, batches are placed at irregular intervals, some months have no data for certain accounts, and comparing absolute values vs. percentage changes yields different anomaly signals. Getting these calculations wrong means the partnerships team makes decisions based on phantom trends.

### Warning Signs

- MoM changes show wild swings in short months (February) vs. long months (March) due to day-count differences
- Batch-over-batch comparisons are nonsensical because batches have different sizes or compositions
- Zero-to-nonzero transitions show as "infinite% increase"
- Users question the numbers because they do not match their mental math from looking at raw data

### Prevention Strategy

- **Normalize by day count** for any time-period comparison, or clearly label whether the comparison is "calendar month" vs. "30-day period"
- **Define comparison semantics precisely** — does "MoM" mean same calendar month last year, prior calendar month, or rolling 30 days? Document this and make it visible in the UI
- **Handle missing periods explicitly** — if a batch has no data for a comparison period, show "No prior data" rather than 0% change or a blank
- **Build a comparison calculation library** with unit tests covering edge cases: zero-to-nonzero, nonzero-to-zero, NULL periods, partial periods, February vs. March
- **Add a "show calculation" tooltip** or detail panel so users can verify how a specific change number was derived

---

## Pitfall 9: Deploying to Vercel Without Considering Snowflake Connection Limits

**Risk Level:** Medium
**Phase Relevance:** Phase 1 (deployment architecture)

### The Problem

Vercel runs Next.js API routes as serverless functions. Each invocation creates a new connection to Snowflake. Snowflake has connection limits per account and per warehouse. Serverless functions cannot share connection pools across invocations easily. This means: slow connection establishment on every API call (Snowflake connections take 1-3 seconds to establish), potential connection limit exhaustion under even moderate load, and no ability to use prepared statements or session-level caching.

### Warning Signs

- API response times include 1-3 seconds of overhead before any query even runs
- Intermittent "too many connections" errors from Snowflake
- Dashboard loads are consistently slower than local development where a persistent connection exists
- Connection establishment dominates query execution time for simple queries

### Prevention Strategy

- **Use a connection pooling service** — consider Snowflake's own connection pooling, or an intermediary like a lightweight persistent API server (e.g., a small always-on service on Railway/Render) that pools Snowflake connections and is called by Vercel functions
- **Cache aggressively on the Vercel edge** — use Vercel's ISR (Incremental Static Regeneration) or edge middleware caching for data that updates on a known schedule
- **Batch API calls** — design the frontend to make one API call per view load, not one per widget, to minimize connection overhead
- **Evaluate Vercel's serverless function connection reuse** — warm functions can reuse connections within a short window; architect routes to take advantage of this
- **Set Snowflake connection timeout and retry logic** — do not let a failed connection hang the UI for 30 seconds; fail fast and retry once

---

## Pitfall 10: Building Features Nobody Uses Because You Skipped User Observation

**Risk Level:** Medium
**Phase Relevance:** All phases, especially Phase 1

### The Problem

With only 2-3 users, there is a temptation to guess their workflows rather than observe them. Internal tools commonly fail because the builder assumes which metrics matter, how data should be grouped, and what "abnormal" means — without watching the actual users work. The partnerships team may spend 80% of their time on 3 specific queries that could be one-click shortcuts, while the fancy collection curve visualization gets used once a month.

### Warning Signs

- Building complex features (multi-axis charts, nested drill-downs) before confirming anyone wants them
- Users still open Metabase alongside the new tool because it has one thing the new tool does not
- Saved view feature is built but nobody saves views because the default view already shows what they need
- Most complex features have zero usage after 2 weeks of deployment

### Prevention Strategy

- **Spend 30 minutes watching each user work in Metabase before building anything** — note what queries they run, what they copy to spreadsheets, what they complain about
- **Ship the simplest possible table view first** and get feedback within days, not weeks
- **Add basic usage tracking** (even just server-side logging of which API endpoints are hit) to see which features are actually used
- **Keep a "user said" log** — literal quotes from the 2-3 users about what they want, updated weekly
- **Resist building the collection curve visualization until someone asks for it twice** — the list of active requirements should be validated against observed usage

---

## Pitfall 11: Ignoring Snowflake Data Freshness Leading to Stale Dashboards

**Risk Level:** Medium
**Phase Relevance:** Phase 1 (data layer), Phase 2 (UI indicators)

### The Problem

The project states "batch/scheduled refresh is sufficient" and real-time is out of scope. But if the dashboard does not clearly communicate *when* data was last updated, users will not trust it. Worse, if the batch ETL job fails silently, the dashboard will show yesterday's data (or last week's) without any indication that something is wrong. The partnerships team may make decisions based on stale data without knowing it.

### Warning Signs

- Users ask "is this data up to date?" repeatedly
- A batch load fails and nobody notices for days because the dashboard still shows data
- Different data sources update at different frequencies but the dashboard does not distinguish between them
- Users export dashboard data into spreadsheets "just to be safe" because they do not trust freshness

### Prevention Strategy

- **Display a "Data as of: [timestamp]" indicator prominently** on every view — query the max timestamp from the source table and show it
- **Implement a data freshness health check** — if the latest data is older than expected (e.g., more than 26 hours for a daily batch), show a warning banner
- **Log and alert on ETL failures** — even a simple Slack webhook when the last batch load timestamp is stale
- **Show freshness per data source** once multiple tables are added — `agg_batch_performance_summary` may update daily while `master_accounts` updates hourly

---

## Summary: Pitfall Priority Matrix

| Pitfall | Risk | Earliest Phase to Address |
|---------|------|---------------------------|
| 1. Cold warehouse latency | Critical | Phase 1 - Data layer |
| 5. Building UI before validating data | Critical | Phase 1 - Foundation |
| 2. Fetching all 61 columns | High | Phase 1 - API design |
| 3. Saved views breaking on schema change | High | Phase 2 - Saved views |
| 4. Hardcoded anomaly thresholds | High | Phase 3 - Anomaly detection |
| 8. Wrong period-over-period calculations | High | Phase 2-3 - Change tracking |
| 6. Snowflake query cost spiral | Medium-High | Phase 1 - API design |
| 9. Vercel + Snowflake connection limits | Medium | Phase 1 - Deployment |
| 7. Unmanageable client state | Medium | Phase 2 - Interactive tables |
| 10. Features nobody uses | Medium | All phases |
| 11. Stale data without freshness indicators | Medium | Phase 1-2 |

---

*Research completed: 2026-04-10*
*Source: Domain expertise in Snowflake-connected dashboard architecture, debt collection analytics, and React/Next.js deployment patterns*
