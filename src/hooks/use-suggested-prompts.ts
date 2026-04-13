'use client';

import { useMemo } from 'react';
import type { DrillLevel } from '@/hooks/use-drill-down';

/**
 * Generates context-aware suggested prompts based on the current drill level.
 * Prompts incorporate partner/batch names when available for a personalized feel.
 */
export function useSuggestedPrompts(
  level: DrillLevel,
  partnerId: string | null,
  batchId: string | null,
): string[] {
  return useMemo(() => {
    switch (level) {
      case 'root':
        return [
          'Which partner has the highest collection rate?',
          'Are any partners flagged for anomalies?',
          'Compare penetration rates across all partners',
          'What is the total portfolio collected amount?',
        ];
      case 'partner': {
        const name = partnerId ?? 'this partner';
        return [
          `How is ${name} performing overall?`,
          `Which batch has the lowest penetration for ${name}?`,
          `Are there any anomalous batches?`,
          `What is the 6-month collection trend?`,
        ];
      }
      case 'batch':
        return [
          "Summarize this batch's performance",
          'How does this batch compare to the partner average?',
          'Are there any anomalies in this batch?',
          'Which accounts are the top outliers?',
        ];
      default:
        return [];
    }
  }, [level, partnerId, batchId]);
}
