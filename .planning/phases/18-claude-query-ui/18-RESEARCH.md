# Phase 18: Claude Query UI - Research

**Researched:** 2026-04-13
**Domain:** AI SDK React integration, streaming UI, context-aware search
**Confidence:** HIGH

## Summary

Phase 18 builds the client-side UI for Claude natural language queries. The backend (Phase 17) already provides `POST /api/query` with `streamText` + `toUIMessageStreamResponse()`. The UI needs `@ai-sdk/react` for its `useChat` hook, which manages message state, streaming display, and the HTTP transport to the existing route.

The AI SDK v6 has significant API changes from older versions: `useChat` returns `sendMessage` (not `append`), messages use `UIMessage` with `parts[]` array (not `content` string), and status uses `submitted | streaming | ready | error` enum. The existing route already returns `toUIMessageStreamResponse()` which is the correct format for `useChat`'s `DefaultChatTransport`.

**Primary recommendation:** Install `@ai-sdk/react`, build a `QuerySearchBar` component using `useChat` with custom transport pointing to `/api/query`, and wire drill state + data context through the request body.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Search bar at top of main content area, always full-width and visible (not collapsed)
- Prominent visual weight: subtle background card, slight shadow
- Sparkle/AI icon inside the input field
- Persistent across drill levels
- Response appears inline directly below the search bar, pushing content down
- Response persists until a new query replaces it
- Data provenance: every data point must be traceable
- Suggested prompts as horizontal pill/chip buttons below search bar
- Visible only when search bar is focused (not always shown)
- Clicking a prompt auto-submits immediately
- Dynamic prompts generated from actual data context
- Removable pill/badge inside search bar showing current scope
- User can click X on pill to remove scope
- AI responses explicitly reference the scope context

### Claude's Discretion
- Response area max height / scroll behavior
- Data point formatting within narrative text
- Loading skeleton/spinner design
- Error state messaging and retry UX
- Exact spacing, typography, transitions

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NLQ-06 | Search bar input for natural language questions | `useChat` + `QuerySearchBar` component with `<input>` |
| NLQ-07 | 3-5 suggested starter prompts contextualized to drill level | `useSuggestedPrompts` hook generating prompts from drill state + data |
| NLQ-08 | AI responses as short narrative with streaming display | `useChat` status-driven rendering: `streaming` shows live text, `ready` shows final |
| NLQ-09 | Query scoped to current view context | Drill state passed as `body` in `useChat` transport, scope pill in search bar |
| NLQ-10 | Loading indicator, error handling, 30s timeout | `useChat` `status` + `error` + `AbortController` timeout |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ai-sdk/react | ^3.x | `useChat` hook for React streaming chat | Official AI SDK React binding, pairs with `ai` v6 |
| ai | 6.0.158 | Already installed — types, transport, UIMessage | Already in project from Phase 17 |
| lucide-react | existing | Icons (Sparkles, X, Loader2, AlertCircle, RefreshCw) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui input | existing | Base input component | Search bar input field |
| shadcn/ui card | existing | Response container | Wrapping AI response area |
| shadcn/ui skeleton | existing | Loading placeholder | Streaming skeleton state |
| shadcn/ui button | existing | Retry button, scope pill | Error state, scope removal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @ai-sdk/react useChat | Custom fetch + state | useChat handles streaming, message state, abort — no reason to hand-roll |
| Inline response area | Modal/drawer | User locked decision: inline below search bar |

**Installation:**
```bash
npm install @ai-sdk/react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── query/
│       ├── query-search-bar.tsx      # Main search bar + response container
│       ├── query-response.tsx        # Streaming response renderer
│       ├── query-scope-pill.tsx      # Removable scope badge
│       └── query-suggested-prompts.tsx # Dynamic prompt chips
├── hooks/
│   └── use-suggested-prompts.ts     # Generates prompts from drill state
├── lib/
│   └── ai/
│       └── context-builder.ts       # Already exists (Phase 17)
└── types/
    └── query.ts                     # Already exists (Phase 17)
```

