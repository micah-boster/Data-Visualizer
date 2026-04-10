# Architecture Research: Bounce Data Visualizer

## Research Question

How should an internal data analytics dashboard be structured for a React/Next.js frontend connected to Snowflake, deployed on Vercel, with interactive tables, charts, saved views, and anomaly highlighting?

---

## System Architecture

### High-Level Component Map

```
+--------------------------------------------------+
|                   VERCEL (Hosting)                |
|                                                   |
|  +---------------------------------------------+ |
|  |          Next.js Application                 | |
|  |                                              | |
|  |  +--------+  +----------+  +--------------+ | |
|  |  | Pages/ |  | React    |  | State Mgmt   | | |
|  |  | Routes |  | Components|  | (View Configs,| | |
|  |  |        |  | (Tables, |  |  Filters,    | | |
|  |  |        |  |  Charts) |  |  Saved Views)| | |
|  |  +--------+  +----------+  +--------------+ | |
|  |       |            |              |          | |
|  |  +---------------------------------------------+
|  |  |         API Route Layer (Server-Side)     | |
|  |  |  /api/data    /api/views   /api/meta      | |
|  |  +---------------------------------------------+
|  |                    |                           | |
|  +---------------------------------------------+ |
+-------------------|-------------------------------+
                    |
          +---------|----------+
          |   Snowflake SDK    |
          |  (snowflake-sdk)   |
          |  Server-side only  |
          +---------|----------+
                    |
          +---------|----------+
          |     SNOWFLAKE      |
          |  bounce schema     |
          | agg_batch_perf...  |
          | master_accounts    |
          | master_outbound... |
          +--------------------+
```

### Component Definitions

**1. Next.js Pages / Routes (Client)**
- Single-page dashboard with tabbed or sidebar navigation
- Routes: `/` (main dashboard), `/views/[id]` (saved view)
- Responsible for layout shell, navigation, and page-level data fetching

**2. React UI Components (Client)**
- **DataTable**: Interactive table with sortable/reorderable columns, row selection, pagination. This is the core component -- most user time will be spent here.
- **ChartPanel**: Collection curve line charts, bar charts for distributions, KPI cards for summary metrics
- **FilterBar**: Partner, batch, account type, time period selectors. Drives query parameters for API calls.
- **AnomalyBadge / HighlightRow**: Visual indicators applied to table rows/cells when metrics exceed thresholds
- **ViewManager**: Save/load/rename view configurations (column selection, sort order, filters, layout)
- **ColumnSelector**: Toggle visible columns from the 61 available -- most views will show 8-15 columns at a time

**3. State Management (Client)**
- Manages active filters, column configuration, sort order, and view definitions
- Zustand or React Context -- lightweight, no Redux overhead needed for 2-3 users
- View state shape: `{ filters, visibleColumns, sortBy, sortDir, columnOrder, thresholds, layoutConfig }`
- Persists saved views to server-side storage via API

**4. API Route Layer (Server-Side, Vercel Serverless Functions)**
- `POST /api/query` -- Accepts filter/column parameters, constructs parameterized SQL, queries Snowflake, returns JSON
- `GET/POST /api/views` -- CRUD for saved view configurations (stored in a JSON file or simple DB)
- `GET /api/meta` -- Returns column metadata, available partners/batches/account types for filter dropdowns
- All routes run as Vercel serverless functions -- Snowflake credentials never reach the client

**5. Snowflake Connector (Server-Side Only)**
- Uses `snowflake-sdk` npm package within API routes
- Connection pooling via a shared module imported by API routes
- Credentials stored as Vercel environment variables: `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_DATABASE`, `SNOWFLAKE_SCHEMA`, `SNOWFLAKE_WAREHOUSE`
- All queries are parameterized to prevent injection
- Read-only warehouse role enforced at Snowflake level

---

## Data Flow

### Primary Data Flow (Dashboard Load)

