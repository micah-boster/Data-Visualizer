# Phase 17: Claude Query Infrastructure - Research

**Researched:** 2026-04-12
**Domain:** Vercel AI SDK + Anthropic streaming integration in Next.js 16
**Confidence:** HIGH

## Summary

Phase 17 adds a server-side Claude integration that accepts natural language questions with data context and streams responses. The Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) provides all streaming plumbing out of the box — `streamText` on the server and `useChat` on the client handle SSE transport, message formatting, and streaming state. The Anthropic provider reads `ANTHROPIC_API_KEY` from environment variables automatically.

The main engineering challenge is the data context builder: summarizing the right slice of partner/batch/anomaly data into a system prompt that stays within token budget while giving Claude enough information to answer questions accurately. The raw dataset is 477x61 — far too large for context — so the builder must produce focused summaries at each drill level (root, partner, batch).

**Primary recommendation:** Single plan with three deliverables: (1) npm install + env var setup, (2) POST /api/query route handler with streamText, (3) system prompt context builder with per-level summarization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Root level: partner summaries (name, batch count, key aggregates) plus anomaly flags/severity from Phase 15
- Partner level: full detail for current partner, plus a one-line portfolio rank summary for each metric (e.g., "3rd of 8 partners on penetration"). Document the path to all-partners-always as a future enhancement.
- Batch level: batch aggregates plus top 5-10 outlier accounts (highest balance, worst performing) for specific questions. Include parent partner summary alongside.
- Data format in system prompt: Claude's discretion — pick the most effective format (likely hybrid JSON/markdown)
- Tone: smart colleague — conversational but informed, not stiff analyst briefings
- Proactivity: answer the question, then add one relevant follow-up insight if something notable exists
- Length: adaptive — simple lookups get 1-2 sentences, complex analytical questions get a short paragraph
- Specificity: always cite exact numbers. "Penetration is 12.3%, down 1.8pp" — not vague directional language
- Missing data: hard boundary. "I don't have data on [X]." Full stop. Never speculate or approximate.
- Off-topic questions: answer if harmless, then redirect back to data. Don't refuse simple non-data questions.
- Predictions/recommendations: light operational recommendations are OK but no financial advice. Always ground in the data.
- Rate limiting: none for now — internal tool, small user base.
- Drill state explicitly communicated to Claude in system prompt
- Batch level includes parent partner context
- Active UI filters passed to Claude so answers match what's on screen

### Claude's Discretion
- Data format structure in system prompt (JSON, markdown tables, hybrid)
- Context builder architecture (single function vs per-level)
- Token budget allocation strategy
- Exact system prompt wording and structure
- Error message phrasing

### Deferred Ideas (OUT OF SCOPE)
- All-partners-always context at every drill level
- SQL query generation / direct database access
- Conversation history / multi-turn chat (Phase 18 scope if at all)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NLQ-01 | POST /api/query route handler accepts question + context, returns streaming Claude response | AI SDK `streamText` + `toUIMessageStreamResponse()` in Next.js 16 route handler |
| NLQ-02 | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for streamText server-side and useChat client-side | `npm install ai @ai-sdk/anthropic` — useChat defaults to /api/chat but supports custom `api` prop |
| NLQ-03 | System prompt injects summarized data context (not raw matrix) within token budget | Context builder function produces per-level summaries; hybrid JSON/markdown format |
| NLQ-04 | Claude constrained to only reference data in context; explicit "I don't have that data" for missing data | System prompt instructions + data boundary enforcement in prompt design |
| NLQ-05 | ANTHROPIC_API_KEY as Vercel env var, never exposed to client | Server-only route handler; `@ai-sdk/anthropic` reads env var automatically |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | ^4.x (latest) | `streamText`, `UIMessage`, `convertToModelMessages` | Vercel's official AI SDK — handles all streaming plumbing |
| `@ai-sdk/anthropic` | ^1.x (latest) | Anthropic provider for AI SDK | Official Anthropic adapter, reads ANTHROPIC_API_KEY automatically |

