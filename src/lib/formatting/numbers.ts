/**
 * Pure number formatting functions for table cell display.
 *
 * Uses module-scoped Intl.NumberFormat instances (created once, reused)
 * for optimal performance across thousands of cells.
 */

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const numberFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

/** Coerce string values from Snowflake JSON to numbers */
function toNum(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value;
}

/** Format as USD currency: $1,234.56 */
export function formatCurrency(value: number): string {
  return currencyFmt.format(toNum(value));
}

/**
 * Format as percentage with configurable decimal places.
 *
 * IMPORTANT: Data is in 0-100 range (NOT 0-1), so we do NOT use
 * Intl.NumberFormat with style: 'percent' (which multiplies by 100).
 *
 * Very small positive values show as "<0.1%" (or appropriate threshold).
 * Very small negative values show as ">-0.1%".
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const v = toNum(value);
  const threshold = Math.pow(10, -decimals);

  if (v > 0 && v < threshold) {
    return `<${threshold.toFixed(decimals)}%`;
  }

  if (v < 0 && v > -threshold) {
    return `>-${threshold.toFixed(decimals)}%`;
  }

  return `${v.toFixed(decimals)}%`;
}

/** Format as integer with comma separators: 1,234,567 */
export function formatCount(value: number): string {
  return countFmt.format(toNum(value));
}

/** Format as number with up to 1 decimal place: 1,234.5 */
export function formatNumber(value: number): string {
  return numberFmt.format(toNum(value));
}

/** Check if a column type is numeric (needs right-alignment, tabular nums) */
export function isNumericType(type: string): boolean {
  return type === 'currency' || type === 'percentage' || type === 'count' || type === 'number';
}

/**
 * Format currency in abbreviated form: $1.2M, $450K, $999.
 * Handles negative values with sign prefix.
 */
export function formatAbbreviatedCurrency(value: number): string {
  const v = toNum(value);
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}$${millions.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const thousands = Math.round(abs / 1_000);
    return `${sign}$${thousands}K`;
  }
  return `${sign}$${Math.round(abs)}`;
}

/** Return the appropriate formatter function for a column type */
export function getFormatter(type: string): (value: number) => string {
  let fn: (value: number) => string;
  switch (type) {
    case 'currency':
      fn = formatCurrency; break;
    case 'percentage':
      fn = formatPercentage; break;
    case 'count':
      fn = formatCount; break;
    case 'number':
    default:
      fn = formatNumber; break;
  }
  return fn;
}
