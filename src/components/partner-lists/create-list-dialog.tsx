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
import { usePartnerLists } from '@/hooks/use-partner-lists';
import { evaluateFilters } from '@/lib/partner-lists/filter-evaluator';
import { getPartnerName, getStringField } from '@/lib/utils';
import type { PartnerListFilters } from '@/lib/partner-lists/types';

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
  const { createList, updateList, getList, hasListWithName } = usePartnerLists();

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

  // Unique ACCOUNT_TYPE values for the attribute bar. Empty array when the
  // column has no non-null values in the dataset — AttributeFilterBar hides
  // the combobox in that case.
  const availableValues = useMemo<
    Partial<Record<'ACCOUNT_TYPE', string[]>>
  >(() => {
    const values = new Set<string>();
    for (const row of allRows) {
      const accountType = getStringField(row, 'ACCOUNT_TYPE');
      if (accountType) values.add(accountType);
    }
    return { ACCOUNT_TYPE: Array.from(values).sort((a, b) => a.localeCompare(b)) };
  }, [allRows]);

  // Real-time "narrow Available" via evaluateFilters. null === no constraint.
  const filteredPartnerIds = useMemo<Set<string> | null>(() => {
    const hasAnyFilter = Object.values(filters).some(
      (arr) => Array.isArray(arr) && arr.length > 0,
    );
    if (!hasAnyFilter) return null;
    return evaluateFilters(allRows, filters);
  }, [allRows, filters]);

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
      createList({ name: trimmed, partnerIds, filters, source });
      toast('List created', { description: `"${trimmed}" is ready to use` });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-card-padding flex flex-col gap-section"
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
