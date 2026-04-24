# Phase 39: Partner Config Module - Research

**Researched:** 2026-04-24
**Domain:** Selection-state migration + per-pair config storage + segment-aware computation
**Confidence:** HIGH (code-sourced), MEDIUM on segment column viability (data audit required)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Segment data binding**
- A segment is a **column + value(s) rule**: `{ name, column, values[] }`. Each segment filters to rows where `column IN (values)`.
- Source columns are **existing columns in the data** (e.g., in `FILE` or `ACCOUNT_COHORT` or similar) — no upstream Snowflake ingestion work is assumed. Researcher must probe the actual schema to enumerate which columns are viable segmenting attributes across partners.
- Stored shape (localStorage): `{ name: string, column: string, values: string[] }` per segment, keyed by `(partner, product)` pair.
- Segments for a pair **must partition** the pair's data — mutually exclusive value-sets. Any rows not covered by any configured segment fall into an auto-generated read-only **"Other"** segment (computed at query time, not stored).
- Segment-split totals must equal the pair rollup total — this is the "apples-and-oranges" invariant applied at segment granularity.

**Sidebar split display**
- Multi-product partners render as **flat, peer rows with suffixed names**: "Happy Money — 1st Party", "Happy Money — 3rd Party". No parent/child tree, no badge-only label.
- Single-product partners stay **visually unchanged** (name only, no suffix). Product type is revealed on hover via tooltip for consistency.
- There is **no partner-level click target** for multi-product partners — selection is always of a specific pair. This enforces "no cross-product blending" by construction at the sidebar.
- Within a multi-product partner, pairs appear in a **stable product-type order** (canonical ordering across the app — e.g., 1st Party → 3rd Party → Personal → others alphabetical). Order is deterministic, not data-volume-driven.

**Setup UI pattern**
- Setup opens in a **right-side slide-over panel**, reachable from the sidebar partner context menu ("Configure segments"). Main view stays visible behind it.
- Editor is a **table with inline-edit rows**: `name | column (dropdown) | values (multi-select) | drag handle | delete`. "Add segment" button at bottom. The **"Other" bucket renders as a locked read-only row** at the end, showing live-computed row-count / coverage against current data scope.
- Edits are **staged**, not autosaved. **Explicit Save commits** to localStorage and re-renders the app; **Cancel discards**. No per-row save.
- Validation:
  - **Block save** on: duplicate segment names (including reserved name "Other"), empty rules, missing column or values.
  - **Warn (but allow force-save)** on: value-set overlap between segments (violates partition invariant) — surface a banner with overlap rows and coverage counts so user can resolve consciously.
- Product type appears as a read-only field at the top of the panel — labelled as data-derived.

**Segment split activation**
- Split-by-segment is a **per-view toggle** — each chart and the KPI card block has its own control. A chart can be split while KPIs stay rolled-up, and vice versa. Toggle is **only visible** when the active pair has segments configured.
- **Default view** on selecting a pair is **rolled-up** (pair-level), regardless of whether segments exist. Split is opt-in per interaction.
- In **multi-pair (cross-partner) views**, segment split applies **within each pair independently** — pairs with segments render their segments as series, pairs without segments render as a single rolled-up series. The app does **not** attempt to cross-partner-blend segments.
- In **Chart Builder** (Phase 36), "Segment" becomes a first-class choice in the existing split-by dropdown. It's only enabled when the scoped pair(s) have segments configured. Reuses Chart Builder's existing split-by plumbing — the computation layer resolves "Segment" to each pair's configured `{column, values[]}` rules at query-assembly time.

### Claude's Discretion

- Exact visual treatment of the split sidebar (indentation, chevron/separator style, suffix typography).
- Tooltip visual on single-product rows (delay, placement).
- Slide-over panel width, entrance animation, header layout, whether it pushes content vs overlays.
- Drag-handle interaction details for segment reordering.
- Visual design of the "Other" bucket row (muted? badge?).
- Exact copy for warning banners and validation messages.
- KPI split-view layout (grouped columns? stacked rows? legend placement?).
- Series color assignment for segments (palette, order).
- Whether the per-view toggle is a switch, segmented control, dropdown, or chip — pick what fits the existing control language.

### Deferred Ideas (OUT OF SCOPE)

- **Snowflake-backed partner config storage with change history** — PCFG-08, v4.2+. Ship localStorage first; revisit once daily-use shape is stable.
- **Bulk segment config import (CSV/Excel)** — PCFG-09, v4.2+.
- **Segment-aware projections** — Phase 40 PRJ-05 (dependent on this phase landing).
- **Free-form SQL predicate segments** — rejected; column+value covers the v1 use cases and keeps the stored shape safe.
- **Manual tag-assignment segments** (user taggings rows individually) — rejected; out of scope for a rule-based config.
- **Global page-level split toggle** — rejected in favor of per-view toggles; revisit if users ask for "split everything at once."
- **Split + cross-partner segment blending** (flatten all segments from all partners into one legend) — rejected; stays within per-pair scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PCFG-01 | Product type derived from `ACCOUNT_TYPE`; canonical unit is `(PARTNER_NAME, ACCOUNT_TYPE)` pair | §"Snowflake / data-layer ACCOUNT_TYPE", §"Standard Stack", §"Architecture Patterns — Pair encoding" |
| PCFG-02 | Sidebar shows one row per `(partner, product)` pair; single-product unchanged, multi-product split | §"Sidebar partner-list flow" (call graph), §"Pattern — Sidebar pair rendering" |
| PCFG-03 | Selection state carries both partner+product; downstream scoping keys off pair | §"Selection & drill-down state migration" (touch-point inventory), §"Pattern — Pair-keyed URL slots" |
| PCFG-04 | No cross-product blended view for a single partner; blocked at selection layer | §"Mandatory migration sites", §"Pitfall — Partner-only grouping survives" |
| PCFG-05 | Per-pair segment list editable in Partner Setup UI, persisted in localStorage | §"Saved Views / Partner Lists localStorage patterns", §"Don't Hand-Roll — context menu + slide-over", §"Pattern — Segment config schema" |
| PCFG-06 | `PartnerListFilters` extended with `PRODUCT_TYPE` + `SEGMENT`; auto pre-populated product-type lists | §"Partner Lists extension points" |
| PCFG-07 | Charts/KPIs gain optional segment split; pairs w/o segments fall back to rolled-up | §"Chart / KPI computation layer", §"Pattern — Segment split activation" |
</phase_requirements>

## Summary

