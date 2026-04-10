# Stack Research: Bounce Data Visualizer

> Research date: 2026-04-10
> Scope: Greenfield internal data visualization dashboard connecting to Snowflake
> Constraints: React/Next.js frontend, Vercel deployment, 2-3 internal users, read-only

---

## Recommended Stack

### Framework Layer

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Meta-framework** | Next.js (App Router) | ^15.x | HIGH |
| **React** | React | ^19.x | HIGH |
| **Language** | TypeScript | ^5.6 | HIGH |

**Next.js 15 with App Router** is the correct choice. The App Router gives us React Server Components (RSC) which are critical for this project: Snowflake queries run server-side via RSC or Route Handlers, credentials never touch the client, and we get streaming for large result sets. The Pages Router is legacy at this point and should not be used for greenfield projects.

**Why not Pages Router:** No RSC support, worse streaming story, will not receive new features.
**Why not Remix/Vite SPA:** Vercel-native deployment is a constraint. Next.js on Vercel is the most battle-tested path. A Vite SPA would require a separate API server.

---

### Data Table

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Table engine** | TanStack Table | ^8.x | HIGH |
| **UI layer** | Custom built on top of TanStack | N/A | HIGH |

**TanStack Table (formerly React Table v8)** is the only serious choice for interactive tables with sorting, filtering, column reordering, and column visibility toggling. It is headless (no UI opinions), so we pair it with our own Tailwind-styled components for full control.

Key capabilities that map directly to requirements:
- **Sorting**: Built-in multi-column sorting
- **Filtering**: Column-level and global filtering with custom filter functions
- **Column reordering**: Built-in column ordering API via `columnOrder` state
- **Column visibility**: Built-in `columnVisibility` state
- **Column resizing**: Built-in resize handlers
- **Pagination**: Client-side and server-side pagination support
- **Row selection**: For batch operations if needed later

**Why not AG Grid:** Overkill for 2-3 users. AG Grid Community is free but the enterprise features (pivoting, aggregation) require a paid license. TanStack Table is fully open source, lighter, and gives us the exact control we need.
**Why not MUI DataGrid:** Brings in the entire MUI design system. We want Tailwind-based styling, not Material Design.
**Why not Shadcn/ui DataTable:** Shadcn's DataTable IS built on TanStack Table -- it's just a pre-styled wrapper. We can use Shadcn's table primitives as a starting point but TanStack Table is the actual engine underneath.

---

### Charts & Visualization

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Charting library** | Recharts | ^2.x | HIGH |
| **Fallback/complex viz** | Observable Plot or D3 (only if needed) | ^0.6 / ^7.x | LOW (unlikely needed) |

**Recharts** is built on D3 and React. It covers the visualization needs for this project:
- **Line charts**: Collection curve visualization (1-60 month progression)
- **Bar charts**: Penetration rates, engagement metrics, balance distributions
- **Area charts**: Period-over-period trend comparisons
- **Composed charts**: Overlay multiple metrics on one chart
- **Reference lines/areas**: Threshold visualization for anomaly highlighting
- **Responsive containers**: Auto-resize to dashboard layout

Recharts is declarative (JSX-based), works naturally with React state, and handles the "80% of chart types" this project needs.

**Why not Chart.js / react-chartjs-2:** Canvas-based rendering makes customization harder. Recharts' SVG output is easier to style and inspect.
**Why not Nivo:** More opinionated, heavier bundle. Recharts is simpler for the chart types we need.
**Why not Victory:** Less active maintenance, smaller community in 2025/2026.
**Why not Tremor:** Tremor is good for pre-built dashboard components but locks you into their design system. We need more control for custom collection curve visualizations.
**Why not D3 directly:** Too low-level for standard charts. Only reach for D3/Observable Plot if we need truly custom visualizations that Recharts can't handle.

---

### State Management & Data Fetching

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Server state / caching** | TanStack Query (React Query) | ^5.x | HIGH |
| **Client state** | Zustand | ^5.x | HIGH |
| **URL state** | nuqs | ^2.x | MEDIUM |

