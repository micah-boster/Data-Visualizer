'use client';

import { useState } from 'react';
import { Users, Bookmark, Trash2, Star, LayoutDashboard } from 'lucide-react';
import { useSidebarData } from '@/contexts/sidebar-data';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { PartnerListsSidebarGroup } from '@/components/partner-lists/partner-lists-sidebar-group';
import { CreateListDialog } from '@/components/partner-lists/create-list-dialog';
import { useData } from '@/hooks/use-data';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const {
    partners,
    drillState,
    drillToPartner,
    navigateToLevel,
    views,
    onLoadView,
    onDeleteView,
    isReady,
  } = useSidebarData();

  // Partner-lists data comes from the shared provider so the sidebar and
  // data-display read from the same usePartnerLists() call (single source
  // of truth for the persisted lists + CRUD actions).
  const { lists, deleteList, restoreList } = usePartnerListsContext();

  // Phase 34-04: CreateListDialog open/edit state owned at the sidebar level so
  // the group header "+" and per-row pencil actions share a single mount of
  // the Sheet. allRows sources from the same TanStack Query cache the rest of
  // the app reads — query client dedupes the fetch, no extra request.
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const { data: queryData } = useData();
  const allRows = queryData?.data ?? [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-title">B</span>
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-title">Bounce</span>
                <span className="truncate text-caption text-muted-foreground">
                  Data Analytics
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Partner Lists — CONTEXT lock: must appear ABOVE the Partners section. */}
        <PartnerListsSidebarGroup
          lists={lists}
          deleteList={deleteList}
          restoreList={restoreList}
          onCreateList={() => {
            setEditListId(null);
            setCreateDialogOpen(true);
          }}
          onEditList={(id) => {
            setEditListId(id);
            setCreateDialogOpen(true);
          }}
        />

        {/* Partner navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            Partners
            {isReady && partners.length > 0 && (
              <span className="ml-auto text-label-numeric text-muted-foreground">
                {partners.length}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* All Partners (root) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="All Partners"
                  isActive={drillState.level === 'root'}
                  onClick={() => navigateToLevel('root')}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>All Partners</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Loading skeleton */}
              {!isReady && (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton showIcon index={i} />
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {/* Partner list */}
              {isReady &&
                partners.map((p) => (
                  <SidebarMenuItem key={p.name}>
                    <SidebarMenuButton
                      tooltip={p.name}
                      isActive={drillState.partner === p.name}
                      onClick={() => drillToPartner(p.name)}
                    >
                      {p.isFlagged ? (
                        <span className="flex h-4 w-4 items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-brand-purple" />
                        </span>
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{p.batchCount}</SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Saved views */}
        <SidebarGroup>
          <SidebarGroupLabel>
            Views
            {views.length > 0 && (
              <span className="ml-auto text-label-numeric text-muted-foreground">
                {views.length}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isReady && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton index={i} />
                    </SidebarMenuItem>
                  ))}
                </>
              )}

              {isReady && views.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled className="text-caption text-muted-foreground">
                    <Bookmark className="h-4 w-4" />
                    <span>No saved views</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isReady &&
                views.map((view) => (
                  <SidebarMenuItem key={view.id}>
                    <SidebarMenuButton
                      tooltip={view.name}
                      onClick={() => onLoadView(view)}
                    >
                      {view.isDefault ? (
                        <Star className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      <span className="truncate">{view.name}</span>
                    </SidebarMenuButton>
                    {!view.isDefault && (
                      <SidebarMenuAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteView(view.id);
                        }}
                        showOnHover
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-caption text-muted-foreground">
              <span>v1.0</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/*
        Phase 34-04: CreateListDialog rendered from AppSidebar because both
        entry points (the group "+" action and per-row pencil) live inside
        PartnerListsSidebarGroup. The Sheet primitive portals itself, so its
        DOM location inside <Sidebar> does not affect the overlay position.
        Closing the dialog also clears editListId so the next open defaults
        to create mode.
      */}
      <CreateListDialog
        open={createDialogOpen}
        onOpenChange={(next) => {
          setCreateDialogOpen(next);
          if (!next) setEditListId(null);
        }}
        allRows={allRows}
        editMode={editListId ? { listId: editListId } : null}
      />
    </Sidebar>
  );
}
