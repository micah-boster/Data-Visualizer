# Architecture Patterns

**Domain:** AI-augmented data visualization (NLQ + anomaly detection + cross-partner comparison)
**Researched:** 2026-04-12
**Confidence:** HIGH (existing codebase fully analyzed, Vercel AI SDK well-documented)

## Current Architecture (Baseline)

```
Browser (React 19)
  |
  +-- useData() -----> GET /api/data -----> Snowflake (agg_batch_performance_summary)
  |                                          or static cache fallback
  +-- useAccountData() -> GET /api/accounts -> Snowflake (master_accounts)
  |
  +-- usePartnerStats(partnerName, allRows)
  |     |-- computeKpis()       (lib/computation/compute-kpis.ts)
  |     |-- computeNorms()      (lib/computation/compute-norms.ts)
  |     |-- reshapeCurves()     (lib/computation/reshape-curves.ts)
  |     |-- computeTrending()   (lib/computation/compute-trending.ts)
  |
  +-- PartnerNormsProvider (React Context)
  |     |-- deviation coloring in FormattedCell
  |
  +-- DataDisplay (orchestrator)
        |-- KpiSummaryCards (partner level)
        |-- CollectionCurveChart (partner level, dynamic import)
        |-- DataTable (TanStack Table + virtual scrolling)
```

**Key characteristics:**
- All 477+ batch rows (61 columns) fetched once, cached client-side via React Query
- Partner drill-down is client-side filter on PARTNER_NAME
- Computation is client-side in `usePartnerStats` composing 4 pure modules
- `computeNorms()` already computes mean + population stddev per metric
- `computeTrending()` already computes batch-over-batch rolling averages with 5% threshold
- `metric-polarity.ts` already defines which metrics are "higher_is_better" vs "lower_is_better"
- Drill-down state is React state, managed by `useDrillDown()`
- Snowflake connection pooled server-side, 45s timeout under Vercel's 60s limit
- `executeQuery()` in `lib/snowflake/queries.ts` supports parameterized queries

## Recommended Architecture (v3.0)

Three new capabilities slot into the existing architecture without restructuring it:

```
Browser (React 19)
  |
  +-- [EXISTING] useData() ---------> GET /api/data -----> Snowflake
  +-- [EXISTING] useAccountData() --> GET /api/accounts -> Snowflake
  +-- [EXISTING] usePartnerStats()
  |
  +-- [NEW] useAnomalies(allRows) --> Pure computation (no API call)
  |     |-- detectPartnerAnomalies()   Z-score against cross-partner norms
  |     |-- detectBatchAnomalies()     Z-score against within-partner norms
  |     Returns: AnomalyReport with flagged partners/batches + reasons
  |
  +-- [NEW] AnomalyContext (React Context)
  |     |-- Provides anomaly badges + highlights to DataTable cells
  |     |-- Anomaly summary panel at root level
  |
  +-- [NEW] useChat() (Vercel AI SDK) --> POST /api/chat --> Claude API
  |     |-- Streams narrative responses
  |     |-- Receives structured data context as system prompt
  |     |-- Tool calls for live Snowflake queries
  |
  +-- [NEW] useCrossPartnerComparison(allRows)
  |     |-- computePercentileRankings()
  |     |-- computeNormalizedTrajectories()
  |     Returns: PercentileRanking[], NormalizedCurve[]
  |
  +-- [NEW COMPONENTS]
        |-- AnomalySummaryPanel (root level)
        |-- AnomalyBadge (table cells)
        |-- ChatPanel (slide-out drawer)
        |-- CrossPartnerRankingTable
        |-- NormalizedCurveOverlay (Recharts)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useAnomalies` hook | Detect statistical anomalies across all batch data | Consumes `useData()` output, feeds AnomalyContext |