**TanStack Query** handles all Snowflake data fetching: caching, background refetching, loading/error states, and stale-while-revalidate. This is non-negotiable for a data dashboard -- it means switching between views feels instant because previously-fetched data is cached.

**Zustand** for client-side state: saved view configurations, active filters, column ordering, dashboard layout state. Zustand is tiny (~1KB), has no boilerplate, and persists to localStorage trivially (built-in `persist` middleware). This is how saved views work: Zustand stores the view config, persists it, and TanStack Query fetches data based on that config.

**nuqs** for URL-synced state: When a user applies filters, the URL updates so views are shareable/bookmarkable. nuqs is a lightweight library purpose-built for Next.js App Router query string state.

**Why not Redux / Redux Toolkit:** Massive overkill for 2-3 users and a handful of state slices. Zustand does everything we need with 90% less code.
**Why not Jotai/Recoil:** Atomic state is elegant but Zustand's store pattern is simpler for dashboard config objects that have many related fields.
**Why not SWR:** TanStack Query has better devtools, more granular cache control, and better mutation support if we ever need it.

---

### Snowflake Connectivity

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Snowflake driver** | snowflake-sdk (Node.js) | ^1.x | HIGH |
| **Connection pattern** | Next.js Route Handlers (App Router API routes) | N/A | HIGH |
| **Connection pooling** | Single persistent connection with reconnect logic | N/A | MEDIUM |

**snowflake-sdk** is Snowflake's official Node.js driver. It runs server-side only in Next.js Route Handlers (`app/api/*/route.ts`). Credentials are stored in environment variables on Vercel, never sent to the client.

Architecture:
```
Client (TanStack Query) -> Next.js Route Handler -> snowflake-sdk -> Snowflake
```

The Route Handler receives filter/sort/pagination params, constructs a parameterized SQL query, executes it against Snowflake, and returns JSON. All queries are read-only (SELECT only).

**Why Node.js driver, not Python:** The project constraint is React/Next.js on Vercel. Vercel serverless functions run Node.js natively. A Python API layer would require a separate service (e.g., FastAPI on Railway/Fly), adding deployment complexity, latency, and a second repo. The Node.js driver keeps everything in one Next.js app.

**Why not Prisma/Drizzle:** These ORMs don't support Snowflake. Raw SQL via snowflake-sdk is the correct approach for an analytical data warehouse.

**Connection management note:** Vercel serverless functions are ephemeral. Each invocation may need to establish a new Snowflake connection. To mitigate cold start latency:
- Cache the connection in module scope (survives across warm invocations)
- Use Snowflake key-pair authentication (faster than password auth)
- Consider Vercel's Edge Config or a connection proxy if latency becomes an issue

---

### Styling & UI Components

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **CSS framework** | Tailwind CSS | ^4.x | HIGH |
| **Component primitives** | Shadcn/ui | latest (not versioned, copy-paste) | HIGH |
| **Icons** | Lucide React | ^0.4x | HIGH |

**Tailwind CSS v4** is the current standard for utility-first styling in Next.js apps. It pairs perfectly with Shadcn/ui.

**Shadcn/ui** is not a component library -- it's a collection of accessible, well-designed component source code you copy into your project. This means zero dependency lock-in, full customization control, and components built on Radix UI primitives (accessible by default). Key components we'll use:
- `Table` (base for TanStack Table integration)
- `Select`, `Input`, `Button` (filter controls)
- `Dialog`, `Sheet` (saved view management)
- `Tabs` (dashboard navigation)
- `DropdownMenu` (column visibility toggles, actions)
- `Badge` (anomaly indicators)
- `Card` (metric cards, chart containers)
- `Tooltip` (data point details)

**Why not MUI / Ant Design / Chakra:** These are full design systems with heavy runtime CSS-in-JS. Tailwind + Shadcn is lighter, faster, and gives complete control -- critical for a data-dense dashboard where every pixel matters.

---

