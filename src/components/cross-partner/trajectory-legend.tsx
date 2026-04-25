'use client';

interface TrajectoryLegendProps {
  /**
   * Phase 39 PCFG-04 — pairs are keyed by `pairKey` so multi-product partners
   * are independently toggleable.
   */
  pairs: Array<{ key: string; displayName: string }>;
  /** Map of pairKey → assigned color */
  colorMap: Map<string, string>;
  /** Currently hidden pairs (keyed by pairKey) */
  hiddenPairs: Set<string>;
  /** Best-in-class pair display label */
  bestPairLabel: string | null;
  onTogglePair: (key: string) => void;
}

export function TrajectoryLegend({
  pairs,
  colorMap,
  hiddenPairs,
  bestPairLabel,
  onTogglePair,
}: TrajectoryLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
      {/* Reference line legend entries (not toggleable) */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block h-0 w-4 border-t-2 border-dashed border-foreground" />
        <span>Best-in-class{bestPairLabel ? ` (${bestPairLabel})` : ''}</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="inline-block h-0 w-4 border-t-2 border-dashed border-muted-foreground" />
        <span>Portfolio Avg</span>
      </div>

      {/* Divider */}
      <span className="mx-1 h-3 w-px bg-border" />

      {/* Pair legend entries (clickable) — Phase 39 PCFG-04. */}
      {pairs.map(({ key, displayName }) => {
        const color = colorMap.get(key) ?? 'var(--muted-foreground)';
        const isHidden = hiddenPairs.has(key);
        return (
          <button
            key={key}
            type="button"
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 transition-opacity hover:bg-muted ${
              isHidden ? 'opacity-40 line-through' : ''
            }`}
            onClick={() => onTogglePair(key)}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
