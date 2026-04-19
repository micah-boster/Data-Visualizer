'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/hooks/use-data';
import { useAccountData } from '@/hooks/use-account-data';
import { useDrillDown } from '@/hooks/use-drill-down';
import { useDataFreshness } from '@/contexts/data-freshness';
import { useSidebarData } from '@/contexts/sidebar-data';
import { accountColumnDefs } from '@/lib/columns/account-definitions';
import { buildRootColumnDefs, buildPartnerSummaryRows } from '@/lib/columns/root-columns';
import dynamic from 'next/dynamic';
import { usePartnerStats } from '@/hooks/use-partner-stats';
import { PartnerNormsProvider } from '@/contexts/partner-norms';
import { AnomalyProvider } from '@/contexts/anomaly-provider';
import { CrossPartnerProvider, useCrossPartnerContext } from '@/contexts/cross-partner-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable } from '@/components/table/data-table';
import { KpiSummaryCards } from '@/components/kpi/kpi-summary-cards';
import { UnifiedToolbar } from '@/components/toolbar/unified-toolbar';
import { QueryCommandDialog } from '@/components/query/query-command-dialog';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import { useActivePartnerList } from '@/contexts/active-partner-list';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { useSavedViews } from '@/hooks/use-saved-views';
import { useFilterState } from '@/hooks/use-filter-state';
import { buildDataContext, type PartnerSummary } from '@/lib/ai/context-builder';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { getPartnerName, getBatchName } from '@/lib/utils';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { SectionDivider } from '@/components/layout/section-divider';
import { toast } from 'sonner';
import type { DrillState } from '@/hooks/use-drill-down';
import type { SavedView, CollectionCurveDefinition, ChartDefinition } from '@/lib/views/types';
import { ChartPanel } from '@/components/charts/chart-panel';
import { DEFAULT_COLLECTION_CURVE } from '@/lib/views/migrate-chart';