### Saved Views & Dashboard Configuration

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **View persistence** | Zustand persist -> localStorage (MVP), Vercel KV (v2) | N/A | HIGH |
| **Layout engine** | CSS Grid (MVP), react-grid-layout (if drag-and-drop needed) | ^1.x | MEDIUM |

**MVP approach:** Saved views are JSON objects stored in Zustand with `persist` middleware writing to localStorage. A "view" is a serializable config:
```typescript
interface SavedView {
  id: string;
  name: string;
  table: string;
  columns: string[];        // visible columns in order
  columnWidths: Record<string, number>;
  sorting: SortingState;
  filters: FilterState;
  chartConfig?: ChartConfig;
}
```

This is the fastest path to "saved views that survive page refresh" for 2-3 users on their own machines.

**V2 upgrade path:** When views need to be shared between users, move persistence to Vercel KV (Redis) or Vercel Postgres. The Zustand store shape stays the same -- only the persistence layer changes.

**Why not a database from day one:** YAGNI. Two users on their own laptops don't need server-side view storage yet. localStorage is zero-infrastructure.

---

### Deployment & Infrastructure

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Hosting** | Vercel | N/A | HIGH (constraint) |
| **Environment variables** | Vercel Environment Variables | N/A | HIGH |
| **Secrets** | Snowflake credentials in Vercel env vars | N/A | HIGH |

Vercel deployment is a project constraint. The full stack runs as a single Next.js app:
- **Frontend**: Static + client-side rendering via Vercel CDN
- **API routes**: Vercel Serverless Functions (Node.js runtime)
- **No separate backend needed**

Environment variables for Snowflake:
- `SNOWFLAKE_ACCOUNT`
- `SNOWFLAKE_USERNAME`
- `SNOWFLAKE_PASSWORD` (or `SNOWFLAKE_PRIVATE_KEY` for key-pair auth)
- `SNOWFLAKE_WAREHOUSE`
- `SNOWFLAKE_DATABASE`
- `SNOWFLAKE_SCHEMA`

---

### Development Tooling

| Component | Choice | Version | Confidence |
|-----------|--------|---------|------------|
| **Package manager** | pnpm | ^9.x | HIGH |
| **Linting** | ESLint + Next.js config | ^9.x | HIGH |
| **Formatting** | Prettier | ^3.x | HIGH |
| **Type checking** | TypeScript strict mode | ^5.6 | HIGH |

**pnpm** over npm/yarn: Faster installs, disk-efficient, strict dependency resolution that prevents phantom dependencies. This is the standard for 2025/2026 projects.

---

## Full Dependency List

### Production Dependencies
```
next
react
react-dom
@tanstack/react-table
@tanstack/react-query
recharts
zustand
nuqs
snowflake-sdk
lucide-react
tailwindcss
@radix-ui/react-* (installed per-component via shadcn)
clsx
tailwind-merge
class-variance-authority
```

### Development Dependencies
```
typescript
@types/react
@types/node
eslint
eslint-config-next
prettier
@tanstack/react-query-devtools
```

---

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| **Python/FastAPI backend** | Adds a second service, second deploy target, and cross-origin complexity. Node.js snowflake-sdk in Next.js Route Handlers keeps it all in one app on Vercel. |
| **Pages Router** | Legacy. App Router has RSC, streaming, and is where Next.js development is focused. |
| **AG Grid** | Paid enterprise features for pivoting/aggregation. TanStack Table is free and sufficient. |
| **Redux / Redux Toolkit** | Massive boilerplate for a 2-3 user app. Zustand does the same in 1/10th the code. |
| **MUI / Ant Design** | Heavy CSS-in-JS runtime, opinionated design system. Tailwind + Shadcn is lighter and more customizable. |
| **Prisma / Drizzle** | ORMs that don't support Snowflake. Raw SQL is the right approach for analytical queries. |
| **D3 (as primary)** | Too low-level for standard charts. Recharts wraps D3 with a React-friendly API. |
| **Retool / Metabase** | Project explicitly chose custom React for full UX control and future AI layer. |
| **tRPC** | Adds complexity without benefit when the API surface is straightforward REST-like queries. Route Handlers are simpler. |
| **GraphQL** | Overkill for a read-only dashboard with predictable query shapes. REST via Route Handlers is simpler. |
| **NextAuth / Clerk** | Auth is out of scope for MVP. 2-3 internal users, no multi-tenancy needed. |
| **Vercel Postgres / Planetscale** | No database needed for MVP. Snowflake is the data source. Saved views go in localStorage. |

