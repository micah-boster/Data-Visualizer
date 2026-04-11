'use client';

interface FilterEmptyStateProps {
  onClearFilters: () => void;
}

/**
 * Zero-results message with Clear filters link.
 * Shown when active filters produce no matching rows.
 */
export function FilterEmptyState({ onClearFilters }: FilterEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-muted-foreground text-sm">
        No results match your filters
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="text-sm text-primary hover:underline cursor-pointer mt-2"
      >
        Clear filters
      </button>
    </div>
  );
}
