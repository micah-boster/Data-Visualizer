"use client";

import type { BatchKeyMap } from "@/components/charts/pivot-curve-data";
import { CHART_COLORS } from "@/components/charts/curve-tooltip";

interface CurveLegendProps {
  keyMap: BatchKeyMap;
  visibleBatchKeys: string[];
  defaultVisibleKeys: string[];
  hiddenBatches: Set<string>;
  newestBatchKey: string;
  showAverage: boolean;
  showAllBatches: boolean;
  totalBatchCount: number;
  onToggleBatch: (key: string) => void;
  onToggleAverage: () => void;
  onToggleShowAll: () => void;
}

export function CurveLegend({
  keyMap,
  defaultVisibleKeys,
  hiddenBatches,
  newestBatchKey,
  showAverage,
  showAllBatches,
  totalBatchCount,
  onToggleBatch,
  onToggleAverage,
  onToggleShowAll,
}: CurveLegendProps) {
  return (
    <div className="thin-scrollbar flex max-h-[40vh] w-[180px] shrink-0 flex-col gap-1 overflow-y-auto text-caption">
      {/* Batch entries */}
      {defaultVisibleKeys.map((key, i) => {
        const isHidden = hiddenBatches.has(key);
        const displayName = keyMap.get(key) ?? key;
        const isNewest = key === newestBatchKey;
        const color = CHART_COLORS[i % CHART_COLORS.length];

        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggleBatch(key)}
            className={`flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted ${
              isHidden ? "opacity-40" : ""
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: isHidden ? "transparent" : color, border: isHidden ? `2px solid ${color}` : "none" }}
            />
            <span className="truncate">
              {displayName}
              {isNewest && (
                <span className="ml-1 text-muted-foreground">(latest)</span>
              )}
            </span>
          </button>
        );
      })}

      {/* Show all / Show recent toggle */}
      {totalBatchCount > 8 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="mt-1 rounded px-1.5 py-1 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showAllBatches
            ? "Show recent 8"
            : `Show all (${totalBatchCount})`}
        </button>
      )}

      {/* Divider */}
      <div className="my-1 border-t border-border" />

      {/* Partner Average toggle */}
      <button
        type="button"
        onClick={onToggleAverage}
        className={`flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted ${
          !showAverage ? "opacity-40" : ""
        }`}
      >
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dashed"
          style={{ borderColor: "var(--muted-foreground)" }}
        />
        <span className="truncate">Partner Average</span>
      </button>
    </div>
  );
}
