'use client';

import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import {
  Users,
  Bookmark,
  Trash2,
  Star,
  LayoutDashboard,
  Database,
  ChevronRight,
  List as ListIcon,
  AlertTriangle,
} from 'lucide-react';
import { ContextMenu } from '@base-ui/react/context-menu';
import { cn, getPartnerName, getStringField } from '@/lib/utils';
import { Term } from '@/components/ui/term';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSidebarData } from '@/contexts/sidebar-data';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { useActivePartnerList } from '@/contexts/active-partner-list';
import { PartnerListsSidebarGroup } from '@/components/partner-lists/partner-lists-sidebar-group';
import { CreateListDialog } from '@/components/partner-lists/create-list-dialog';
import { ImportSheet } from '@/components/metabase-import/import-sheet';
import { PartnerSetupSheet } from '@/components/partner-config/partner-setup-sheet';
import { useData } from '@/hooks/use-data';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
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

/**
 * Phase 44 VOC-07 — defensive substrate for the mixed-revenue-model batch
 * outlier flagged in Phase 44 CONTEXT.md ("the 1/550 batch with mixed
 * revenue models"). The Wave 3 ETL audit (Plan 44-03 ADR 0002) found ZERO
 * batches mixing revenue models on real data — every batch maps cleanly
 * to one of CONTINGENCY / DEBT_SALE. This helper is the substrate for
 * future ETL anomalies; no current call site exercises it.
 *
 * Returns true when a single batch row carries multiple distinct
 * REVENUE_MODEL values across its constituent accounts. Caller decides
 * how to render the warning (the MixedRevenueModelChip below renders the
 * canonical Phase 44 amber-warning treatment).
 */
export function isMixedRevenueModelBatch(
  batchRows: Array<Record<string, unknown>>,
): boolean {
  const seen = new Set<string>();
  for (const row of batchRows) {
    const rm = getStringField(row, 'REVENUE_MODEL');
    if (rm) seen.add(rm);
    if (seen.size > 1) return true;
  }
  return false;
}

/**
 * Phase 44 VOC-07 — small "Mixed" warning chip with explanatory tooltip.
 * Defensive substrate: renders when a batch row carries multiple revenue
 * models (the 1/550 outlier anticipated by CONTEXT.md). UNEXERCISED on
 * current data — the Wave 3 ETL audit found ZERO mixed-model batches at
 * the (partner, batch) grain. Kept here so future ETL anomalies don't
 * silently mis-attribute mixed batches to a single model.
 *
 * Type tokens (Phase 27): `text-caption` for the chip body. NO
 * font-weight pairing — `text-caption` owns weight per the Phase 27 rule.
 * Semantic warning tokens `bg-warning-bg` / `text-warning-fg` exist in
 * `src/app/globals.css` (Phase 28+ design tokens) — using them keeps
 * dark-mode parity automatic.
 */
