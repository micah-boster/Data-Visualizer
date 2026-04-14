/**
 * Assembles the full system prompt from persona instructions + data context +
 * safety constraints. The data context is built by context-builder.ts.
 *
 * Architecture: docs/QUERY-ARCHITECTURE.md
 */

import type { DrillLevel } from '@/hooks/use-drill-down';

/** Model constant — update when switching Claude versions */
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Check whether the AI features are available (API key configured).
 * Call from route handler only — server-side.
 */
export function validateAIConfig(): { available: boolean; reason?: string } {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { available: false, reason: 'ANTHROPIC_API_KEY not configured' };
  }
  return { available: true };
}

/**
 * Build the complete system prompt for Claude.
 *
 * @param drillState - Current user drill position
 * @param dataContext - Pre-formatted data summary from buildDataContext()
 * @param filters - Active UI filters the user has applied
 */
export function buildSystemPrompt(
  drillState: {
    level: DrillLevel;
    partnerId: string | null;
    batchId: string | null;
  },
  dataContext: string,
  filters?: {
    dateRange?: { start: string; end: string };
    metric?: string;
  },
): string {
  const viewDescription = describeView(drillState);
  const filterDescription = describeFilters(filters);

  return `You are a data analyst assistant for the Bounce partnerships team. You help team members understand their debt collection portfolio performance data.

## Your Personality
- Smart colleague: conversational but informed. Not a stiff analyst briefing.
- When you answer a question, add one relevant follow-up insight if something notable exists in the data.
- Adaptive length: simple lookups get 1-2 sentences, complex analytical questions get a short paragraph.
- Always cite exact numbers: "Penetration is 12.3%, down 1.8pp" — never vague directional language.

## Current View
The user is viewing: ${viewDescription}
${filterDescription}

## Available Data
${dataContext}

## Critical Rules
1. ONLY reference data provided in the "Available Data" section above. If the user asks about data not shown there, respond: "I don't have data on that. I can only answer questions about ${describeScope(drillState)}."
2. Never speculate, approximate, or infer data that isn't explicitly provided.
3. Light operational recommendations are OK ("this declining trend might warrant a check-in") but never give financial advice.
4. If the user asks a non-data question, answer briefly if harmless, then redirect: "By the way, I can also help with questions about your portfolio data."`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function describeView(drillState: {
  level: DrillLevel;
  partnerId: string | null;
  batchId: string | null;
}): string {
  switch (drillState.level) {
    case 'root':
      return 'the portfolio overview (all partners)';
    case 'partner':
      return `Partner: ${drillState.partnerId ?? 'unknown'}`;
    case 'batch':
      return `Batch: ${drillState.batchId ?? 'unknown'} (Partner: ${drillState.partnerId ?? 'unknown'})`;
    default:
      return 'the portfolio overview';
  }
}

function describeFilters(filters?: {
  dateRange?: { start: string; end: string };
  metric?: string;
}): string {
  if (!filters) return '';

  const parts: string[] = [];
  if (filters.dateRange) {
    parts.push(`Date range: ${filters.dateRange.start} to ${filters.dateRange.end}`);
  }
  if (filters.metric) {
    parts.push(`Selected metric: ${filters.metric}`);
  }

  if (parts.length === 0) return '';
  return `Active filters: ${parts.join(', ')}`;
}

function describeScope(drillState: {
  level: DrillLevel;
  partnerId: string | null;
  batchId: string | null;
}): string {
  switch (drillState.level) {
    case 'root':
      return 'the portfolio overview and partner summaries shown above';
    case 'partner':
      return `${drillState.partnerId ?? 'this partner'}'s performance data shown above`;
    case 'batch':
      return `batch ${drillState.batchId ?? 'this batch'} and its parent partner data shown above`;
    default:
      return 'the data shown above';
  }
}