This phase is **primarily a migration, not a greenfield build**. The app currently uses `PARTNER_NAME` as the single selection key (sidebar rows, URL slots `?p=`, drill state, filter URL params `?partner=`, partner summary aggregation, cross-partner grouping, anomaly grouping, AI context builder). All of these must migrate to a `(partner, product)` pair. The good news: there is an established `(partner, product)` filter chain already — the `ACCOUNT_TYPE` dimension filter (`?type=`) flows through `filteredRawData` (`data-display.tsx:194-235`) into all downstream consumers, so the substrate works; we just need to flip it from an optional filter into a mandatory-paired-with-partner primary key.

The second half of the phase (segment config + Setup UI + segment split) is **new surface** but the three structural precedents already in the codebase (saved views, partner lists, active-partner-list context) give a tight playbook: Zod schema + localStorage CRUD hook + React context provider + slide-over Sheet editor. The Chart Builder's existing `series` field on generic chart variants (`src/lib/views/schema.ts:56-88`, `src/components/charts/generic-chart.tsx:232`) is the plumbing segment split rides on — no new rendering machinery.

**The critical data-layer finding** is that **no pre-existing segmenting column** (language, bank subsidiary, sub-cohort) exists in `agg_batch_performance_summary` or `master_accounts`. The batch-summary schema carries only `PARTNER_NAME, LENDER_ID, BATCH, ACCOUNT_TYPE, BATCH_AGE_IN_MONTHS` + numeric aggregates; the account-level table adds `US_STATE, STATUS, RESOLUTION_STATUS, BALANCE_BAND, HAS_EMAIL, HAS_PHONE, PAYMENT_PLAN_STATE`. **"Snap — Personal with English/Spanish sub-cohorts" is not presently viable on the batch-summary dataset** — the language dimension does not exist in either table. The column-pick dropdown in Setup can only offer columns that actually exist (which for `agg_batch_performance_summary` is essentially `LENDER_ID` and `BATCH`, neither of which is a useful segmenting dim). This is a v1 constraint the planner must surface: either the user's canonical examples require an upstream ETL add (deferred to PCFG-08/v4.2), or segments are an account-table feature and the plan must wire them against drill-down/account data rather than the aggregate-batch dataset. **Recommend flagging this explicitly as an open question in the plan gate — the decision determines whether PCFG-05/07 ship as "segments defined on account-level columns visible during batch drill-down" or "segments are scaffolded but no-op until ETL-adds-columns."**

**Primary recommendation:** Structure as 4 plans grouped by risk surface: (1) selection-state migration — the riskiest, touches the most files, must land first; (2) segment config schema + storage + Setup UI; (3) Partner Lists extension (PRODUCT_TYPE + SEGMENT filters + auto pre-populated lists); (4) chart/KPI segment-split dimension + per-view toggle. Plans 2-4 can parallelize once Plan 1's selection-state contracts (pair encoding + URL shape) are locked.

## Standard Stack

### Core (already in repo — use as-is)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react/context-menu` | 1.3.0 | Sidebar right-click "Configure segments" entry | Already in dependencies (verified `node_modules/@base-ui/react/context-menu/`); same library as Dialog/Combobox/Tabs already used in repo (token-browser, filter-combobox, query-command-dialog); has full compound API (Root/Trigger/Portal/Positioner/Popup/Item/Submenu) |
| `@base-ui/react/dialog` (Sheet) | 1.3.0 | Slide-over Setup panel | Already wrapped in `src/components/ui/sheet.tsx`; existing `CreateListDialog` uses it with `side="right"` slide-over and staged-edit semantics — identical UX pattern to what this phase needs |
| `zod` | ^4.3.6 | Segment-config schema validation on localStorage load | Precedents: `viewSnapshotSchema` (`src/lib/views/schema.ts`), `partnerListSchema` (`src/lib/partner-lists/schema.ts`). Both use `.strict()` on records that must not accept unknown keys and additive-`.optional()` for evolution. |
| `sonner` | ^2.0.7 | Save/deleted/restored toasts | Already used in `CreateListDialog`, `PartnerListsSidebarGroup.handleDelete`, `useDrillDown`/`handleLoadView` stale-deep-link toasts. Same pattern for segment Setup save/cancel. |
| `crypto.randomUUID()` | built-in | Segment IDs (if we track stable identity for reordering) | Used in `useSavedViews.saveView` and `usePartnerLists.createList`. |

### Supporting (already in repo)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^1.8.0 | Menu icons (Settings, GripVertical for drag handle, Plus, Trash2) | Consistent with existing sidebar/dialog iconography |
| `@tanstack/react-query` | ^5.97.0 | Nothing new here — segment config is pure localStorage, no server state | n/a |
| React `useCallback` / `useMemo` / `useRef` hydration pattern | built-in | localStorage hook with SSR-safe hydration | Copy the exact pattern from `useSavedViews` / `usePartnerLists`: empty initial state, `useEffect` load, `hasHydrated.current` ref to skip first persist |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@base-ui/react/context-menu` | Shadcn-style `<Popover>` anchored to a 3-dot button | Context menu is discoverable by right-click (matches CONTEXT "reachable from the sidebar partner context menu"); popover requires a visible trigger button which clutters every sidebar row. **Use context-menu.** A 3-dot fallback is acceptable as a secondary affordance. |
| Zod schema | Hand-written type guards | Zod is already the project's validation standard; hand-written guards would diverge. **Use Zod.** |
| New localStorage key per `(partner, product)` | Single key, nested map | Single key is cheaper to load/persist and matches `partnerLists` convention (one key, whole array). **Use single key + nested-map shape.** |

**No new packages needed.** Everything this phase requires is already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── partner-config/                # NEW — segment config domain
│       ├── types.ts                   # SegmentRule, PartnerConfig, canonical-pair helpers
│       ├── schema.ts                  # Zod schemas (mirrors partner-lists/schema.ts)
│       ├── storage.ts                 # loadPartnerConfig / persistPartnerConfig (localStorage)
│       ├── pair.ts                    # makePairKey(partner, product), parsePairKey, PRODUCT_TYPE_ORDER
│       ├── segment-evaluator.ts       # evaluateSegments(rows, segments) → { [segName]: rows[], _other: rows[] }
│       └── defaults.ts                # getDefaultPartnerConfig() (empty map)
├── hooks/
│   └── use-partner-config.ts          # NEW — CRUD hook (mirrors usePartnerLists)
├── contexts/
│   └── partner-config.tsx             # NEW — single upstream hook call, distributes via context
├── components/
│   ├── partner-config/                # NEW
│   │   ├── partner-setup-sheet.tsx    # Slide-over editor (mirrors CreateListDialog)
│   │   ├── segment-editor-table.tsx   # Inline-edit rows with drag handles
│   │   ├── segment-row.tsx            # Single segment row
│   │   └── other-bucket-row.tsx       # Locked read-only "Other" summary
│   └── layout/
│       └── app-sidebar.tsx            # MODIFIED — pair rendering + context-menu wiring
├── hooks/
│   ├── use-drill-down.ts              # MODIFIED — add `product` param, return pair
│   ├── use-filter-state.ts            # MODIFIED — only if ACCOUNT_TYPE becomes part of selection
│   └── use-partner-stats.ts           # MODIFIED — accept pair (partner, product), filter by both
└── lib/
    ├── columns/root-columns.ts        # MODIFIED — buildPartnerSummaryRows → buildPairSummaryRows
    ├── computation/
    │   ├── compute-cross-partner.ts   # MODIFIED — groupByPartner → groupByPair
    │   └── compute-anomalies.ts       # MODIFIED — byPartner → byPair
    └── partner-lists/
        ├── types.ts                   # MODIFIED — add PRODUCT_TYPE, SEGMENT to PartnerListFilters
        ├── schema.ts                  # MODIFIED — extend attributeFiltersSchema (additive)
        └── filter-evaluator.ts        # MODIFIED — eval new attribute keys
```

