import type { BatchCurve, CurvePoint } from '@/types/partner-stats';
import { getBatchName } from '@/lib/utils';

/** The 20 collection month milestones tracked in Snowflake. */
export const COLLECTION_MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 30, 36, 48, 60,
] as const;

/**
 * Reshape wide collection columns into long-format BatchCurve arrays.
 *
 * Each row has 20 `COLLECTION_AFTER_X_MONTH` columns (wide format).
 * This converts them to an array of CurvePoint objects truncated at
 * the batch's actual age so young batches don't show false zero cliffs.
 */
export function reshapeCurves(
  rows: Record<string, unknown>[],
): BatchCurve[] {
  return rows.map((row) => {
    const batchName = getBatchName(row);
    const totalPlaced = Number(row.TOTAL_AMOUNT_PLACED) || 0;

    // BATCH_AGE_IN_MONTHS is actually days in Snowflake -- convert to months
    const rawAge = Number(row.BATCH_AGE_IN_MONTHS) || 0;
    const ageInMonths = Math.floor(rawAge / 30);

    const points: CurvePoint[] = [];

    // Edge case: if ageInMonths < 1, return empty points array
    if (ageInMonths < 1) {
      return { batchName, totalPlaced, ageInMonths, points };
    }

    for (const month of COLLECTION_MONTHS) {
      // Stop when we exceed the batch's actual age
      if (month > ageInMonths) break;

      const colKey = `COLLECTION_AFTER_${month}_MONTH`;
      const amount = Number(row[colKey]) || 0;

      // Recovery rate % = (collection / totalPlaced) * 100, guard division by zero
      const recoveryRate = totalPlaced > 0 ? (amount / totalPlaced) * 100 : 0;

      points.push({ month, amount, recoveryRate });
    }

    return { batchName, totalPlaced, ageInMonths, points };
  });
}
