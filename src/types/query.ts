import type { DrillLevel } from '@/hooks/use-drill-down';

/** Request body for POST /api/query */
export interface QueryRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  drillState: {
    level: DrillLevel;
    partnerId: string | null;
    batchId: string | null;
  };
  filters?: {
    dateRange?: { start: string; end: string };
    metric?: string;
  };
  /** Pre-built data context string from client-side buildDataContext() */
  dataContext?: string;
}
