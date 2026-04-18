'use client';

/**
 * PartnerListsSidebarGroup — renders the "Partner Lists" sidebar section.
 *
 * Owns: group chrome (label + create action), empty-state row, list item
 * rendering, activate-on-click (via useActivePartnerList), delete with sonner
 * undo toast (mirrors handleDeleteView in data-display.tsx:360-374).
 *
 * Does NOT own:
 * - The usePartnerLists hook. Lists + CRUD arrive as props so a single upstream
 *   hook call (in providers.tsx / PartnerListsProvider) is the single source
 *   of truth for both this sidebar surface and the future create-list dialog.
 * - The create-list dialog itself. Plan 03 ships the dialog and wires
 *   onCreateList / onEditList to open it.
 *
 * Rename flow is delegated to `onEditList(listId)`; Plan 03's CreateListDialog
 * will accept an editMode prop and pre-populate.
 */

import { List, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { useActivePartnerList } from '@/contexts/active-partner-list';
import type { PartnerList } from '@/lib/partner-lists/types';

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

export function PartnerListsSidebarGroup({
  lists,
  deleteList,
  restoreList,
  onCreateList,
  onEditList,
}: PartnerListsSidebarGroupProps) {
  const { activeListId, toggleList } = useActivePartnerList();

  const handleDelete = (listId: string) => {
    const deleted = deleteList(listId);
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
      <SidebarGroupAction onClick={onCreateList}>
        <Plus className="h-4 w-4" />
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
            lists.map((list) => (
              <SidebarMenuItem key={list.id}>
                <SidebarMenuButton
                  tooltip={list.name}
                  isActive={activeListId === list.id}
                  onClick={() => toggleList(list.id)}
                >
                  <List className="h-4 w-4" />
                  <span className="truncate">{list.name}</span>
                </SidebarMenuButton>
                {/*
                  Two stacked hover-actions. SidebarMenuAction's base recipe
                  pins the button to right-1. Override the edit action to
                  sit at right-7 so delete (default right-1) stays in the
                  canonical position. Both reveal together on item hover.
                */}
                <SidebarMenuAction
                  showOnHover
                  className="right-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditList(list.id);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit list</span>
                </SidebarMenuAction>
                <SidebarMenuAction
                  showOnHover
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(list.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete list</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
