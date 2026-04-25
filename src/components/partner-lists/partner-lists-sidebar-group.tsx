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

import { List, Plus, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const handleDelete = (list: PartnerList) => {
    if (isDerived(list)) {
      // Phase 39 — derived deletes don't touch storage. The hook's deleteList
      // is a noop for derived ids (returns undefined). Communicate the
      // "reappears on refresh" semantic via a sonner toast so the user
      // doesn't think the click was ignored.
      toast.info('Auto-list — will reappear on next refresh', {
        description: `"${list.name}" is auto-maintained from your data`,
        duration: 5000,
      });
      return;
    }
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
      <SidebarGroupLabel>Partner Lists</SidebarGroupLabel>
      <SidebarGroupAction onClick={onCreateList} aria-label="Create partner list">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Create partner list</span>
      </SidebarGroupAction>
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
                    Two stacked hover-actions. SidebarMenuAction's base recipe
                    pins the button to right-1. Override the edit action to
                    sit at right-7 so delete (default right-1) stays in the
                    canonical position. Both reveal together on item hover.
                    Phase 39: edit action is disabled for derived lists with
                    a tooltip explaining the lock — affordance visible but
                    non-functional.
                  */}
                  {derived ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <SidebarMenuAction
                            showOnHover
                            className="right-7 opacity-50"
                            disabled
                            aria-label={`Auto-lists can't be renamed`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </SidebarMenuAction>
                        }
                      />
                      <TooltipContent>Auto-lists can&apos;t be renamed</TooltipContent>
                    </Tooltip>
                  ) : (
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
                  )}
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
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