### Pattern 1: Pair encoding for URL + selection state

**What:** A `(partner, product)` pair needs a canonical serialized form for URL slots and Map keys, and a canonical parser. Keep it boring — two URL params, joined-key helper.

**When to use:** Everywhere drill state, sidebar selection, or a "partner summary row" needs to identify what's selected.

**Example (recommended):**
```typescript
// src/lib/partner-config/pair.ts
export interface PartnerProductPair {
  partner: string;
  product: string; // Snowflake ACCOUNT_TYPE verbatim: THIRD_PARTY | PRE_CHARGE_OFF_FIRST_PARTY | ...
}

/** Stable order so Happy Money — 1st Party always renders before — 3rd Party. */
export const PRODUCT_TYPE_ORDER = [
  'PRE_CHARGE_OFF_FIRST_PARTY',
  'THIRD_PARTY',
  'PRE_CHARGE_OFF_THIRD_PARTY',
  // any unknown type: sorted alphabetically after these three
] as const;

/** Display label — user-facing. Drives sidebar suffix text + Setup header. */
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PRE_CHARGE_OFF_FIRST_PARTY: '1st Party',
  THIRD_PARTY: '3rd Party',
  PRE_CHARGE_OFF_THIRD_PARTY: 'Pre-Chargeoff 3rd Party',
};

/** Map key — safe because partner names + ACCOUNT_TYPE values are plain ASCII. */
export function pairKey(pair: PartnerProductPair): string {
  return `${pair.partner}::${pair.product}`;
}

export function parsePairKey(key: string): PartnerProductPair | null {
  const ix = key.indexOf('::');
  if (ix < 0) return null;
  return { partner: key.slice(0, ix), product: key.slice(ix + 2) };
}
```

**URL encoding decision (recommend):** Extend `useDrillDown` from `?p=<partner>` to `?p=<partner>&pr=<product>`. Two params, independent. A deep-link into a partner *without* a product when that partner has multiple products must fail-safe to a step-up — reuse the existing NAV-03 pattern in `data-display.tsx:276-305` (sonner toast + `navigateToLevel('root')`).

**Why this shape:** Two URL slots stay orthogonal to Phase 32 drill semantics and mirror the existing `?p=` / `?b=` pattern. A compound single slot (`?p=Happy%20Money::THIRD_PARTY`) is fragile (URL-encoding pitfalls + harder to filter in the UI).

### Pattern 2: Sidebar pair rendering

**What:** Replace the `SidebarDataPopulator.partners` derivation (`data-display.tsx:1165-1195`) with a pair-aware derivation. Single-product partners → 1 row (name only). Multi-product partners → N rows (name + em-dash + product label). No parent/child tree (CONTEXT lock).

**Example sketch:**
```typescript
// Inside SidebarDataPopulator (data-display.tsx:1165-ish)
const pairs = useMemo(() => {
  // Group rows by (partner, product)
  const pairMap = new Map<string, { partner: string; product: string; batchCount: number }>();
  for (const row of allData) {
    const partner = getPartnerName(row);
    const product = getStringField(row, 'ACCOUNT_TYPE');
    if (!partner || !product) continue;
    const key = pairKey({ partner, product });
    const existing = pairMap.get(key);
    if (existing) existing.batchCount++;
    else pairMap.set(key, { partner, product, batchCount: 1 });
  }

  // Count products per partner so we know which need the suffix.
  const productsPerPartner = new Map<string, number>();
  for (const p of pairMap.values()) {
    productsPerPartner.set(p.partner, (productsPerPartner.get(p.partner) ?? 0) + 1);
  }

  // Sort: partner alphabetical, within partner by PRODUCT_TYPE_ORDER, then remaining alphabetical.
  const all = [...pairMap.values()];
  all.sort((a, b) => {
    if (a.partner !== b.partner) return a.partner.localeCompare(b.partner);
    const ai = PRODUCT_TYPE_ORDER.indexOf(a.product as any);
    const bi = PRODUCT_TYPE_ORDER.indexOf(b.product as any);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.product.localeCompare(b.product);
  });

  return all.map((p) => ({
    ...p,
    displayName:
      productsPerPartner.get(p.partner)! > 1
        ? `${p.partner} — ${PRODUCT_TYPE_LABELS[p.product] ?? p.product}`
        : p.partner,
    productTooltip: PRODUCT_TYPE_LABELS[p.product] ?? p.product, // always shown on hover
    isFlagged: flaggedSet.has(pairKey(p)), // see anomalies migration below
  }));
}, [allData, partnerAnomalies]);
```

**Context menu wiring** (Base UI ContextMenu from `@base-ui/react/context-menu`):
```tsx
// Inside app-sidebar.tsx's SidebarMenuItem mapping for each pair row:
<ContextMenu.Root>
  <ContextMenu.Trigger
    render={
      <SidebarMenuButton ... onClick={() => drillToPair(p)}>
        <span>{p.displayName}</span>
      </SidebarMenuButton>
    }
  />
  <ContextMenu.Portal>
    <ContextMenu.Positioner>
      <ContextMenu.Popup>
        <ContextMenu.Item onClick={() => openSetupSheet(p)}>
          Configure segments
        </ContextMenu.Item>
      </ContextMenu.Popup>
    </ContextMenu.Positioner>
  </ContextMenu.Portal>
</ContextMenu.Root>
```

