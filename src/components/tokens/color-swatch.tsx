'use client';

/** Stub — filled in Task 2. */
export type ColorSwatchCategory =
  | 'surfaces'
  | 'accent-state'
  | 'neutrals'
  | 'chart'
  | 'interaction';

export function ColorSwatch({ category }: { category: ColorSwatchCategory }) {
  return (
    <div className="text-body text-muted-foreground">
      TODO: color swatches — {category}
    </div>
  );
}
