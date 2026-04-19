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
import { PasteStep } from './paste-step';
import { PreviewStep } from './preview-step';

/**
 * Phase 37 Plan 02 — top-level orchestrator for the Import-from-Metabase
 * wizard. Owns the only state in the module: `step`, `sql`, `parseResult`.
 *
 * Layout is a right-side Sheet at ~60% viewport width. The width recipe
 * matches Phase 34-04 CreateListDialog:
 *   `data-[side=right]:sm:max-w-2xl md:max-w-[60vw]`
 *
 * Plain `md:max-w-[60vw]` alone would LOSE on specificity to the primitive's
 * internal `data-[side=right]:sm:max-w-sm`. The `data-[side=right]:sm:` prefix
 * matches the same selector shape and wins.
 *
 * Closing the sheet resets step + clears parseResult (useEffect on `open`)
 * so a reopen always starts fresh in Step 1.
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
   */
  onImportSql: (result: ParseResult, sourceSql: string) => void;
}

export function ImportSheet({ open, onOpenChange, onImportSql }: ImportSheetProps) {
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [sql, setSql] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Reset local state on close so reopen always starts fresh in Step 1.
  useEffect(() => {
    if (!open) {
      setStep('paste');
      setParseResult(null);
    }
  }, [open]);

  const handleParse = useCallback(() => {
    const trimmed = sql.trim();
    if (trimmed.length === 0) return;
    const result = parseMetabaseSql(trimmed);
    setParseResult(result);
    setStep('preview');
  }, [sql]);

  const handleBack = useCallback(() => {
    // Preserve `sql` so the user can iterate; only clear the result + step.
    setParseResult(null);
    setStep('paste');
  }, []);

  const handleApply = useCallback(() => {
    if (!parseResult || parseResult.parseError) return;
    onImportSql(parseResult, sql.trim());
    onOpenChange(false);
  }, [parseResult, sql, onImportSql, onOpenChange]);

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
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