```
User opens dashboard
       |
       v
Page component mounts
       |
       v
Client sends POST /api/query
  { filters: { partner: "X", account_type: "Y" },
    columns: ["partner_name", "batch", "total_accounts", ...],
    sort: { col: "total_collected_life_time", dir: "desc" } }
       |
       v
API route (serverless function):
  1. Validates input parameters against allowed column whitelist
  2. Constructs parameterized SQL query
  3. Connects to Snowflake via pooled connection
  4. Executes query, receives result set
  5. Applies server-side formatting (rate columns -> percentages)
  6. Returns JSON response
       |
       v
Client receives JSON:
  1. Stores in component state
  2. Renders DataTable with data
  3. Computes anomaly thresholds client-side (stddev from mean, % change)
  4. Applies highlight styles to flagged rows/cells
```

### Saved View Flow

```
User configures view (filters, columns, sort, thresholds)
       |
       v
Client POSTs to /api/views
  { name: "Problem Batches", config: { filters, columns, sort, thresholds } }
       |
       v
Server stores view config (JSON file on disk, or Vercel KV/Postgres)
       |
       v
User loads saved view -> GET /api/views/[id] -> client applies config -> re-fetches data
```

### Collection Curve Chart Flow

```
User selects batch(es) in table
       |
       v
Client extracts COLLECTION_AFTER_1_MONTH through COLLECTION_AFTER_60_MONTH
from already-loaded row data (no additional API call needed)
       |
       v
Transforms to chart-ready format:
  [{ month: 1, amount: 50000 }, { month: 2, amount: 85000 }, ...]
       |
       v
Renders line chart with one series per selected batch
```

---

## Key Architecture Decisions

### Decision 1: Server-Side Query Construction (Not Client-Side SQL)

The client sends structured filter/sort parameters, never raw SQL. The API route constructs queries from a whitelist of allowed columns and operations. This prevents SQL injection and keeps Snowflake schema details server-side.

### Decision 2: Full Dataset Load per Query (Not Pagination-First)

With 533 total rows and a maximum plausible result set of a few hundred rows after filtering, the dataset fits comfortably in a single API response (estimated 50-100KB JSON). Client-side sorting, filtering refinement, and column reordering can happen instantly without round-trips. Server-side filtering still applies for the initial query to reduce load and support future table growth.

### Decision 3: Client-Side Anomaly Computation

Threshold calculations (standard deviation from mean, period-over-period % change) run in the browser after data loads. This keeps the API layer stateless and simple, and allows users to adjust thresholds interactively without re-querying. The data volumes are small enough that this adds negligible client overhead.

### Decision 4: Vercel Environment Variables for Credentials

Snowflake credentials are stored as Vercel encrypted environment variables and accessed only within serverless function scope. The `snowflake-sdk` connection is initialized per-invocation (serverless functions are short-lived). No connection pooling library is needed at this scale -- cold start + query execution will be under 2-3 seconds.

### Decision 5: JSON File or Vercel KV for View Storage

Saved views are small JSON objects (under 1KB each). For MVP with 2-3 users, options ranked by simplicity:
1. **Vercel KV (Redis)** -- simplest managed option, free tier sufficient
2. **Vercel Postgres** -- more structure than needed for MVP but scales better
3. **JSON file in repo** -- works for prototype but requires redeploy to update

Recommendation: Start with Vercel KV. Zero config, sub-millisecond reads, free tier handles this easily.

### Decision 6: Snowflake SDK vs. REST API

Use `snowflake-sdk` (Node.js driver) rather than the Snowflake SQL REST API. The SDK handles authentication, session management, and result parsing. It works in Node.js serverless environments. The alternative Snowflake REST API adds HTTP complexity without benefit at this scale.

---

## Component Boundaries

| Component | Runs Where | Talks To | Data It Owns |
|---|---|---|---|
| Page Shell / Router | Client | UI Components | Current route, layout state |
| FilterBar | Client | State, triggers API refetch | Active filter selections |
| DataTable | Client | State (reads data + config) | Column widths, scroll position |
| ChartPanel | Client | State (reads selected rows) | Chart zoom/hover state |
| AnomalyEngine | Client | State (reads data, writes flags) | Threshold configs, flagged cells |
| ViewManager | Client | API (/api/views), State | Nothing persistent -- delegates to API |
| /api/query | Server (Vercel) | Snowflake, returns to client | Nothing persistent |
| /api/views | Server (Vercel) | Vercel KV, returns to client | Saved view configurations |
| /api/meta | Server (Vercel) | Snowflake, returns to client | Nothing persistent (cacheable) |
| Snowflake module | Server (Vercel) | Snowflake warehouse | Connection config only |