---

## Architecture Diagram

```
+--------------------------------------------------+
|                   Vercel (Production)             |
|                                                   |
|  +--------------------+  +---------------------+ |
|  |  Next.js Frontend  |  |  Route Handlers     | |
|  |  (App Router)      |  |  (Serverless Fns)   | |
|  |                    |  |                      | |
|  |  - TanStack Table  |  |  - snowflake-sdk    | |
|  |  - Recharts        |  |  - SQL query builder| |
|  |  - Shadcn/ui       |  |  - JSON response    | |
|  |  - Zustand (state) |  |                      | |
|  |  - TanStack Query  |  |                      | |
|  +--------+-----------+  +----------+-----------+ |
|           |                          |             |
|           |    fetch('/api/query')   |             |
|           +------------------------->|             |
|                                      |             |
+--------------------------------------|-------------+
                                       |
                                       | snowflake-sdk
                                       v
                              +------------------+
                              |    Snowflake     |
                              |                  |
                              | agg_batch_       |
                              | performance_     |
                              | summary          |
                              |                  |
                              | master_accounts  |
                              | (future)         |
                              +------------------+
```

---

## Key Technical Decisions

### 1. All-in-one Next.js (no separate API)
The Snowflake queries run inside Next.js Route Handlers, which deploy as Vercel Serverless Functions. This means one repo, one deploy, one domain. No CORS issues, no API gateway, no second service to maintain.

### 2. Server Components for initial data loads
The first page load can use React Server Components to fetch data server-side and stream HTML. Subsequent interactions (filtering, sorting, pagination) go through TanStack Query hitting Route Handlers.

### 3. Parameterized SQL, not an ORM
Snowflake queries are analytical SQL (aggregations, window functions, CTEs). An ORM would fight us. We write SQL directly with parameterized inputs to prevent injection, wrapped in a thin query builder utility.

### 4. Client-side table operations where possible
For tables under ~10K rows, do sorting/filtering client-side via TanStack Table. This makes the UI feel instant. For larger datasets, push sorting/filtering to Snowflake via query params.

### 5. Saved views in localStorage first
Zero-infrastructure persistence for MVP. Upgrade path to Vercel KV is straightforward when users need to share views.

---

## Version Confidence Note

Versions listed are based on the stable releases known as of early 2025. Before initializing the project, run `pnpm create next-app@latest` and check the following for any major version bumps:
- `npm view next version`
- `npm view @tanstack/react-table version`
- `npm view recharts version`
- `npm view zustand version`
- `npm view snowflake-sdk version`

The architectural choices and library selections are stable regardless of minor/patch version changes. The only potential shift would be if TanStack Table v9 ships (unlikely to change the API dramatically) or if Next.js 16 drops (App Router API is stable).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Snowflake cold start latency on Vercel | HIGH | MEDIUM | Module-scope connection caching, key-pair auth, consider Vercel Pro for longer function timeouts |
| 61-column table performance | MEDIUM | MEDIUM | Virtual scrolling via TanStack Virtual if rendering slows, column visibility to hide unused columns |
| Recharts limitation for custom viz | LOW | LOW | D3/Observable Plot escape hatch available for edge cases |
| Saved views data loss (localStorage) | MEDIUM | LOW | Export/import JSON as stopgap, upgrade to Vercel KV when needed |
| Snowflake query cost on frequent refresh | LOW | MEDIUM | TanStack Query caching with appropriate staleTime (5-15 min), manual refresh button instead of auto-refresh |

---

*Stack research complete. Ready for roadmap creation.*
