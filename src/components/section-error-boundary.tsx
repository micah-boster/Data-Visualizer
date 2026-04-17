'use client';

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * SectionErrorBoundary — wraps one cohesive section of the app (chart block,
 * table block) so a render-time error in that subtree doesn't take down
 * siblings.
 *
 * IMPORTANT: React error boundaries catch errors during render and lifecycle
 * methods ONLY. Event-handler, async, and timer errors are NOT caught. If you
 * need to surface those, use `useErrorBoundary().showBoundary(error)` inside
 * the handler.
 *
 * Reset semantics (per Phase 25 CONTEXT.md): 'Try again' calls
 * resetErrorBoundary, which re-renders the children with the same props and
 * data. No automatic data refetch. `resetKeys` auto-resets when a referenced
 * value changes — pass stable references (e.g. `data`), NOT freshly computed
 * objects or `JSON.stringify(...)` outputs.
 */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function SectionFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Alert variant="default" className="my-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-title">
            This section couldn&apos;t load.
          </span>
          <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
            Try again
          </Button>
        </div>
        <details className="text-caption text-muted-foreground">
          <summary className="cursor-pointer select-none">Show details</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words">{getErrorMessage(error)}</pre>
        </details>
      </AlertDescription>
    </Alert>
  );
}

type SectionErrorBoundaryProps = {
  children: React.ReactNode;
  /**
   * Stable reference(s) that, when changed, auto-reset the boundary.
   * Pass e.g. [data] — NOT JSON.stringify(data) or a freshly computed object.
   */
  resetKeys?: unknown[];
};

export function SectionErrorBoundary({ children, resetKeys }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={SectionFallback} resetKeys={resetKeys}>
      {children}
    </ErrorBoundary>
  );
}

export { SectionFallback };
