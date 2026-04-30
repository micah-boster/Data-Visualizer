'use client';

/**
 * PartnerListsSidebarGroup — renders the "Partner Lists" sidebar section.
 *
 * Owns: group chrome (label + create action), empty-state row, list item
 * rendering, activate-on-click (via useActivePartnerList), delete with sonner
 * undo toast (mirrors handleDeleteView in data-display.tsx:360-374).
 *
 * Phase 39 — derived auto-list rendering (PCFG-06):
 *   - Detect derived lists via `list.id.startsWith(DERIVED_LIST_ID_PREFIX)`
 *     OR `list.source === 'derived'`. Either signal works; the prefix is
 *     the cheaper check.
 *   - Visual distinction: render a `Sparkles` icon (instead of `List`) +
 *     append a `.text-label` "Auto" pill to the right of the name. The
 *     pill makes the auto-maintained semantic immediately legible.
 *   - Delete on a derived list: sonner toast "Auto-list — will reappear
 *     on next refresh." The hook's `deleteList` is a no-op for derived
 *     ids (returns undefined), so storage is untouched and the next
 *     re-derivation re-materializes the list.
 *   - Rename is DISABLED on derived lists — the edit/pencil action is
 *     wrapped in a Tooltip explaining "Auto-lists can't be renamed."
 *     Affordance disabled rather than hidden so the lock is visible.
 *
 * Does NOT own:
 * - The usePartnerLists hook. Lists + CRUD arrive as props so a single upstream
 *   hook call (in providers.tsx / PartnerListsProvider) is the single source
 *   of truth for both this sidebar surface and the create-list dialog.
 * - The create-list dialog itself. Plan 03 ships the dialog and wires
 *   onCreateList / onEditList to open it.
 */

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, List, Plus, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Term } from '@/components/ui/term';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActivePartnerList } from '@/contexts/active-partner-list';
import type { PartnerList } from '@/lib/partner-lists/types';
import { DERIVED_LIST_ID_PREFIX } from '@/lib/partner-lists/derived-lists';

export interface PartnerListsSidebarGroupProps {
  /** Lists to render. Comes from the single upstream usePartnerLists() call. */
  lists: PartnerList[];
  /** Remove a list by id and return the removed list for undo. */
  deleteList: (id: string) => PartnerList | undefined;
  /** Append-only restore for undo. */
  restoreList: (list: PartnerList) => void;
  /** Fired when user clicks the "+" in the group header. Plan 03 wires this. */
  onCreateList: () => void;
  /** Fired when user clicks the edit/pencil action. Plan 03 wires this. */
  onEditList: (listId: string) => void;
}

function isDerived(list: PartnerList): boolean {
  return (
    list.id.startsWith(DERIVED_LIST_ID_PREFIX) || list.source === 'derived'
  );
}

export function PartnerListsSidebarGroup({
  lists,
  deleteList,
  restoreList,
  onCreateList,
  onEditList,
}: PartnerListsSidebarGroupProps) {
  const { activeListId, toggleList } = useActivePartnerList();

  // Collapse — same hydration-safe recipe as the Partners group in app-sidebar.
  // Defaults to expanded (lists are typically small + benefit from being
  // visible by default); user choice persists via 'partner-lists-collapsed'.
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('partner-lists-collapsed') === 'true') {
      setExpanded(false);
    }
  }, []);
  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('partner-lists-collapsed', String(!next));
      return next;
    });
  }, []);

  const handleDelete = (list: PartnerList) => {
    const deleted = deleteList(list.id);
    if (!deleted) return;
    // Stale-ID cleanup is handled by ActivePartnerListProvider's sanitizer
    // effect; no manual setActiveListId(null) needed here.
    toast('List deleted', {
      description: `"${deleted.name}" was removed`,
      action: {
        label: 'Undo',
        onClick: () => restoreList(deleted),
      },
      duration: 5000,
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        render={
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls="partner-lists-region"
          />
        }
        className="w-full cursor-pointer"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn(
            'mr-1 h-3.5 w-3.5 transition-transform duration-quick ease-default',
            expanded && 'rotate-90',
          )}
        />
        {/*
          Phase 44 VOC-03 — first-instance-per-surface rule: Partner Lists
          renders ABOVE the Partners group on the sidebar (CONTEXT lock), so
          this is the FIRST occurrence of both `partner` and `list` on the
          sidebar surface. Both terms wrapped here; the Partners group label
          + "All Partners" menu button below stay plain.
        */}
        <span>
          <Term name="partner">Partner</Term>{' '}
          <Term name="list">Lists</Term>
        </span>
      </SidebarGroupLabel>
      <SidebarGroupAction onClick={onCreateList} aria-label="Create partner list">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Create partner list</span>
      </SidebarGroupAction>
      <div
        id="partner-lists-region"
        className={cn(
          'grid transition-[grid-template-rows] duration-normal ease-default',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              {lists.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <List className="h-4 w-4" />
                    <span className="text-caption text-muted-foreground">
                      No lists yet
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                lists.map((list) => {
                  const derived = isDerived(list);
                  const Icon = derived ? Sparkles : List;
                  return (
                    <SidebarMenuItem key={list.id}>
                      <SidebarMenuButton
                        tooltip={list.name}
                        isActive={activeListId === list.id}
                        aria-current={activeListId === list.id ? 'page' : undefined}
                        onClick={() => toggleList(list.id)}
                      >
                        <Icon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        <span className="truncate">{list.name}</span>
                        {derived && (
                          <span
                            className="ml-auto text-label text-muted-foreground"
                            aria-label="Auto-maintained list"
                          >
                            Auto
                          </span>
                        )}
                      </SidebarMenuButton>
                      {/*
                        Edit + Delete actions only for user-created lists.
                        Derived auto-lists can't be renamed (auto-derived from
                        data) and can't be meaningfully deleted (re-materialize
                        on next hydration), so we don't render the affordances.
                      */}
                      {!derived && (
                        <>
                          <SidebarMenuAction
                            showOnHover
                            className="right-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditList(list.id);
                            }}
                            aria-label={`Edit partner list ${list.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </SidebarMenuAction>
                          <SidebarMenuAction
                            showOnHover
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(list);
                            }}
                            aria-label={`Delete partner list ${list.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </SidebarMenuAction>
                        </>
                      )}
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </div>
      </div>
    </SidebarGroup>
  );
}