### Pattern 1: useChat with Custom Body
**What:** Pass drill state and data context to the API route via `body` option on the transport.
**When to use:** Every query needs the current drill state to scope context.
**Example:**
```typescript
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage, status, error, stop } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/query',
    body: {
      drillState: {
        level: drillState.level,
        partnerId: drillState.partner,
        batchId: drillState.batch,
      },
      dataContext: buildDataContext(drillState, contextData),
    },
  }),
  onError: (err) => {
    console.error('Query error:', err);
  },
});
```

**CRITICAL AI SDK v6 NOTE:** The route already uses `toUIMessageStreamResponse()` which produces the `UIMessageStream` protocol. The `DefaultChatTransport` (used by `useChat` by default) expects this protocol. This means `useChat({ transport: new DefaultChatTransport({ api: '/api/query' }) })` will "just work" — no custom stream parsing needed.

### Pattern 2: Status-Driven Rendering
**What:** Use `useChat` status to drive UI states.
**When to use:** Always — status is the source of truth.
```typescript
// status: 'ready' | 'submitted' | 'streaming' | 'error'
{status === 'submitted' && <LoadingSkeleton />}
{status === 'streaming' && <StreamingResponse messages={messages} />}
{status === 'ready' && messages.length > 0 && <FinalResponse messages={messages} />}
{status === 'error' && <ErrorState error={error} onRetry={...} />}
```

### Pattern 3: UIMessage Parts Extraction
**What:** AI SDK v6 messages use `parts[]` array, not `content` string.
**When to use:** Rendering assistant messages.
```typescript
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
```

### Pattern 4: Abort + Timeout
**What:** 30-second timeout using AbortController, user can also manually stop.
**When to use:** Every query.
```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

const handleSubmit = (text: string) => {
  // Clear previous timeout
  if (timeoutRef.current) clearTimeout(timeoutRef.current);

  // Set 30s timeout
  timeoutRef.current = setTimeout(() => {
    stop(); // useChat's stop function
  }, 30_000);

  sendMessage({ text });
};

// Clear timeout when response finishes
useEffect(() => {
  if (status === 'ready' || status === 'error') {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }
}, [status]);
```

### Anti-Patterns to Avoid
- **Using `content` on UIMessage:** v6 uses `parts[]`, not `content`. Accessing `.content` will be undefined.
- **Custom SSE parsing:** `useChat` + `DefaultChatTransport` handles the `UIMessageStream` protocol. Never parse `toUIMessageStreamResponse()` manually.
- **Importing `ai` or `@ai-sdk/anthropic` in client components:** Only `@ai-sdk/react` should be imported client-side. `ai` types are OK but the runtime should stay server-side.
- **Re-creating transport on every render:** `DefaultChatTransport` should be memoized or created outside the component, updating `body` via ref.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming text display | Custom fetch + EventSource | `useChat` from `@ai-sdk/react` | Handles reconnection, message state, abort, UIMessage protocol |
| Message state management | useState for messages array | `useChat` messages + status | useChat manages optimistic updates, streaming appends, error rollback |
| Request body injection | Custom fetch wrapper | `DefaultChatTransport` with `body` | Transport handles all HTTP concerns, body merges automatically |

## Common Pitfalls

### Pitfall 1: Transport Body Not Updating
**What goes wrong:** `body` in `DefaultChatTransport` is set at construction time. If drill state changes, old body is sent.
**Why it happens:** Transport is created once, body is stale closure.
**How to avoid:** Recreate transport when drill state changes (use `useMemo` with drill state dependencies), or use a ref-based approach.
**Warning signs:** Queries return data for wrong partner/batch.

### Pitfall 2: Rendering Parts Instead of Content
**What goes wrong:** Trying to render `message.content` which doesn't exist in v6.
**Why it happens:** AI SDK v6 breaking change — messages use `parts[]` array.
**How to avoid:** Always extract text from `message.parts.filter(p => p.type === 'text')`.
**Warning signs:** Empty or undefined content rendering.

### Pitfall 3: Focus Management with Suggested Prompts
**What goes wrong:** Clicking a suggested prompt blurs the input, hiding the prompts before the click registers.
**Why it happens:** `onBlur` fires before `onClick` on the prompt chip.
**How to avoid:** Use `onMouseDown` with `preventDefault()` on prompt chips, or use a small delay before hiding prompts.
**Warning signs:** Suggested prompts disappear but no query submits.