| `AnomalyContext` | Distribute anomaly flags to cell renderers | Consumed by DataTable cells, AnomalySummaryPanel |
| `POST /api/chat` | Server-side Claude API route with Snowflake tool access | Claude API, Snowflake via `executeQuery` |
| `ChatPanel` | Slide-out UI for natural language queries | `useChat()` from Vercel AI SDK |
| `useCrossPartnerComparison` | Compute percentile rankings and normalized curves | Consumes `useData()` output |
| `CrossPartnerRankingTable` | Percentile ranking display at root level | `useCrossPartnerComparison` output |
| `NormalizedCurveOverlay` | Recharts overlay comparing partner trajectories | `useCrossPartnerComparison` output |

## Integration Points with Existing Code

### 1. Anomaly Detection -- Extends Existing Computation Pattern

**Why it fits:** The existing `usePartnerStats` composes 4 pure computation modules. Anomaly detection is a 5th computation that follows the same pattern but operates on ALL rows (cross-partner) rather than one partner's rows.

**Reuse of existing code:**
- `computeNorms()` logic (mean + stddev) reused for cross-partner norms
- `metric-polarity.ts` reused to determine whether anomaly is good or bad
- `TRENDING_METRICS` list reused for which metrics to flag

**Integration:**
- New `lib/computation/detect-anomalies.ts` follows exact same pattern as `compute-trending.ts`
- New `useAnomalies(allRows)` hook mirrors `usePartnerStats` structure
- `AnomalyContext` parallels `PartnerNormsContext` -- wraps DataTable, consumed by cells

**What changes in existing code:**
- `DataDisplay` -- add `AnomalyProvider` wrapping the layout (same pattern as `PartnerNormsProvider`)
- `FormattedCell` -- optionally render anomaly badge when `AnomalyContext` flags the cell
- Root-level layout -- add `AnomalySummaryPanel` above the table

**What does NOT change:**
- `useData`, `usePartnerStats`, `computeNorms`, `computeTrending` -- untouched
- API routes -- no changes needed, anomaly detection is client-side
- DataTable core, column configs, drill-down logic -- untouched

### 2. Claude Query Layer -- New Server Route + Client Panel

**Why Vercel AI SDK:** Already deployed on Vercel, already using Next.js 16. The AI SDK provides `streamText` server-side and `useChat` client-side with streaming baked in. No custom SSE or WebSocket plumbing. Anthropic is a first-class provider.

**Packages:** `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`

**Server side** (`/api/chat/route.ts`):
```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { executeQuery } from '@/lib/snowflake/queries';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: buildSystemPrompt(context),
    messages,
    tools: {
      querySnowflake: {
        description: 'Run a read-only SQL query against batch performance or account data',
        parameters: z.object({
          sql: z.string().describe('SELECT query against allowed tables'),
        }),
        execute: async ({ sql }) => {
          // Validate: must be SELECT, allowed tables only, enforce LIMIT
          const validated = validateAndSanitizeSQL(sql);
          const rows = await executeQuery(validated);
          return { rows: rows.slice(0, 100) };
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
```

**Client side:**
```typescript
import { useChat } from '@ai-sdk/react';

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { context: { drillState, anomalySummary, partnerName } },
});
```

**What changes in existing code:**
- `DataDisplay` or `layout.tsx` -- add ChatPanel trigger button (FAB or header button)
- New env var: `ANTHROPIC_API_KEY` in Vercel environment

**What does NOT change:**
- All existing data fetching, computation, rendering -- untouched
- Snowflake connection module -- reused as-is by the chat tool
- `providers.tsx` -- no changes needed (useChat manages its own state)

### 3. Cross-Partner Comparison -- Extends Computation + New Charts

**Integration:**
- New `lib/computation/compute-percentiles.ts` -- rank partners on key metrics
- New `lib/computation/normalize-curves.ts` -- normalize collection curves to % of total placed
- New `useCrossPartnerComparison(allRows)` hook at root level
- New chart components extend existing Recharts + shadcn Chart patterns

**What changes in existing code:**
- `DataDisplay` -- add comparison view at root level (tab or section below table)

**What does NOT change:**
- Existing charts, KPIs, table -- untouched
- API routes -- no changes, all computation is client-side

## Data Flow

### Anomaly Detection Data Flow

