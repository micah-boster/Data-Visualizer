'use client';

import { AlertCircle, RefreshCw, Square } from 'lucide-react';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface QueryResponseProps {
  messages: UIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  error?: Error;
  onRetry: () => void;
  onStop: () => void;
}

/** Extract text content from a UIMessage's parts array (AI SDK v6). */
function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/**
 * Renders the AI response with status-driven states:
 * - submitted: loading skeleton
 * - streaming: live text with pulsing cursor + stop button
 * - ready: complete text
 * - error: error message with retry button
 */
export function QueryResponse({
  messages,
  status,
  error,
  onRetry,
  onStop,
}: QueryResponseProps) {
  // Find the last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  // Loading skeleton
  if (status === 'submitted') {
    return (
      <div className="mt-2 rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    const isTimeout =
      error?.message?.includes('timeout') ||
      error?.message?.includes('abort') ||
      error?.name === 'AbortError';

    return (
      <div className="mt-2 rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding border border-destructive/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 space-y-2">
            <p className="text-body text-muted-foreground">
              {isTimeout
                ? 'Query timed out. Please try a simpler question or retry.'
                : 'Something went wrong. Please try again.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No assistant message yet — nothing to render
  if (!lastAssistant) return null;

  const text = extractText(lastAssistant);
  if (!text) return null;

  // Streaming or ready state
  return (
    <div className="mt-2 max-h-[200px] overflow-y-auto rounded-lg bg-surface-raised shadow-elevation-raised p-card-padding">
      <p className="text-body text-foreground">
        {text}
        {status === 'streaming' && (
          <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-foreground/60" />
        )}
      </p>
      {status === 'streaming' && (
        <div className="mt-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onStop} className="gap-1.5">
            <Square className="h-3 w-3" />
            Stop
          </Button>
        </div>
      )}
    </div>
  );
}
