'use client';

import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * DualPaneTransfer — generic Available ⇄ Selected checkbox list UI.
 *
 * Parent owns the `available` + `selected` arrays and the mutation callbacks.
 * This component owns only the per-pane checkbox selection state so Add/Remove
 * can operate on the user's current multi-pick within each pane.
 *
 * Generic over `T extends { id: string; name: string }` so it is reusable for
 * any future list-picker surface. In the partner-lists dialog, the id and the
 * name are both the PARTNER_NAME string (Phase 25 convention).
 */
export interface DualPaneTransferProps<T extends { id: string; name: string }> {
  available: T[];
  selected: T[];
  /** Move the given ids from Available → Selected. */
  onMoveRight: (ids: string[]) => void;
  /** Move the given ids from Selected → Available. */
  onMoveLeft: (ids: string[]) => void;
}

interface PaneProps<T extends { id: string; name: string }> {
  title: string;
  items: T[];
  checked: Set<string>;
  onCheckedChange: (next: Set<string>) => void;
  idPrefix: string;
}

function Pane<T extends { id: string; name: string }>({
  title,
  items,
  checked,
  onCheckedChange,
  idPrefix,
}: PaneProps<T>) {
  const toggle = useCallback(
    (id: string) => {
      const next = new Set(checked);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onCheckedChange(next);
    },
    [checked, onCheckedChange],
  );

  return (
    <div className="flex flex-col gap-stack">
      <div className="text-label text-muted-foreground">{title}</div>
      <ScrollArea className="h-72 rounded-md border bg-surface-base">
        {items.length === 0 ? (
          <div className="text-caption text-muted-foreground px-card-padding py-stack">
            No partners
          </div>
        ) : (
          <div>
            {items.map((item) => {
              const rowId = `${idPrefix}-${item.id}`;
              const isChecked = checked.has(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-inline py-1 px-card-padding hover:bg-hover-bg"
                >
                  <Checkbox
                    id={rowId}
                    checked={isChecked}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <Label
                    htmlFor={rowId}
                    className="text-body cursor-pointer flex-1 truncate"
                  >
                    {item.name}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function DualPaneTransfer<T extends { id: string; name: string }>({
  available,
  selected,
  onMoveRight,
  onMoveLeft,
}: DualPaneTransferProps<T>) {
  const [availableChecked, setAvailableChecked] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedChecked, setSelectedChecked] = useState<Set<string>>(
    () => new Set(),
  );

  const availableIds = useMemo(
    () => new Set(available.map((item) => item.id)),
    [available],
  );
  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.id)),
    [selected],
  );

  // Drop stale ids from local pane-check state if the parent no longer lists them.
  const prunedAvailableChecked = useMemo(() => {
    const pruned = new Set<string>();
    for (const id of availableChecked) {
      if (availableIds.has(id)) pruned.add(id);
    }
    return pruned;
  }, [availableChecked, availableIds]);

  const prunedSelectedChecked = useMemo(() => {
    const pruned = new Set<string>();
    for (const id of selectedChecked) {
      if (selectedIds.has(id)) pruned.add(id);
    }
    return pruned;
  }, [selectedChecked, selectedIds]);

  const handleMoveRight = useCallback(() => {
    const ids = Array.from(prunedAvailableChecked);
    if (ids.length === 0) return;
    onMoveRight(ids);
    setAvailableChecked(new Set());
  }, [prunedAvailableChecked, onMoveRight]);

  const handleMoveLeft = useCallback(() => {
    const ids = Array.from(prunedSelectedChecked);
    if (ids.length === 0) return;
    onMoveLeft(ids);
    setSelectedChecked(new Set());
  }, [prunedSelectedChecked, onMoveLeft]);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-section items-start">
      <Pane
        title={`Available (${available.length})`}
        items={available}
        checked={prunedAvailableChecked}
        onCheckedChange={setAvailableChecked}
        idPrefix="dpt-avail"
      />
      <div className="flex flex-col justify-center gap-stack pt-6">
        <Button
          variant="outline"
          size="icon"
          disabled={prunedAvailableChecked.size === 0}
          onClick={handleMoveRight}
          aria-label={`Add ${prunedAvailableChecked.size} to Selected`}
        >
          <ArrowRight className="h-4 w-4" />
          <span className="sr-only">
            Add {prunedAvailableChecked.size} to Selected
          </span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={prunedSelectedChecked.size === 0}
          onClick={handleMoveLeft}
          aria-label={`Remove ${prunedSelectedChecked.size} from Selected`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">
            Remove {prunedSelectedChecked.size} from Selected
          </span>
        </Button>
      </div>
      <Pane
        title={`Selected (${selected.length})`}
        items={selected}
        checked={prunedSelectedChecked}
        onCheckedChange={setSelectedChecked}
        idPrefix="dpt-sel"
      />
    </div>
  );
}