### Pattern 3: Segment config schema + storage

**What:** Mirror the `partner-lists` pattern exactly. localStorage key + Zod schema + hook + context.

**Stored shape:**
```typescript
// src/lib/partner-config/types.ts
export interface SegmentRule {
  id: string;              // crypto.randomUUID(), stable for drag-reorder
  name: string;            // display name — unique within pair, never "Other" (reserved)
  column: string;          // Snowflake column name (UPPERCASE)
  values: string[];        // row matches if row[column] in values
}

export interface PartnerConfigEntry {
  partner: string;
  product: string;
  segments: SegmentRule[]; // ordered; array position drives render order
  updatedAt: number;
}

/** localStorage shape: array (mirrors partner-lists array shape for consistency). */
export type PartnerConfigArray = PartnerConfigEntry[];
```

**Zod schema (additive-safe):**
```typescript
// src/lib/partner-config/schema.ts
import { z } from 'zod';

const segmentRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).refine((n) => n.trim().toLowerCase() !== 'other', {
    message: 'Segment name "Other" is reserved',
  }),
  column: z.string().min(1),
  values: z.array(z.string()).min(1),
});

export const partnerConfigEntrySchema = z.object({
  partner: z.string().min(1),
  product: z.string().min(1),
  segments: z.array(segmentRuleSchema),
  updatedAt: z.number(),
}).strict();

export const partnerConfigArraySchema = z.array(partnerConfigEntrySchema);
```

**Storage:**
```typescript
// src/lib/partner-config/storage.ts
export const PARTNER_CONFIG_STORAGE_KEY = 'bounce-dv-partner-config';
// loadPartnerConfig + persistPartnerConfig — direct copy of src/lib/partner-lists/storage.ts
```

**Hook (mirrors `usePartnerLists` / `useSavedViews`):**
- SSR-safe: `useState([])` + `useEffect` load + `hasHydrated` ref
- Return: `{ configs, getConfig(pair), upsertSegments(pair, segments), deleteConfig(pair) }`
- `getConfig(pair)` returns `PartnerConfigEntry | undefined` (undefined → no segments configured → fall back to rolled-up view, PCFG-07 contract).

### Pattern 4: Segment split activation (PCFG-07)

**What:** Each chart and the KPI block owns its own per-view `splitBySegment: boolean` local state. Only visible when `getConfig(activePair)?.segments.length > 0`.

**Charts** — two paths depending on which chart variant:

1. **`CollectionCurveChart` (preset branch)** — computation flows through `usePartnerStats` → `reshapeCurves`. When split is active, group pair rows by segment rule (plus an auto "Other" bucket for uncovered rows) and reshape per group. Render one `<Line>` per segment via the existing multi-line plumbing. No new chart machinery needed — `CollectionCurveChart` already handles N batches as N lines; segments become another batching dimension upstream.

2. **`GenericChart` (Chart Builder)** — the existing `series` axis in `ChartDefinition` (lines 56-88 in `src/lib/views/schema.ts`) is already doing this job for arbitrary columns. PCFG-07's "Segment in the split-by dropdown" is a virtual column: add a sentinel `series: { column: '__SEGMENT__' }` and teach the row-prep path (before `pivotForSeries` at `generic-chart.tsx:232, 584-622`) to compute `__SEGMENT__` from the active pair's segment rules + "Other" fallback. Virtual-column pattern keeps the schema stable.

