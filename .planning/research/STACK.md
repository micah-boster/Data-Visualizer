# Technology Stack

**Project:** Bounce Data Visualizer v3.0 -- Intelligence & Cross-Partner Comparison
**Researched:** 2026-04-12
**Scope:** NEW additions only. Existing stack (Next.js 16, React 19, TanStack Table, React Query, Recharts 3.8, Tailwind 4, shadcn/ui, Snowflake SDK, Zod 4) is validated and unchanged.

> v2.0 stack research (Recharts, conditional formatting, KPI cards) remains valid and is not repeated here. This document covers only v3.0 additions.

## Recommended Stack Additions

### Claude AI Query Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ai` (Vercel AI SDK) | ^6.0.158 | Streaming text generation, `useChat` hook, server/client bridge | First-class Next.js integration. Handles streaming, abort signals, message history, and UI state out of the box. Eliminates manual SSE/WebSocket plumbing. Already deployed on Vercel so zero config for edge runtime. |
| `@ai-sdk/anthropic` | ^3.0.69 | Anthropic provider for AI SDK | Plugs Claude models into AI SDK's `streamText`/`generateText`. One-line model swap if needed later. |

**Why AI SDK instead of raw `@anthropic-ai/sdk`:** The raw Anthropic SDK gives you a streaming API but you still need to build: message serialization, abort handling, client-side state management, token-by-token rendering, and error recovery. AI SDK wraps all of that with `useChat` (client) + `streamText` (server route handler). Since the app is already on Next.js + Vercel, this is the path of least resistance. The raw SDK makes sense for server-to-server pipelines; AI SDK makes sense for interactive chat UIs.

**Integration pattern:**
- Route handler at `app/api/chat/route.ts` using `streamText` with `@ai-sdk/anthropic`
- Client component using `useChat` hook from `ai/react`
- System prompt injects serialized data context (partner stats, norms, anomalies) so Claude answers about *this* data
- `ANTHROPIC_API_KEY` env var in Vercel, server-side only (same pattern as existing Snowflake creds)

**Confidence:** HIGH -- AI SDK v6 + @ai-sdk/anthropic are actively maintained (published within last 24 hours), well-documented, and purpose-built for this exact pattern.

### Anomaly Detection & Statistical Computation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `simple-statistics` | ^7.8.8 | z-scores, percentiles, standard deviation, IQR, quantile ranks | Zero dependencies. Tree-shakeable. Battle-tested (10+ years, millions of weekly downloads). Provides exactly the statistical primitives needed without pulling in an ML framework. |

**Why simple-statistics instead of an ML library (isolation-forest, etc.):**
1. The dataset is small -- hundreds of batch rows, not millions. ML-based anomaly detection (Isolation Forest, DBSCAN) is overkill and adds complexity without proportional value.
2. The `isolation-forest` npm package was last published 4 years ago (v0.0.9) -- effectively abandoned.
3. The existing codebase already computes mean/stddev/norms manually in `compute-norms.ts`. `simple-statistics` replaces that hand-rolled math with tested implementations and adds percentile/IQR/z-score functions needed for anomaly flagging.
4. Financial batch data has clear expected distributions -- z-score thresholds (e.g., |z| > 2.0) are interpretable and explainable, which matters per the project's "explainable transformations" constraint.

**Why NOT build anomaly detection into Claude:** Claude should narrate and explain anomalies, not detect them. Detection must be deterministic and reproducible -- if you ask Claude "is this anomalous?" twice, you may get different answers. Compute anomaly scores server-side, pass them to Claude as context for narrative generation.

**Integration pattern:**
- New computation module `compute-anomalies.ts` alongside existing `compute-norms.ts` and `compute-trending.ts`
- Extends `usePartnerStats` to include anomaly scores in `PartnerStats` type
- Uses z-scores against partner norms (already computed) and cross-partner percentiles
- Anomaly thresholds are configurable constants, not magic numbers
- Can also refactor `compute-norms.ts` to use `simple-statistics` for mean/stddev (reduces hand-rolled math)

**Confidence:** HIGH -- simple-statistics is stable, well-maintained, zero-dependency, and the z-score/IQR approach is standard for this type of structured financial data.

### Cross-Partner Comparison & Normalization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (No new dependency) | -- | Cross-partner percentile rankings and normalized trajectory overlays | `simple-statistics` provides `quantileRank` and `quantile` functions. Combined with existing `computeNorms` pattern, no additional library needed. |

**Why no additional library:** Cross-partner comparison is a computation pattern, not a library problem. The work is:
1. Compute per-metric percentile ranks across all partners (one `quantileRank` call per metric per partner)
2. Normalize collection curves to recovery-rate basis (already done in `reshape-curves.ts` -- `recoveryRate` field exists on `CurvePoint`)
3. Overlay normalized curves in Recharts (existing charting infrastructure)

The existing `computeNorms` module computes within-partner norms. The new work adds cross-partner norms computed at the root level (all rows, not filtered to one partner). This is a new computation module, not a new dependency.

**Confidence:** HIGH -- the existing computation architecture (`compute-*.ts` modules composed by `usePartnerStats`) is well-suited for this extension.

## What NOT to Add

