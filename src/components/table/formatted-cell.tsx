"use client";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  getFormatter,
  getThreshold,
  checkThreshold,
  isNumericType,
} from "@/lib/formatting";
import { formatDate } from "@/lib/formatting/dates";

interface FormattedCellProps {
  value: unknown;
  formattedValue: string;
  type: string;
  columnKey: string;
}

/**
 * Renders a formatted table cell value with conditional styling:
 * - Zero values: dimmed text
 * - Negative values: red (destructive) text
 * - Outlier values: subtle background tint with tooltip explanation
 * - Default: plain formatted text
 */
export function FormattedCell({
  value,
  formattedValue,
  type,
  columnKey,
}: FormattedCellProps) {
  // 1. Zero check — dimmed text for zero numeric values
  if (typeof value === "number" && value === 0) {
    return (
      <span className="text-[var(--cell-zero)]">{formattedValue}</span>
    );
  }

  // 2. Negative check — red text for negative values
  if (typeof value === "number" && value < 0) {
    return <span className="text-destructive">{formattedValue}</span>;
  }

  // 3. Outlier check — background tint with tooltip (only for numeric values with thresholds)
  if (typeof value === "number") {
    const threshold = getThreshold(columnKey);
    if (threshold) {
      const result = checkThreshold(value, threshold);
      if (result.isLow || result.isHigh) {
        const tintClass = result.isLow
          ? "bg-[var(--cell-tint-low)]"
          : "bg-[var(--cell-tint-high)]";
        return (
          <Tooltip>
            <TooltipTrigger
              className={`${tintClass} rounded px-1 -mx-1`}
            >
              {formattedValue}
            </TooltipTrigger>
            <TooltipContent>{result.reason}</TooltipContent>
          </Tooltip>
        );
      }
    }
  }

  // 4. Default — plain text, no wrapper element
  return <>{formattedValue}</>;
}

/**
 * Returns the rendered cell content for a given column type and value.
 *
 * Used by column definitions to convert raw accessor values into
 * formatted, styled React nodes.
 *
 * Text columns return the raw value as-is (no FormattedCell wrapper).
 */
export function getCellRenderer(
  type: string,
  columnKey: string,
  value: unknown,
): React.ReactNode {
  // Text columns: return raw value without formatting
  if (type === "text") {
    return String(value);
  }

  // Date columns: use formatDate
  if (type === "date") {
    const formatted = formatDate(value as string | Date);
    return (
      <FormattedCell
        value={value}
        formattedValue={formatted}
        type={type}
        columnKey={columnKey}
      />
    );
  }

  // Numeric columns: use the appropriate formatter
  if (isNumericType(type)) {
    const formatter = getFormatter(type);
    const formatted = formatter(value as number);
    return (
      <FormattedCell
        value={value}
        formattedValue={formatted}
        type={type}
        columnKey={columnKey}
      />
    );
  }

  // Fallback
  return String(value);
}
