/**
 * Pure date formatting functions for table cell display.
 *
 * Uses module-scoped Intl.DateTimeFormat instances (created once, reused).
 */

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timestampFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** Format as short date: "Jan 15, 2024" */
export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateFmt.format(date);
}

/** Format as timestamp with time zone: "Jan 15, 2024, 3:30 PM EST" */
export function formatTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return timestampFmt.format(date);
}