| Library | Why Skip |
|---------|----------|
| `@anthropic-ai/sdk` (raw) | AI SDK wraps it with streaming UI primitives. Adding both creates confusion about which to use. |
| `langchain` / `@langchain/anthropic` | Massive dependency tree, abstraction overkill for a single-model chat with injected context. LangChain adds value for multi-model orchestration, RAG pipelines, and agent chains -- none of which apply here. |
| `isolation-forest` | Abandoned (4 years stale, v0.0.9), overkill for structured batch data with hundreds of rows. |
| `@azure/ai-anomaly-detector` | Cloud dependency for something computable in-process in milliseconds. |
| `ml-regression` / `tensorflow.js` | No regression/forecasting in v3 scope. Dynamic curve re-projection is explicitly v4+. |
| `d3` or additional charting lib | Recharts 3.8 already handles multi-line overlays for curve comparison. No need for a second charting library. |
| `openai` / `@ai-sdk/openai` | Project uses Claude. Don't install providers you won't use. |
| `lodash` / `ramda` | The codebase already uses native array methods. simple-statistics covers the math gap. |
| `mathjs` | 700KB+ with matrix algebra, complex numbers, symbolic math. We need percentiles and z-scores. |
| Database for chat history | 2-3 internal users, no persistence requirement stated. React state or localStorage is sufficient for v3. |

## Installation

```bash
# AI query layer
npm install ai @ai-sdk/anthropic

# Statistical computation
npm install simple-statistics
```

**Total new dependencies: 3 packages** (ai, @ai-sdk/anthropic, simple-statistics)

## Environment Variables

```env
# Add to Vercel environment variables (server-side only)
ANTHROPIC_API_KEY=sk-ant-...
```

No other infrastructure changes. No new databases. No new services. The AI query layer runs through Anthropic's API; anomaly detection and comparison run in-process on the server.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| AI Integration | AI SDK + @ai-sdk/anthropic | Raw @anthropic-ai/sdk | AI SDK handles streaming UI, abort, message state. Raw SDK requires building all of that manually. |
| AI Integration | AI SDK + @ai-sdk/anthropic | LangChain.js | Massive dependency tree, abstraction overkill for a single-model chat with injected data context. |
| Statistics | simple-statistics | Hand-rolled (current approach in compute-norms.ts) | Adding z-scores, percentiles, IQR on top of hand-rolled code increases bug surface. simple-statistics is tested and tree-shakeable. |
| Statistics | simple-statistics | mathjs | mathjs is 700KB+ with matrix algebra, complex numbers, symbolic math. We need percentiles and z-scores. |
| Anomaly Detection | Z-score/IQR via simple-statistics | Isolation Forest npm | Dataset too small (hundreds of rows), library abandoned (v0.0.9, 4 years stale), results not easily explainable to partnerships team. |
| Anomaly Detection | Z-score/IQR via simple-statistics | Claude-based detection | Non-deterministic. Same data may get different anomaly flags on different runs. Violates project's "explainable transformations" constraint. |
| Chat UI | AI SDK `useChat` hook | Custom WebSocket/SSE implementation | useChat provides message state, loading state, abort, error handling, and streaming out of the box. Building custom gains nothing. |

## Integration Points with Existing Stack

### AI SDK + Existing API Route Pattern
The app already has route handlers at `app/api/data/route.ts`, `app/api/accounts/route.ts`, and `app/api/health/route.ts`. The Claude chat endpoint follows the same pattern at `app/api/chat/route.ts`. Snowflake queries can be called within the route handler to fetch fresh data context before streaming to Claude.

### AI SDK + React Query
`useChat` manages its own message state (it does not use React Query). This is correct -- chat messages are ephemeral UI state, not cacheable server data. The two systems coexist without conflict.

### simple-statistics + Existing Computation Modules
The existing `src/lib/computation/` directory has a clean pattern: pure functions that take `Record<string, unknown>[]` and return typed results. `compute-anomalies.ts` and `compute-cross-partner.ts` follow the same pattern. `simple-statistics` functions are called inside these modules -- they are implementation details, not exposed to components.

### Anomaly Data + Existing Norms/Trending
Anomaly detection builds directly on existing infrastructure:
- `compute-norms.ts` already produces `{ mean, stddev, count }` per metric -- z-score is `(value - mean) / stddev`
- `compute-trending.ts` already flags direction changes -- anomalies extend this with severity scoring
- `MetricNorm` type already exists in `types/partner-stats.ts` -- extend with anomaly fields

### Cross-Partner Comparison + Existing Recharts
Normalized curve overlays use the same Recharts `LineChart` + `Line` components already rendering per-partner curves. The `recoveryRate` field on `CurvePoint` (already computed in `reshape-curves.ts`) is the normalized basis for comparison -- no new chart type needed.

## Version Verification

| Package | Verified Source | Version | Last Published |
|---------|----------------|---------|----------------|
| `ai` | [npm registry](https://www.npmjs.com/package/ai) | 6.0.158 | 2026-04-11 |
| `@ai-sdk/anthropic` | [npm registry](https://www.npmjs.com/package/@ai-sdk/anthropic) | 3.0.69 | 2026-04-12 |
| `simple-statistics` | [npm registry](https://www.npmjs.com/package/simple-statistics) | 7.8.8 | ~2025-06 |

## Sources

- [AI SDK documentation](https://ai-sdk.dev/docs/introduction) -- HIGH confidence
- [AI SDK Next.js App Router guide](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- HIGH confidence
- [AI SDK v6 announcement](https://vercel.com/blog/ai-sdk-6) -- HIGH confidence
- [@ai-sdk/anthropic on npm](https://www.npmjs.com/package/@ai-sdk/anthropic) -- HIGH confidence
- [simple-statistics on npm](https://www.npmjs.com/package/simple-statistics) -- HIGH confidence
- [simple-statistics GitHub](https://github.com/simple-statistics/simple-statistics) -- HIGH confidence
- [isolation-forest on npm](https://www.npmjs.com/package/isolation-forest) -- evaluated and rejected (last publish 4 years ago)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) -- evaluated, AI SDK preferred for interactive UI use case

---
*Stack research for: Bounce Data Visualizer v3.0 intelligence & cross-partner comparison features*
*Researched: 2026-04-12*
