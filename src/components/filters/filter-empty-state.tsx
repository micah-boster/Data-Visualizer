'use client';

interface FilterEmptyStateProps {
  onClearFilters: () => void;
}

/**
 * Zero-results message with Clear filter action.
 * Shown when active filters produce no matching rows.
 */
export function FilterEmptyState({ onClearFilters }: FilterEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-muted-foreground text-body">
        No rows match the filter
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="text-body text-primary hover:underline cursor-pointer mt-2"
      >
        Clear filter
      </button>
    </div>
  );
}
