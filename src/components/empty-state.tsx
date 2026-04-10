import { SearchX } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
      <SearchX className="h-10 w-10 text-muted-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          No data matches your filters
        </p>
        <p className="text-xs text-muted-foreground/70">
          Try adjusting your filters or refreshing the data
        </p>
      </div>
    </div>
  );
}
