'use client';

import { useState, useCallback } from 'react';
import { ArrowUpDown, X, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import type { SortingState } from '@tanstack/react-table';
import { COLUMN_CONFIGS } from '@/lib/columns/config';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

interface SortDialogProps {
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  /** Controlled open state (optional — defaults to internal state) */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in trigger button when used from toolbar */
  hideTrigger?: boolean;
}

export function SortDialog({ sorting, onSortingChange, open: controlledOpen, onOpenChange: controlledOnOpenChange, hideTrigger }: SortDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [draft, setDraft] = useState<SortingState>([]);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setDraft([...sorting]);
    }
    setOpen(isOpen);
  }, [sorting]);

  const addSort = useCallback(() => {
    const usedIds = new Set(draft.map((s) => s.id));
    const available = COLUMN_CONFIGS.find((c) => !usedIds.has(c.key));
    if (available) {
      setDraft((prev) => [...prev, { id: available.key, desc: false }]);
    }
  }, [draft]);

  const removeSort = useCallback((index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDirection = useCallback((index: number) => {
    setDraft((prev) =>
      prev.map((s, i) => (i === index ? { ...s, desc: !s.desc } : s))
    );
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setDraft((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setDraft((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const changeColumn = useCallback((index: number, newId: string) => {
    setDraft((prev) =>
      prev.map((s, i) => (i === index ? { ...s, id: newId } : s))
    );
  }, []);

  const apply = useCallback(() => {
    onSortingChange(draft.length > 0 ? draft : [{ id: 'PARTNER_NAME', desc: false }]);
    setOpen(false);
  }, [draft, onSortingChange]);

  const usedIds = new Set(draft.map((s) => s.id));

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      {!hideTrigger && (
        <SheetTrigger
          render={
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              Sort
              {sorting.length > 1 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-label-numeric text-primary-foreground">
                  {sorting.length}
                </span>
              )}
            </Button>
          }
        />
      )}
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sort Rules</SheetTitle>
          <SheetDescription>
            Add, remove, and reorder sort rules. Higher rules take priority.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-2">
            {draft.map((sortRule, index) => {
              return (
                <div
                  key={`${sortRule.id}-${index}`}
                  className="flex items-center gap-2 rounded-md border bg-card p-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-label-numeric">
                    {index + 1}
                  </span>

                  <select
                    value={sortRule.id}
                    onChange={(e) => changeColumn(index, e.target.value)}
                    className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-body"
                  >
                    {COLUMN_CONFIGS.map((col) => (
                      <option
                        key={col.key}
                        value={col.key}
                        disabled={usedIds.has(col.key) && col.key !== sortRule.id}
                      >
                        {col.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => toggleDirection(index)}
                    className="shrink-0"
                  >
                    {sortRule.desc ? 'DESC' : 'ASC'}
                  </Button>

                  <div className="flex shrink-0 flex-col">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === draft.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeSort(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {draft.length < COLUMN_CONFIGS.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={addSort}
              className="mt-3 w-full"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Sort Rule
            </Button>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