const CrossPartnerTrajectoryChart = dynamic(
  () =>
    import('@/components/cross-partner/trajectory-chart').then(
      (mod) => mod.CrossPartnerTrajectoryChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[40vh] w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const PartnerComparisonMatrix = dynamic(
  () =>
    import('@/components/cross-partner/comparison-matrix').then(
      (mod) => mod.PartnerComparisonMatrix,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const RootSparkline = dynamic(
  () =>
    import('@/components/charts/root-sparkline').then(
      (mod) => mod.RootSparkline,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

const PartnerSparkline = dynamic(
  () =>
    import('@/components/charts/partner-sparkline').then(
      (mod) => mod.PartnerSparkline,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  },
);

export function DataDisplay() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } = useData();
  const { state: drillState, drillToPartner, drillToBatch, navigateToLevel } =
    useDrillDown();
  const {
    data: accountData,
    isLoading: isAccountLoading,
    isError: isAccountError,
    error: accountError,
  } = useAccountData(drillState.partner, drillState.batch);
  const { setFetchedAt, setIsFetching } = useDataFreshness();
  const [schemaWarningDismissed, setSchemaWarningDismissed] = useState(false);

  // Chart state
  const [chartsExpanded, setChartsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('charts-expanded') !== 'false';
  });
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const toggleCharts = useCallback(() => {
    setChartsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('charts-expanded', String(next));
      return next;
    });
  }, []);

  // Query dialog state
  const [queryOpen, setQueryOpen] = useState(false);

  // Phase 34-04: known partner-list ids feed useSavedViews so sanitizeSnapshot
  // can strip stale snapshot.listId values (non-destructive — views still
  // load, they just don't activate a list that no longer exists). Re-memoed
  // whenever the lists collection changes.
  const { lists: partnerLists } = usePartnerListsContext();
  const knownListIds = useMemo(
    () => new Set(partnerLists.map((l) => l.id)),
    [partnerLists],
  );

  // Lifted state: saved views
  const {
    views,
    saveView,
    deleteView,
    restoreView,
    hasViewWithName,
    replaceView,
    restoreDefaults,
  } = useSavedViews(knownListIds);

  // Lifted state: dimension filters (URL-backed)
  const {
    columnFilters: dimensionFilters,
    setFilter,
    clearAll: clearAllDimension,
    activeFilters,
    searchParams,
  } = useFilterState(data?.data);

  // Active partner list (Phase 34 — LIST-03). Flows through the same
  // filteredRawData memo as dimension filters so KPIs, charts, and table
  // share ONE filter pipeline (Pitfall 2 lock).
  // Phase 34-04: setActiveListId is pulled here too so handleLoadView can
  // activate a view's referenced list (already sanitized — guaranteed known
  // or undefined).
  const { activeList, setActiveListId } = useActivePartnerList();

  // HEALTH-01 / KI-07 fix: apply dimension filters to raw batch rows BEFORE
  // aggregation so root-level table, chart, KPIs, and downstream consumers
  // all reflect the filtered dataset consistently. `use-filter-state.ts` is
  // correct (don't touch); the bug was that `rootSummaryRows` and friends
  // operated on unfiltered `data.data`.
  //
  // Phase 34 LIST-03: after dimension filters, additionally narrow to the
  // active partner list's partnerIds (if any). Keeps the filter-before-
  // aggregate contract intact — all downstream consumers (KPIs, trajectory,
  // comparison matrix, table) pick up the list filter through this single
  // memo.
  const filteredRawData = useMemo(() => {
    const rows = data?.data;
    if (!rows) return [];
    let out = rows;

    // 1. Dimension filters (Phase 25 — HEALTH-01)
    if (dimensionFilters && dimensionFilters.length > 0) {
      out = out.filter((row) =>
        dimensionFilters.every((cf) => {
          const value = (row as Record<string, unknown>)[cf.id];
          if (value == null) return false;
          // TanStack filter values can be scalars or arrays — handle both
          if (Array.isArray(cf.value)) {
            return cf.value.some((v) => String(v) === String(value));
          }
          return String(cf.value) === String(value);
        }),
      );
    }

    // 2. Active partner list (Phase 34 — LIST-03)
    if (activeList && activeList.partnerIds.length > 0) {
      const allow = new Set(activeList.partnerIds);
      out = out.filter((row) => allow.has(getPartnerName(row) ?? ''));
    }

    return out;
  }, [data?.data, dimensionFilters, activeList]);

  // Partner stats sourced from filteredRawData so root-level dimension filters
  // (e.g. ACCOUNT_TYPE) cascade into partner drill-down aggregates.
  const partnerStats = usePartnerStats(drillState.partner, filteredRawData);

  // Sync freshness state to context so header can display it
  useEffect(() => {
    if (data?.meta?.fetchedAt) {
      setFetchedAt(data.meta.fetchedAt);
    }
  }, [data?.meta?.fetchedAt, setFetchedAt]);

  useEffect(() => {
    setIsFetching(isFetching);
  }, [isFetching, setIsFetching]);

  // NAV-03: deep-link stale-param guard. When the URL references a partner
  // or batch that isn't in the loaded dataset, show a toast and step up to
  // the nearest valid level. Uses navigateToLevel (router.push) rather than
  // router.replace so the user's back button still works coherently — matches
  // CONTEXT's "render empty + toast, don't show error page" directive.
  useEffect(() => {
    if (isLoading || !data?.data || drillState.level === 'root') return;

    const rows = data.data;
    const partnerExists = drillState.partner
      ? rows.some((r) => getPartnerName(r) === drillState.partner)
      : true;

    if (!partnerExists) {
      toast(`Partner "${drillState.partner}" not found`, {
        description: 'Returning to the root view.',
      });
      navigateToLevel('root');
      return;
    }

    if (drillState.level === 'batch' && drillState.batch) {
      const batchExists = rows.some(
        (r) =>
          getPartnerName(r) === drillState.partner &&
          getBatchName(r) === drillState.batch,
      );
      if (!batchExists) {
        toast(`Batch "${drillState.batch}" not found for ${drillState.partner}`, {
          description: 'Returning to the partner view.',
        });
        navigateToLevel('partner');
      }
    }
  }, [isLoading, data?.data, drillState, navigateToLevel]);

  // Data source depends on drill level.
  // KI-12 fix: deps are object references (filteredRawData, accountData,
  // drillState) rather than sub-properties so the React Compiler can preserve
  // this memoization. The downstream refs are stable via TanStack Query and
  // useDrillDown so broadening the deps is safe.
  // HEALTH-01: starts from filteredRawData so root-level dimension filters
  // cascade into partner drill-down.
  const tableData = useMemo(() => {
    if (drillState.level === 'batch') {
      return accountData?.data ?? [];
    }
    if (drillState.level === 'partner' && drillState.partner) {
      return filteredRawData.filter(
        (row) => getPartnerName(row) === drillState.partner,
      );
    }
    return filteredRawData;
  }, [filteredRawData, accountData, drillState]);

  // Memoize batch-level curve for single-batch drill-down.
  // KI-12 fix: same object-ref pattern.
  const batchCurve = useMemo(() => {
    if (drillState.level !== 'batch' || !drillState.batch || !partnerStats?.curves) return null;
    const curves = partnerStats.curves.filter((c) => c.batchName === drillState.batch);
    return curves.length > 0 ? curves : null;
  }, [drillState, partnerStats]);

  // Memoize unique partner count
  const uniquePartnerCount = useMemo(
    () => new Set(data?.data?.map((r) => getPartnerName(r))).size,
    [data?.data],
  );

  // Filter options for the toolbar filter popover
  const partnerOptions = useMemo(
    () =>
      [...new Set((data?.data ?? []).map((r) => String(r.PARTNER_NAME ?? '')))]
        .filter(Boolean)
        .sort(),
    [data?.data],
  );
  const typeOptions = useMemo(
    () =>
      [...new Set((data?.data ?? []).map((r) => String(r.ACCOUNT_TYPE ?? '')))]
        .filter(Boolean)
        .sort(),
    [data?.data],
  );
  const selectedPartner = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'PARTNER_NAME');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const selectedType = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'ACCOUNT_TYPE');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const selectedBatch = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'BATCH');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  const batchOptions = useMemo(() => {
    const rows = selectedPartner
      ? (data?.data ?? []).filter((r) => String(r.PARTNER_NAME ?? '') === selectedPartner)
      : (data?.data ?? []);
    return [...new Set(rows.map((r) => String(r.BATCH ?? '')))]
      .filter(Boolean)
      .sort();
  }, [data?.data, selectedPartner]);

  // Refs for DataTable to expose snapshot capture and view loading
  const tableSnapshotRef = useRef<(() => import('@/lib/views/types').ViewSnapshot) | null>(null);
  const tableLoadViewRef = useRef<((view: SavedView) => void) | null>(null);

  // Refs for chart state snapshot/restore (wired by CollectionCurveChart).
  // Typed as CollectionCurveDefinition (the narrow variant) — snapshot writes
  // only land on ViewSnapshot.chartState when the running chart is the
  // collection-curve variant.
  const chartSnapshotRef = useRef<(() => CollectionCurveDefinition) | null>(null);
  const chartLoadRef = useRef<((state: CollectionCurveDefinition) => void) | null>(null);

  // Phase 36-05 — parent-owned chart definition (preset OR generic variant).
  // Initial value is DEFAULT_COLLECTION_CURVE per CONTEXT lock: "Default chart
  // for a view with no chartState is the collection-curve preset." View load
  // hydrates this from snapshot.chartState; view save captures it by branching
  // on chartDefinition.type (Pitfall 8 — two-snapshot-mechanism resolution).
  const [chartDefinition, setChartDefinition] = useState<ChartDefinition>(DEFAULT_COLLECTION_CURVE);

  // View loading handler — called from sidebar or toolbar
  const handleLoadView = useCallback(
    (view: SavedView) => {
      const { snapshot } = view;

      // Restore chart state
      if (snapshot.chartsExpanded !== undefined) {
        setChartsExpanded(snapshot.chartsExpanded);
        localStorage.setItem('charts-expanded', String(snapshot.chartsExpanded));
      }
      if (snapshot.comparisonVisible !== undefined) {
        setComparisonVisible(snapshot.comparisonVisible);
      }

      // Restore dimension filters via URL
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(snapshot.dimensionFilters)) {
        if (value) params.set(key, value);
      }
      const qs = params.toString();
      // Use window.history to avoid full re-render
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);

      // NAV-04: Drill URL update runs separately from the dimension-filter
      // history.replaceState above. router.push ensures useSearchParams re-reads
      // and useDrillDown re-renders (Pitfall 5 in 32-RESEARCH.md).
      {
        const drillParams = new URLSearchParams(window.location.search);
        drillParams.delete('p');
        drillParams.delete('b');
        if (snapshot.drill?.partner) {
          drillParams.set('p', snapshot.drill.partner);
          if (snapshot.drill.batch) drillParams.set('b', snapshot.drill.batch);
        }
        const drillQs = drillParams.toString();
        router.push(drillQs ? `?${drillQs}` : window.location.pathname, { scroll: false });
      }

      // Phase 35 — narrow on the discriminator before handing off to the
      // collection-curve-specific chartLoadRef. Future chart variants (line /
      // bar / scatter from Phase 36) will get their own refs + narrow sites.
      if (snapshot.chartState?.type === 'collection-curve' && chartLoadRef.current) {
        chartLoadRef.current(snapshot.chartState);
      }

      // Phase 36-05 — hydrate the parent-owned chartDefinition state so
      // ChartPanel can re-render on the correct branch (preset vs generic).
      // Absent chartState falls back to DEFAULT_COLLECTION_CURVE (CONTEXT lock).
      // The chartLoadRef call above (preset-branch-only) still runs to
      // synchronize the preset's internal useCurveChartState hook.
      if (snapshot.chartState) {
        setChartDefinition(snapshot.chartState);
      } else {
        setChartDefinition(DEFAULT_COLLECTION_CURVE);
      }

      // Phase 34-04: apply partner-list activation when the view carries a
      // valid listId. Sanitization in useSavedViews has already guaranteed the
      // id is either a known list or undefined — no runtime validation needed
      // here. When listId is undefined we DO NOT clear the currently-active
      // list (CONTEXT lock: "loading a view without a list reference does
      // not clear the active list").
      if (snapshot.listId) {
        setActiveListId(snapshot.listId);
      }

      // The rest (sorting, visibility, order, column filters, sizing, preset)
      // is handled by DataTable via the onLoadView callback
      if (tableLoadViewRef.current) {
        tableLoadViewRef.current(view);
      }
    },
    [router, setActiveListId],
  );

  const handleDeleteView = useCallback(
    (id: string) => {
      const { deleted } = deleteView(id);
      if (deleted) {
        toast('View deleted', {
          description: `"${deleted.name}" was removed`,
          action: {
            label: 'Undo',
            onClick: () => restoreView(deleted),
          },
          duration: 5000,
        });
      }
    },
    [deleteView, restoreView],
  );

  const handleSaveView = useCallback(
    (name: string, options?: { includeDrill?: boolean }) => {
      if (tableSnapshotRef.current) {
        const snapshot = tableSnapshotRef.current();
        // Enrich with chart + layout state
        snapshot.chartsExpanded = chartsExpanded;
        snapshot.comparisonVisible = comparisonVisible;
        // Phase 36-05 Pitfall 8 — two snapshot mechanisms resolved by
        // branching on chartDefinition.type: the collection-curve preset owns
        // its own domain-specific state (hiddenBatches / showAverage /
        // showAllBatches) inside useCurveChartState, so we capture via
        // chartSnapshotRef on the preset branch; generic variants carry all
        // their state on chartDefinition itself.
        if (chartDefinition.type === 'collection-curve') {
          if (chartSnapshotRef.current) {
            snapshot.chartState = chartSnapshotRef.current();
          }
        } else {
          snapshot.chartState = chartDefinition;
        }
        // NAV-04: optional drill capture. Only write the field when the user
        // opted in AND we actually have drill state to save.
        if (options?.includeDrill && drillState.level !== 'root') {
          snapshot.drill = {
            partner: drillState.partner ?? undefined,
            batch: drillState.batch ?? undefined,
          };
        }
        saveView(name, snapshot);
        toast('View saved', {
          description: `"${name}" has been saved`,
          duration: 3000,
        });
      }
    },
    [saveView, chartsExpanded, comparisonVisible, drillState, chartDefinition],
  );

  const handleReplaceView = useCallback(
    (name: string, options?: { includeDrill?: boolean }) => {
      if (tableSnapshotRef.current) {
        const snapshot = tableSnapshotRef.current();
        snapshot.chartsExpanded = chartsExpanded;
        snapshot.comparisonVisible = comparisonVisible;
        // Phase 36-05 Pitfall 8 — see handleSaveView for rationale.
        if (chartDefinition.type === 'collection-curve') {
          if (chartSnapshotRef.current) {
            snapshot.chartState = chartSnapshotRef.current();
          }
        } else {
          snapshot.chartState = chartDefinition;
        }
        // NAV-04: mirror handleSaveView — capture drill when opted in.
        if (options?.includeDrill && drillState.level !== 'root') {
          snapshot.drill = {
            partner: drillState.partner ?? undefined,
            batch: drillState.batch ?? undefined,
          };
        }
        replaceView(name, snapshot);
        toast('View updated', {
          description: `"${name}" has been updated`,
          duration: 3000,
        });
      }
    },
    [replaceView, chartsExpanded, comparisonVisible, drillState, chartDefinition],
  );

  // DS-27: skeleton → content cross-fade with ~150ms overlap window.
  // Tracks two booleans independently so both layers can be rendered during
  // the overlap. When isLoading flips true → skeleton mounts immediately,
  // content unmounts. When isLoading flips false → content mounts at t=0
  // (fades in at --ease-decelerate × --duration-normal), skeleton starts
  // fading at t=0 (--ease-default × --duration-quick), skeleton unmounts
  // at t=150ms. The overlap window is 0-150ms where both layers are visible.
  // Reduced-motion path: global @media override collapses transitions to 0ms,
  // so the timer still fires at 150ms but no animation is seen — clean hard
  // swap. animate-pulse on the skeleton is neutralized by the same override.
  const [skeletonVisible, setSkeletonVisible] = useState(isLoading);
  const [contentReady, setContentReady] = useState(!isLoading);

  useEffect(() => {
    if (isLoading) {
      setSkeletonVisible(true);
      setContentReady(false);
    } else {
      setContentReady(true);
      const t = setTimeout(() => setSkeletonVisible(false), 150);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  // A11Y-03: drill cross-fade focus restoration.
  // The drill wrapper (line ~612) re-keys on drill identity so React unmounts
  // + remounts the subtree — after remount, focus lands on <body> (axe
  // focus-order-semantics violation). This effect restores focus to the
  // breadcrumb's current segment on every drill transition. Direction-agnostic:
  // URL back/forward fire the same useSearchParams re-read → same drillState
  // update → same useEffect. `preventScroll: true` complements Phase 32's
  // router.push({ scroll: false }) so the restore doesn't nudge the viewport.
  //
  // Guard: never steal focus when the user is mid-typing in an input/textarea
  // (protects Cmd+K search flow + any future textarea surfaces).
  //
  // Selector fallback chain:
  //   1. [data-breadcrumb-current] — attribute Plan 02 Task 2 adds on the
  //      breadcrumb active segment. Primary target.
  //   2. [aria-current="page"] inside nav[aria-label="Drill-down breadcrumb"]
  //      — also added by Plan 02 Task 2. Secondary fallback.
  // If neither attribute is in the DOM (Plan 02 hasn't landed yet), the effect
  // silently no-ops; no focus restore, but no error either. Once Plan 02 ships,
  // the effect activates without any code change here.
  useEffect(() => {
    const activeTag =
      typeof document !== 'undefined' ? document.activeElement?.tagName : null;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    const el =
      document.querySelector<HTMLElement>('[data-breadcrumb-current]') ??
      document.querySelector<HTMLElement>(
        'nav[aria-label="Drill-down breadcrumb"] [aria-current="page"]',
      );
    if (el) {
      // The breadcrumb active segment may not natively accept focus
      // (e.g. <span>); set tabIndex=-1 inline so .focus() works regardless
      // of Plan 02's markup choices. tabIndex=-1 means programmatic-only
      // (user cannot Tab to it).
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1');
      }
      el.focus({ preventScroll: true });
    }
  }, [drillState.level, drillState.partner, drillState.batch]);

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!isLoading && (!data || data.data.length === 0)) return <EmptyState variant="no-data" />;
  if (drillState.level === 'batch' && isAccountError) {
    return <ErrorState error={accountError} onRetry={() => navigateToLevel('partner')} />;
  }

  // Pre-overlap / still-loading: skeleton-only render, no content mounted yet.
  if (!contentReady || !data) {
    return (
      <div className="relative">
        <div className="transition-opacity duration-quick ease-default opacity-100">
          <LoadingState />
        </div>
      </div>
    );
  }

  const hasSchemaWarnings =
    !schemaWarningDismissed &&
    data.schemaWarnings &&
    (data.schemaWarnings.missing.length > 0 || data.schemaWarnings.unexpected.length > 0);

  // DS-27 overlap window: skeleton layer co-renders with content for the first
  // 150ms after data arrival, absolute-positioned above and fading out while
  // content fades in. After the overlap, skeletonVisible flips false and only
  // the content layer remains.
  return (
    <CrossPartnerProvider allRows={filteredRawData}>
      <EnrichedAnomalyProvider allRows={filteredRawData}>
        <SidebarDataPopulator
          allData={data.data}
          allowedPartnerIds={activeList?.partnerIds ?? null}
          drillState={drillState}
          drillToPartner={drillToPartner}
          navigateToLevel={navigateToLevel}
          views={views}
          onLoadView={handleLoadView}
          onDeleteView={handleDeleteView}
          onSaveView={handleSaveView}
        />

        {skeletonVisible && (
          <div
            className="absolute inset-0 z-10 transition-opacity duration-quick ease-default opacity-0 pointer-events-none"
            aria-hidden
          >
            <LoadingState />
          </div>
        )}

        <div className={cn(
          "flex h-[calc(100vh-3.5rem)] flex-col transition-opacity duration-normal ease-decelerate",
          contentReady ? "opacity-100" : "opacity-0",
        )}>
          {/* Schema warnings */}
          {hasSchemaWarnings && (
            <Alert className="relative shrink-0 mx-2 mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="pr-8">
                <span className="text-title">Data may be incomplete. </span>
                {data.schemaWarnings!.missing.length > 0 && (
                  <span>
                    Missing columns: {data.schemaWarnings!.missing.join(', ')}.{' '}
                  </span>
                )}
                {data.schemaWarnings!.unexpected.length > 0 && (
                  <span>
                    {data.schemaWarnings!.unexpected.length} unexpected column(s) found.
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={() => setSchemaWarningDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </Alert>
          )}

          {/*
            DS-23 drill cross-fade boundary.
            Re-key on drill identity → React unmounts + remounts the subtree;
            `transition-opacity duration-normal ease-default` softens the swap.
            Symmetric (opacity-only), so browser back/forward replays identically
            with zero direction tracking. Header, sidebar, sticky chrome render
            OUTSIDE this wrapper and stay steady.
            `contain: layout` holds the container height stable mid-fade so
            scroll position does not jump on multi-batch partners (Pitfall 3).
            Reduced-motion @media override in globals.css collapses this to an
            instant swap for users with prefers-reduced-motion: reduce.
          */}
          <div
            key={`drill-${drillState.level}-${drillState.partner ?? 'none'}-${drillState.batch ?? 'none'}`}
            data-drill-fade
            className="transition-opacity duration-normal ease-default flex min-h-0 flex-1 flex-col"
            style={{ contain: 'layout' }}
          >
            {/*
              DS-24 chart expand/collapse region.
              Wrapper uses `grid-template-rows: 0fr ↔ 1fr` transition at
              --duration-normal × --ease-default. Inner `overflow-hidden` is
              non-negotiable (Pitfall 8) — without it, collapsed charts spill
              a sliver below the row line on fat charts (PartnerComparisonMatrix,
              CollectionCurveChart). Chart children are always mounted when in
              scope for the current drill level; the grid drives height so
              expand→collapse is a smooth height transition rather than a hard
              mount/unmount. Sparkline renders OUTSIDE the collapsible region
              (sibling, not nested) so it's always mounted when its conditions
              match and doesn't participate in the grid transition.
              Option A (grid-rows-only, no opacity layer) selected per plan —
              escalate to Option B opacity layer only if pilot shows a visible
              pop at the collapsed boundary.
            */}
            <SectionErrorBoundary resetKeys={[data]}>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-normal ease-default',
                  chartsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
                data-charts-expanded={chartsExpanded}
              >
                <div className="overflow-hidden">
                  <div className="shrink-0 px-2 pt-2 space-y-2">
                    {drillState.level === 'root' && (
                      <>
                        <CrossPartnerTrajectoryChart />
                        {comparisonVisible && <PartnerComparisonMatrix />}
                      </>
                    )}
                    {drillState.level === 'partner' && (
                      <>
                        <KpiSummaryCards
                          kpis={partnerStats?.kpis ?? null}
                          trending={partnerStats?.trending ?? null}
                        />
                        {partnerStats?.curves && partnerStats.curves.length >= 2 && (
                          <>
                            {/* DS-29 section boundary: KPI band ↔ charts */}
                            <SectionDivider />
                            <ChartPanel
                              definition={chartDefinition}
                              onDefinitionChange={setChartDefinition}
                              rows={filteredRawData}
                              curves={partnerStats.curves}
                              chartSnapshotRef={chartSnapshotRef}
                              chartLoadRef={chartLoadRef}
                            />
                          </>
                        )}
                      </>
                    )}
                    {batchCurve && (
                      <ChartPanel
                        definition={chartDefinition}
                        onDefinitionChange={setChartDefinition}
                        rows={filteredRawData}
                        curves={batchCurve}
                        chartSnapshotRef={chartSnapshotRef}
                        chartLoadRef={chartLoadRef}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Sparkline when charts collapsed — OUTSIDE the collapsible region */}
              {!chartsExpanded && drillState.level === 'root' && (
                <div className="shrink-0 px-2 pt-2">
                  <RootSparkline />
                </div>
              )}
              {!chartsExpanded && drillState.level === 'partner' && partnerStats?.curves && partnerStats.curves.length >= 2 && (
                <div className="shrink-0 px-2 pt-2">
                  <PartnerSparkline curves={partnerStats.curves} />
                </div>
              )}
            </SectionErrorBoundary>

            {/* DS-29 section boundary: charts ↔ table */}
            <SectionDivider />

            {/* Interactive data table with toolbar */}
            <PartnerNormsProvider norms={partnerStats?.norms ?? null}>
              <SectionErrorBoundary resetKeys={[data]}>
              <div className="min-h-0 flex-1 flex flex-col">
                {drillState.level === 'batch' && isAccountLoading ? (
                  <LoadingState />
                ) : (
                  <CrossPartnerDataTable
                    drillState={drillState}
                    tableData={tableData}
                    isFetching={isFetching}
                    drillToPartner={drillToPartner}
                    drillToBatch={drillToBatch}
                    navigateToLevel={navigateToLevel}
                    totalRowCount={uniquePartnerCount}
                    partnerStats={partnerStats}
                    allData={filteredRawData}
                    // Lifted state
                    dimensionFilters={dimensionFilters}
                    setFilter={setFilter}
                    clearAllDimension={clearAllDimension}
                    activeFilters={activeFilters}
                    searchParams={searchParams}
                    views={views}
                    onLoadView={handleLoadView}
                    onDeleteView={handleDeleteView}
                    onSaveView={handleSaveView}
                    onReplaceView={handleReplaceView}
                    hasViewWithName={hasViewWithName}
                    restoreDefaults={restoreDefaults}
                    // Chart state for toolbar
                    chartsExpanded={chartsExpanded}
                    onToggleCharts={toggleCharts}
                    comparisonVisible={comparisonVisible}
                    // Query
                    onOpenQuery={() => setQueryOpen(true)}
                    // Filter options
                    partnerOptions={partnerOptions}
                    typeOptions={typeOptions}
                    batchOptions={batchOptions}
                    selectedPartner={selectedPartner}
                    selectedType={selectedType}
                    selectedBatch={selectedBatch}
                    // NAV-04: gate the 'Include drill state' checkbox
                    canIncludeDrill={drillState.level !== 'root'}
                    // Refs for snapshot/load
                    snapshotRef={tableSnapshotRef}
                    loadViewRef={tableLoadViewRef}
                  />
                )}
              </div>
              </SectionErrorBoundary>
            </PartnerNormsProvider>
          </div>

          {/* Query command dialog */}
          <QueryCommandDialogWithContext
            open={queryOpen}
            onOpenChange={setQueryOpen}
            drillState={drillState}
            allData={filteredRawData}
            onRemoveScope={() => navigateToLevel('root')}
          />
        </div>
      </EnrichedAnomalyProvider>
    </CrossPartnerProvider>
  );
}

// ---------------------------------------------------------------------------
// EnrichedAnomalyProvider — feeds cross-partner outlier data into AnomalyProvider
// ---------------------------------------------------------------------------

function EnrichedAnomalyProvider({
  allRows,
  children,
}: {
  allRows: Record<string, unknown>[];
  children: React.ReactNode;
}) {
  const { crossPartnerData } = useCrossPartnerContext();
  return (
    <AnomalyProvider allRows={allRows} crossPartnerData={crossPartnerData}>
      {children}
    </AnomalyProvider>
  );
}

// ---------------------------------------------------------------------------
// SidebarDataPopulator — pushes data into sidebar context
// ---------------------------------------------------------------------------

function SidebarDataPopulator({
  allData,
  allowedPartnerIds,
  drillState,
  drillToPartner,
  navigateToLevel,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
}: {
  allData: Record<string, unknown>[];
  /**
   * When non-null, restrict the sidebar's displayed partners to this set.
   * The ROSTER SOURCE remains `allData` (Phase 25 navigation-integrity lock);
   * this prop only narrows what is rendered in the sidebar when an active
   * partner list is applied. `null` = no active list, show everyone.
   */
  allowedPartnerIds: string[] | null;
  drillState: DrillState;
  drillToPartner: (name: string) => void;
  navigateToLevel: (level: import('@/hooks/use-drill-down').DrillLevel) => void;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string) => void;
}) {
  const { setSidebarData } = useSidebarData();
  const { partnerAnomalies } = useAnomalyContext();

  const partners = useMemo(() => {
    const partnerGroups = new Map<string, number>();
    for (const row of allData) {
      const name = getPartnerName(row);
      if (!name) continue;
      partnerGroups.set(name, (partnerGroups.get(name) ?? 0) + 1);
    }

    const flaggedSet = new Set(
      [...partnerAnomalies.entries()]
        .filter(([, a]) => a.isFlagged)
        .map(([name]) => name),
    );

    const deduped = [...partnerGroups.entries()]
      .map(([name, batchCount]) => ({
        name,
        batchCount,
        isFlagged: flaggedSet.has(name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Phase 34 LIST-03: when an active partner list is applied, narrow the
    // DISPLAYED sidebar entries to its partnerIds set. The underlying roster
    // source is still `allData` (Phase 25 navigation-integrity lock — drill
    // into partners inside the active list still works; partners outside
    // it are simply not shown).
    if (!allowedPartnerIds) return deduped;
    const allow = new Set(allowedPartnerIds);
    return deduped.filter((p) => allow.has(p.name));
  }, [allData, partnerAnomalies, allowedPartnerIds]);

  const anomalyCount = useMemo(
    () => [...partnerAnomalies.values()].filter((a) => a.isFlagged).length,
    [partnerAnomalies],
  );

  useEffect(() => {
    setSidebarData({
      partners,
      drillState,
      drillToPartner,
      navigateToLevel,
      views,
      onLoadView,
      onDeleteView,
      onSaveView,
      anomalyCount,
    });
  }, [partners, drillState, drillToPartner, navigateToLevel, views, onLoadView, onDeleteView, onSaveView, anomalyCount, setSidebarData]);

  return null;
}

// ---------------------------------------------------------------------------
// CrossPartnerDataTable — reads cross-partner context and renders toolbar + table
// ---------------------------------------------------------------------------

function CrossPartnerDataTable({
  drillState,
  tableData,
  isFetching,
  drillToPartner,
  drillToBatch,
  navigateToLevel,
  totalRowCount,
  partnerStats,
  allData,
  // Lifted state
  dimensionFilters,
  setFilter,
  clearAllDimension,
  activeFilters,
  searchParams,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
  onReplaceView,
  hasViewWithName,
  restoreDefaults,
  // Chart state
  chartsExpanded,
  onToggleCharts,
  comparisonVisible,
  // Query
  onOpenQuery,
  // Filter options
  partnerOptions,
  typeOptions,
  batchOptions,
  selectedPartner,
  selectedType,
  selectedBatch,
  canIncludeDrill,
  // Refs
  snapshotRef,
  loadViewRef,
}: {
  drillState: DrillState;
  tableData: Record<string, unknown>[];
  isFetching: boolean;
  drillToPartner: (name: string) => void;
  drillToBatch: (name: string, partnerName?: string) => void;
  navigateToLevel: (level: import('@/hooks/use-drill-down').DrillLevel) => void;
  totalRowCount: number;
  partnerStats: ReturnType<typeof usePartnerStats>;
  allData: Record<string, unknown>[];
  dimensionFilters: import('@tanstack/react-table').ColumnFiltersState;
  setFilter: (param: string, value: string | null) => void;
  clearAllDimension: () => void;
  activeFilters: import('@/hooks/use-filter-state').ActiveFilter[];
  searchParams: URLSearchParams;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string, options?: { includeDrill?: boolean }) => void;
  onReplaceView: (name: string, options?: { includeDrill?: boolean }) => void;
  hasViewWithName: (name: string) => boolean;
  restoreDefaults: () => void;
  chartsExpanded: boolean;
  onToggleCharts: () => void;
  comparisonVisible: boolean;
  onOpenQuery: () => void;
  partnerOptions: string[];
  typeOptions: string[];
  batchOptions: string[];
  selectedPartner: string | null;
  selectedType: string | null;
  selectedBatch: string | null;
  canIncludeDrill?: boolean;
  snapshotRef: React.MutableRefObject<(() => import('@/lib/views/types').ViewSnapshot) | null>;
  loadViewRef: React.MutableRefObject<((view: SavedView) => void) | null>;
}) {
  const { crossPartnerData } = useCrossPartnerContext();

  // At root level, show one row per partner (deduplicated summary)
  const rootSummaryRows = useMemo(
    () => (drillState.level === 'root' ? buildPartnerSummaryRows(allData) : []),
    [drillState.level, allData],
  );

  const rootColumnDefs = useMemo(
    () => (drillState.level === 'root' ? buildRootColumnDefs() : undefined),
    [drillState.level],
  );

  const effectiveData = drillState.level === 'root' ? rootSummaryRows : tableData;
  const effectiveColumns =
    drillState.level === 'batch'
      ? accountColumnDefs
      : drillState.level === 'root'
        ? rootColumnDefs
        : undefined;

  // Prune dimension filters whose column id isn't in the currently-rendered
  // column set. Root columns replace batch-level BATCH/BATCH_AGE/ACCOUNT_TYPE
  // with partner-summary columns, so an ACCOUNT_TYPE or BATCH filter
  // (from a saved view, URL state, or a persisted default) would otherwise be
  // forwarded to tanstack-table's state.columnFilters where it throws
  // "Column with id 'ACCOUNT_TYPE' does not exist" during getFilteredRowModel.
  // Upstream row filtering (filteredRawData in DataDisplay) still honors the
  // full filter set, so the filter keeps its semantic effect on root summary
  // aggregation — we just don't hand a stale column id to the table.
  // Partner level uses the default batch-level columns (which DO contain
  // ACCOUNT_TYPE/BATCH), so leave those filters untouched there.
  const prunedDimensionFilters = useMemo(() => {
    const defs =
      drillState.level === 'batch'
        ? accountColumnDefs
        : drillState.level === 'root'
          ? rootColumnDefs
          : undefined;
    if (!defs) return dimensionFilters;
    const validIds = new Set(
      defs
        .map((d) => (d as { id?: string }).id)
        .filter((id): id is string => Boolean(id)),
    );
    return dimensionFilters.filter((f) => validIds.has(f.id));
  }, [dimensionFilters, drillState.level, rootColumnDefs]);

  return (
    <DataTable
      key={`${drillState.level}-${drillState.partner ?? ''}-${drillState.batch ?? ''}`}
      data={effectiveData}
      isFetching={drillState.level === 'batch' ? false : isFetching}
      drillState={drillState}
      onDrillToPartner={drillToPartner}
      onDrillToBatch={drillToBatch}
      onNavigateToLevel={navigateToLevel}
      totalRowCount={drillState.level === 'root' ? undefined : totalRowCount}
      columnDefs={effectiveColumns}
      partnerRowCount={
        drillState.level === 'batch' && drillState.partner
          ? allData.filter((r) => getPartnerName(r) === drillState.partner).length
          : undefined
      }
      trendingData={drillState.level === 'partner' ? partnerStats?.trending ?? null : null}
      crossPartnerData={drillState.level === 'root' ? crossPartnerData : undefined}
      // Lifted state
      dimensionFilters={prunedDimensionFilters}
      setFilter={setFilter}
      clearAllDimension={clearAllDimension}
      activeFilters={activeFilters}
      searchParams={searchParams}
      views={views}
      onLoadView={onLoadView}
      onDeleteView={onDeleteView}
      onSaveView={onSaveView}
      onReplaceView={onReplaceView}
      hasViewWithName={hasViewWithName}
      restoreDefaults={restoreDefaults}
      chartsExpanded={chartsExpanded}
      onToggleCharts={onToggleCharts}
      comparisonVisible={comparisonVisible}
      onOpenQuery={onOpenQuery}
      partnerOptions={partnerOptions}
      typeOptions={typeOptions}
      batchOptions={batchOptions}
      selectedPartner={selectedPartner}
      selectedType={selectedType}
      selectedBatch={selectedBatch}
      canIncludeDrill={canIncludeDrill}
      snapshotRef={snapshotRef}
      loadViewRef={loadViewRef}
    />
  );
}

// ---------------------------------------------------------------------------
// QueryCommandDialogWithContext — lives inside AnomalyProvider
// ---------------------------------------------------------------------------

function QueryCommandDialogWithContext({
  open,
  onOpenChange,
  drillState,
  allData,
  onRemoveScope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drillState: DrillState;
  allData: Record<string, unknown>[];
  onRemoveScope: () => void;
}) {
  const { partnerAnomalies } = useAnomalyContext();

  const dataContext = useMemo(() => {
    if (!allData || allData.length === 0) return '';

    const partnerGroups = new Map<string, Record<string, unknown>[]>();
    for (const row of allData) {
      const name = getPartnerName(row);
      if (!name) continue;
      if (!partnerGroups.has(name)) partnerGroups.set(name, []);
      partnerGroups.get(name)!.push(row);
    }

    const partners: PartnerSummary[] = Array.from(partnerGroups.entries()).map(
      ([name, rows]) => ({
        name,
        batchCount: rows.length,
        stats: computeKpis(rows),
      }),
    );

    return buildDataContext(
      {
        level: drillState.level,
        partnerId: drillState.partner,
        batchId: drillState.batch,
      },
      { partners, anomalies: partnerAnomalies },
    );
  }, [allData, drillState, partnerAnomalies]);

  return (
    <QueryCommandDialog
      open={open}
      onOpenChange={onOpenChange}
      drillState={drillState}
      dataContext={dataContext}
      onRemoveScope={onRemoveScope}
    />
  );
}
