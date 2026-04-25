'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { useActivePartnerList } from '@/contexts/active-partner-list';
import {
  evaluateFilters,
  type SegmentResolver,
} from '@/lib/partner-lists/filter-evaluator';
import { getPartnerName, getStringField } from '@/lib/utils';
import type { PartnerListFilters } from '@/lib/partner-lists/types';
// Phase 39 (PCFG-06): SEGMENT attribute pulls rule names from partner-config.
// usePartnerConfigContext lives in Plan 39-02 (sibling Wave 2 plan). Defensive
// import + try/catch in the consumer below — if the provider isn't mounted
// yet, segment names default to [] and the SEGMENT control simply hides.
import { usePartnerConfigContext } from '@/contexts/partner-config';

import { AttributeFilterBar } from './attribute-filter-bar';
import { DualPaneTransfer } from './dual-pane-transfer';

/**
 * CreateListDialog — create/edit a partner list via a right-side Sheet.
 *
 * Create mode: user narrows Available pane by multi-selecting ACCOUNT_TYPE
 * values (v1 attribute scope), transfers partners Available → Selected,
 * names the list, saves. `source` is derived at save time:
 *   hasAnyFilter → 'attribute'   (gets Refresh action downstream)
 *   else         → 'manual'      (hand-picked snapshot)
 *
 * Edit mode: when `editMode.listId` is set, the dialog hydrates from the
 * existing list (name + filters + partnerIds) and calls updateList on save.
 * `source` is NOT mutated in edit mode (locked at creation per Phase 34-01
 * Pitfall 7).
 */
export interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * All partner rows in the current dataset — dialog dedupes internally by
   * PARTNER_NAME. Source: `data.data` in `data-display.tsx` (same source
   * SidebarDataPopulator uses today).
   */
  allRows: Array<Record<string, unknown>>;
  /**
   * Edit mode: when `listId` is non-null, the dialog pre-populates name +
   * selected partners + filters and calls `updateList` on save instead of
   * `createList`.
   */
  editMode?: { listId: string } | null;
}

interface PartnerItem {
  id: string;
  name: string;
}

