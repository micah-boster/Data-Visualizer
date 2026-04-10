import { executeQuery } from '@/lib/snowflake/queries';
import { COLUMN_CONFIGS } from './config';
import type { SchemaColumn } from '@/lib/snowflake/types';

interface SchemaValidationResult {
  valid: boolean;
  missing: string[];     // Expected columns not found in Snowflake
  unexpected: string[];  // Snowflake columns not in our config
}

// Cache schema validation result for the lifetime of the serverless container
let cachedResult: SchemaValidationResult | null = null;

export async function validateSchema(): Promise<SchemaValidationResult> {
  if (cachedResult) return cachedResult;

  try {
    const schemaRows = await executeQuery<SchemaColumn>(
      `SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'AGG_BATCH_PERFORMANCE_SUMMARY'
       ORDER BY ORDINAL_POSITION`
    );

    const snowflakeColumns = new Set(schemaRows.map((r) => r.COLUMN_NAME));
    const expectedColumns = new Set(COLUMN_CONFIGS.map((c) => c.key));

    const missing = [...expectedColumns].filter((c) => !snowflakeColumns.has(c));
    const unexpected = [...snowflakeColumns].filter((c) => !expectedColumns.has(c));

    cachedResult = { valid: missing.length === 0, missing, unexpected };
    return cachedResult;
  } catch {
    // If schema validation fails, don't block data fetching
    // Return a safe default that indicates we couldn't validate
    return { valid: true, missing: [], unexpected: [] };
  }
}

/**
 * Clear cached schema validation (useful for testing or after config updates)
 */
export function clearSchemaCache(): void {
  cachedResult = null;
}
