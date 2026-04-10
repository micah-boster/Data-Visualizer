'use client';

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading data from Snowflake...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  );
}