```
GET /api/data (existing, already cached)
  |
  v
allRows (477+ batch records, cached in React Query)
  |
  +---> useAnomalies(allRows)
  |       |
  |       +---> computeCrossPartnerNorms(allRows)
  |       |       Group by PARTNER_NAME
  |       |       Aggregate each partner's metrics (weighted or averaged)
  |       |       Compute mean + stddev ACROSS partners
  |       |
  |       +---> For each partner:
  |       |       For each metric:
  |       |         Z-score = (partnerAggregate - crossPartnerMean) / crossPartnerStddev
  |       |         |Z| > 2.0 --> WARNING
  |       |         |Z| > 3.0 --> CRITICAL
  |       |         Use metric-polarity.ts to label "good" vs "bad" anomaly
  |       |
  |       +---> For each partner's batches:
  |       |       Within-partner norms (same as computeNorms but for anomaly flags)
  |       |       Flag batches deviating > 2 stddev from their own partner's norms
  |       |
  |       v
  |     AnomalyReport {
  |       partnerAnomalies: Map<partnerName, Anomaly[]>
  |       batchAnomalies: Map<batchKey, Anomaly[]>
  |       summary: { totalFlags, criticalCount, warningCount }
  |     }
  |
  +---> AnomalyContext.Provider
          |
          +---> AnomalySummaryPanel (root level: "3 partners need attention")
          +---> DataTable cells (badge overlay when metric is flagged)
          +---> KpiSummaryCards (anomaly indicator on partner-level KPIs)
```

### Claude Query Layer Data Flow

```
User types question in ChatPanel
  |
  v
useChat() sends POST /api/chat
  |  Body: { messages, context: { drillState, filters, anomalySummary } }
  |
  v
/api/chat/route.ts
  |
  +---> Builds system prompt with:
  |       - Available tables: agg_batch_performance_summary (61 cols), master_accounts (78 cols)
  |       - Current drill context (which partner/batch user is viewing)
  |       - Current anomaly flags (so Claude can reference them)
  |       - Summary statistics (partner count, batch count, date range)
  |
  +---> streamText({ model: anthropic('claude-sonnet-4-5'), system, messages, tools })
  |       |
  |       +---> Claude generates narrative response
  |       |       OR
  |       +---> Claude calls querySnowflake tool
  |               |
  |               v
  |             validateAndSanitizeSQL(sql)
  |               - Must start with SELECT
  |               - Only allowed tables: agg_batch_performance_summary, master_accounts
  |               - Enforce LIMIT 100
  |               - Strip any DDL/DML keywords
  |               |
  |               v
  |             executeQuery() (existing Snowflake module, reused as-is)
  |               |
  |               v
  |             Results returned to Claude for interpretation
  |
  v
Streaming response --> useChat() --> ChatPanel UI
  (tokens appear in real-time via SSE)
```

### Cross-Partner Comparison Data Flow

```
GET /api/data (existing, already cached)
  |
  v
allRows (477+ batch records)
  |
  +---> useCrossPartnerComparison(allRows)
          |
          +---> computePercentileRankings(allRows)
          |       Group by PARTNER_NAME
          |       For each partner: compute aggregate KPIs (reuse computeKpis pattern)
          |       For each metric: rank all partners, compute percentile position
          |       Return: PercentileRanking[] { partnerName, metric, value, percentile }
          |
          +---> computeNormalizedTrajectories(allRows)
          |       For each partner: get collection curves (reuse reshapeCurves pattern)
          |       Normalize: convert amounts to % of TOTAL_AMOUNT_PLACED
          |       Align on BATCH_AGE_IN_MONTHS for x-axis comparability
          |       Average across batches per partner to get single trajectory
          |       Return: NormalizedCurve[] { partnerName, points: {month, pctRecovered}[] }
          |
          v
        CrossPartnerData {
          rankings: PercentileRanking[]
          normalizedCurves: NormalizedCurve[]
        }
          |
          +---> CrossPartnerRankingTable (root level, sortable by any metric)
          +---> NormalizedCurveOverlay (root level, Recharts multi-line)
```

## Patterns to Follow

### Pattern 1: Client-Side Computation Hook

