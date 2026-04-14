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
