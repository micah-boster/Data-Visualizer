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
import { buildRootColumnDefs, buildPairSummaryRows } from '@/lib/columns/root-columns';
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
import {
  BaselineSelector,
  type BaselineMode,
} from '@/components/kpi/baseline-selector';
import { UnifiedToolbar } from '@/components/toolbar/unified-toolbar';
import { QueryCommandDialog } from '@/components/query/query-command-dialog';
import { useAnomalyContext } from '@/contexts/anomaly-provider';
import { useActivePartnerList } from '@/contexts/active-partner-list';
import { usePartnerListsContext } from '@/contexts/partner-lists';
import { useSavedViews } from '@/hooks/use-saved-views';
import { useFilterState } from '@/hooks/use-filter-state';
import { buildDataContext, type PartnerSummary } from '@/lib/ai/context-builder';
import { computeKpis } from '@/lib/computation/compute-kpis';
import { getPartnerName, getBatchName, getStringField, coerceAgeMonths } from '@/lib/utils';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { SectionDivider } from '@/components/layout/section-divider';
import { toast } from 'sonner';
import type { DrillState } from '@/hooks/use-drill-down';
import type { SavedView, CollectionCurveDefinition, ChartDefinition, ViewSnapshot } from '@/lib/views/types';
import { ChartPanel } from '@/components/charts/chart-panel';
import { DEFAULT_COLLECTION_CURVE } from '@/lib/views/migrate-chart';
import { mapToSnapshot } from '@/lib/metabase-import/map-to-snapshot';
import type { ParseResult } from '@/lib/metabase-import/types';
import { FILTER_PARAMS } from '@/hooks/use-filter-state';
import {
  pairKey,
  sortPairs,
  displayNameForPair,
  labelForProduct,
  type PartnerProductPair,
} from '@/lib/partner-config/pair';

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
  const { state: drillState, drillToPair, drillToBatch, navigateToLevel } =
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

  // Phase 39 PCFG-03: knownPairs map drives legacy drill-state migration in
  // useSavedViews.sanitizeSnapshot. `Map<partnerName, productList[]>` —
  // single-product partners get their product synthesized onto a legacy
  // `drill.partner` payload; multi-product partners trigger a step-up toast
  // (Pitfall 2 in 39-RESEARCH).
  const knownPairs = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of data?.data ?? []) {
      const partner = getPartnerName(row);
      const product = getStringField(row, 'ACCOUNT_TYPE');
      if (!partner || !product) continue;
      if (!map.has(partner)) map.set(partner, new Set());
      map.get(partner)!.add(product);
    }
    return new Map(
      [...map.entries()].map(([partner, products]) => [partner, [...products]]),
    );
  }, [data?.data]);

  // Lifted state: saved views
  const {
    views,
    saveView,
    deleteView,
    restoreView,
    hasViewWithName,
    replaceView,
    restoreDefaults,
  } = useSavedViews(knownListIds, knownPairs);

  // Lifted state: dimension filters (URL-backed)
  // Phase 38 FLT-01: `age` (AgeBucket) + `setAge` added for the date-range
  // preset chip group. Separate from dimension filters because age is a
  // value-range predicate, not column-equality — handled inline below in
  // filteredRawData (still upstream of aggregation = Phase 25 contract).
  const {
    columnFilters: dimensionFilters,
    setFilter,
    clearAll: clearAllDimension,
    activeFilters,
    searchParams,
    age,
    setAge,
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

    // 2. Phase 38 FLT-01: age-bucket predicate — keep rows whose
    //    BATCH_AGE_IN_MONTHS is <= the selected cap. Applied AFTER the
    //    dimension filters and BEFORE the active-list scope so the
    //    filter-before-aggregate contract continues to hold (Phase 25).
    //    `coerceAgeMonths` falls back days->months for any legacy cached
    //    rows (values > 365). `age === null` means "All" (no-op).
    if (age !== null) {
      const cap = age;
      out = out.filter(
        (row) =>
          coerceAgeMonths((row as Record<string, unknown>).BATCH_AGE_IN_MONTHS) <= cap,
      );
    }

    // 3. Active partner list (Phase 34 — LIST-03)
    if (activeList && activeList.partnerIds.length > 0) {
      const allow = new Set(activeList.partnerIds);
      out = out.filter((row) => allow.has(getPartnerName(row) ?? ''));
    }

    return out;
  }, [data?.data, dimensionFilters, age, activeList]);

  // Phase 39 PCFG-03: derive the active (partner, product) pair from drill
  // state. null at root level. Used as the canonical selection key downstream.
  const selectedPair: PartnerProductPair | null = useMemo(() => {
    if (!drillState.partner || !drillState.product) return null;
    return { partner: drillState.partner, product: drillState.product };
  }, [drillState.partner, drillState.product]);

  // Partner stats sourced from filteredRawData so root-level dimension filters
  // (e.g. ACCOUNT_TYPE) cascade into pair drill-down aggregates. Phase 39 —
  // pair-aware: filters by both PARTNER_NAME and ACCOUNT_TYPE.
  const partnerStats = usePartnerStats(selectedPair, filteredRawData);

  // Phase 40 PRJ-04 — panel-level baseline selector state. Default 'rolling'
  // for zero regression with existing users (CONTEXT lock); 'modeled' is
  // opt-in. Persistence is intentionally out of scope for v1 (CONTEXT
  // Deferred Idea: localStorage/URL-sync deferred to a fast-follow).
  const [baselineMode, setBaselineMode] = useState<BaselineMode>('rolling');

  // True when ANY visible batch in the current scope has projection coverage.
  // Drives BaselineSelector's disabled state for the modeled toggle. Reading
  // any-coverage (rather than all-coverage at all horizons) is the right gate
  // for the panel-level affordance — per-card baseline-absent state handles
  // partial coverage gracefully via the "Switch to rolling avg" recovery.
  const modeledAvailable = useMemo(
    () =>
      (partnerStats?.curves ?? []).some(
        (c) => c.projection && c.projection.length > 0,
      ),
    [partnerStats?.curves],
  );

  // Reset to rolling if modeled becomes unavailable mid-session (e.g., scope
  // change removes all modeled-coverage batches, or user switches partners
  // away from one that has projection data). Prevents a stuck "modeled"
  // selection on a scope where it's no longer meaningful.
  useEffect(() => {
    if (!modeledAvailable && baselineMode === 'modeled') {
      setBaselineMode('rolling');
    }
  }, [modeledAvailable, baselineMode]);

  // Phase 36.x — row-level slices for the generic chart panel. The preset
  // (CollectionCurveChart) consumes the pre-shaped `curves` array; the generic
  // branch (GenericChart) plots raw rows and must see the same pair/batch
  // subset the rest of the drill-down view uses. Without these narrowed sets
  // the multi-series line chart would plot every pair's batches even when
  // the user is drilled into one pair.
  // Phase 39 PCFG-04 — filter by BOTH PARTNER_NAME and ACCOUNT_TYPE.
  const partnerRows = useMemo(() => {
    if (!drillState.partner) return filteredRawData;
    return filteredRawData.filter((r) => {
      if (getPartnerName(r) !== drillState.partner) return false;
      if (drillState.product && getStringField(r, 'ACCOUNT_TYPE') !== drillState.product) {
        return false;
      }
      return true;
    });
  }, [filteredRawData, drillState.partner, drillState.product]);
  const batchRows = useMemo(() => {
    if (!drillState.partner || !drillState.batch) return partnerRows;
    return partnerRows.filter(
      (r) => String(r.BATCH ?? '') === drillState.batch,
    );
  }, [partnerRows, drillState.partner, drillState.batch]);

  // Sync freshness state to context so header can display it
  useEffect(() => {
    if (data?.meta?.fetchedAt) {
      setFetchedAt(data.meta.fetchedAt);
    }
  }, [data?.meta?.fetchedAt, setFetchedAt]);

  useEffect(() => {
    setIsFetching(isFetching);
  }, [isFetching, setIsFetching]);

  // NAV-03 + Phase 39 PCFG-03: deep-link stale-param guard. When the URL
  // references a partner / pair / batch that isn't in the loaded dataset,
  // show a toast and step up to the nearest valid level. Phase 39 adds:
  //   - missing `?pr=` for a multi-product partner steps up to root with toast
  //   - `(partner, product)` pair not present in data steps up to root
  // Uses navigateToLevel (router.push) so the back button still works.
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

    // Phase 39 PCFG-03: missing or invalid product on a multi-product partner.
    if (drillState.partner) {
      const products = knownPairs.get(drillState.partner) ?? [];
      if (!drillState.product) {
        // Single-product partner is OK without ?pr= (drill state was likely
        // built from a legacy URL); the page can still show pair view by
        // implicit product. Multi-product partners must step up.
        if (products.length > 1) {
          toast(`Product type required for "${drillState.partner}"`, {
            description: 'This partner has multiple products — returning to the root view.',
          });
          navigateToLevel('root');
          return;
        }
      } else if (!products.includes(drillState.product)) {
        toast(
          `Pair "${drillState.partner} — ${labelForProduct(drillState.product)}" not found`,
          {
            description: 'Returning to the root view.',
          },
        );
        navigateToLevel('root');
        return;
      }
    }

    if (drillState.level === 'batch' && drillState.batch) {
      const batchExists = rows.some(
        (r) =>
          getPartnerName(r) === drillState.partner &&
          (drillState.product
            ? getStringField(r, 'ACCOUNT_TYPE') === drillState.product
            : true) &&
          getBatchName(r) === drillState.batch,
      );
      if (!batchExists) {
        toast(`Batch "${drillState.batch}" not found for ${drillState.partner}`, {
          description: 'Returning to the partner view.',
        });
        navigateToLevel('partner');
      }
    }
  }, [isLoading, data?.data, drillState, navigateToLevel, knownPairs]);

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
      // Phase 39 PCFG-04: filter by BOTH partner AND product when available.
      return filteredRawData.filter((row) => {
        if (getPartnerName(row) !== drillState.partner) return false;
        if (drillState.product && getStringField(row, 'ACCOUNT_TYPE') !== drillState.product) {
          return false;
        }
        return true;
      });
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

  // Filter options for the toolbar filter popover. Phase 39 PCFG-04:
  // partnerOptions / selectedPartner removed (partner is no longer a filter).
  const typeOptions = useMemo(
    () =>
      [...new Set((data?.data ?? []).map((r) => String(r.ACCOUNT_TYPE ?? '')))]
        .filter(Boolean)
        .sort(),
    [data?.data],
  );
  const selectedType = useMemo(() => {
    const f = dimensionFilters.find((cf) => cf.id === 'ACCOUNT_TYPE');
    return f ? String(f.value) : null;
  }, [dimensionFilters]);
  // Phase 38 FLT-01: `selectedBatch` / `batchOptions` derivations dropped.
  // The batch combobox was replaced by a date-range preset chip group (age +
  // setAge from useFilterState). The filter chip rendering and predicate both
  // live upstream — no per-derivation needed in this orchestrator.

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
      // Phase 39 PCFG-03: sanitizeSnapshot stamps `legacyDrillStrippedReason`
      // and `hasLegacyPartnerFilter` on the snapshot when legacy fields were
      // migrated. The view stored in useSavedViews has already been sanitized,
      // but cast to read the optional metadata fields.
      const meta = snapshot as ViewSnapshot & {
        legacyDrillStrippedReason?: 'multi-product-ambiguous';
        hasLegacyPartnerFilter?: boolean;
      };

      // Phase 38 FLT-01: detect legacy batch-equality filter BEFORE
      // sanitizeSnapshot strips it elsewhere — we want to fire the toast
      // only on user-initiated loads (this callback), not on hydration.
      const hadLegacyBatch =
        !!(snapshot.dimensionFilters &&
          typeof snapshot.dimensionFilters === 'object' &&
          'batch' in snapshot.dimensionFilters &&
          (snapshot.dimensionFilters as Record<string, string>).batch);
      const hadLegacyDrill = meta.legacyDrillStrippedReason === 'multi-product-ambiguous';
      const hadLegacyPartnerFilter = meta.hasLegacyPartnerFilter === true;

      // Restore chart state
      if (snapshot.chartsExpanded !== undefined) {
        setChartsExpanded(snapshot.chartsExpanded);
        localStorage.setItem('charts-expanded', String(snapshot.chartsExpanded));
      }
      if (snapshot.comparisonVisible !== undefined) {
        setComparisonVisible(snapshot.comparisonVisible);
      }

      // Restore dimension filters via URL.
      // Phase 38 FLT-01: skip any legacy `batch` entry — the field is removed
      // from the URL space. Combined with the toast below, this strips the
      // stale filter cleanly without crashing the old saved view.
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(snapshot.dimensionFilters)) {
        if (key === 'batch') continue;
        if (value) params.set(key, value);
      }
      // Phase 38 FLT-01: restore the age bucket from the snapshot (if any).
      // `null | undefined` = All (drop the param); 3|6|12 = preset chip.
      if (snapshot.batchAgeFilter === 3 || snapshot.batchAgeFilter === 6 || snapshot.batchAgeFilter === 12) {
        params.set('age', String(snapshot.batchAgeFilter));
      }
      const qs = params.toString();
      // Use window.history to avoid full re-render
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);

      // Phase 38 FLT-01: sonner toast on user-initiated load when the saved
      // view carried the legacy batch-equality filter. Hydration path reuses
      // sanitizeSnapshot but never calls handleLoadView, so this fires only
      // when the user clicks Load on a legacy view.
      if (hadLegacyBatch) {
        toast('Batch filter removed', {
          description:
            'This view was saved with the old batch filter. Re-save with a date range to restore filtering.',
          duration: 5000,
        });
      }

      // Phase 39 PCFG-03: sonner toast when sanitizeSnapshot stripped the
      // entire drill block because the partner had multiple products and
      // the saved view didn't specify which.
      if (hadLegacyDrill) {
        toast('Saved view drill cleared', {
          description:
            'This view was saved before product split. Re-drill into the specific pair to restore.',
          duration: 5000,
        });
      }

      // Phase 39 PCFG-04: sonner toast when a legacy `?partner=` dimension
      // filter was stripped. (The filter was deprecated when selection moved
      // entirely to drill state.)
      if (hadLegacyPartnerFilter) {
        toast('Partner filter removed', {
          description:
            'This view was saved with the old partner filter. Use the sidebar to select a partner.',
          duration: 5000,
        });
      }

      // NAV-04 + Phase 39 PCFG-03: Drill URL update — pair-aware. Writes
      // ?p=&pr=&b= when present. router.push ensures useSearchParams re-reads
      // and useDrillDown re-renders (Pitfall 5 in 32-RESEARCH.md).
      {
        const drillParams = new URLSearchParams(window.location.search);
        drillParams.delete('p');
        drillParams.delete('pr');
        drillParams.delete('b');
        if (snapshot.drill?.partner) {
          drillParams.set('p', snapshot.drill.partner);
          if (snapshot.drill.product) drillParams.set('pr', snapshot.drill.product);
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

  // Phase 37 — Apply path for Metabase SQL Import. Mirrors handleLoadView's
  // state-restore pipeline, but:
  //   1. Captures the pre-import ViewSnapshot for the Undo action BEFORE we
  //      mutate anything.
  //   2. Forces drill to root (CONTEXT lock + META-03) — drill reset is
  //      unconditional, not snapshot-driven.
  //   3. Stamps sourceQuery: { sql, importedAt } on the working view so the
  //      audit-trail lands if the user later persists via Save View.
  //   4. Does NOT push into useSavedViews — the imported view is an unsaved
  //      working view until the user uses the existing Save View flow.
  const handleApplyImport = useCallback(
    (result: ParseResult, sourceSql: string) => {
      // 1. Capture pre-import snapshot + outer layout flags for Undo (same
      //    ref handleSaveView uses for snapshot capture).
      const previousSnapshot = tableSnapshotRef.current?.();
      const previousChartsExpanded = chartsExpanded;
      const previousComparisonVisible = comparisonVisible;
      const previousDrill: DrillState = { ...drillState };

      // 2. Build a Partial<ViewSnapshot> from the parsed result, overlay on
      //    current-view defaults, stamp sourceQuery.
      const partial = mapToSnapshot(result);
      const base: ViewSnapshot = previousSnapshot ?? {
        sorting: [],
        columnVisibility: {},
        columnOrder: [],
        columnFilters: {},
        dimensionFilters: {},
        columnSizing: {},
      };

      // Defect fix (2026-04-19): promote WHERE-clause filters on the three
      // dimension-filterable columns (PARTNER_NAME / ACCOUNT_TYPE / BATCH)
      // out of `columnFilters` and into `dimensionFilters` so handleLoadView's
      // URL-rewrite loop actually writes `?partner=X&type=Y&batch=Z` — the
      // single mechanism that drives `filteredRawData` (KPIs, charts, root
      // summary rows, table). `columnFilters` on those same ids are
      // additionally dropped at non-partner drill levels (root uses
      // `rootColumnDefs`, so ACCOUNT_TYPE / BATCH are not in validIds and get
      // silently filtered out by handleLoadViewInternal), making the filter
      // vanish entirely before Apply. Dimension filters are the correct
      // channel — they cascade through `filteredRawData` regardless of drill
      // level and render as toolbar filter chips via `activeFilters`.
      // FILTER_PARAMS is the single source of truth for url-param↔column-id.
      const promotedDimensionFilters: Record<string, string> = {
        ...(partial.dimensionFilters ?? {}),
      };
      const remainingColumnFilters: Record<string, unknown> = {
        ...(partial.columnFilters ?? {}),
      };
      for (const [paramKey, columnId] of Object.entries(FILTER_PARAMS)) {
        const filterValue = remainingColumnFilters[columnId];
        if (Array.isArray(filterValue) && filterValue.length > 0) {
          // Text-equality filters from mapToSnapshot arrive as string[].
          // The URL param is single-valued; pick the first match (parser only
          // emits `eq` via columnFilters[columnId] = [value] today).
          promotedDimensionFilters[paramKey] = String(filterValue[0]);
          delete remainingColumnFilters[columnId];
        }
      }

      const importedSnapshot: ViewSnapshot = {
        ...base,
        ...partial,
        columnFilters: remainingColumnFilters,
        dimensionFilters: promotedDimensionFilters,
        // drill always cleared on import (CONTEXT lock).
        drill: undefined,
        // listId explicitly unset — imports do NOT carry a partner list.
        listId: null,
        sourceQuery: { sql: sourceSql, importedAt: Date.now() },
      };

      // 3. Drill reset — lifted from handleLoadView's drill-update block
      //    (above in this file), without the snapshot.drill branch — imports
      //    always clear drill params.
      {
        const drillParams = new URLSearchParams(window.location.search);
        drillParams.delete('p');
        drillParams.delete('b');
        const drillQs = drillParams.toString();
        router.push(drillQs ? `?${drillQs}` : window.location.pathname, { scroll: false });
      }

      // 4. Chart state — the mapper only emits Phase-36 line/scatter/bar
      //    variants through migrateChartState's gate; the collection-curve
      //    preset is driven via chartLoadRef (as handleLoadView does).
      //    Guarding by discriminant keeps the narrow ref type-safe even
      //    though inferChart never emits 'collection-curve' today.
      if (importedSnapshot.chartState?.type === 'collection-curve' && chartLoadRef.current) {
        chartLoadRef.current(importedSnapshot.chartState);
      }

      // 5. Synthesize a working SavedView and drive through handleLoadView.
      //    id='working:import' is a sentinel — useSavedViews never persists
      //    it because we don't call saveView. handleLoadView only READS from
      //    the SavedView shape.
      const workingView: SavedView = {
        id: 'working:import',
        name: 'Imported View (unsaved)',
        snapshot: importedSnapshot,
        createdAt: Date.now(),
      };

      handleLoadView(workingView);

      // 6. Toast with summary + Undo action.
      const matchedCols = result.matchedColumns.length;
      const matchedFlts = result.matchedFilters.length;
      const skippedTotal =
        result.skippedColumns.length
        + result.skippedFilters.length
        + result.skippedSort.length
        + result.inferredChart.skipped.length
        + result.unsupportedConstructs.length;
      const description = `${matchedCols} column${matchedCols === 1 ? '' : 's'}, ${
        matchedFlts
      } filter${matchedFlts === 1 ? '' : 's'}${
        skippedTotal > 0 ? `, ${skippedTotal} skipped` : ''
      }`;

      toast('View imported', {
        description,
        action: {
          label: 'Undo',
          onClick: () => {
            // Restore via the same handleLoadView pipeline. Rebuild the
            // pre-import SavedView with the captured snapshot + outer
            // layout flags + drill.
            if (!previousSnapshot) return;
            setChartsExpanded(previousChartsExpanded);
            setComparisonVisible(previousComparisonVisible);
            const restoreView: SavedView = {
              id: 'working:undo-import',
              name: 'Undo Import',
              snapshot: {
                ...previousSnapshot,
                chartsExpanded: previousChartsExpanded,
                comparisonVisible: previousComparisonVisible,
                drill:
                  previousDrill.level === 'root'
                    ? undefined
                    : {
                        partner: previousDrill.partner ?? undefined,
                        product: previousDrill.product ?? undefined,
                        batch: previousDrill.batch ?? undefined,
                      },
              },
              createdAt: Date.now(),
            };
            handleLoadView(restoreView);
          },
        },
        // Longer than save/delete (3s/5s) — import is higher-stakes and the
        // user may want time to evaluate the imported view before undoing.
        duration: 8000,
        // Defect fix (2026-04-19, Plan 37-03 round 3 — "can't get the filter
        // off"): the global Toaster sits at bottom-right. The FilterPopover
        // content is anchored to the top-right filter button with `align="end"`
        // so it extends downward and — when an active-filter chip is rendered
        // — lands its dismiss-X in the bottom-right quadrant. Both surfaces
        // carry z-50 and Sonner's portal is mounted last, so for the full
        // 8-second window the toast intercepts pointer events on the chip's
        // close button AND the combobox dropdowns, making it impossible for
        // the user to clear the freshly-imported filter through the normal
        // UI. Pinning THIS toast (and this toast only) to `bottom-left` keeps
        // the Undo affordance available while getting out of the filter
        // popover's footprint. Save/Delete toasts continue to use the global
        // `bottom-right` default — they fire AFTER the user is done with
        // filters, so no collision.
        position: 'bottom-left',
      });
    },
    [
      router,
      handleLoadView,
      chartsExpanded,
      comparisonVisible,
      drillState,
      setChartsExpanded,
      setComparisonVisible,
    ],
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
        // NAV-04 + Phase 39 PCFG-03: optional drill capture, now pair-aware.
        if (options?.includeDrill && drillState.level !== 'root') {
          snapshot.drill = {
            partner: drillState.partner ?? undefined,
            product: drillState.product ?? undefined,
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
        // NAV-04 + Phase 39 PCFG-03: mirror handleSaveView — capture drill
        // (pair-aware) when opted in.
        if (options?.includeDrill && drillState.level !== 'root') {
          snapshot.drill = {
            partner: drillState.partner ?? undefined,
            product: drillState.product ?? undefined,
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
          drillToPair={drillToPair}
          navigateToLevel={navigateToLevel}
          views={views}
          onLoadView={handleLoadView}
          onDeleteView={handleDeleteView}
          onSaveView={handleSaveView}
          onImportSql={handleApplyImport}
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
            key={`drill-${drillState.level}-${drillState.partner ?? 'none'}-${drillState.product ?? 'none'}-${drillState.batch ?? 'none'}`}
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
                  {/* Phase 38 CHT-04: chart-laptop-cap (globals.css @media
                      max-height: 900px) caps the INNER chart container at
                      48vh. Applied here per 38-RESEARCH Pitfall 8 — never on
                      the grid row (would fight `grid-rows-[1fr]`). The
                      outer `overflow-hidden` already handles any clipping
                      for viewports too short to contain the KPI band + chart
                      at full height. */}
                  <div className="chart-laptop-cap shrink-0 px-2 pt-2 space-y-2">
                    {drillState.level === 'root' && (
                      <>
                        <CrossPartnerTrajectoryChart />
                        {comparisonVisible && <PartnerComparisonMatrix />}
                      </>
                    )}
                    {drillState.level === 'partner' && (
                      <>
                        {/* Phase 40 PRJ-04 — panel-level baseline selector
                            mounted above the KPI row. CONTEXT lock: panel-
                            level, not per-card. Disabled state is owned by
                            modeledAvailable (any visible batch with
                            projection data); per-card baseline-absent UX
                            handles horizons without modeled coverage. */}
                        <div className="flex items-center justify-end px-1">
                          <BaselineSelector
                            value={baselineMode}
                            onChange={setBaselineMode}
                            modeledAvailable={modeledAvailable}
                          />
                        </div>
                        <KpiSummaryCards
                          kpis={partnerStats?.kpis ?? null}
                          trending={partnerStats?.trending ?? null}
                          baselineMode={baselineMode}
                          curves={partnerStats?.curves}
                          onSwitchToRolling={() => setBaselineMode('rolling')}
                          pair={selectedPair}
                          rawRows={partnerStats?.rawRows}
                        />
                        {/* Phase 38 CHT-01: render ASAP with whatever data exists
                            — the prior `>= 2` minimum-age gate hid charts for
                            partners with a single new batch. `>= 1` means the
                            chart renders even from day one of a new vintage. */}
                        {partnerStats?.curves && partnerStats.curves.length >= 1 && (
                          <>
                            {/* DS-29 section boundary: KPI band ↔ charts */}
                            <SectionDivider />
                            <ChartPanel
                              definition={chartDefinition}
                              onDefinitionChange={setChartDefinition}
                              rows={partnerRows}
                              curves={partnerStats.curves}
                              chartSnapshotRef={chartSnapshotRef}
                              chartLoadRef={chartLoadRef}
                              pair={selectedPair}
                            />
                          </>
                        )}
                      </>
                    )}
                    {batchCurve && (
                      <ChartPanel
                        definition={chartDefinition}
                        onDefinitionChange={setChartDefinition}
                        rows={batchRows}
                        curves={batchCurve}
                        chartSnapshotRef={chartSnapshotRef}
                        chartLoadRef={chartLoadRef}
                        pair={selectedPair}
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
              {/* Phase 38 CHT-01: sparkline preview mirrors the chart gate —
                  drop `>= 2` to `>= 1` so single-batch partners also get a
                  condensed preview when charts are collapsed. */}
              {!chartsExpanded && drillState.level === 'partner' && partnerStats?.curves && partnerStats.curves.length >= 1 && (
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
              {/* Phase 38 CHT-04: table-laptop-floor (globals.css @media
                  max-height: 900px) keeps the table visible on laptop-height
                  viewports once the chart container hits its 48vh cap. Table
                  scrolls internally via existing TanStack Virtual. */}
              <div className="table-laptop-floor min-h-0 flex-1 flex flex-col">
                {drillState.level === 'batch' && isAccountLoading ? (
                  <LoadingState />
                ) : (
                  <CrossPartnerDataTable
                    drillState={drillState}
                    tableData={tableData}
                    isFetching={isFetching}
                    drillToPair={drillToPair}
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
                    // Filter options (Phase 39 PCFG-04 — partnerOptions removed)
                    typeOptions={typeOptions}
                    selectedType={selectedType}
                    age={age}
                    onAgeChange={setAge}
                    // Phase 38 FLT-03: when the active partner list has exactly
                    // 1 partner, the PARTNER_NAME column is redundant (every
                    // row is the same partner). Pass the derivation down so
                    // data-table.tsx can apply a one-shot auto-hide on mount /
                    // activeList change, while still respecting manual toggles
                    // through the column picker (POL-03).
                    hidePartnerColumn={
                      drillState.level === 'root' &&
                      activeList !== null &&
                      activeList.partnerIds.length === 1
                    }
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
  drillToPair,
  navigateToLevel,
  views,
  onLoadView,
  onDeleteView,
  onSaveView,
  onImportSql,
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
  drillToPair: (pair: PartnerProductPair) => void;
  navigateToLevel: (level: import('@/hooks/use-drill-down').DrillLevel) => void;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: (name: string) => void;
  onImportSql: (result: ParseResult, sourceSql: string) => void;
}) {
  const { setSidebarData } = useSidebarData();
  const { partnerAnomalies } = useAnomalyContext();

  // Phase 39 PCFG-02..04: emit one row per (partner, product) PAIR. Multi-
  // product partners (Happy Money, Zable) split into peer rows with
  // suffixed display names; single-product partners stay visually unchanged
  // (name only, product revealed on hover). Pair anomaly flags read from
  // the pair-keyed anomaly map (compute-anomalies.ts).
  const pairs = useMemo(() => {
    // Group rows by pairKey, count batches.
    const pairBatchCounts = new Map<
      string,
      { pair: PartnerProductPair; batchCount: number }
    >();
    for (const row of allData) {
      const partner = getPartnerName(row);
      const product = getStringField(row, 'ACCOUNT_TYPE');
      if (!partner || !product) continue;
      const pair: PartnerProductPair = { partner, product };
      const key = pairKey(pair);
      const existing = pairBatchCounts.get(key);
      if (existing) existing.batchCount += 1;
      else pairBatchCounts.set(key, { pair, batchCount: 1 });
    }

    // Count products per partner so display name knows whether to suffix.
    const productsPerPartner = new Map<string, number>();
    for (const { pair } of pairBatchCounts.values()) {
      productsPerPartner.set(
        pair.partner,
        (productsPerPartner.get(pair.partner) ?? 0) + 1,
      );
    }

    // Pre-keyed flagged set (anomaly map is now keyed by pairKey).
    const flaggedSet = new Set(
      [...partnerAnomalies.entries()]
        .filter(([, a]) => a.isFlagged)
        .map(([key]) => key),
    );

    // Sort by canonical pair order, then build sidebar rows.
    const sortedPairs = sortPairs(
      [...pairBatchCounts.values()].map(({ pair }) => pair),
    );
    const rows = sortedPairs.map((pair) => {
      const key = pairKey(pair);
      const entry = pairBatchCounts.get(key)!;
      const count = productsPerPartner.get(pair.partner) ?? 1;
      return {
        partner: pair.partner,
        product: pair.product,
        displayName: displayNameForPair(pair, count),
        productTooltip: labelForProduct(pair.product),
        batchCount: entry.batchCount,
        isFlagged: flaggedSet.has(key),
      };
    });

    // Phase 34 LIST-03: when an active partner list is applied, narrow the
    // DISPLAYED sidebar entries to its partnerIds set. The underlying roster
    // source is still `allData` (Phase 25 navigation-integrity lock — drill
    // into partners inside the active list still works; partners outside
    // it are simply not shown). Partner-list membership is partner-level by
    // design; both pair rows of a multi-product partner ride along together.
    if (!allowedPartnerIds) return rows;
    const allow = new Set(allowedPartnerIds);
    return rows.filter((p) => allow.has(p.partner));
  }, [allData, partnerAnomalies, allowedPartnerIds]);

  const anomalyCount = useMemo(
    () => [...partnerAnomalies.values()].filter((a) => a.isFlagged).length,
    [partnerAnomalies],
  );

  useEffect(() => {
    setSidebarData({
      pairs,
      drillState,
      drillToPair,
      navigateToLevel,
      views,
      onLoadView,
      onDeleteView,
      onSaveView,
      onImportSql,
      anomalyCount,
    });
  }, [pairs, drillState, drillToPair, navigateToLevel, views, onLoadView, onDeleteView, onSaveView, onImportSql, anomalyCount, setSidebarData]);

  return null;
}

// ---------------------------------------------------------------------------
// CrossPartnerDataTable — reads cross-partner context and renders toolbar + table
// ---------------------------------------------------------------------------

function CrossPartnerDataTable({
  drillState,
  tableData,
  isFetching,
  drillToPair,
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
  // Filter options (Phase 39 PCFG-04 — partner removed)
  typeOptions,
  selectedType,
  age,
  onAgeChange,
  hidePartnerColumn,
  canIncludeDrill,
  // Refs
  snapshotRef,
  loadViewRef,
}: {
  drillState: DrillState;
  tableData: Record<string, unknown>[];
  isFetching: boolean;
  /** Phase 39 PCFG-03 — pair-aware drill. */
  drillToPair: (pair: PartnerProductPair) => void;
  drillToBatch: (name: string, pair?: PartnerProductPair) => void;
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
  typeOptions: string[];
  selectedType: string | null;
  /** Phase 38 FLT-01 — date-range bucket for the preset chip group. */
  age: import('@/hooks/use-filter-state').AgeBucket;
  onAgeChange: (value: import('@/hooks/use-filter-state').AgeBucket) => void;
  /** Phase 38 FLT-03 — hide PARTNER_NAME col when sidebar scoped to 1 partner. */
  hidePartnerColumn: boolean;
  canIncludeDrill?: boolean;
  snapshotRef: React.MutableRefObject<(() => import('@/lib/views/types').ViewSnapshot) | null>;
  loadViewRef: React.MutableRefObject<((view: SavedView) => void) | null>;
}) {
  const { crossPartnerData } = useCrossPartnerContext();

  // At root level, show one row per (partner, product) PAIR (Phase 39 PCFG-04).
  const rootSummaryRows = useMemo(
    () => (drillState.level === 'root' ? buildPairSummaryRows(allData) : []),
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
      key={`${drillState.level}-${drillState.partner ?? ''}-${drillState.product ?? ''}-${drillState.batch ?? ''}`}
      data={effectiveData}
      isFetching={drillState.level === 'batch' ? false : isFetching}
      drillState={drillState}
      onDrillToPair={drillToPair}
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
      typeOptions={typeOptions}
      selectedType={selectedType}
      age={age}
      onAgeChange={onAgeChange}
      hidePartnerColumn={hidePartnerColumn}
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

    // Phase 39 PCFG-04: build per-pair summaries (no cross-product blending).
    const pairGroups = new Map<
      string,
      { pair: PartnerProductPair; rows: Record<string, unknown>[] }
    >();
    for (const row of allData) {
      const partner = getPartnerName(row);
      const product = getStringField(row, 'ACCOUNT_TYPE');
      if (!partner || !product) continue;
      const pair: PartnerProductPair = { partner, product };
      const key = pairKey(pair);
      const existing = pairGroups.get(key);
      if (existing) existing.rows.push(row);
      else pairGroups.set(key, { pair, rows: [row] });
    }

    // Count products per partner so display name knows whether to suffix.
    const productsPerPartner = new Map<string, number>();
    for (const { pair } of pairGroups.values()) {
      productsPerPartner.set(
        pair.partner,
        (productsPerPartner.get(pair.partner) ?? 0) + 1,
      );
    }

    const partners: PartnerSummary[] = Array.from(pairGroups.values()).map(
      ({ pair, rows }) => ({
        name: displayNameForPair(
          pair,
          productsPerPartner.get(pair.partner) ?? 1,
        ),
        partner: pair.partner,
        product: pair.product,
        batchCount: rows.length,
        stats: computeKpis(rows),
      }),
    );

    return buildDataContext(
      {
        level: drillState.level,
        partnerId: drillState.partner,
        productId: drillState.product,
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