**What:** Pure computation in `useMemo`, following `usePartnerStats` pattern.
**When:** Transforming already-fetched data without additional API calls.
**Why:** Data is already client-side via React Query. No reason to round-trip to server. With 477 rows, computation is trivial (~1ms).

```typescript
// hooks/use-anomalies.ts
export function useAnomalies(allRows: Record<string, unknown>[]): AnomalyReport | null {
  return useMemo(() => {
    if (allRows.length === 0) return null;
    return detectAnomalies(allRows);
  }, [allRows]);
}
```

### Pattern 2: React Context for Cross-Cutting UI State

**What:** Context provider distributing computed state to deeply nested components.
**When:** Multiple unrelated components need the same derived data.
**Why:** Mirrors existing `PartnerNormsContext`. Avoids prop drilling anomaly data through DataTable.

```typescript
// contexts/anomaly.tsx -- follows exact same shape as contexts/partner-norms.tsx
const AnomalyContext = createContext<AnomalyReport | null>(null);

export function AnomalyProvider({ report, children }: { report: AnomalyReport | null; children: ReactNode }) {
  return (
    <AnomalyContext.Provider value={report}>
      {children}
    </AnomalyContext.Provider>
  );
}

export function useAnomalyFlags() {
  const ctx = useContext(AnomalyContext);
  if (!ctx) throw new Error('useAnomalyFlags must be used within AnomalyProvider');
  return ctx;
}
```

### Pattern 3: Vercel AI SDK for Streaming Chat

**What:** `streamText` on server, `useChat` on client, tool calling for Snowflake access.
**When:** Building the natural language query interface.
**Why:** First-party Vercel integration. Handles streaming/SSE, manages conversation state, supports Anthropic tool use natively. No custom WebSocket or event source code needed.

### Pattern 4: System Prompt as Data Context Bridge

**What:** Inject current application state into Claude's system prompt so it knows what the user is looking at.
**When:** Every chat message.
**Why:** Claude needs context about the current view, filters, and anomalies to give relevant answers.

```typescript
function buildSystemPrompt(context: ChatContext): string {
  return `You are a data analyst for Bounce's partnerships team.
The user is viewing: ${context.drillState.level} level
${context.drillState.partner ? `Partner: ${context.drillState.partner}` : 'All partners'}
${context.anomalySummary ? `Current anomaly flags:\n${context.anomalySummary}` : 'No anomalies flagged.'}

Available tables:
- agg_batch_performance_summary (${context.batchCount} rows, 61 columns including penetration rate, collection amounts at months 1-60, batch age)
- master_accounts (account-level detail, 78 columns)

When querying, always include a LIMIT clause. Explain findings in plain language for a non-technical partnerships team.`;
}
```

### Pattern 5: SQL Safety Layer for Chat Tool

**What:** Validate and sanitize any SQL Claude generates before executing against Snowflake.
**When:** Every querySnowflake tool call.
**Why:** Claude generates SQL from user prompts. Must prevent injection, DDL, and runaway queries.

