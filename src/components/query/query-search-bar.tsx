'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Sparkles } from 'lucide-react';
import type { DrillState } from '@/hooks/use-drill-down';
import { useSuggestedPrompts } from '@/hooks/use-suggested-prompts';
import { QueryScopePill } from './query-scope-pill';
import { QuerySuggestedPrompts } from './query-suggested-prompts';
import { QueryResponse } from './query-response';

interface QuerySearchBarProps {
  drillState: DrillState;
  /** Pre-built data context string from buildDataContext() */
  dataContext: string;
  /** Called when user removes the scope pill — typically navigates to root */
  onRemoveScope: () => void;
}

/**
 * Main Claude Query UI component.
 *
 * Renders a search bar with sparkle icon, scope pill, suggested prompts,
 * and streaming response area. Uses AI SDK's useChat with DefaultChatTransport
 * to stream responses from POST /api/query.
 */
export function QuerySearchBar({
  drillState,
  dataContext,
  onRemoveScope,
}: QuerySearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recreate transport when drill state or context changes so body stays fresh
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

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport,
    onError: (err) => {
      console.error('Query error:', err);
    },
  });

  const suggestedPrompts = useSuggestedPrompts(
    drillState.level,
    drillState.partner,
    drillState.batch,
  );

  // ---------- Handlers ----------

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Clear previous messages — search-bar pattern, not chat history
      setMessages([]);

      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Set 30-second timeout
      timeoutRef.current = setTimeout(() => {
        stop();
      }, 30_000);

      setLastQuery(text);
      sendMessage({ text });
      setInputValue('');
    },
    [sendMessage, stop, setMessages],
  );

  const handleRetry = useCallback(() => {
    if (lastQuery) handleSend(lastQuery);
  }, [lastQuery, handleSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(inputValue);
      }
    },
    [inputValue, handleSend],
  );

  // Clear timeout when response finishes
  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isActive = status === 'submitted' || status === 'streaming';
  const showPrompts = isFocused && status === 'ready' && messages.length === 0;

  return (
    <div className="shrink-0">
      {/* Search bar card */}
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        {/* Input row */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
          <QueryScopePill drillState={drillState} onRemoveScope={onRemoveScope} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={isActive}
          />
        </div>

        {/* Suggested prompts — visible on focus when no active query */}
        <QuerySuggestedPrompts
          prompts={suggestedPrompts}
          onSelectPrompt={(prompt) => handleSend(prompt)}
          visible={showPrompts}
        />
      </div>

      {/* Response area — appears below search bar */}
      <QueryResponse
        messages={messages}
        status={status}
        error={error}
        onRetry={handleRetry}
        onStop={stop}
      />
    </div>
  );
}
