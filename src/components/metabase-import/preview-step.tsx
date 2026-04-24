'use client';

import { XCircle, AlertTriangle, LineChart, ScatterChart, BarChart3, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import type { ParseResult, MatchedFilter } from '@/lib/metabase-import/types';
import { inferenceReason } from '@/lib/metabase-import/chart-inference';
import type { OverrideChartType } from '@/lib/metabase-import/merge-override';
import { AxisPicker } from '@/components/charts/axis-picker';
import { cn } from '@/lib/utils';
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
 * Phase 38 MBI-01: the Chart section now exposes a chart-type override
 * segmented control (line / scatter / bar / none) plus X and Y axis pickers
 * and an inference-reason helper line. State lives in the parent
 * (ImportSheet) so `onImportSql` can merge overrides into the ParseResult
 * at Apply time via `mergeOverride`.
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

/**
 * Phase 38 MBI-01 — segmented chart-type control scoped to the Metabase Import
 * preview. Distinct from `ChartTypeSegmentedControl` (which carries a
 * 'collection-curve' option not relevant to SQL-imported views). Local to the
 * import surface; reusing the builder's control would require a cross-phase
 * 'none' option.
 */
const OVERRIDE_TYPE_OPTIONS: ReadonlyArray<{
  value: 'line' | 'scatter' | 'bar' | 'none';
  Icon: typeof LineChart;
  label: string;
}> = [
  { value: 'line', Icon: LineChart, label: 'Line' },
  { value: 'scatter', Icon: ScatterChart, label: 'Scatter' },
  { value: 'bar', Icon: BarChart3, label: 'Bar' },
  { value: 'none', Icon: MinusCircle, label: 'None' },
];

export interface PreviewStepProps {
  /** Parser output — rendered as-is; no further translation here. */
  result: ParseResult;
  /** Return to Step 1 preserving the SQL, clearing the result. */
  onBack: () => void;
  /** Commit the import — disabled when a parse error is present. */
  onApply: () => void;
  /** Phase 38 MBI-01 — hoisted override state (owned by ImportSheet). */
  overrideType: OverrideChartType;
  overrideX: string | null;
  overrideY: string | null;
  onOverrideTypeChange: (next: OverrideChartType) => void;
  onOverrideXChange: (next: string | null) => void;
  onOverrideYChange: (next: string | null) => void;
}

export function PreviewStep({
  result,
  onBack,
  onApply,
  overrideType,
  overrideX,
  overrideY,
  onOverrideTypeChange,
  onOverrideXChange,
  onOverrideYChange,
}: PreviewStepProps) {
  const hasError = result.parseError !== undefined;

  // Phase 38 MBI-01: effective chart-type — override wins over inference.
  // `null` (no override picked yet) falls through to the inferred value (or
  // 'none' when inference didn't find one). Drives both the segmented
  // control's pressed state and the AxisPicker visibility.
  const activeType: 'line' | 'scatter' | 'bar' | 'none' =
    overrideType ?? result.inferredChart.chartType ?? 'none';

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
                  validValues={s.validValues}
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

            {/* Phase 38 MBI-01: Chart section now exposes a user-overridable
                segmented control + axis pickers + inference rationale. */}
            <section className="border-t py-4">
              <header className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="text-title">Chart</h3>
                <span className="text-caption text-muted-foreground">
                  {inferenceReason(result)}
                </span>
              </header>
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center gap-1"
                  role="group"
                  aria-label="Chart type"
                >
                  {OVERRIDE_TYPE_OPTIONS.map(({ value, Icon, label }) => {
                    const pressed = activeType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={pressed}
                        aria-label={label}
                        onClick={() => onOverrideTypeChange(value)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption transition-colors',
                          pressed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground hover:bg-muted/80',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Axis pickers visible only when a concrete chart type is
                    active (everything except 'none'). When no inference exists
                    and no override picked yet, activeType === 'none' so no
                    pickers render. */}
                {activeType !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-muted-foreground">X:</span>
                    <AxisPicker
                      chartType={activeType}
                      axis="x"
                      value={
                        (overrideX ?? result.inferredChart.x) != null
                          ? { column: (overrideX ?? result.inferredChart.x) as string }
                          : null
                      }
                      onChange={(next) => onOverrideXChange(next?.column ?? null)}
                      placeholder="Pick X column"
                    />
                    <span className="text-caption text-muted-foreground ml-2">Y:</span>
                    <AxisPicker
                      chartType={activeType}
                      axis="y"
                      value={
                        (overrideY ?? result.inferredChart.y) != null
                          ? { column: (overrideY ?? result.inferredChart.y) as string }
                          : null
                      }
                      onChange={(next) => onOverrideYChange(next?.column ?? null)}
                      placeholder="Pick Y column"
                    />
                  </div>
                )}
                {result.inferredChart.skipped.length > 0 && (
                  <ul className="mt-1 flex flex-col">
                    {result.inferredChart.skipped.map((s, i) => (
                      <PreviewRow
                        key={`chart-s-${i}`}
                        variant="skipped"
                        label="Chart inference"
                        reason={s.reason}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
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
