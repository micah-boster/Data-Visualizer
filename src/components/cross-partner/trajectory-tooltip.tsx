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
  /** Map of partner key → display color */
  colorMap: Map<string, string>;
  /** Currently hovered partner (null = none) */
  hoveredPartner: string | null;
}

export function TrajectoryTooltip({
  active,
  payload,
  label,
  colorMap,
  hoveredPartner,
}: TrajectoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Sort: hovered partner first, then reference lines, then rest alphabetically
  const sorted = [...payload]
    .filter((p) => p.value !== undefined && p.value !== null)
    .sort((a, b) => {
      if (a.dataKey === hoveredPartner) return -1;
      if (b.dataKey === hoveredPartner) return 1;
      if (a.dataKey.startsWith('__')) return 1;
      if (b.dataKey.startsWith('__')) return -1;
      return a.dataKey.localeCompare(b.dataKey);
    });

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm">
      <p className="mb-1 text-label text-muted-foreground">
        Month {label}
      </p>
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const isRef = entry.dataKey.startsWith('__');
          const isHovered = entry.dataKey === hoveredPartner;
          const color = entry.stroke ?? colorMap.get(entry.dataKey) ?? 'var(--muted-foreground)';
          const name = isRef
            ? entry.dataKey === '__portfolioAvg__'
              ? 'Portfolio Avg'
              : entry.dataKey.replace('__bestInClass__', 'Best-in-class')
            : entry.dataKey;

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