### Pitfall 4: Scope Pill Taking Input Space
**What goes wrong:** Scope pill inside the input field reduces typing area on mobile/narrow screens.
**Why it happens:** Absolute positioning inside input without proper padding adjustment.
**How to avoid:** Use a flex container with the pill as a sibling to the actual input, adjust input padding dynamically based on pill presence.
**Warning signs:** Text overlaps with scope pill.

### Pitfall 5: Response Not Clearing on New Query
**What goes wrong:** Previous response persists alongside new streaming response.
**Why it happens:** `useChat` appends messages — history grows.
**How to avoid:** For search-bar pattern (not chat), clear messages before each new query by setting `messages = []` or using `setMessages` before `sendMessage`.
**Warning signs:** Multiple responses stacked.

## Code Examples

### useChat Setup with Custom Transport
```typescript
// Source: AI SDK v6 types + Phase 17 route contract
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

function useQueryChat(drillState: DrillState, dataContext: string) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/query',
        body: {
          drillState: {
            level: drillState.level,
            partnerId: drillState.partner,
            batchId: drillState.batch,
          },
          dataContext,
        },
      }),
    [drillState.level, drillState.partner, drillState.batch, dataContext],
  );

  return useChat({ transport });
}
```

### Extracting Text from UIMessage
```typescript
import type { UIMessage } from 'ai';

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}
```

### Dynamic Suggested Prompts
```typescript
function getSuggestedPrompts(
  level: DrillLevel,
  partnerId: string | null,
  batchId: string | null,
): string[] {
  switch (level) {
    case 'root':
      return [
        'Which partner has the highest collection rate?',
        'Are any partners flagged for anomalies?',
        'Compare penetration rates across all partners',
        'What is the total portfolio collected amount?',
      ];
    case 'partner':
      return [
        `How is ${partnerId} performing overall?`,
        `Which batch has the lowest penetration for ${partnerId}?`,
        `Are there any anomalous batches?`,
        `What is the 6-month collection trend?`,
      ];
    case 'batch':
      return [
        `Summarize this batch's performance`,
        `How does this batch compare to the partner average?`,
        `Are there any anomalies in this batch?`,
        `Which accounts are the top outliers?`,
      ];
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useChat` with `append()` | `useChat` with `sendMessage()` | AI SDK v6 | Method renamed, takes `{ text }` object |
| `message.content` string | `message.parts[]` array | AI SDK v6 | Must extract text from parts |
| `maxTokens` in streamText | `maxOutputTokens` | AI SDK v6 | Already handled in Phase 17 route |
| `onFinish(message)` | `onFinish({ message, messages, isAbort, ... })` | AI SDK v6 | Expanded callback signature |
| `isLoading` boolean | `status` enum | AI SDK v6 | `submitted \| streaming \| ready \| error` |

## Open Questions

1. **Transport body reactivity**
   - What we know: `DefaultChatTransport` accepts `body` at construction
   - What's unclear: Whether body can be updated after construction without recreating transport
   - Recommendation: Recreate transport via `useMemo` when drill state changes — simple and correct

2. **@ai-sdk/react version compatibility**
   - What we know: `ai@6.0.158` is installed, `@ai-sdk/react` needs to be compatible
   - What's unclear: Exact compatible version range
   - Recommendation: Install `@ai-sdk/react` (latest) — same publisher, designed to be compatible

## Sources

### Primary (HIGH confidence)
- AI SDK v6 TypeScript definitions (`node_modules/ai/dist/index.d.ts`) — UIMessage, ChatTransport, status types
- Phase 17 implementation (`src/app/api/query/route.ts`) — confirmed `toUIMessageStreamResponse()` output format
- Phase 17 summary (`17-01-SUMMARY.md`) — confirmed AI SDK v6 patterns

### Secondary (MEDIUM confidence)
- AI SDK v6 type comments in `index.d.ts` — `useChat` usage examples with `sendMessage`
- `@ai-sdk/react` import path from type declarations — confirmed package name

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from installed packages and types
- Architecture: HIGH - patterns derived from actual AI SDK v6 type definitions and existing Phase 17 code
- Pitfalls: HIGH - derived from v6 breaking changes visible in types and common React patterns

**Research date:** 2026-04-13
**Valid until:** 2026-05-13