### Boundary Rules
- Client components NEVER import `snowflake-sdk` or access credentials
- API routes NEVER return raw Snowflake error messages to client (wrap in safe error responses)
- State management layer is the single source of truth for "what the user sees" -- components read from state, API responses write to state
- ChartPanel and DataTable share data through state, not through props chains

---

## Snowflake Connectivity in Vercel

### Connection Pattern for Serverless

```
// lib/snowflake.ts (server-only module)

Each API route invocation:
1. Import shared connection helper
2. Create connection with env vars (SNOWFLAKE_ACCOUNT, etc.)
3. Execute parameterized query
4. Destroy connection before function returns
```

### Security Measures

| Concern | Mitigation |
|---|---|
| Credential exposure | Env vars only, never in client bundle. Next.js only exposes `NEXT_PUBLIC_*` vars to client. |
| SQL injection | Parameterized queries with column whitelist validation. No string interpolation of user input into SQL. |
| Excessive data access | Snowflake role with read-only grants on specific tables only. No `CREATE`, `UPDATE`, `DELETE` permissions. |
| API abuse | Vercel rate limiting (built-in for serverless). Optional: simple API key header for extra layer. |
| Error leakage | API routes catch Snowflake errors and return generic 500 messages. Full errors logged server-side only. |

### Query Construction Pattern

```
Allowed columns: static whitelist derived from DESCRIBE TABLE output
Allowed filters: partner_name, batch, account_type, batch_age_in_months
Allowed sorts: any column in the whitelist

Client sends: { filters: {...}, columns: [...], sort: {...} }
Server validates each field against whitelist
Server constructs: SELECT <validated_columns> FROM bounce.agg_batch_performance_summary WHERE <validated_filters> ORDER BY <validated_sort>
Server binds filter values as query parameters (not string interpolation)
```

---

## Suggested Build Order

The phases below reflect dependency relationships -- each phase builds on the one before it.

### Phase 1: Snowflake API Foundation
**Build**: Snowflake connection module, `/api/query` route, `/api/meta` route
**Why first**: Everything downstream depends on getting data from Snowflake. This is the riskiest integration point (serverless + Snowflake cold starts, auth, query patterns). Validate this works on Vercel early.
**Delivers**: Working API that returns JSON data from Snowflake queries.

### Phase 2: Core Table View
**Build**: DataTable component, FilterBar, basic page layout, state management
**Why second**: The table is the primary interface. Filters + table + API = a usable (if minimal) tool.
**Depends on**: Phase 1 (needs API to fetch data)
**Delivers**: Filterable, sortable interactive table showing batch performance data.

### Phase 3: Column Management and Anomaly Highlighting
**Build**: ColumnSelector, AnomalyEngine, threshold configuration, cell/row highlighting
**Why third**: Transforms the table from "shows data" to "surfaces problems." This is the core value proposition.
**Depends on**: Phase 2 (needs working table to highlight within)
**Delivers**: Users can customize visible columns and immediately see which metrics are abnormal.

### Phase 4: Charts and Visualization
**Build**: ChartPanel (collection curves, distribution bars, KPI cards)
**Why fourth**: Charts complement the table but are secondary to it. Collection curve visualization requires row selection in the table.
**Depends on**: Phase 2 (needs table for row selection context)
**Delivers**: Visual collection curve analysis, distribution charts, summary KPIs.

### Phase 5: Saved Views
**Build**: ViewManager, `/api/views` CRUD routes, Vercel KV integration, view loading/saving UI
**Why fifth**: Saving views requires all other components to exist (filters, columns, sort, thresholds, layout). This is the "quality of life" layer.
**Depends on**: Phases 2-4 (needs all configurable components to have something to save)
**Delivers**: Users can save, name, and reload their dashboard configurations.

