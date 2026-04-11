/**
 * Browser download trigger for CSV files.
 *
 * Uses the Blob API with a UTF-8 BOM for Excel compatibility,
 * and a temporary anchor element to trigger instant download.
 */

/**
 * Trigger a browser download of the given CSV content.
 *
 * Prepends a UTF-8 BOM (\uFEFF) so Excel on Windows correctly
 * detects the encoding. Creates a temporary anchor element,
 * clicks it, then cleans up the object URL to prevent memory leaks.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a date-stamped filename for the export.
 *
 * @returns A filename like `bounce-batch-performance-2026-04-11.csv`
 */
export function getExportFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `bounce-batch-performance-${date}.csv`;
}
