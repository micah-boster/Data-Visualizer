import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely extract a string field from a dynamic data row. */
export function getStringField(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? '');
}

/** Shorthand for the most common field extractions. */
export function getPartnerName(row: Record<string, unknown>): string {
  return getStringField(row, 'PARTNER_NAME');
}

export function getBatchName(row: Record<string, unknown>): string {
  return getStringField(row, 'BATCH');
}

/**
 * Coerce a raw BATCH_AGE_IN_MONTHS value into months.
 *
 * Static-cache snapshots from before normalization may hold days
 * (pre-coercion) instead of months. Values > 365 are treated as days and
 * floored into months; values <= 365 are returned as-is. Live Snowflake
 * returns actual months (e.g. 7, 33).
 *
 * Shared by reshape-curves.ts and the Phase 38 FLT-01 age-bucket filter
 * (and any future cascade-tier / age-predicate call sites).
 */
export function coerceAgeMonths(raw: unknown): number {
  const n = Number(raw) || 0;
  return n > 365 ? Math.floor(n / 30) : n;
}
