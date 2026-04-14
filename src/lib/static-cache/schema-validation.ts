/**
 * Permissive Zod-based schema validation for cached JSON data.
 *
 * Validates structure and required columns but never blocks rendering.
 * Always returns data (best effort) — warnings are surfaced via
 * schemaWarnings on the DataResponse.
 */

import { z } from 'zod';
import type { DataResponse } from '@/types/data';

// --- Zod schema for DataResponse structure ---

const dataRowSchema = z.record(z.string(), z.unknown());

const cachedDataResponseSchema = z.object({
  data: z.array(dataRowSchema),
  meta: z.object({
    rowCount: z.number(),
    fetchedAt: z.string(),
    columns: z.array(z.string()),
  }),
});

// --- Required column constants ---

/** Minimum required columns for batch-level data */
export const BATCH_REQUIRED_COLUMNS = ['PARTNER_NAME', 'BATCH'] as const;

/** Minimum required columns for account-level data (ACCOUNT_PUBLIC_ID is optional) */
export const ACCOUNT_REQUIRED_COLUMNS = ['PARTNER_NAME', 'BATCH'] as const;

// --- Known columns for detecting unexpected extras ---

const KNOWN_COLUMNS = new Set([
  'PARTNER_NAME', 'BATCH', 'ACCOUNT_PUBLIC_ID',
  'TOTAL_PLACED', 'TOTAL_COLLECTED', 'RECOVERY_RATE',
  'DOLLARS_PLACED', 'DOLLARS_COLLECTED', 'PER_DOLLAR_PLACED_RATE',
  'AVG_BALANCE', 'ACCOUNT_COUNT', 'BATCH_AGE_MONTHS',
  'M1_RECOVERY', 'M2_RECOVERY', 'M3_RECOVERY', 'M4_RECOVERY',
  'M5_RECOVERY', 'M6_RECOVERY', 'M7_RECOVERY', 'M8_RECOVERY',
  'M9_RECOVERY', 'M10_RECOVERY', 'M11_RECOVERY', 'M12_RECOVERY',
  'M1_AMOUNT', 'M2_AMOUNT', 'M3_AMOUNT', 'M4_AMOUNT',
  'M5_AMOUNT', 'M6_AMOUNT', 'M7_AMOUNT', 'M8_AMOUNT',
  'M9_AMOUNT', 'M10_AMOUNT', 'M11_AMOUNT', 'M12_AMOUNT',
  'BALANCE', 'ACCOUNT_STATUS', 'PLACEMENT_DATE',
]);

/**
 * Validate required columns against first data row.
 */
function validateRequiredColumns(
  data: Record<string, unknown>[],
  requiredColumns: readonly string[],
): { valid: boolean; missing: string[] } {
  if (data.length === 0) return { valid: true, missing: [] };

  const actualKeys = new Set(Object.keys(data[0]));
  const missing = requiredColumns.filter((col) => !actualKeys.has(col));
  return { valid: missing.length === 0, missing };
}

/**
 * Detect unexpected columns not in the known set.
 */
function detectUnexpectedColumns(
  data: Record<string, unknown>[],
): string[] {
  if (data.length === 0) return [];
  const actualKeys = Object.keys(data[0]);
  return actualKeys.filter((col) => !KNOWN_COLUMNS.has(col));
}

/**
 * Validate a cached DataResponse object.
 *
 * Permissive: always returns data. Schema issues are logged via console.warn
 * and surfaced through the returned `missing` and `unexpected` arrays.
 * Callers assign these to `schemaWarnings` on the DataResponse.
 *
 * Validation runs lazily — only when this function is called, not at import time.
 */
export function validateCachedData(
  response: unknown,
  requiredColumns: readonly string[] = BATCH_REQUIRED_COLUMNS,
): { data: DataResponse; missing: string[]; unexpected: string[] } {
  // Step 1: Structure validation
  const parsed = cachedDataResponseSchema.safeParse(response);
  if (!parsed.success) {
    console.warn('Cached data schema validation failed:', parsed.error.message);
    return {
      data: response as DataResponse,
      missing: ['SCHEMA_STRUCTURE'],
      unexpected: [],
    };
  }

  const data = response as DataResponse;

  // Step 2: Required column check
  const { missing } = validateRequiredColumns(data.data, requiredColumns);
  if (missing.length > 0) {
    console.warn('Cached data missing columns:', missing);
  }

  // Step 3: Unexpected column check
  const unexpected = detectUnexpectedColumns(data.data);

  return { data, missing, unexpected };
}
