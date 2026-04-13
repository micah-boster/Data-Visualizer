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

const queryRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
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

  // 4. Convert simple {role, content} messages to AI SDK UIMessage format
  const uiMessages: UIMessage[] = messages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role,
    parts: [{ type: 'text' as const, text: m.content }],
  }));

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