### Already in Project
| Library | Purpose | Relevance |
|---------|---------|-----------|
| `next` 16.2.3 | App Router route handlers | POST /api/query route handler |
| `zod` ^4.3.6 | Schema validation | Validate incoming query request body |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@ai-sdk/anthropic` | `@anthropic-ai/sdk` (direct) | Direct SDK gives more control but requires manual streaming; AI SDK abstracts all of it |
| `ai` streamText | Manual SSE implementation | AI SDK handles data protocol, message formatting, error propagation automatically |

**Installation:**
```bash
npm install ai @ai-sdk/anthropic
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/query/
│   └── route.ts          # POST handler with streamText
├── lib/ai/
│   ├── context-builder.ts # Builds data context per drill level
│   └── system-prompt.ts   # Assembles full system prompt
```

### Pattern 1: Route Handler with streamText
**What:** Next.js 16 App Router route handler that receives a question + drill state, builds context, and streams a Claude response.
**When to use:** Every AI query request.

```typescript
// src/app/api/query/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages, drillState, filters } = await req.json();

  const systemPrompt = buildSystemPrompt(drillState, filters);

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
```

### Pattern 2: useChat with Custom Endpoint
**What:** Client-side hook that manages message state and streaming.
**When to use:** Phase 18 UI will consume this. Phase 17 sets up the route it connects to.

```typescript
// Phase 18 will use this pattern:
const { messages, sendMessage, status } = useChat({
  api: '/api/query',
  body: { drillState, filters },
});
```

Key: `useChat` defaults to `/api/chat`. Since our route is `/api/query`, Phase 18 must pass `api: '/api/query'`. The `body` prop sends extra data alongside messages.

### Pattern 3: Context Builder Per Drill Level
**What:** Function that takes the current drill state + data and produces a focused summary string for Claude's system prompt.
**When to use:** Every query — context varies by where the user is in the app.

Three levels:
- **Root**: All partner summaries + anomaly flags
- **Partner**: Full partner detail + portfolio rank comparisons + anomaly detail
- **Batch**: Batch aggregates + top outlier accounts + parent partner summary

### Anti-Patterns to Avoid
- **Sending raw data as context:** The 477x61 matrix exceeds token limits. Always summarize.
- **Custom SSE/WebSocket code:** AI SDK handles all streaming transport. Don't hand-roll.
- **Exposing API key to client:** Route handler runs server-side only. Never import AI SDK on client.
- **Hardcoding system prompt:** Build dynamically based on drill state and available data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming transport | Custom SSE/ReadableStream | `streamText` + `toUIMessageStreamResponse()` | Handles backpressure, error propagation, data protocol |
| Message formatting | Custom message types | `UIMessage` + `convertToModelMessages` | AI SDK data protocol expected by useChat |
| Client streaming state | Custom useState/useEffect | `useChat` hook (Phase 18) | Manages messages[], status, error, stop/regenerate |
| API key management | Custom env reading | `@ai-sdk/anthropic` auto-reads ANTHROPIC_API_KEY | Standard pattern, no configuration needed |

## Common Pitfalls

### Pitfall 1: Token Budget Overflow
**What goes wrong:** System prompt + data context exceeds model's context window, causing truncation or errors.
**Why it happens:** Naively serializing all data without summarization.
**How to avoid:** Budget tokens explicitly. Partner summaries ~200 tokens each, batch detail ~500 tokens. Set `maxTokens` for response. Keep total under 8K for Sonnet.
**Warning signs:** Responses that seem to "forget" data mentioned earlier in context.

### Pitfall 2: useChat Default Endpoint
**What goes wrong:** useChat sends to `/api/chat` instead of `/api/query`.
**Why it happens:** Default endpoint assumption.
**How to avoid:** Always pass `api: '/api/query'` in useChat options (Phase 18 concern, but route path matters now).

### Pitfall 3: Missing ANTHROPIC_API_KEY in Production
**What goes wrong:** 500 errors on Vercel deploy.
**Why it happens:** API key not added to Vercel env vars.
**How to avoid:** Validate env var presence at route handler startup. Return explicit error message if missing.
**Warning signs:** Works locally with .env.local, fails on Vercel.

### Pitfall 4: Data Staleness in Context
**What goes wrong:** Claude answers based on stale data that doesn't match what user sees.
**Why it happens:** Context builder doesn't receive current filter state.
**How to avoid:** Pass active filters (date range, metric selection) from client to route handler. Context builder respects them.

### Pitfall 5: Prompt Injection via User Questions
**What goes wrong:** User crafts a question that overrides system prompt instructions.
**Why it happens:** User input placed directly into messages without sanitization.
**How to avoid:** System prompt uses clear delimiters and instruction hierarchy. User questions go in `messages` array (user role), never concatenated into system prompt.

## Code Examples

### Environment Variable Validation
```typescript
// src/lib/ai/system-prompt.ts
export function validateAIConfig(): { available: boolean; reason?: string } {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { available: false, reason: 'ANTHROPIC_API_KEY not configured' };
  }
  return { available: true };
}
```

### Context Builder Skeleton
```typescript
// src/lib/ai/context-builder.ts
type DrillLevel = 'root' | 'partner' | 'batch';

