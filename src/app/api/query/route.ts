import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  buildSystemPrompt,
  validateAIConfig,
  CLAUDE_MODEL,
} from '@/lib/ai/system-prompt';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

// Accept both UIMessage format (from useChat's DefaultChatTransport) and
// simple {role, content} format (for manual API calls).
const uiMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  content: z.string().optional(),
});

const queryRequestSchema = z.object({
  messages: z.array(uiMessageSchema),
  drillState: z.object({
    level: z.enum(['root', 'partner', 'batch']),
    partnerId: z.string().nullable(),
    batchId: z.string().nullable(),
  }),
  filters: z
    .object({
      dateRange: z
        .object({ start: z.string(), end: z.string() })
        .optional(),
      metric: z.string().optional(),
    })
    .optional(),
  dataContext: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/query
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // 1. Check AI availability
  const config = validateAIConfig();
  if (!config.available) {
    return new Response(
      JSON.stringify({
        error: `AI features are not configured. ${config.reason ?? 'Unknown reason'}.`,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 2. Parse and validate request body
  let body: z.infer<typeof queryRequestSchema>;
  try {
    const raw = await req.json();
    body = queryRequestSchema.parse(raw);
  } catch (error) {
    // Zod v4 uses `issues` not `errors`
    const zodErr = error as { issues?: Array<{ message: string }> };
    const message = zodErr.issues
      ? `Invalid request: ${zodErr.issues.map((i) => i.message).join(', ')}`
      : 'Invalid request body';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, drillState, filters, dataContext } = body;

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(
    drillState,
    dataContext ?? 'No data context provided by client.',
    filters,
  );

  // 4. Normalize messages to UIMessage format
  // Handles both UIMessage (from useChat with parts[]) and simple {role, content}
  const uiMessages: UIMessage[] = messages.map((m) => {
    if (m.parts && m.parts.length > 0) {
      // Already in UIMessage parts format (from useChat)
      return {
        id: m.id ?? crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        parts: m.parts.map((p) => ({
          type: p.type as 'text',
          text: p.text ?? '',
        })),
      };
    }
    // Simple {role, content} format — convert to UIMessage
    return {
      id: m.id ?? crypto.randomUUID(),
      role: m.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: m.content ?? '' }],
    };
  });

  // 5. Stream response
  try {
    const result = streamText({
      model: anthropic(CLAUDE_MODEL),
      system: systemPrompt,
      messages: await convertToModelMessages(uiMessages),
      maxOutputTokens: 1024,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Handle Anthropic API errors
    const status =
      error instanceof Error && error.message.includes('rate')
        ? 429
        : 500;
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while processing your query.';

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
