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
  computeDeviation,
  formatDeviationTooltip,
  HEATMAP_COLUMNS,
} from "@/lib/formatting";
import { formatDate } from "@/lib/formatting/dates";
import { usePartnerNorms } from "@/contexts/partner-norms";

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
 * - Deviation heatmap: green/red tint at partner level (continuous opacity)
 * - Static outlier thresholds: background tint at root level
 * - Default: plain formatted text
 */
export function FormattedCell({
  value,
  formattedValue,
  type,
  columnKey,
}: FormattedCellProps) {
  const { norms, heatmapEnabled } = usePartnerNorms();

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

  // 2.5 Deviation heatmap — partner-level formatting for eligible columns
  if (
    typeof value === "number" &&
    norms &&
    heatmapEnabled &&
    HEATMAP_COLUMNS.has(columnKey)
  ) {
    const norm = norms[columnKey];
    if (norm) {
      const deviation = computeDeviation(value, norm);
      if (deviation && deviation.direction !== "neutral") {
        // oklch with dynamic opacity — hue 145 = green, 25 = red
        const hue = deviation.direction === "above" ? 145 : 25;
        const bgColor = `oklch(0.55 0.15 ${hue} / ${deviation.opacity})`;

        // Format the mean using the same formatter as the cell value
        const formatter = getFormatter(type);
        const formattedMean = formatter(norm.mean);
        const tooltipText = formatDeviationTooltip(
          formattedValue,
          formattedMean,
          deviation.percentDeviation,
        );

        return (
          <Tooltip>
            <TooltipTrigger
              className="rounded px-1 -mx-1 transition-colors duration-150"
              style={{ backgroundColor: bgColor }}
            >
              {formattedValue}
            </TooltipTrigger>
            <TooltipContent>{tooltipText}</TooltipContent>
          </Tooltip>
        );
      }
    }
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
