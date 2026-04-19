'use client';

import { XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import type { ParseResult, MatchedFilter } from '@/lib/metabase-import/types';
import { PreviewSection } from './preview-section';
import { PreviewRow } from './preview-row';

/**
 * Phase 37 Plan 02 — Step 2 of the import wizard.
 *
 * Renders either:
 *   (a) a single error card when `result.parseError` is set, OR
 *   (b) an optional unsupported-constructs banner + four fixed-order
 *       sections (Columns / Filters / Sort / Chart).
 *
 * This component is a dumb renderer over ParseResult (from Plan 01). All
 * translation happens in `parseMetabaseSql` — no AST logic here.
 *
 * Accessibility:
 *   - Parse-error card uses `role="alert"` (assertive SR announcement)
 *   - Partial-import banner uses `role="status"` (polite announcement)
 *   - Icons are `aria-hidden`; label + reason carry the signal
 */

const LABEL_BY_KEY = new Map(COLUMN_CONFIGS.map((c) => [c.key, c.label]));

function formatFilterLabel(f: MatchedFilter): string {
  const label = LABEL_BY_KEY.get(f.columnKey) ?? f.columnKey;
  switch (f.operator) {
    case 'eq':
      return `${label} = ${String(f.value)}`;
    case 'in':
      return `${label} in (${(f.value as unknown[]).join(', ')})`;
    case 'between': {
      const { min, max } = f.value as { min: unknown; max: unknown };
      return `${label} between ${String(min)} and ${String(max)}`;
    }
    case 'isNull':
      return `${label} is null`;
  }
}

function chartSummary(chart: ParseResult['inferredChart']): string {
  if (!chart.chartType) return 'No chart inferred';
  const parts: string[] = [
    `${chart.chartType[0].toUpperCase()}${chart.chartType.slice(1)} chart`,
  ];
  if (chart.x) parts.push(`X: ${LABEL_BY_KEY.get(chart.x) ?? chart.x}`);
  if (chart.y) parts.push(`Y: ${LABEL_BY_KEY.get(chart.y) ?? chart.y}`);
  return parts.join(' — ');
}

export interface PreviewStepProps {
  /** Parser output — rendered as-is; no further translation here. */
  result: ParseResult;
  /** Return to Step 1 preserving the SQL, clearing the result. */
  onBack: () => void;
  /** Commit the import — disabled when a parse error is present. */
  onApply: () => void;
}

export function PreviewStep({ result, onBack, onApply }: PreviewStepProps) {
  const hasError = result.parseError !== undefined;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
        {hasError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-md border border-border bg-surface-raised p-4"
          >
            <XCircle className="h-5 w-5 mt-0.5 shrink-0 text-error-fg" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-title">Could not parse SQL</div>
              <p className="text-body text-muted-foreground mt-1">
                {result.parseError?.message}
              </p>
              {(result.parseError?.line !== undefined ||
                result.parseError?.column !== undefined) && (
                <p className="text-caption text-muted-foreground mt-1">
                  Line {result.parseError?.line ?? '?'}, column{' '}
                  {result.parseError?.column ?? '?'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {result.unsupportedConstructs.length > 0 && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-md border border-border bg-surface-raised p-4 mb-4"
              >
                <AlertTriangle
                  className="h-5 w-5 mt-0.5 shrink-0 text-warning-fg"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-title">Partial import</div>
                  <ul className="mt-1 flex flex-col">
                    {result.unsupportedConstructs.map((c, i) => (
                      <li
                        key={`${c.kind}-${i}`}
                        className="text-caption text-muted-foreground"
                      >
                        {c.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <PreviewSection
              title="Columns"
              matchedCount={result.matchedColumns.length}
              skippedCount={result.skippedColumns.length}
              emptyLabel="No columns detected"
            >
              {result.matchedColumns.map((c) => (
                <PreviewRow
                  key={`col-m-${c.key}`}
                  variant="matched"
                  label={`${c.label} (${c.key})`}
                />
              ))}
              {result.skippedColumns.map((s, i) => (
                <PreviewRow
                  key={`col-s-${i}`}
                  variant="skipped"
                  label={s.raw}
                  reason={s.reason}
                />
              ))}
            </PreviewSection>

            <PreviewSection
              title="Filters"
              matchedCount={result.matchedFilters.length}
              skippedCount={result.skippedFilters.length}
              emptyLabel="No filters detected"
            >
              {result.matchedFilters.map((f, i) => (
                <PreviewRow
                  key={`flt-m-${i}`}
                  variant="matched"
                  label={formatFilterLabel(f)}
                />
              ))}
              {result.skippedFilters.map((s, i) => (
                <PreviewRow
                  key={`flt-s-${i}`}
                  variant="skipped"
                  label={s.raw}
                  reason={s.reason}
                />
              ))}
            </PreviewSection>

            <PreviewSection
              title="Sort"
              matchedCount={result.matchedSort.length}
              skippedCount={result.skippedSort.length}
              emptyLabel="No sort order detected"
            >
              {result.matchedSort.map((s, i) => (
                <PreviewRow
                  key={`sort-m-${i}`}
                  variant="matched"
                  label={`${LABEL_BY_KEY.get(s.columnKey) ?? s.columnKey} ${
                    s.desc ? 'DESC' : 'ASC'
                  }`}
                />
              ))}
              {result.skippedSort.map((s, i) => (
                <PreviewRow
                  key={`sort-s-${i}`}
                  variant="skipped"
                  label={s.raw}
                  reason={s.reason}
                />
              ))}
            </PreviewSection>

            <PreviewSection
              title="Chart"
              matchedCount={result.inferredChart.chartType ? 1 : 0}
              skippedCount={result.inferredChart.skipped.length}
              emptyLabel="No chart inferred"
            >
              {result.inferredChart.chartType && (
                <PreviewRow variant="matched" label={chartSummary(result.inferredChart)} />
              )}
              {result.inferredChart.skipped.map((s, i) => (
                <PreviewRow
                  key={`chart-s-${i}`}
                  variant="skipped"
                  label="Chart inference"
                  reason={s.reason}
                />
              ))}
            </PreviewSection>
          </>
        )}
      </div>
      <SheetFooter className="border-t p-4 flex-row justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          {hasError ? 'Back to edit' : 'Back'}
        </Button>
        <Button onClick={onApply} disabled={hasError}>
          Apply
        </Button>
      </SheetFooter>
    </>
  );
}