interface DrillState {
  level: DrillLevel;
  partnerId?: string;
  batchId?: string;
  filters?: {
    dateRange?: { start: string; end: string };
    metric?: string;
  };
}

export function buildDataContext(
  drillState: DrillState,
  data: { partners: PartnerSummary[]; anomalies: AnomalyResult[] }
): string {
  switch (drillState.level) {
    case 'root':
      return buildRootContext(data.partners, data.anomalies);
    case 'partner':
      return buildPartnerContext(drillState.partnerId!, data);
    case 'batch':
      return buildBatchContext(drillState.batchId!, data);
  }
}
```

### Request Body Validation with Zod
```typescript
import { z } from 'zod';

const queryRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  drillState: z.object({
    level: z.enum(['root', 'partner', 'batch']),
    partnerId: z.string().optional(),
    batchId: z.string().optional(),
  }),
  filters: z.object({
    dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
    metric: z.string().optional(),
  }).optional(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SSE streams | AI SDK `streamText` | AI SDK v3+ (2024) | No manual ReadableStream/TextEncoder code |
| `@anthropic-ai/sdk` direct | `@ai-sdk/anthropic` provider | AI SDK v3+ (2024) | Provider-agnostic code, can swap models trivially |
| Separate message state management | `useChat` hook | AI SDK v3+ (2024) | All streaming state managed by hook |
| Manual message format conversion | `convertToModelMessages` | AI SDK v4+ (2025) | UIMessage <-> ModelMessage conversion handled |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` | AI SDK v4+ (2025) | New response format for UI message protocol |

**Important version note:** AI SDK v4+ introduced `UIMessage` type and `toUIMessageStreamResponse()`. Ensure installed version supports these. The `ai` package should be ^4.0 or latest.

## Open Questions

1. **Exact model string for Anthropic**
   - What we know: `anthropic('claude-sonnet-4-20250514')` or similar
   - What's unclear: Exact model ID may change; use a config constant
   - Recommendation: Define model ID as a constant in system-prompt.ts, easy to update

2. **Token budget allocation**
   - What we know: Sonnet has 200K context, but we should stay much smaller for cost/latency
   - What's unclear: Exact token count of partner summaries at scale
   - Recommendation: Target ~4K tokens for system prompt + data context, ~1K for response. Measure in practice.

3. **Graceful degradation when ANTHROPIC_API_KEY missing**
   - What we know: App runs in static mode without Snowflake; AI should similarly degrade
   - Recommendation: Route handler returns 503 with clear message. Phase 18 UI handles this gracefully.

## Sources

### Primary (HIGH confidence)
- ai-sdk.dev/docs/getting-started/nextjs-app-router — Official AI SDK getting started guide
- ai-sdk.dev/providers/ai-sdk-providers/anthropic — Official Anthropic provider docs
- ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat — useChat hook API reference

### Secondary (MEDIUM confidence)
- Next.js 16.2.3 bundled docs (node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md) — Route handler conventions
- Existing project route handlers (src/app/api/health/route.ts) — Established patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK with clear documentation
- Architecture: HIGH - Well-established patterns from AI SDK docs
- Pitfalls: HIGH - Common issues documented by community and official guides

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (AI SDK evolving but core patterns stable)
