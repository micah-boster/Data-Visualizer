'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { parseMetabaseSql } from '@/lib/metabase-import/parse-metabase-sql';
import type { ParseResult } from '@/lib/metabase-import/types';
import {
  mergeOverride,
  type OverrideChartType,
} from '@/lib/metabase-import/merge-override';
import { PasteStep } from './paste-step';
import { PreviewStep } from './preview-step';

/**
 * Phase 37 Plan 02 — top-level orchestrator for the Import-from-Metabase
 * wizard. Owns the only state in the module: `step`, `sql`, `parseResult`.
 *
 * Phase 38 MBI-01: also owns the chart-type override state (overrideType /
 * overrideX / overrideY). Override is ephemeral (per-import session — reset
 * when the sheet closes) and NEVER persisted on ViewSnapshot.sourceQuery.
 *
 * Layout is a right-side Sheet at ~60% viewport width. The width recipe
 * matches Phase 34-04 CreateListDialog:
 *   `data-[side=right]:sm:max-w-2xl md:max-w-[60vw]`
 *
 * Plain `md:max-w-[60vw]` alone would LOSE on specificity to the primitive's
 * internal `data-[side=right]:sm:max-w-sm`. The `data-[side=right]:sm:` prefix
 * matches the same selector shape and wins.
 *
 * Closing the sheet resets step + clears parseResult + override state
 * (useEffect on `open`) so a reopen always starts fresh in Step 1.
 *
 * Plan 03 (Wave 3) wires `onImportSql` to `handleApplyImport` in
 * data-display.tsx via the `useSidebarData` context.
 */

export interface ImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the user clicks Apply on a successful parse. Plan 03 binds
   * this to `handleApplyImport` in `data-display.tsx` via the
   * `useSidebarData` context. Receives the ParseResult + the original SQL
   * string so the apply path can stamp `sourceQuery` with both.
   *
   * Phase 38 MBI-01: when the user sets an override via the Preview step,
   * the ParseResult handed off here already has `inferredChart` replaced
   * with the merged override (inference is pre-selected; override wins).
   */
  onImportSql: (result: ParseResult, sourceSql: string) => void;
}

export function ImportSheet({ open, onOpenChange, onImportSql }: ImportSheetProps) {
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [sql, setSql] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Phase 38 MBI-01 — hoisted chart-type override state. `null` means "use
  // inferred as-is"; 'none' means "suppress chart entirely". Reset on close.
  const [overrideType, setOverrideType] = useState<OverrideChartType>(null);
  const [overrideX, setOverrideX] = useState<string | null>(null);
  const [overrideY, setOverrideY] = useState<string | null>(null);

  // Reset local state on close so reopen always starts fresh in Step 1.
  useEffect(() => {
    if (!open) {
      setStep('paste');
      setParseResult(null);
      setOverrideType(null);
      setOverrideX(null);
      setOverrideY(null);
    }
  }, [open]);

  const handleParse = useCallback(() => {
    const trimmed = sql.trim();
    if (trimmed.length === 0) return;
    const result = parseMetabaseSql(trimmed);
    setParseResult(result);
    // Phase 38 MBI-01: new parse resets the override so the user doesn't
    // carry over axis picks that were valid against a different SELECT list.
    setOverrideType(null);
    setOverrideX(null);
    setOverrideY(null);
    setStep('preview');
  }, [sql]);

  const handleBack = useCallback(() => {
    // Preserve `sql` so the user can iterate; only clear the result + step.
    setParseResult(null);
    setStep('paste');
  }, []);

  const handleApply = useCallback(() => {
    if (!parseResult || parseResult.parseError) return;
    // Phase 38 MBI-01: merge the user's override over the inferred chart
    // before handing off. `mergeOverride` handles the five branches (null
    // override, 'none' suppression, concrete-type + axis fall-through, etc).
    const mergedChart = mergeOverride(
      parseResult.inferredChart,
      overrideType,
      overrideX,
      overrideY,
    );
    const finalResult: ParseResult = {
      ...parseResult,
      inferredChart: mergedChart,
    };
    onImportSql(finalResult, sql.trim());
    onOpenChange(false);
  }, [
    parseResult,
    sql,
    onImportSql,
    onOpenChange,
    overrideType,
    overrideX,
    overrideY,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-2xl md:max-w-[60vw] flex flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b p-6">
          <SheetTitle className="text-heading">Import from Metabase</SheetTitle>
          <SheetDescription className="text-body text-muted-foreground">
            Paste a Metabase SQL query and preview how it maps to this view.
          </SheetDescription>
        </SheetHeader>

        {step === 'paste' && (
          <>
            <PasteStep sql={sql} onSqlChange={setSql} onParse={handleParse} />
            <SheetFooter className="border-t p-4 flex-row justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={sql.trim().length === 0}>
                Parse
              </Button>
            </SheetFooter>
          </>
        )}

        {step === 'preview' && parseResult && (
          <PreviewStep
            result={parseResult}
            onBack={handleBack}
            onApply={handleApply}
            overrideType={overrideType}
            overrideX={overrideX}
            overrideY={overrideY}
            onOverrideTypeChange={setOverrideType}
            onOverrideXChange={setOverrideX}
            onOverrideYChange={setOverrideY}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
