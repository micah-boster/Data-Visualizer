'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Bookmark,
  Trash2,
  Star,
  LayoutDashboard,
  Database,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarData } from '@/contexts/sidebar-data';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { PartnerListsSidebarGroup } from '@/components/partner-lists/partner-lists-sidebar-group';
import { CreateListDialog } from '@/components/partner-lists/create-list-dialog';
import { ImportSheet } from '@/components/metabase-import/import-sheet';
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
  // Phase 37 — Metabase import entry + Sheet mount.
  // Phase 39 PCFG-02..04: sidebar reads pairs (not partners). drillToPair
  // carries the full (partner, product) pair so multi-product partners
  // (Happy Money, Zable) become two peer rows.
  const {
    pairs,
    drillState,
    drillToPair,
    navigateToLevel,
    views,
    onLoadView,
    onDeleteView,
    onImportSql,
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
  // Phase 37 Plan 02: Metabase import Sheet open state owned at the sidebar
  // level so the menu entry and the Sheet mount live in the same scope.
  const [importOpen, setImportOpen] = useState(false);
  const { data: queryData } = useData();
  const allRows = queryData?.data ?? [];

  // POL-02: Partners group collapse/expand. Hydration-safe: useState
  // initializes to `false` on BOTH server and first client render so the
  // initial DOM matches. An effect then syncs from localStorage after
  // mount. Reading localStorage inside the useState initializer (even
  // behind `typeof window !== 'undefined'`) is NOT safe here — it runs
  // synchronously on the first client render before hydration commits,
  // producing an aria-expanded / grid-rows className mismatch vs the
  // server HTML when the user has a saved 'false' (= expanded) value.
  // Key semantics: storage 'true' = collapsed, 'false' = expanded.
  const [partnersExpanded, setPartnersExpanded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('partners-list-collapsed') === 'false') {
      setPartnersExpanded(true);
    }
  }, []);
  const togglePartners = useCallback(() => {
    setPartnersExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('partners-list-collapsed', String(!next));
      return next;
    });
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              {/*
                POL-01: Bounce arc mark inlined from public/bounce-mark.svg so
                fill="currentColor" inherits text-primary-foreground in both
                light and dark modes. next/image does NOT propagate
                currentColor into SVG fills — inline <svg> is required.
                viewBox 313x145 (~2.16:1); h-5 gives ~20px mark height inside
                the existing 32px square slot without clipping the title.
              */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg
                  viewBox="0 0 313 145"
                  aria-hidden="true"
                  className="h-5 w-auto"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M313 18.0004C242.86 18.0004 186 74.8605 186 145.001H168C168 103.579 134.421 70.0007 93 70.0007C51.5787 70.0007 18 103.579 18 145.001H0C0 93.6382 41.6375 52.0007 93 52.0007C128.371 52.0007 159.13 71.7471 174.855 100.817C193.541 42.3425 248.326 0.000366211 313 0.000366211V18.0004Z"
                  />
                </svg>
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
          {/*
            POL-02: SidebarGroupLabel renders as the collapse/expand toggle.
            A real <button> is required (not a <div onClick>) so keyboard and
            screen-reader users can reach it. aria-expanded + aria-controls
            wire it to the content region below.
            SidebarGroupLabel is a Base UI useRender component — pass the
            target element via `render={<button ... />}` (NOT Radix's asChild).
          */}
          <SidebarGroupLabel
            render={
              <button
                type="button"
                onClick={togglePartners}
                aria-expanded={partnersExpanded}
                aria-controls="partners-list-region"
              />
            }
            className="w-full cursor-pointer"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'mr-1 h-3.5 w-3.5 transition-transform duration-quick ease-default',
                partnersExpanded && 'rotate-90',
              )}
            />
            <span>Partners</span>
            {isReady && pairs.length > 0 && (
              <span className="ml-auto text-label-numeric text-muted-foreground">
                {pairs.length}
              </span>
            )}
          </SidebarGroupLabel>
          {/*
            POL-02: Collapsible content region. grid-rows 0fr↔1fr with inner
            overflow-hidden is the established collapse recipe in this
            codebase (see data-display.tsx:902-910 charts-expanded).
          */}
          <div
            id="partners-list-region"
            className={cn(
              'grid transition-[grid-template-rows] duration-normal ease-default',
              partnersExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="overflow-hidden">
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* All Partners (root) */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="All Partners"
                      isActive={drillState.level === 'root'}
                      aria-current={drillState.level === 'root' ? 'page' : undefined}
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

                  {/* Phase 39 PCFG-02..04: pair rows. Multi-product partners
                      (Happy Money, Zable) appear as TWO rows with suffixed
                      displayName. Single-product partners look unchanged
                      (name only); productTooltip carries the product label
                      shown on hover. Active state matches the FULL pair
                      (partner + product), so 1st-Party row stays inactive
                      when 3rd-Party is selected. */}
                  {isReady &&
                    pairs.map((p) => {
                      const isActive =
                        drillState.partner === p.partner &&
                        drillState.product === p.product;
                      return (
                        <SidebarMenuItem key={`${p.partner}::${p.product}`}>
                          <SidebarMenuButton
                            tooltip={
                              p.displayName === p.partner
                                ? `${p.partner} (${p.productTooltip})`
                                : p.displayName
                            }
                            isActive={isActive}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() =>
                              drillToPair({ partner: p.partner, product: p.product })
                            }
                          >
                            {p.isFlagged ? (
                              <span
                                aria-hidden="true"
                                className="flex h-4 w-4 items-center justify-center"
                              >
                                <span className="h-2 w-2 rounded-full bg-brand-purple" />
                              </span>
                            ) : (
                              <Users className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="truncate">{p.displayName}</span>
                          </SidebarMenuButton>
                          <SidebarMenuBadge>{p.batchCount}</SidebarMenuBadge>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </div>
          </div>
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
                        <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
                      ) : (
                        <Bookmark className="h-4 w-4" aria-hidden="true" />
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
                        aria-label={`Delete saved view ${view.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </SidebarMenuAction>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/*
          Phase 37 — Metabase import entry. Placed after Views to keep the
          primary partner-navigation affordances at top and tools at bottom.
          Single-item utility entry — no SidebarGroupLabel.
        */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Import from Metabase"
                  onClick={() => setImportOpen(true)}
                >
                  <Database className="h-4 w-4" />
                  <span>Import from Metabase</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

      {/*
        Phase 37 — ImportSheet mounted at the sidebar level (matches
        CreateListDialog placement). The Sheet primitive portals itself, so
        its DOM location does not affect overlay position. onImportSql is a
        typed field on SidebarDataState as of Plan 03, bound to
        handleApplyImport in data-display.tsx.
      */}
      <ImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportSql={onImportSql}
      />
    </Sidebar>
  );
}
