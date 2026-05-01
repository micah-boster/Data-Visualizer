'use client';

/**
 * PartnerSetupSheet — slide-over Setup panel for a (partner, product) pair.
 *
 * Reachable from the sidebar's per-pair context menu ("Configure segments").
 * Mirrors `CreateListDialog` for the Sheet wrapper + staged-edit semantics:
 *   - SheetContent side="right", max-w-2xl
 *   - Staged edits via SegmentEditorTable, NOT autosaved
 *   - Save commits via usePartnerConfigContext().upsertSegments + closes
 *   - Cancel discards by closing the sheet — the editor re-hydrates on next open
 *
 * Header shows the pair: partner name (in `<strong>` per AGENTS.md type-token
 * rules — tokens own weight, no weight-utility pairing) plus a read-only
 * Product line with `labelForProduct(pair.product)` and "Data-derived, not
 * editable" help text. The product is locked because it's structurally part
 * of the pair, not an editable field.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Term } from '@/components/ui/term';
import {
  labelForProduct,
  labelForRevenueModel,
  type PartnerProductPair,
} from '@/lib/partner-config/pair';

import {
  SegmentEditorTable,
  type SegmentEditorTableHandle,
} from './segment-editor-table';

export interface PartnerSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: PartnerProductPair;
  /**
   * Pair-scoped rows the parent already filtered. Drives the Other bucket
   * coverage counter, the column dropdown options, and the values picker.
   * MUST be the same row set Plan 39-04's segment-split charts/KPIs use.
   */
  pairScopedRows: Array<Record<string, unknown>>;
}

export function PartnerSetupSheet({
  open,
  onOpenChange,
  pair,
  pairScopedRows,
}: PartnerSetupSheetProps) {
  // hydrationKey bumps on every false→true transition so the editor's
  // useEffect picks up the latest stored config. Without this signal, a
  // user who saves, closes, then reopens would see their old draft state
  // (the editor is mounted under the Sheet, but its state isn't reset
  // unless the key changes).
  const [hydrationKey, setHydrationKey] = useState(0);
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setHydrationKey((k) => k + 1);
    }
    wasOpenRef.current = open;
  }, [open]);

  const editorRef = useRef<SegmentEditorTableHandle | null>(null);

  const handleSave = () => {
    const result = editorRef.current?.save();
    if (!result) return;
    if (result.ok) {
      toast.success('Segments saved', {
        description: `Updated configuration for ${pair.partner} — ${labelForProduct(pair.product)}.`,
      });
      onOpenChange(false);
    } else if (result.error) {
      // First save attempt with overlap returns ok=false but the editor
      // also surfaces a banner with a Confirm button. Use toast.warning
      // for overlap (recoverable) and toast.error for hard validation
      // failures (empty/duplicate/reserved-name).
      const isOverlap = result.error.includes('match multiple segments');
      if (isOverlap) {
        toast.warning('Overlap detected', { description: result.error });
      } else {
        toast.error('Could not save segments', { description: result.error });
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-2xl p-card-padding flex flex-col gap-section overflow-y-auto"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="text-heading">Configure segments</SheetTitle>
          <SheetDescription className="text-body text-muted-foreground">
            <strong>{pair.partner}</strong>
          </SheetDescription>
          <div className="mt-stack flex flex-col gap-0.5">
            <span className="text-label text-muted-foreground uppercase">
              Product type
            </span>
            <span className="text-body">{labelForProduct(pair.product)}</span>
            <span className="text-caption text-muted-foreground">
              Data-derived, not editable
            </span>
          </div>
          {/*
            Phase 44 VOC-07 — Revenue Model read-only section. Mirrors the
            Product type read-out above (data-derived, not editable). The
            section header carries the FIRST-INSTANCE-PER-SURFACE <Term>
            wrap on this Partner Setup surface (per Plan 44-01 first-instance
            rule). The value comes from labelForRevenueModel for known enums
            (Contingency / DebtSale); falls back to "Not specified" when the
            pair has no revenue model — pre-ETL fixtures and the 34
            single-model partners on current data flow through this branch.

            Type tokens: text-label uppercase for the section overline (KPI
            card / read-only-section convention); text-body for the value;
            text-caption for the "Data-derived, not editable" help text. NO
            font-weight pairings (Phase 27 rule — tokens own weight).
          */}
          <div className="mt-stack flex flex-col gap-0.5">
            <span className="text-label text-muted-foreground uppercase">
              <Term name="revenueModel">Revenue Model</Term>
            </span>
            <span className="text-body">
              {pair.revenueModel
                ? labelForRevenueModel(pair.revenueModel)
                : 'Not specified'}
            </span>
            <span className="text-caption text-muted-foreground">
              Data-derived, not editable
            </span>
          </div>
        </SheetHeader>

        <SegmentEditorTable
          ref={editorRef}
          pair={pair}
          pairScopedRows={pairScopedRows}
          hydrationKey={hydrationKey}
        />

        <SheetFooter className="p-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