```typescript
function validateAndSanitizeSQL(sql: string): string {
  const trimmed = sql.trim();

  // Must be a SELECT
  if (!/^SELECT\s/i.test(trimmed)) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Block dangerous keywords
  const blocked = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;
  if (blocked.test(trimmed)) {
    throw new Error('Query contains disallowed keywords');
  }

  // Only allowed tables
  const allowedTables = ['agg_batch_performance_summary', 'master_accounts'];
  const fromMatch = trimmed.match(/FROM\s+(\w+)/i);
  if (fromMatch && !allowedTables.includes(fromMatch[1].toLowerCase())) {
    throw new Error(`Table ${fromMatch[1]} is not accessible`);
  }

  // Enforce LIMIT
  if (!/LIMIT\s+\d+/i.test(trimmed)) {
    return trimmed.replace(/;?\s*$/, ' LIMIT 100');
  }

  return trimmed;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side Anomaly Detection

**What:** Computing anomalies in an API route instead of client-side.
**Why bad:** Data is already fetched and cached client-side via React Query. Server round-trip adds latency for no benefit. With 477 rows, computation is ~1ms in the browser.
**Instead:** Pure computation in `useMemo`, same as `usePartnerStats`.

### Anti-Pattern 2: Giving Claude Unrestricted SQL Access

**What:** Letting Claude generate and execute arbitrary SQL without validation.
**Why bad:** SQL injection risk, runaway queries hitting Vercel's 60s timeout, accidental full table scans.
**Instead:** Validate server-side: must be SELECT, allowed tables only, LIMIT enforced. See Pattern 5 above.

### Anti-Pattern 3: Sending All Data in the Chat Context

**What:** Stuffing 477 rows x 61 columns into the system prompt.
**Why bad:** ~500K+ tokens, slow, expensive, unnecessary.
**Instead:** Send summary statistics in the system prompt. Let Claude use the `querySnowflake` tool when it needs specific data.

### Anti-Pattern 4: Custom WebSocket/SSE for Chat

**What:** Building custom streaming infrastructure for the chat interface.
**Why bad:** Vercel AI SDK's `useChat` handles all of this out of the box.
**Instead:** `useChat()` hook with `body` parameter to pass context.

### Anti-Pattern 5: New API Routes for Anomaly/Comparison Data

**What:** Creating `/api/anomalies` or `/api/comparison` endpoints.
**Why bad:** Data is already on the client. Server routes add complexity and latency for zero benefit.
**Instead:** Client-side computation hooks following existing patterns.

### Anti-Pattern 6: Real-Time Anomaly Monitoring

**What:** Polling for anomalies, WebSocket updates, background workers.
**Why bad:** This is a dashboard viewed by 2-3 people on demand. Data refreshes when they load the page. Real-time adds massive complexity for no value.
**Instead:** Compute anomalies once when data loads. Re-compute when data refetches (React Query handles this naturally).

## New Files Needed

### API Routes (1 new)

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Claude query layer -- POST with streamText + Snowflake tool |

### Computation Modules (3 new)

| File | Purpose |
|------|---------|
| `src/lib/computation/detect-anomalies.ts` | Z-score anomaly detection (cross-partner + within-partner) |
| `src/lib/computation/compute-percentiles.ts` | Percentile ranking of partners on key metrics |
| `src/lib/computation/normalize-curves.ts` | Normalize collection curves for cross-partner overlay |

### Utility Modules (1 new)

| File | Purpose |
|------|---------|
| `src/lib/chat/system-prompt.ts` | Build context-aware system prompt for Claude |
| `src/lib/chat/sql-validator.ts` | Validate and sanitize Claude-generated SQL |

### Hooks (2 new)

| File | Purpose |
|------|---------|
| `src/hooks/use-anomalies.ts` | Memoized anomaly computation from allRows |
| `src/hooks/use-cross-partner-comparison.ts` | Memoized percentile + normalized curve computation |

### Contexts (1 new)

| File | Purpose |
|------|---------|
| `src/contexts/anomaly.tsx` | AnomalyProvider + useAnomalyFlags hook |

### Types (2 new)

| File | Purpose |
|------|---------|
| `src/types/anomaly.ts` | Anomaly, AnomalyReport, AnomalySeverity types |
| `src/types/comparison.ts` | PercentileRanking, NormalizedCurve types |

### Components (5-6 new)

| File | Purpose |
|------|---------|
| `src/components/anomaly/anomaly-summary-panel.tsx` | Root-level anomaly overview ("3 partners need attention") |
| `src/components/anomaly/anomaly-badge.tsx` | Inline badge for flagged cells/rows |
| `src/components/chat/chat-panel.tsx` | Slide-out drawer with chat interface |
| `src/components/chat/chat-message.tsx` | Individual message rendering (user + assistant) |
| `src/components/comparison/cross-partner-ranking.tsx` | Percentile ranking table |
| `src/components/comparison/normalized-curve-overlay.tsx` | Recharts multi-partner normalized overlay |

### Modified Files (3 existing)

| File | Change |
|------|--------|
| `src/components/data-display.tsx` | Add AnomalyProvider, AnomalySummaryPanel, ChatPanel trigger, comparison section |
| `src/components/table/formatted-cell.tsx` | Consume AnomalyContext for optional badge rendering on flagged cells |
| `package.json` | Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` |