**KPIs** — `KpiSummaryCards` today receives `kpis: KpiAggregates`. For split mode:
- Compute `KpiAggregates` per segment (reuse `computeKpis` on the per-segment row subset).
- Render a grouped card layout (CONTEXT Claude's Discretion — grouped columns / stacked rows / legend TBD).
- Rolled-up default stays as today.

**Invariant check:** Segment-split totals must equal the pair rollup total (CONTEXT). Verify by comparing `sum(segmentKpis.totalCollected) + otherKpis.totalCollected === pairKpis.totalCollected` in a dev-only assertion or smoke test; divergence means a segment rule overlap leaked rows into two buckets.

### Anti-Patterns to Avoid

- **Don't extend `useDrillDown` state shape with nullable product** — keep `product: string | null` explicit and validate on render. A partner with one product should still carry its product in state (not null) so downstream code never hits the "what's my product?" fork.
- **Don't store segments keyed by `pairKey()` as Object keys** — the array shape matches `partnerLists` and is more robust to pairs containing unexpected characters. Use `configs.find((c) => c.partner === p && c.product === pr)` (cheap — at most 72 entries for current data: 36 pairs × 2 products).
- **Don't add "allow cross-product blending" toggle** — PCFG-04 locks blending out at the selection layer. The UI must not even render the option.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Right-click context menu on sidebar rows | A custom `onContextMenu` + div-based menu + focus management | `@base-ui/react/context-menu` (already installed, `node_modules/@base-ui/react/context-menu/`) | Keyboard nav, focus trap, escape, positioning, collision detection — Base UI handles all of it. See [Base UI ContextMenu docs](https://base-ui.com/react/components/context-menu). |
| Slide-over panel | A custom portal + transform transition | Existing `src/components/ui/sheet.tsx` (wraps `@base-ui/react/dialog`); reuse its `side="right"` + `className="data-[side=right]:sm:max-w-2xl"` recipe from `CreateListDialog` | Already token-correct, a11y-compliant, focus-trapped. Pattern already in-repo. |
| Zod schema evolution | Version bumps on every change | Additive `.optional()` fields, like `drill?` / `listId?` / `batchAgeFilter?` in `viewSnapshotSchema` | Legacy localStorage payloads must continue to parse (users have data). Additive evolution is the established pattern. |
| localStorage hydration | Direct reads at render time | `useState([]) + useEffect + hasHydrated.current` ref pattern | Hydration mismatch is the gotcha Phase 25 Plan D explicitly called out. All three existing persistence hooks use this pattern. |
| Drag-to-reorder segments | Hand-wired mouse events | The planner should pick a tiny DnD lib OR a simpler up/down button pair — **not a native drag-and-drop impl**. dnd-kit is the ecosystem standard but adds a dep. **Recommend: up/down arrow buttons for v1** (simpler, no new dep, accessible); revisit drag if users ask. CONTEXT explicitly marks drag-handle details as Claude's Discretion. |
| Partner summary row aggregation at root | Keep `buildPartnerSummaryRows` grouping by partner only | Rewrite to group by `(partner, product)` so multi-product partners render as two summary rows | PCFG-04: blocking cross-product blending means the root-level table must NOT sum across products for a partner. |
| Cross-partner ranking per partner | Keep `compute-cross-partner.groupByPartner` grouping by partner only | Rewrite to group by pair — each pair is its own entry in percentile rankings | "Apples-and-oranges" principle (from user memory `project_product_splitting`): Happy Money 1st-Party and 3rd-Party have different economics; ranking them as a single entity blends them. |

**Key insight:** The selection-state migration is large in surface but uses existing patterns — no new abstractions needed. The Setup UI reuses the `CreateListDialog` pattern wholesale (slide-over Sheet, staged edits, explicit Save/Cancel, sonner toast, validation banner). The hard work is inventory + migration, not invention.

## Common Pitfalls

### Pitfall 1: Partner-only grouping survives the migration
**What goes wrong:** A file that groups rows by `PARTNER_NAME` gets missed in the migration, and suddenly a Happy Money chart shows blended 1st+3rd party curves.
**Why it happens:** The pattern `Map<string /*partner*/, Rows[]>` is baked into at least 4 sites (enumerate below) and any `.filter((r) => r.PARTNER_NAME === x)` without a corresponding ACCOUNT_TYPE predicate is a silent blend.
**How to avoid:** Audit every call-site before landing Plan 1. The exhaustive list (verified via grep):
- `src/components/data-display.tsx:247-258` — `partnerRows` and `batchRows` memos
- `src/components/data-display.tsx:314-324` — `tableData` memo (partner-drill branch)
- `src/components/data-display.tsx:1165-1195` — `SidebarDataPopulator.partners` derivation
- `src/components/data-display.tsx:1307-1310` — `rootSummaryRows` (via `buildPartnerSummaryRows`)
- `src/hooks/use-partner-stats.ts:19-49` — `usePartnerStats` filters by partner name only
- `src/lib/computation/compute-cross-partner.ts:32-47, 206` — `groupByPartner` + consumer
- `src/lib/computation/compute-anomalies.ts:223-257` — `computeAllPartnerAnomalies`
- `src/lib/columns/root-columns.ts:71-109` — `buildPartnerSummaryRows`
- `src/lib/ai/context-builder.ts:43-76, *` — partner-summary shape (needs pair-awareness so Claude never references Happy Money as a single entity)
- `src/components/cross-partner/*` — all matrix/trajectory components render `p.partnerName` as the entity (must become `${partnerName} — ${productLabel}` for multi-product partners)
- `src/hooks/use-drill-down.ts:47-54` — `state: DrillState` is `{ partner, batch }`; must become `{ partner, product, batch }`
- `src/hooks/use-filter-state.ts:16-19` — `FILTER_PARAMS` currently has `partner` and `type` — when both are set today they already scope to the pair, but the UI does not guarantee both are set together
**Warning signs:** After migration, KPIs for Happy Money still add to the "whole Happy Money portfolio" values instead of one of the two product slices.

### Pitfall 2: Selection-state inconsistency — one place has pair, another still has partner-only
**What goes wrong:** `useDrillDown` returns `{ partner, product, batch }` but `useSavedViews.snapshot.drill` still has `{ partner?, batch? }` — saved views break when loaded into pair-aware drill state.
**Why it happens:** `ViewSnapshot.drill` is persisted in localStorage and must evolve additively.
**How to avoid:** Add `product?: string` to `ViewSnapshot.drill` (`src/lib/views/types.ts:72-75` + `schema.ts:111-116`) as a second `.optional()` field — matches the Phase 32-02 / 34-04 / 38 FLT-01 precedent for additive-optional schema evolution. Legacy saved views load with `product: undefined` and the load handler in `data-display.tsx:442-452` must synthesize a product (e.g., default to the pair that matches `snapshot.drill.partner` for single-product partners, step up to root for multi-product partners) + fire a sonner toast explaining the step-up.
**Warning signs:** Pre-Phase-39 saved views throw a Zod error on load (you forgot `.optional()`), or they load silently but drill to the wrong pair.

### Pitfall 3: Filter-state dimension filter still treats partner and type as independent axes
**What goes wrong:** Today's `FILTER_PARAMS = { partner: 'PARTNER_NAME', type: 'ACCOUNT_TYPE' }` (`src/hooks/use-filter-state.ts:16-19`) lets the user set `?partner=HappyMoney` without `?type=` — which produces a cross-product blend.
**Why it happens:** `?partner=` and `?type=` are orthogonal URL dimension filters. Nothing ties them together.
**How to avoid:** Choose one of two routes (planner should pick in Plan 1 discussion):
   (a) **Deprecate the `?partner=` filter** — selection is owned by drill state (`?p=&pr=`); remove `partner` + `type` from `FILTER_PARAMS`. FilterPopover loses the partner combobox entirely. Filter UI becomes "Date Range" only.
   (b) **Keep the filter but force pair-consistency** — if `?partner=` is set for a multi-product partner and `?type=` is absent, auto-fill `?type=` with the first product in `PRODUCT_TYPE_ORDER` (UI shows it locked) OR block the filter from being set.
Either is acceptable; (a) is cleaner because the sidebar is already the canonical selection surface (Phase 38 FLT-03 deprecated the partner column-filter overlap by auto-hiding the PARTNER_NAME column).
**Warning signs:** Feedback "I set the partner filter but I still see multiple product lines."

### Pitfall 4: Segment column dropdown lists columns that don't exist in the pair's data
**What goes wrong:** Setup UI offers "US_STATE" but `agg_batch_performance_summary` doesn't have a US_STATE column — segments save but evaluate to 0 rows.
**Why it happens:** Segments operate on *the same dataset KPIs/charts compute from* — which is `agg_batch_performance_summary` (batch-summary), NOT `master_accounts`. The account-level table is only loaded on drill to batch.
**How to avoid:** The Setup UI's column dropdown must enumerate distinct non-null columns from `allData` (the batch-summary rows) that have string-type values. Running this against the live dataset today:
- Viable columns in `agg_batch_performance_summary`: `LENDER_ID`, `BATCH` (not useful — high cardinality per-pair), `ACCOUNT_TYPE` (self-referential, already the pair), `PARTNER_NAME` (self-referential)
- **There is no useful segmenting column on the batch-summary dataset today.**
**Warning signs:** The dropdown is empty or only shows LENDER_ID. Escalate to an open question.

### Pitfall 5: Partner Lists auto-pre-populated "by product type" multiplies silently when ETL adds a new ACCOUNT_TYPE
**What goes wrong:** PCFG-06 says "pre-populated Partner Lists auto-maintain one list per distinct product-type value." Today there are 3 values (`THIRD_PARTY`, `PRE_CHARGE_OFF_FIRST_PARTY`, `PRE_CHARGE_OFF_THIRD_PARTY`) — so 3 auto-lists. If ETL adds a 4th, a 4th list appears silently.
**Why it happens:** Derive-from-data + auto-maintain means no user action required, which can be confusing when lists appear/disappear.
**How to avoid:** Clearly mark auto-lists (e.g., a different icon or a "system list" label in the sidebar) + prevent the user from deleting them (or allow delete with "will reappear on refresh"). Reuse `partnerLists.source` pattern — add a third variant `'derived'` in `PartnerList.source` enum (additive on `partnerListSchema`).
**Warning signs:** User deletes a "1st Party" list, refreshes, and it's back without explanation.

### Pitfall 6: Cross-partner ranking becomes confusing with pair entities
**What goes wrong:** The cross-partner matrix (`src/components/cross-partner/matrix-bar-ranking.tsx` etc.) today renders `p.partnerName`. After migration, Happy Money 1st-Party and Happy Money 3rd-Party are separate entries — but their display names must make it obvious they're different entities, not duplicates.
**Why it happens:** `partnerName` was unique before; with pairs, the display name must carry the product suffix consistently.
**How to avoid:** Introduce `p.displayName` in `CrossPartnerEntry` (computed via `PRODUCT_TYPE_LABELS`) and render `displayName` everywhere the matrix/trajectory chart shows the label. Single-product partners still show just the name.
**Warning signs:** Two "Happy Money" rows in the cross-partner matrix with no visual distinction.

### Pitfall 7: "Other" bucket recomputed inconsistently across surfaces
**What goes wrong:** Charts compute their "Other" bucket from visible/filtered rows, KPIs from something else, and the numbers don't reconcile.
**Why it happens:** "Other" is derived at query time, not stored — if two surfaces call the evaluator on different row sets, the buckets diverge.
**How to avoid:** Centralize segment evaluation in `src/lib/partner-config/segment-evaluator.ts` and always pass it the *same input* (the pair-scoped + filter-applied row set). Setup UI's "Other" coverage counter and chart/KPI segment groupings must call the same helper with the same row set.

### Pitfall 8: Context menu + sidebar-menu keyboard focus fight
**What goes wrong:** Right-click a partner row, context menu opens, but the sidebar's own keyboard nav (left/right arrows, tooltip wiring) intercepts keys.
**Why it happens:** Base UI's Menu manages its own focus but `SidebarMenuButton` (from shadcn sidebar primitive) has its own focus handling.
**How to avoid:** Use `ContextMenu.Trigger`'s `render` prop to delegate rendering to the existing `SidebarMenuButton` (no extra wrapper div). Base UI's `render` slot properly composes refs + event handlers. See also `src/components/views/views-sidebar.tsx` and existing `SidebarGroupLabel render={<button>}` pattern in `app-sidebar.tsx:149-157` as the canonical `render`-prop example.
**Warning signs:** Arrow keys close the context menu instead of navigating items.

## Code Examples

### Example: `usePartnerConfig` hook (mirror of `usePartnerLists`)
```typescript
// src/hooks/use-partner-config.ts
// Source pattern: src/hooks/use-partner-lists.ts:53-201
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PartnerConfigArray,
  PartnerConfigEntry,
  SegmentRule,
  PartnerProductPair,
} from '@/lib/partner-config/types';
import { loadPartnerConfig, persistPartnerConfig } from '@/lib/partner-config/storage';

export function usePartnerConfig() {
  const [configs, setConfigs] = useState<PartnerConfigArray>([]);
  const hasHydrated = useRef(false);

  useEffect(() => {
    setConfigs(loadPartnerConfig());
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    persistPartnerConfig(configs);
  }, [configs]);

  const getConfig = useCallback(
    (pair: PartnerProductPair): PartnerConfigEntry | undefined =>
      configs.find((c) => c.partner === pair.partner && c.product === pair.product),
    [configs],
  );

  const upsertSegments = useCallback(
    (pair: PartnerProductPair, segments: SegmentRule[]) => {
      setConfigs((prev) => {
        const ix = prev.findIndex(
          (c) => c.partner === pair.partner && c.product === pair.product,
        );
        const next: PartnerConfigEntry = {
          partner: pair.partner,
          product: pair.product,
          segments,
          updatedAt: Date.now(),
        };
        if (ix === -1) return [...prev, next];
        return prev.map((c, i) => (i === ix ? next : c));
      });
    },
    [],
  );

  const deleteConfig = useCallback((pair: PartnerProductPair) => {
    setConfigs((prev) =>
      prev.filter((c) => !(c.partner === pair.partner && c.product === pair.product)),
    );
  }, []);

  return { configs, getConfig, upsertSegments, deleteConfig };
}
```

### Example: `evaluateSegments` with "Other" auto-bucket
```typescript
// src/lib/partner-config/segment-evaluator.ts
import type { SegmentRule } from './types';

/** Evaluate segments against row set; produces per-segment row arrays + an Other bucket. */
export function evaluateSegments(
  rows: Array<Record<string, unknown>>,
  segments: SegmentRule[],
): {
  bySegment: Map<string, Array<Record<string, unknown>>>;
  other: Array<Record<string, unknown>>;
  overlapRowCount: number; // for Setup UI warning banner
} {
  const bySegment = new Map<string, Array<Record<string, unknown>>>();
  segments.forEach((s) => bySegment.set(s.name, []));
  const other: Array<Record<string, unknown>> = [];
  let overlapRowCount = 0;

  for (const row of rows) {
    let matched = 0;
    for (const s of segments) {
      const v = row[s.column];
      if (v != null && s.values.includes(String(v))) {
        bySegment.get(s.name)!.push(row);
        matched++;
      }
    }
    if (matched === 0) other.push(row);
    if (matched > 1) overlapRowCount++;
  }
  return { bySegment, other, overlapRowCount };
}
```

### Example: Additive schema evolution on `ViewSnapshot.drill`
```typescript
// src/lib/views/types.ts — EXISTING field
drill?: {
  partner?: string;
  batch?: string;
  // NEW (Phase 39): pair-aware drill state. Additive-optional so legacy
  // pre-Phase-39 saved views load without a Zod error.
  product?: string;
};
```

```typescript
// src/lib/views/schema.ts — EXISTING shape at line 111-116
drill: z
  .object({
    partner: z.string().optional(),
    batch: z.string().optional(),
    product: z.string().optional(), // NEW — additive
  })
  .optional(),
```

### Example: PartnerListFilters extension (PCFG-06)
```typescript
// src/lib/partner-lists/types.ts — CURRENT
export type AttributeKey = 'ACCOUNT_TYPE';
export interface PartnerListFilters {
  ACCOUNT_TYPE?: string[];
}

// AFTER Phase 39:
export type AttributeKey = 'ACCOUNT_TYPE' | 'PRODUCT_TYPE' | 'SEGMENT';
export interface PartnerListFilters {
  ACCOUNT_TYPE?: string[];
  PRODUCT_TYPE?: string[]; // Alias for ACCOUNT_TYPE — auto-derived, user-facing label
  SEGMENT?: string[];       // References SegmentRule.name values
}

// src/lib/partner-lists/schema.ts — extend attributeFiltersSchema additively:
const attributeFiltersSchema = z
  .object({
    ACCOUNT_TYPE: z.array(z.string()).optional(),
    PRODUCT_TYPE: z.array(z.string()).optional(),
    SEGMENT: z.array(z.string()).optional(),
  })
  .strict();
```

**Decision point for planner:** PCFG-06 says "auto-derived from `ACCOUNT_TYPE`" — simplest implementation is to treat `PRODUCT_TYPE` as a display alias of `ACCOUNT_TYPE` (user sees "Product Type" in the UI, storage still writes `ACCOUNT_TYPE`). Avoids duplicate storage + keeps `filter-evaluator.ts` unchanged for that key. Add `SEGMENT` as a new storage key + evaluator branch.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `PARTNER_NAME` as the selection primary key | `(PARTNER_NAME, ACCOUNT_TYPE)` pair | This phase (PCFG-01..04) | Forces migration of 9+ call-sites |
| `?partner=<name>` URL selection filter + `?p=<name>` drill param as independent axes | Drill owns selection: `?p=<partner>&pr=<product>`; filter popover deprecates partner combobox (recommend) | This phase (Pitfall 3) | Simplifies filter surface; Phase 38 FLT-03 already foreshadowed this by auto-hiding PARTNER_NAME column |
| Segments not a concept | First-class segment rules per `(partner, product)` pair, localStorage-persisted, rule-based only (no SQL predicates, no manual tagging) | This phase (PCFG-05..07) | Adds ~4 new files under `src/lib/partner-config/`, ~3 new components, 1 new context. Precedent: `partner-lists/*` |
| Auto pre-populated partner lists driven by `source: 'manual' | 'attribute'` | Additive `source: 'derived'` variant for auto product-type lists | This phase (PCFG-06) | Partner Lists UI needs to distinguish derived lists (no delete? warn on delete?) |

**Deprecated/outdated:**
- **`buildPartnerSummaryRows` grouping by partner only** (`src/lib/columns/root-columns.ts:71`) — must become `buildPairSummaryRows`. The root-level table shows one row per pair after Phase 39.
- **`groupByPartner` in `compute-cross-partner.ts:32-47`** and **`byPartner` in `compute-anomalies.ts:229`** — both must become pair-keyed.
- **Current `useDrillDown` 2-dim URL slots `?p&b`** — gains a third `?pr=<product>`. Mirror Phase 32-02's additive-optional pattern.

## Open Questions

1. **No segmenting column exists on `agg_batch_performance_summary`** — the Setup UI's column dropdown would be effectively empty. The canonical "Snap — Personal EN/ES" example needs a language column that does not exist in the current schema.
   - What we know: batch-summary rows carry `PARTNER_NAME, LENDER_ID, BATCH, ACCOUNT_TYPE, BATCH_AGE_IN_MONTHS` + numeric aggregates. The account-level table (`master_accounts`, loaded only on batch drill) has `US_STATE, STATUS, RESOLUTION_STATUS, BALANCE_BAND, HAS_EMAIL, HAS_PHONE` — candidates for segmenting at drill time.
   - What's unclear: whether the planner should (a) scaffold segments against a column-list filtered to "string-typed, non-identity, low-cardinality columns present on all rows of a pair" (will yield an essentially empty dropdown today but prepares surfaces for a future column add), (b) wait for ETL work, or (c) make segments operate on account-level data during batch drill-down only.
   - Recommendation: Scaffold for (a) — ship the Setup UI and config storage with a column dropdown populated from actual data; document "no viable columns yet for the batch-summary" in the plan's verification step and flag this as a pre-req for PCFG-08. The structural work (pair migration, Partner Lists extension, segment-split plumbing) is valuable regardless; the column-picker just renders an empty state until ETL lands.

2. **Should the `?partner=` dimension filter be deprecated or repaired?** (Pitfall 3)
   - What we know: `?partner=` + `?type=` are orthogonal today; setting only `?partner=` produces cross-product blending.
   - What's unclear: Whether users rely on `?partner=` in the filter popover (vs. the sidebar). Phase 38 FLT-03 auto-hiding the PARTNER_NAME column suggests the sidebar is already canonical.
   - Recommendation: Deprecate — drop the partner combobox from `FilterPopover`, leaving only Account Type (still useful for cross-partner filtering, e.g., "show only 1st-party pairs") and Date Range. `?partner=` stops being written but is read-through-migrated on load for legacy saved views (`sanitizeSnapshot`-style strip + toast).

3. **Segment reordering interaction — drag handle vs up/down buttons?**
   - What we know: CONTEXT locks "drag handle" in the editor recipe but marks the interaction details as Claude's Discretion.
   - What's unclear: Whether shipping native HTML5 drag-and-drop (no lib, but awkward with forms) vs dnd-kit (adds ~30KB + package) vs arrow buttons (simplest, no new lib).
   - Recommendation: Up/down buttons for v1. CONTEXT allows it under discretion; revisit if users ask for drag.

4. **Pre-populated auto-lists — how are they marked and can they be deleted?**
   - What we know: PCFG-06 says "pre-populated ... auto-maintain."
   - What's unclear: User deletion semantics + visual distinguishing.
   - Recommendation: Add `source: 'derived'` variant + icon difference + delete warning "Will reappear on next refresh." Plan should decide before shipping.

## Validation Architecture

> Skipped — `.planning/config.json` does not set `workflow.nyquist_validation`. The project's standing convention is targeted smoke tests per plan (via `node --experimental-strip-types`) rather than full coverage. See `package.json` scripts `smoke:*` for precedent.

**Recommended smoke-test scaffolding for Phase 39 (per planner's discretion):**
- `src/lib/partner-config/segment-evaluator.smoke.ts` — verifies Other-bucket total + overlap count against fixtures
- `src/lib/partner-config/pair.smoke.ts` — pairKey/parsePairKey roundtrip + PRODUCT_TYPE_ORDER sort invariants
- `src/lib/views/schema.additive-drill-product.smoke.ts` — legacy ViewSnapshot with `drill: { partner, batch }` still parses after the `product?` addition (mirrors Phase 32-02 / 34-04 smoke pattern)
- `src/lib/partner-lists/schema.additive-segment.smoke.ts` — legacy PartnerList (ACCOUNT_TYPE-only) still parses after adding PRODUCT_TYPE + SEGMENT optional keys

## Sources

### Primary (HIGH confidence)

- **Codebase inventory** (this repo, `src/`) — all selection/filter/state paths grep'd directly:
  - `src/components/data-display.tsx:194-235` — filteredRawData pipeline (the single filter-before-aggregate contract)
  - `src/components/data-display.tsx:355-362` — selectedPartner/selectedType derivation
  - `src/components/data-display.tsx:247-258, 314-324` — drill-partner row filters
  - `src/components/data-display.tsx:1165-1195` — sidebar partner derivation
  - `src/components/data-display.tsx:1307-1310` — rootSummaryRows
  - `src/hooks/use-drill-down.ts` — drill state + URL slots `?p=&b=`
  - `src/hooks/use-filter-state.ts:16-19` — FILTER_PARAMS map
  - `src/hooks/use-partner-stats.ts:19-49` — per-partner stats hook
  - `src/hooks/use-partner-lists.ts` — CRUD hook pattern to mirror
  - `src/hooks/use-saved-views.ts` — sanitizeSnapshot pattern for schema evolution
  - `src/lib/computation/compute-cross-partner.ts:32-47, 206` — groupByPartner
  - `src/lib/computation/compute-anomalies.ts:223-257` — computeAllPartnerAnomalies
  - `src/lib/columns/root-columns.ts:71-109` — buildPartnerSummaryRows
  - `src/lib/columns/config.ts:41-45, 47-53` — ACCOUNT_TYPE_VALUES + ACCOUNT_TYPE ColumnConfig
  - `src/lib/partner-lists/*` — schema/evaluator/storage/types templates
  - `src/lib/views/schema.ts:111-143` — additive-optional drill/listId/sourceQuery/batchAgeFilter precedents
  - `src/components/partner-lists/create-list-dialog.tsx` — slide-over Sheet + staged-edit + sonner template
  - `src/components/layout/app-sidebar.tsx` — sidebar structure + `render={<button>}` Base UI delegation pattern
  - `src/components/charts/generic-chart.tsx:232, 584-622` — series-axis multi-series plumbing (chart split target)
  - `src/lib/views/schema.ts:55-88` — ChartDefinition series field
  - `src/lib/static-cache/batch-summary.json` — verified 36 `(PARTNER_NAME, ACCOUNT_TYPE)` pairs, 34 partners, 3 ACCOUNT_TYPE values; only Happy Money + Zable are multi-product
  - `src/lib/static-cache/accounts-affirm-afrm_mar_26_pri.json` — verified account-table schema (US_STATE, STATUS, RESOLUTION_STATUS, BALANCE_BAND, HAS_EMAIL, HAS_PHONE, PAYMENT_PLAN_STATE)
- **Base UI package introspection**: `node_modules/@base-ui/react/context-menu/index.d.ts` — confirms ContextMenu compound API exists
- **Base UI ContextMenu official docs** (https://base-ui.com/react/components/context-menu) — verified minimal usage pattern

### Secondary (MEDIUM confidence)

- `.planning/phases/39-partner-config-module/39-CONTEXT.md` — user decisions (locked, cross-verified against ROADMAP.md)
- `.planning/milestones/v4.1-REQUIREMENTS.md` — PCFG-01..07 definitions
- `.planning/STATE.md` — precedent patterns from prior phases (Phase 32-02 additive-optional, Phase 34-04 stale-ID sanitization, Phase 38 FLT-01 legacy migration)

### Tertiary (LOW confidence — flagged for validation)

- None. All findings are code-sourced.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; patterns in-repo
- Architecture: HIGH — mirrors two existing persistence/UI pipelines (partner-lists, saved-views)
- Pitfalls: HIGH — touch-points verified via grep against the actual codebase
- Data-layer segment column viability: **MEDIUM** — verified against static-cache JSON that no useful segmenting column exists on `agg_batch_performance_summary` today; depends on whether Snowflake live data adds columns not in the cached snapshot (unlikely per project history)

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable patterns; revisit if Chart Builder/Partner Lists get restructured)

---

## Plan-grouping recommendation

Four plans, with Plan 1 being the gate for the others:

**Plan 39-01 — Pair migration (Wave 1)**
Blocks downstream work. Touches 9+ files (see Pitfall 1 checklist). Updates `useDrillDown` URL shape, `SidebarDataPopulator.partners`, `buildPartnerSummaryRows`, `compute-cross-partner`, `compute-anomalies`, `usePartnerStats`, all cross-partner matrix `displayName` rendering, and `ViewSnapshot.drill.product` additive schema evolution. Blocks PCFG-01..04.

**Plan 39-02 — Segment config schema + storage + Setup UI (Wave 2, parallel with 03/04)**
New domain under `src/lib/partner-config/*`. Zod schema, storage, `usePartnerConfig` hook, `PartnerConfigProvider` context, sidebar context-menu entry, `PartnerSetupSheet` slide-over editor with staged edits + validation banner + Other-bucket row. Blocks PCFG-05.

**Plan 39-03 — Partner Lists extension (Wave 2, parallel)**
Extends `PartnerListFilters` with `PRODUCT_TYPE` (alias of ACCOUNT_TYPE) + `SEGMENT`. Auto-pre-populated derived lists with `source: 'derived'` variant. Updates `AttributeFilterBar` to render both new keys when available. Additive schema evolution on `partner-lists/schema.ts`. Blocks PCFG-06.

**Plan 39-04 — Segment-split dimension on charts + KPIs (Wave 2, parallel)**
Per-view toggle for split-by-segment on `CollectionCurveChart`, `GenericChart` (via virtual `__SEGMENT__` column), and `KpiSummaryCards` (grouped layout). Pair-level rolled-up stays default. Toggle hidden when `getConfig(pair)?.segments.length === 0`. Includes Chart Builder "Segment" entry in split-by dropdown (enabled only when applicable). Blocks PCFG-07.

This matches CONTEXT's projected 3-4 plans and the ROADMAP's "3-4 plans grouping: sidebar + selection-state restructure, segment config schema + storage + Setup UI, filter/list extension, chart/KPI segment dimension."