export function CreateListDialog({
  open,
  onOpenChange,
  allRows,
  editMode = null,
}: CreateListDialogProps) {
  // Phase 34-04: consume the shared PartnerListsProvider context so creates/edits
  // write to the single upstream hook instance. Calling usePartnerLists() here
  // would spin up a parallel React-state copy and desync from the sidebar's
  // view of the list collection within the session.
  const { createList, updateList, getList, hasListWithName } =
    usePartnerListsContext();
  // Phase 34-04: activate newly-created lists immediately so the user sees the
  // filter cascade without a second click. Edit mode never changes activation.
  const { setActiveListId } = useActivePartnerList();

  // Phase 39 (PCFG-06) — partner-config segment rules drive the SEGMENT
  // attribute control + the SEGMENT filter resolver. Defensive try/catch:
  // if PartnerConfigProvider isn't mounted yet (e.g. plan 39-02 hasn't
  // landed in this branch), the SEGMENT control simply hides because
  // configs defaults to [].
  let configs: ReturnType<typeof usePartnerConfigContext>['configs'] = [];
  try {
    configs = usePartnerConfigContext().configs;
  } catch {
    // Provider not mounted — leave configs as the empty default.
  }

  const [name, setName] = useState('');
  const [filters, setFilters] = useState<PartnerListFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [nameError, setNameError] = useState<string | null>(null);

  // Dedupe partners by PARTNER_NAME. id === name (Phase 25 convention).
  const deduplicatedPartners = useMemo<PartnerItem[]>(() => {
    const seen = new Set<string>();
    const out: PartnerItem[] = [];
    for (const row of allRows) {
      const partnerName = getPartnerName(row);
      if (!partnerName) continue;
      if (seen.has(partnerName)) continue;
      seen.add(partnerName);
      out.push({ id: partnerName, name: partnerName });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [allRows]);

  // Phase 39 (PCFG-06) — available values per attribute key.
  // - ACCOUNT_TYPE + PRODUCT_TYPE share the same source values (display alias).
  // - SEGMENT pulls SegmentRule.name across all configured pairs (deduped).
  //   Empty when no segments are configured anywhere; AttributeFilterBar
  //   hides the SEGMENT combobox in that case.
  const availableValues = useMemo<
    Partial<Record<'ACCOUNT_TYPE' | 'PRODUCT_TYPE' | 'SEGMENT', string[]>>
  >(() => {
    const accountTypeValues = new Set<string>();
    for (const row of allRows) {
      const accountType = getStringField(row, 'ACCOUNT_TYPE');
      if (accountType) accountTypeValues.add(accountType);
    }
    const sortedAccountTypes = Array.from(accountTypeValues).sort((a, b) =>
      a.localeCompare(b),
    );
    const segmentNames = new Set<string>();
    for (const config of configs) {
      for (const segment of config.segments) {
        if (segment.name) segmentNames.add(segment.name);
      }
    }
    return {
      ACCOUNT_TYPE: sortedAccountTypes,
      PRODUCT_TYPE: sortedAccountTypes,
      SEGMENT: Array.from(segmentNames).sort((a, b) => a.localeCompare(b)),
    };
  }, [allRows, configs]);

  // Phase 39 (PCFG-06) — segment resolver wired from partner-config.
  // Returns the segment rules configured for a given (partner, product)
  // pair. Memoized on configs so the evaluator's dep array stays stable.
  const segmentResolver = useMemo<SegmentResolver>(() => {
    return (partner: string, product: string) => {
      const entry = configs.find(
        (c) => c.partner === partner && c.product === product,
      );
      return entry?.segments ?? [];
    };
  }, [configs]);

  // Real-time "narrow Available" via evaluateFilters. null === no constraint.
  // Phase 39: pass segmentResolver only when SEGMENT is active to avoid
  // unnecessary lookup work for filters without a segment constraint.
  const filteredPartnerIds = useMemo<Set<string> | null>(() => {
    const hasAnyFilter = Object.values(filters).some(
      (arr) => Array.isArray(arr) && arr.length > 0,
    );
    if (!hasAnyFilter) return null;
    const segmentActive = !!filters.SEGMENT && filters.SEGMENT.length > 0;
    return evaluateFilters(
      allRows,
      filters,
      segmentActive ? segmentResolver : undefined,
    );
  }, [allRows, filters, segmentResolver]);

  const availablePartners = useMemo(
    () =>
      deduplicatedPartners.filter(
        (p) =>
          !selectedIds.has(p.id) &&
          (filteredPartnerIds === null || filteredPartnerIds.has(p.id)),
      ),
    [deduplicatedPartners, selectedIds, filteredPartnerIds],
  );

  // Selected pane always shows every selected partner regardless of filter —
  // filter only scopes Available (sticky-selection semantics).
  const selectedPartners = useMemo(
    () => deduplicatedPartners.filter((p) => selectedIds.has(p.id)),
    [deduplicatedPartners, selectedIds],
  );

  const canSave = name.trim().length > 0 && selectedIds.size > 0;

  // Hydration / reset. Fires on editMode change and on open→close transition.
  useEffect(() => {
    if (!open) {
      setName('');
      setFilters({});
      setSelectedIds(new Set());
      setNameError(null);
      return;
    }
    if (!editMode) {
      setName('');
      setFilters({});
      setSelectedIds(new Set());
      setNameError(null);
      return;
    }
    const existing = getList(editMode.listId);
    if (!existing) {
      onOpenChange(false);
      toast('List not found', { description: 'It may have been deleted.' });
      return;
    }
    setName(existing.name);
    setFilters(existing.filters);
    setSelectedIds(new Set(existing.partnerIds));
    setNameError(null);
    // getList + onOpenChange are stable per usePartnerLists/prop identity; we
    // intentionally depend only on open + editMode.listId so the effect does
    // not re-hydrate mid-edit from list-state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMode?.listId]);

  const handleMoveRight = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleMoveLeft = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return;
    }

    if (!editMode) {
      if (hasListWithName(trimmed)) {
        setNameError('A list with this name already exists');
        return;
      }
    } else {
      const existing = getList(editMode.listId);
      if (
        existing &&
        existing.name.trim().toLowerCase() !== trimmed.toLowerCase() &&
        hasListWithName(trimmed)
      ) {
        setNameError('A list with this name already exists');
        return;
      }
    }

    const partnerIds = Array.from(selectedIds);
    const hasAnyFilter = Object.values(filters).some(
      (arr) => Array.isArray(arr) && arr.length > 0,
    );
    const source: 'attribute' | 'manual' = hasAnyFilter ? 'attribute' : 'manual';

    if (editMode) {
      updateList(editMode.listId, { name: trimmed, partnerIds, filters });
      toast('List updated', { description: `"${trimmed}" saved` });
    } else {
      const created = createList({ name: trimmed, partnerIds, filters, source });
      // Activate the newly-created list so the user sees the filter take effect
      // immediately (Plan 34-04 must_haves.truths #3).
      setActiveListId(created.id);
      toast('List created', { description: `"${trimmed}" is ready to use` });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-2xl p-card-padding flex flex-col gap-section overflow-y-auto"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="text-heading">
            {editMode ? 'Edit partner list' : 'New partner list'}
          </SheetTitle>
          <SheetDescription className="text-body text-muted-foreground">
            Narrow the available partners by attribute, then choose the ones to include.
          </SheetDescription>
        </SheetHeader>

        <AttributeFilterBar
          availableValues={availableValues}
          value={filters}
          onChange={setFilters}
        />

        <DualPaneTransfer<PartnerItem>
          available={availablePartners}
          selected={selectedPartners}
          onMoveRight={handleMoveRight}
          onMoveLeft={handleMoveLeft}
        />

        <div className="grid gap-stack">
          <Label htmlFor="list-name" className="text-label">
            List name
          </Label>
          <Input
            id="list-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. High-value enterprise"
            maxLength={60}
          />
          {nameError && (
            <div className="text-caption text-error-fg">{nameError}</div>
          )}
        </div>

        <SheetFooter className="p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {editMode ? 'Save changes' : 'Create list'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
