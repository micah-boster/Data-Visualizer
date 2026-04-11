'use client';

interface DrillableCellProps {
  value: string;
  onDrill: () => void;
}

/**
 * Clickable cell renderer for drill-down navigation.
 * Renders the value as a styled button that looks like a link.
 * Only the text itself is the click target (not the entire cell).
 */
export function DrillableCell({ value, onDrill }: DrillableCellProps) {
  return (
    <button
      onClick={onDrill}
      className="cursor-pointer text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary/80 hover:decoration-primary/60"
    >
      {value}
    </button>
  );
}