### Phase 6: Polish and Change Tracking
**Build**: Period-over-period comparison columns, batch-over-batch deltas, benchmark comparison, responsive refinements
**Why last**: Change tracking is computed from existing data but requires additional query logic and UI patterns. Polish requires all features to be in place.
**Depends on**: Phases 1-5 (all features exist to polish)
**Delivers**: Full MVP with change tracking and refined UX.

---

## Technology Recommendations

| Concern | Recommendation | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | API routes colocated with frontend, Vercel-native deployment |
| Table library | TanStack Table (React Table v8) | Headless -- full control over rendering, sorting, column reordering, pagination built-in |
| Charts | Recharts or Nivo | Recharts for simplicity, Nivo for richer chart types. Both handle line/bar/area well for collection curves |
| State management | Zustand | Lightweight, no boilerplate, works well for view config state |
| Snowflake driver | snowflake-sdk | Official Node.js driver, works in serverless |
| View storage | Vercel KV | Managed Redis, free tier, zero config |
| Styling | Tailwind CSS | Fast iteration, consistent spacing/colors for data-dense UI |
| UI primitives | shadcn/ui | Accessible, composable components (dialogs, dropdowns, tabs) that pair well with Tailwind |

---

## Data Shape Reference

The primary table `bounce.agg_batch_performance_summary` has 61 columns across these categories:

| Category | Columns | Count |
|---|---|---|
| Identifiers | partner_name, lender_id, batch, account_type | 4 |
| Volume metrics | total_accounts, resolved_accounts, batch_age_in_months | 3 |
| Balance stats | total/avg/median amount placed | 3 |
| Balance distribution | accounts and amounts in 5 balance buckets ($0-500, $500-1K, $1K-2K, $2K-5K, $5K+) | 10 |
| Timing | avg days between chargeoff/delinquency/origination and assignment | 3 |
| Credit score | avg_experian_ca_score | 1 |
| Collection curve | collection_after_1_month through collection_after_60_month (17 time points) | 17 |
| Payment / conversion | total_accounts_with_payment, total_collected_life_time, total_converted_accounts, ratio_first_time_converted | 4 |
| Penetration rates | penetrated accounts (possible/confirmed/both), penetration rates (3 variants) | 6 |
| Engagement rates | SMS open/click, email open/click, phone verify (outbound + inbound) | 6 |
| Plan accounts | total_accounts_with_plans | 1 |

Total dataset: 533 rows, 37 partners, 532 batches, 3 account types. Comfortably fits in a single API response.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Snowflake cold start in serverless | 2-5s first query delay | Cache `/api/meta` results (partner/batch lists change rarely). Show loading skeleton. Consider Vercel cron to keep warm. |
| 61-column table overwhelming users | Poor UX, information overload | Default views show 8-12 key columns. ColumnSelector lets users add more. Saved views remember preferences. |
| Credential rotation | App breaks silently | Alert on Snowflake connection errors. Document env var update process. |
| Future table additions | API changes needed | Design `/api/query` to accept table name parameter from a whitelist, not hardcode single table. |
| Vercel function timeout (default 10s) | Complex queries fail | Snowflake queries on 533 rows will be fast (<1s). Monitor and increase timeout if adding larger tables later. |

---

## Open Questions

1. **View storage for future scale**: If the team grows beyond 3 users, should views be per-user or shared? MVP can treat all views as shared.
2. **Data refresh frequency**: How often does `agg_batch_performance_summary` update? This determines whether caching strategies matter.
3. **Anomaly threshold defaults**: What constitutes "abnormal"? Need initial threshold values from the partnerships team (e.g., >2 stddev from partner mean, >15% MoM change).
4. **Additional tables timeline**: When will `master_accounts` and `master_outbound_interactions` need to be added? Architecture supports it but UI patterns may differ for account-level vs. batch-level data.

---

*Research completed: 2026-04-10*
*Source: Snowflake schema analysis (DESCRIBE TABLE, aggregate stats), PROJECT.md requirements, Next.js/Vercel/Snowflake platform knowledge*
