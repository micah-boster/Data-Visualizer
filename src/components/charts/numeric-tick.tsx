/**
 * Shared Recharts tick component for numeric axes (Phase 27 Plan 02).
 *
 * Recharts renders ticks as SVG <text>, which does NOT inherit Tailwind
 * classes — so axis tick styling must go through the `tick` prop either
 * as a plain style object or a custom component. Use this component when
 * the axis shows digits and tabular alignment matters (recovery rate %,
 * month numbers, day counts). Inline style sets `font-variant-numeric`
 * directly because CSS classes cannot reach into the SVG surface.
 *
 * See docs/TYPE-MIGRATION.md §7 (Numeric policy) and the Phase 27 research
 * Pattern 5.
 */
interface NumericTickProps {
  /** Horizontal position supplied by Recharts at render time. */
  x?: number;
  /** Vertical position supplied by Recharts at render time. */
  y?: number;
  /** Tick payload supplied by Recharts at render time. */
  payload?: { value: string | number };
  /** Baseline shift for the text — tune per axis. */
  dy?: number;
  /** Text anchor — `middle` for X axes, `end` for Y axes. */
  anchor?: 'start' | 'middle' | 'end';
}

export function NumericTick({
  x,
  y,
  payload,
  dy = 10,
  anchor = 'middle',
}: NumericTickProps) {
  if (x == null || y == null || !payload) return null;
  return (
    <text
      x={x}
      y={y}
      dy={dy}
      textAnchor={anchor}
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums lining-nums',
        fill: 'var(--muted-foreground)',
      }}
    >
      {payload.value}
    </text>
  );
}