export function MixedRevenueModelChip(): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="ml-1 inline-flex items-center gap-1 rounded-sm bg-warning-bg px-1 text-caption text-warning-fg"
            aria-label="Mixed revenue model batch"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>Mixed</span>
          </span>
        }
      />
      <TooltipContent>
        This batch contains accounts from multiple revenue models — a known
        data-quality issue. Displayed under the dominant model.
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  // Phase 37 — Metabase import entry + Sheet mount.
  // Phase 39 PCFG-02..04: sidebar reads pairs (not partners). drillToPair
  // carries the full (partner, product) pair so multi-product partners
  // (Happy Money, Zable) become two peer rows.
  const {
    pairs,
    revenueModelsPerPair,
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

  // Phase 44 VOC-04 — nested-row activation handler. The Views group surfaces
  // a View's bound List as an expandable child row (see ADR 0001); clicking
  // the nested List row activates the same cross-app filter the standalone
  // Partner Lists section uses, so the activation path stays single-source.
  const { toggleList } = useActivePartnerList();

  // Phase 34-04: CreateListDialog open/edit state owned at the sidebar level so
  // the group header "+" and per-row pencil actions share a single mount of
  // the Sheet. allRows sources from the same TanStack Query cache the rest of
  // the app reads — query client dedupes the fetch, no extra request.
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  // Phase 37 Plan 02: Metabase import Sheet open state owned at the sidebar
  // level so the menu entry and the Sheet mount live in the same scope.
  const [importOpen, setImportOpen] = useState(false);
  // Phase 39-02 PCFG-05: PartnerSetupSheet open state — null when closed,
  // pair when a context-menu "Configure segments" click sets it. Mount lives
  // at the sidebar root (the Sheet primitive portals itself, so its DOM
  // location does not affect overlay position) — same placement convention
  // as CreateListDialog and ImportSheet.
  const [setupPair, setSetupPair] = useState<PartnerProductPair | null>(null);
  const { data: queryData } = useData();
  const allRows = queryData?.data ?? [];

  // Phase 39-02 PCFG-05: pair-scoped rows for the active Setup sheet. Filter
  // allRows by both PARTNER_NAME AND ACCOUNT_TYPE — this is the same row set
  // Plan 39-04's segment-split charts/KPIs will operate on (Pitfall 7 lock —
  // single source of truth for the evaluator input).
  const setupPairScopedRows = useMemo(() => {
    if (!setupPair) return [];
    return allRows.filter(
      (row) =>
        getPartnerName(row) === setupPair.partner &&
        getStringField(row, 'ACCOUNT_TYPE') === setupPair.product,
    );
  }, [allRows, setupPair]);

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

  // Views collapse — same hydration-safe recipe as partners. Defaults to
  // expanded (Views is small and benefits from being visible by default);
  // user choice persists via 'views-list-collapsed' (true=collapsed).
  const [viewsExpanded, setViewsExpanded] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('views-list-collapsed') === 'true') {
      setViewsExpanded(false);
    }
  }, []);
  const toggleViews = useCallback(() => {
    setViewsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('views-list-collapsed', String(!next));
      return next;
    });
  }, []);

  // Phase 44 VOC-04 — per-view nested-list expansion. Keyed by view.id so each
  // View row toggles its bound-List child independently. Session-only state
  // (NOT persisted) — the nested affordance is a quick-glance disclosure, not
  // a setting users would expect to remember across reloads. See
  // docs/adr/0001-list-view-hierarchy.md for the conceptual model.
  const [viewsExpansionState, setViewsExpansionState] = useState<
    Record<string, boolean>
  >({});
  const toggleViewExpansion = useCallback((viewId: string) => {
    setViewsExpansionState((prev) => ({ ...prev, [viewId]: !prev[viewId] }));
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
                      when 3rd-Party is selected.

                      Phase 39-02 PCFG-05: each pair row is wrapped in a
                      ContextMenu so right-click opens a menu with the
                      "Configure segments" entry. The render-prop delegation
                      pattern (Pitfall 8 in 39-RESEARCH) lets Base UI compose
                      refs + event handlers correctly with the existing
                      SidebarMenuButton primitive — no extra wrapper div, no
                      keyboard-focus fight. Click-to-drill semantics are
                      preserved on the trigger. */}
                  {isReady &&
                    pairs.map((p) => {
                      // Phase 44 VOC-07 — active-state matching extends to
                      // revenueModel for multi-model pairs. Single-model
                      // pairs (rmCount === 1) match on partner+product
                      // only — revenueModel is meaningless when the
                      // (partner, product) is structurally bound to a
                      // single model. Multi-model pairs (rmCount > 1)
                      // require all three to match, so 3P-Contingency stays
                      // inactive when 3P-DebtSale is selected and vice
                      // versa.
                      const ppKey = `${p.partner}::${p.product}`;
                      const rmCount = revenueModelsPerPair.get(ppKey) ?? 1;
                      const isActive =
                        drillState.partner === p.partner &&
                        drillState.product === p.product &&
                        (rmCount === 1 ||
                          drillState.revenueModel === (p.revenueModel ?? null));
                      const pairForMenu: PartnerProductPair = {
                        partner: p.partner,
                        product: p.product,
                        // Carry revenueModel into the per-pair Setup sheet
                        // entry-point so the Partner Setup sheet shows the
                        // right pair (Step 4 below reads pair.revenueModel).
                        revenueModel: p.revenueModel,
                      };
                      return (
                        <SidebarMenuItem
                          key={`${p.partner}::${p.product}::${p.revenueModel ?? ''}`}
                        >
                          <ContextMenu.Root>
                            <ContextMenu.Trigger
                              render={
                                <SidebarMenuButton
                                  tooltip={
                                    p.displayName === p.partner
                                      ? `${p.partner} (${p.productTooltip})`
                                      : p.displayName
                                  }
                                  isActive={isActive}
                                  aria-current={isActive ? 'page' : undefined}
                                  onClick={() =>
                                    drillToPair({
                                      partner: p.partner,
                                      product: p.product,
                                      // Phase 44 VOC-07 — pair.revenueModel
                                      // travels into URL ?rm= via drillToPair
                                      // (Task 1 wire). Single-model pairs
                                      // pass undefined → drillToPair clears
                                      // ?rm=; multi-model pairs push the
                                      // value (Contingency / DebtSale).
                                      revenueModel: p.revenueModel,
                                    })
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
                                    <Users
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="truncate">
                                    {p.displayName}
                                  </span>
                                </SidebarMenuButton>
                              }
                            />
                            <ContextMenu.Portal>
                              <ContextMenu.Positioner sideOffset={4}>
                                <ContextMenu.Popup className="min-w-[180px] rounded-md bg-surface-overlay p-1 shadow-elevation-overlay outline-hidden">
                                  <ContextMenu.Item
                                    className="rounded-sm px-2 py-1.5 text-body cursor-default outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                                    onClick={() => setSetupPair(pairForMenu)}
                                  >
                                    Configure segments
                                  </ContextMenu.Item>
                                </ContextMenu.Popup>
                              </ContextMenu.Positioner>
                            </ContextMenu.Portal>
                          </ContextMenu.Root>
                          <SidebarMenuBadge>{p.batchCount}</SidebarMenuBadge>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </div>
          </div>
        </SidebarGroup>

        {/* Saved views — collapsible (same recipe as Partners group) */}
        <SidebarGroup>
          <SidebarGroupLabel
            render={
              <button
                type="button"
                onClick={toggleViews}
                aria-expanded={viewsExpanded}
                aria-controls="views-list-region"
              />
            }
            className="w-full cursor-pointer"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'mr-1 h-3.5 w-3.5 transition-transform duration-quick ease-default',
                viewsExpanded && 'rotate-90',
              )}
            />
            {/*
              Phase 44 VOC-03 — first-instance-per-surface rule: this is the
              FIRST occurrence of the `view` term on the sidebar surface
              (Partner Lists group above carries `partner` + `list`; Views
              label carries `view`). "Partners" group label below +
              "All Partners" menu button + saved-view names are subsequent
              instances and stay plain.
            */}
            <span>
              <Term name="view">Views</Term>
            </span>
            {views.length > 0 && (
              <span className="ml-auto text-label-numeric text-muted-foreground">
                {views.length}
              </span>
            )}
          </SidebarGroupLabel>
          <div
            id="views-list-region"
            className={cn(
              'grid transition-[grid-template-rows] duration-normal ease-default',
              viewsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="overflow-hidden">
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

                  {/*
                    Phase 44 VOC-04 — View-contains-List explicit hierarchy.
                    A View row carries an expand chevron when its `listId`
                    references a List that exists in the current `lists`
                    array. Expanding reveals the bound List as a nested
                    child row; clicking the nested row activates the List
                    via the same toggleList path the standalone Partner
                    Lists section uses. Views without a `listId` (every
                    pre-Phase-44 saved view falls in this bucket) render
                    as leaf rows — current behavior preserved. Views with
                    a `listId` that references a missing List degrade to
                    leaf + console.warn (no crash). See
                    docs/adr/0001-list-view-hierarchy.md.

                    Looking up the bound list inside the .map() body is
                    cheap (lists.length is typically <20) and keeps the
                    render-path branch in one place. Same render shape
                    when the binding is absent or invalid — single
                    SidebarMenuButton, no chevron.
                  */}
                  {isReady &&
                    views.map((view) => {
                      const boundList = view.snapshot.listId
                        ? lists.find((l) => l.id === view.snapshot.listId)
                        : undefined;
                      // Missing-list reference = saved view points at a
                      // List the user deleted. Don't crash, don't render
                      // the chevron — fall back to the leaf-row recipe
                      // and warn once for diagnostic visibility.
                      if (view.snapshot.listId && !boundList) {
                        console.warn(
                          `[44-02] View ${view.id} references missing list ${view.snapshot.listId}`,
                        );
                      }
                      const hasBinding = !!boundList;
                      const isExpanded = !!viewsExpansionState[view.id];

                      return (
                        <SidebarMenuItem key={view.id}>
                          <SidebarMenuButton
                            tooltip={view.name}
                            onClick={() => onLoadView(view)}
                          >
                            {hasBinding ? (
                              // Inline chevron toggles only this view's
                              // nested-list expansion. stopPropagation
                              // prevents the parent SidebarMenuButton
                              // onClick (load view) from firing alongside.
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleViewExpansion(view.id);
                                }}
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? `Collapse list bound to ${view.name}`
                                    : `Expand list bound to ${view.name}`
                                }
                                className="-ml-0.5 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                              >
                                <ChevronRight
                                  aria-hidden="true"
                                  className={cn(
                                    'h-3.5 w-3.5 transition-transform duration-quick ease-default',
                                    isExpanded && 'rotate-90',
                                  )}
                                />
                              </button>
                            ) : view.isDefault ? (
                              <Star
                                className="h-4 w-4 text-amber-500"
                                aria-hidden="true"
                              />
                            ) : (
                              <Bookmark
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
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
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </SidebarMenuAction>
                          )}
                          {/*
                            Nested bound-List row. Renders when the view
                            has a valid binding AND the user has expanded
                            it. Indented via pl-6 to read as a child of
                            the View row above. Clicking activates the
                            list via toggleList — same code path the
                            standalone Partner Lists group uses, so the
                            cross-app filter behavior is identical.
                          */}
                          {hasBinding && isExpanded && boundList && (
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                tooltip={`${boundList.name} (List)`}
                                onClick={() => toggleList(boundList.id)}
                                className="pl-6"
                              >
                                <ListIcon
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span className="truncate text-body">
                                  {boundList.name}
                                </span>
                                <span className="ml-auto text-caption text-muted-foreground">
                                  List
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </div>
          </div>
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

      {/*
        Phase 39-02 PCFG-05 — PartnerSetupSheet for the per-pair segment
        editor. Mount lives at the sidebar root because the entry point
        (per-pair ContextMenu's "Configure segments" item) lives in the
        sidebar's pair-row mapping above. The Sheet primitive portals
        itself, so its DOM location does not affect overlay position.
        Closing clears setupPair so the next open re-hydrates from storage
        for whatever pair was clicked.
      */}
      {setupPair && (
        <PartnerSetupSheet
          open={!!setupPair}
          onOpenChange={(next) => {
            if (!next) setSetupPair(null);
          }}
          pair={setupPair}
          pairScopedRows={setupPairScopedRows}
        />
      )}
    </Sidebar>
  );
}