## Scalability Considerations

| Concern | At 477 rows (now) | At 5K rows | At 50K rows |
|---------|-------------------|------------|-------------|
| Anomaly computation | <1ms, useMemo | <10ms, fine | Web Worker or server-side |
| Chat system prompt | Summary stats (~500 tokens) | Same approach | Same approach |
| Cross-partner charts | All partners overlay | Filter to top 15-20 | Cluster/sample |
| Snowflake query via chat | 45s timeout, fine | Add LIMIT enforcement | Add query cost estimation |
| Cross-partner percentiles | Trivial grouping | Trivial | Consider server-side aggregation |

With 477 rows and 2-3 users, all client-side computation is trivially fast. The architecture scales to ~5K rows without changes. Beyond that, move heavy computation to Web Workers or server-side aggregation in Snowflake views.

## Build Order (Dependency-Driven)

```
Phase 1: Anomaly Detection (no new dependencies, no API keys)
  - types/anomaly.ts
  - lib/computation/detect-anomalies.ts (reuses computeNorms pattern)
  - hooks/use-anomalies.ts
  - contexts/anomaly.tsx
  - components/anomaly/anomaly-summary-panel.tsx
  - components/anomaly/anomaly-badge.tsx
  - Modified: data-display.tsx (add AnomalyProvider)
  - Modified: formatted-cell.tsx (consume AnomalyContext)
  WHY FIRST: Pure computation, no external dependencies, no API keys.
  Immediately surfaces value. Provides anomaly data that enriches
  both the chat layer (Phase 3) and comparison views (Phase 2).

Phase 2: Cross-Partner Comparison (no new dependencies)
  - types/comparison.ts
  - lib/computation/compute-percentiles.ts
  - lib/computation/normalize-curves.ts
  - hooks/use-cross-partner-comparison.ts
  - components/comparison/cross-partner-ranking.tsx
  - components/comparison/normalized-curve-overlay.tsx
  - Modified: data-display.tsx (add comparison section at root level)
  WHY SECOND: Also pure computation. Extends existing Recharts patterns.
  No external service dependencies.

Phase 3: Claude Query Layer (requires ANTHROPIC_API_KEY)
  - npm install ai @ai-sdk/anthropic @ai-sdk/react
  - lib/chat/system-prompt.ts
  - lib/chat/sql-validator.ts
  - app/api/chat/route.ts
  - components/chat/chat-panel.tsx
  - components/chat/chat-message.tsx
  - Modified: data-display.tsx (add chat trigger)
  - New env var: ANTHROPIC_API_KEY
  WHY LAST: Requires API key, incurs per-query cost, most complex
  (prompt engineering, SQL safety, streaming UI). Anomaly detection
  and comparison provide context that makes chat smarter -- Claude
  can reference flagged anomalies and ranking data.
```

**Phase ordering rationale:**
1. Anomaly detection is foundational -- it produces data consumed by both the comparison layer (which anomalies to highlight) and the chat layer (anomaly context in system prompt).
2. Cross-partner comparison is self-contained and extends existing patterns.
3. Chat depends on both prior features for richest context, plus requires external API setup.

## Sources

- Existing codebase analysis: full read of all hooks, API routes, computation modules, types, contexts, components
- [Vercel AI SDK documentation](https://ai-sdk.dev/docs/introduction) -- streamText, useChat, tool calling
- [Vercel AI SDK Anthropic provider](https://sdk.vercel.ai/docs/guides/providers/anthropic) -- model configuration
- [AI SDK useChat reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) -- hook API, streaming, body parameter
- [Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- output_config.format
- [Statistical anomaly detection methods](https://www.tinybird.co/blog/anomaly-detection) -- Z-score for time series
- [Moving Z-Score vs Moving IQR](https://medium.com/@kis.andras.nandor/detecting-time-series-anomalies-moving-z-score-vs-moving-iqr-70754d853105) -- method comparison
