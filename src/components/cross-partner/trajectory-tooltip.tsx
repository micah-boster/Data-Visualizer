'use client';

interface TrajectoryTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value?: number;
    color?: string;
    stroke?: string;
  }>;
  label?: number;
  /** Map of pairKey → display color */
  colorMap: Map<string, string>;
  /**
   * Phase 39 PCFG-04 — currently hovered pair, keyed by pairKey
   * ("partner::product"). null = none.
   */
  hoveredPair: string | null;
  /** Phase 39 PCFG-04 — pairKey → user-facing display name. */
  labelMap: Map<string, string>;
}

export function TrajectoryTooltip({
  active,
  payload,
  label,
  colorMap,
  hoveredPair,
  labelMap,
}: TrajectoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Sort: hovered pair first, then reference lines, then rest alphabetically
  const sorted = [...payload]
    .filter((p) => p.value !== undefined && p.value !== null)
    .sort((a, b) => {
      if (a.dataKey === hoveredPair) return -1;
      if (b.dataKey === hoveredPair) return 1;
      if (a.dataKey.startsWith('__')) return 1;
      if (b.dataKey.startsWith('__')) return -1;
      const aLabel = labelMap.get(a.dataKey) ?? a.dataKey;
      const bLabel = labelMap.get(b.dataKey) ?? b.dataKey;
      return aLabel.localeCompare(bLabel);
    });

  return (
    <div className="rounded-lg bg-surface-overlay shadow-elevation-overlay px-3 py-2">
      <p className="mb-1 text-label text-muted-foreground">
        Month {label}
      </p>
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const isRef = entry.dataKey.startsWith('__');
          const isHovered = entry.dataKey === hoveredPair;
          const color = entry.stroke ?? colorMap.get(entry.dataKey) ?? 'var(--muted-foreground)';
          const name = isRef
            ? entry.dataKey === '__portfolioAvg__'
              ? 'Portfolio Avg'
              : entry.dataKey.replace('__bestInClass__', 'Best-in-class')
            : labelMap.get(entry.dataKey) ?? entry.dataKey;

          return (
            <div
              key={entry.dataKey}
              className={`flex items-center justify-between gap-4 ${
                isHovered ? 'text-title' : isRef ? 'text-caption text-muted-foreground' : 'text-caption'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate max-w-[140px]">{name}</span>
              </div>
              <span className="text-label-numeric">
                {entry.value !== undefined ? `${entry.value.toFixed(1)}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
