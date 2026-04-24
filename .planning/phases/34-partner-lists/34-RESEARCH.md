# Phase 34: Partner Lists — Research

**Researched:** 2026-04-17
**Domain:** Client-side feature — named partner groupings, localStorage persistence, dual-pane selection UI, sidebar filtering integration
**Confidence:** HIGH (all findings verified against existing codebase files + official library docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**List creation flow**
- Dialog/modal triggered by a "+ New List" action in the sidebar
- Dual-pane transfer UI inside the dialog: available partners on left, selected on right
- Single flow with attribute filters at top that narrow the available partners, then user checks/unchecks from filtered results (no tabs)
- After attribute filters narrow the list, user can manually add/remove individual partners before saving
- Name is prompted at save time, not upfront

**Sidebar placement & activation**
- Partner Lists section appears ABOVE the Partners section in the sidebar (lists filter what's below)
- When a list is active, the Partners section filters down to only show partners in that list (drill-down still works within that filtered set)
- Toggle behavior: clicking the active list deactivates it and returns to all partners
- Lists show just the name in the sidebar — no count badges

**Attribute filtering**
- Three filter dimensions available: product type, account type, revenue band
- Multi-select per attribute (e.g. product type = 1P AND 3P returns partners matching either)
- Lists snapshot the matching partners at creation time (stored as partner IDs)
- A "Refresh" action on the list re-runs the original filter criteria to capture new matches
- Filter criteria are stored alongside the snapshot so refresh is possible

**List-to-view relationship**
- Lists and views are independent concepts — lists exist as their own entities in localStorage
- A saved view can optionally reference a partner list (by list ID)
- Lists are shared: the same list can be referenced by multiple views; editing the list affects all
- Manual list selection always wins — switching lists doesn't mark the view as "modified"
- Active list persists across view switches; loading a view without a list reference does NOT clear the active list
- Only explicitly toggling or switching the list changes it

### Claude's Discretion

- Exact dialog sizing and responsive behavior
- Filter dropdown component choice
- Dual-pane transfer animation/transitions
- How "Refresh" action is surfaced (inline button, context menu, etc.)
- localStorage schema for partner lists

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIST-01 | User can create a named partner list by selecting partners manually | Dual-pane transfer UI pattern (Code Examples §1); existing `Sheet` primitive via `@base-ui/react/dialog` (Standard Stack); partner source: `SidebarDataPopulator.partners` in `data-display.tsx:647-668` — already deduplicates partners from `data.data` |
| LIST-02 | User can create a partner list by filtering on attributes (product type, revenue band, account type) and the matching partners are captured | **CRITICAL GAP (Open Q #1):** `ACCOUNT_TYPE` exists in schema (`src/lib/columns/config.ts:23`) but `PRODUCT_TYPE` and `REVENUE_BAND` do NOT. Plan must either (a) derive from existing columns, (b) add new columns, or (c) reduce attribute scope to ACCOUNT_TYPE only for v1. Multi-select popover pattern exists — see `filter-popover.tsx` + `filter-combobox.tsx` |
| LIST-03 | User can load a partner list to filter the table and charts to only those partners | Integrate with existing `filteredRawData` memo in `data-display.tsx:170-185`. Same filter-before-aggregate contract Phase 25 enforced (Pitfall 2). Active list ID lives in a new context/hook; when set, `filteredRawData` additionally filters rows by `partnerIds.has(getPartnerName(row))` |
| LIST-04 | Partner lists persist in localStorage alongside saved views | Mirror the saved-views persistence pattern: separate storage key `bounce-dv-partner-lists`, zod schema with `safeParse`, hydration-safe hook pattern (`loadSavedViews`/`persistSavedViews` in `src/lib/views/storage.ts` is the template) |
| LIST-05 | User can edit or delete existing partner lists | Sidebar `SidebarMenuAction showOnHover` pattern already used for view delete (`app-sidebar.tsx:159-169`). Rename via inline edit OR the same create-dialog re-opened in edit mode. Delete via `SidebarMenuAction` + sonner undo toast (mirrors `handleDeleteView`) |
</phase_requirements>

## Summary

Phase 34 builds a **new client-side feature** on top of an already-mature design system foundation (Phases 26-29 complete) and an established URL/state architecture (Phase 32 shipped URL-backed drill state). The feature is composed of three well-understood primitives combined in a project-specific way: (1) a localStorage-persisted entity, (2) a dialog with dual-pane transfer UI + attribute filters, and (3) a sidebar section that, when active, feeds into the existing `filteredRawData` memo to scope table/charts/KPIs.

Every library and pattern needed already exists in the codebase. The main work is composition, not invention: mirror the saved-views pattern (`src/lib/views/storage.ts` + `schema.ts` + `defaults.ts` + `use-saved-views.ts` hook) for partner lists; mirror the `app-sidebar.tsx` group pattern for the new "Partner Lists" sidebar group; thread an `activePartnerListId` through `data-display.tsx` and have `filteredRawData` respect it. The single non-obvious unknown is **attribute coverage** — `ACCOUNT_TYPE` exists, `PRODUCT_TYPE` and `REVENUE_BAND` do not (verified in `src/lib/columns/config.ts` — zero grep hits in `src/`). This must be resolved before planning (see Open Questions §1).

**Primary recommendation:** Build a `partner-lists/` feature slice under `src/lib/` (types, schema, storage, defaults) + `src/hooks/use-partner-lists.ts` + `src/contexts/active-partner-list.tsx` (for activation state) + a new `CreateListDialog` using the existing `Sheet` primitive (or add a centered-dialog `ui/dialog.tsx` wrapper if CONTEXT's "dialog/modal" wording is taken to mean centered). Reuse `filter-combobox.tsx` for attribute multi-selects. Touch `app-sidebar.tsx`, `sidebar-data.tsx` context, and `data-display.tsx` to wire activation into `filteredRawData`.

## Standard Stack

### Core (all already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.3 | App framework | Project uses App Router + `useSearchParams`/`router.push` for URL state (Phase 32) |
| `react` | 19.2.4 | UI | React Compiler is enabled — follow memoization/ref patterns from Phase 25 |
| `@base-ui/react` | ^1.3.0 | Dialog/popover/tooltip primitives | Already the accessibility primitive for `Sheet`, `Popover`, `Tooltip`. Base UI `Dialog` primitive backs the existing `Sheet` wrapper (`src/components/ui/sheet.tsx:4` imports `Dialog as SheetPrimitive from '@base-ui/react/dialog'`) |
| `zod` | ^4.3.6 | localStorage schema validation | Saved views use zod `safeParse` for graceful recovery from corrupt data — same pattern for partner lists |
| `lucide-react` | ^1.8.0 | Icons | `List`, `Plus`, `Trash2`, `Pencil`, `RefreshCw`, `Users` already in use |
| `sonner` | ^2.0.7 | Toasts | `handleDeleteView` in `data-display.tsx:359-374` is the undo-toast template for list deletion |
| `class-variance-authority` | ^0.7.1 | Variant styling | Not critical here; only if a new shared primitive is added |
| `tailwindcss` | ^4 | Styling | Tokens-only discipline required (see Type Token Constraints) |

### Supporting (existing app primitives to reuse)

| Primitive | Path | Reuse For |
|-----------|------|-----------|
| `Sheet` | `src/components/ui/sheet.tsx` | Creation dialog if side-sheet styling is acceptable; it is Base UI `Dialog` under the hood so it IS a modal — just positioned. Consider using `data-side="right"` or "bottom" |
| `Popover` | `src/components/ui/popover.tsx` | Delete-confirm, attribute filter dropdowns |
| `Button`, `Input`, `Checkbox`, `Label`, `ScrollArea`, `Separator`, `Tooltip` | `src/components/ui/*` | Standard interactive primitives |
| `EmptyState` | `src/components/patterns/empty-state.tsx` | "No lists yet" in sidebar / dialog empty attribute-match state |
| `SectionHeader` | `src/components/layout/section-header.tsx` | Optional: headers inside the dialog. NOT for `PopoverTitle`/`SheetTitle` (Phase 27-04 decision — primitives own ARIA slot semantics) |
| `FilterCombobox` | `src/components/filters/filter-combobox.tsx` | Multi-select attribute filter popover |
| `Sidebar` family | `src/components/ui/sidebar.tsx` | `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuSkeleton` — used exactly the way `app-sidebar.tsx` uses them today |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Recommendation |
|------------|-----------|----------|----------------|
| New `ui/dialog.tsx` (centered modal wrapper) | Reuse `Sheet` with right/bottom side | Sheet is already wired + accessible; adding Dialog doubles the modal primitive surface | **Use Sheet** unless a visual mock requires centered modal. If centered needed: add `ui/dialog.tsx` as a thin wrapper over `@base-ui/react/dialog` — costs one file, keeps API parity with Sheet |
| Hand-rolled dual-pane transfer | Custom with `FilterCombobox` + two `ScrollArea` lists | Material UI TransferList is a good reference pattern (checkboxes, Add/Remove buttons, disabled until selection) but MUI is NOT in the stack | **Hand-roll the dual-pane** using project primitives (Checkbox, ScrollArea, Button); ~100-150 LOC; no new dep |
| Introduce `zustand` for active-list state | React Context (`ActivePartnerListProvider`) | Project has zero state libraries; all state is URL, Context, or local | **Use Context** — matches existing `SidebarDataProvider`, `PartnerNormsProvider`, etc. |

**Installation:**
```bash
# No new dependencies required.
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── partner-lists/
│       ├── types.ts              # PartnerList, PartnerListFilters, AttributeKey
│       ├── schema.ts             # zod partnerListSchema + array schema
│       ├── storage.ts            # loadPartnerLists / persistPartnerLists (storage key)
│       ├── defaults.ts           # optional: zero starter lists (empty array), OR seed examples
│       ├── filter-evaluator.ts   # runFilter(partners, PartnerListFilters) → Set<partnerId>
│       └── index.ts              # public barrel (optional)
├── hooks/
│   └── use-partner-lists.ts      # CRUD hook mirroring use-saved-views.ts
├── contexts/
│   └── active-partner-list.tsx   # ActivePartnerListProvider + useActivePartnerList hook
└── components/
    ├── partner-lists/
    │   ├── partner-lists-sidebar-group.tsx   # Sidebar UI (lives under Partners)
    │   ├── create-list-dialog.tsx            # Sheet-based dialog, attribute filters + dual pane
    │   ├── dual-pane-transfer.tsx            # Inner composable: available ↔ selected
    │   ├── attribute-filter-bar.tsx          # Row of multi-select popovers (product/account/revenue)
    │   └── edit-list-dialog.tsx              # Thin wrapper / alias of create-list-dialog in edit mode
    └── ui/
        └── dialog.tsx             # OPTIONAL — only if centered modal is required
```

Total new files: 10-12 (matches roadmap effort estimate of "6-8 new files" + 2-3 if dialog is broken into sub-components).

### Pattern 1: localStorage-Persisted Entity (mirrors saved-views)

**What:** Same 4-part shape the app uses for saved views: `types.ts` → `schema.ts` (zod) → `storage.ts` (SSR-safe load/persist) → `use-X.ts` hook (hydration-safe CRUD).

**When to use:** Any client-side user-owned collection that survives reloads.

**Example (adapted from `src/lib/views/storage.ts`):**
```typescript
// src/lib/partner-lists/types.ts
export type AttributeKey = 'ACCOUNT_TYPE' | 'PRODUCT_TYPE' | 'REVENUE_BAND';

export interface PartnerListFilters {
  ACCOUNT_TYPE?: string[];  // multi-select values
  PRODUCT_TYPE?: string[];  // PENDING attribute availability — see Open Q #1
  REVENUE_BAND?: string[];  // PENDING attribute availability — see Open Q #1
}

export interface PartnerList {
  id: string;                      // crypto.randomUUID()
  name: string;
  partnerIds: string[];            // snapshot of matching PARTNER_NAME values
  filters: PartnerListFilters;     // empty object if list was hand-picked only
  createdAt: number;
  updatedAt: number;               // bumped on refresh or edit
}

// src/lib/partner-lists/storage.ts (mirror of src/lib/views/storage.ts)
export const PARTNER_LISTS_STORAGE_KEY = 'bounce-dv-partner-lists';

export function loadPartnerLists(): PartnerList[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(PARTNER_LISTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = partnerListsArraySchema.safeParse(parsed);
    return result.success ? (result.data as PartnerList[]) : [];
  } catch {
    return [];
  }
}

export function persistPartnerLists(lists: PartnerList[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PARTNER_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // silent fail — quota / private browsing
  }
}
```

### Pattern 2: Hydration-Safe CRUD Hook (mirrors `use-saved-views.ts`)

**What:** Initialize `useState([])`, hydrate in `useEffect`, persist in a second `useEffect` gated on a `hasHydrated` ref.

**When to use:** Any hook reading localStorage in a Next.js App Router RSC-compatible client component.

**Example:**
```typescript
// src/hooks/use-partner-lists.ts — structurally identical to use-saved-views.ts
export function usePartnerLists() {
  const [lists, setLists] = useState<PartnerList[]>([]);
  const hasHydrated = useRef(false);

  useEffect(() => {
    setLists(loadPartnerLists());
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    persistPartnerLists(lists);
  }, [lists]);

  const createList = useCallback(
    (name: string, partnerIds: string[], filters: PartnerListFilters) => { /* ... */ },
    [],
  );
  const updateList = useCallback(/* ... */, []);
  const deleteList = useCallback(/* ... */, []);
  const restoreList = useCallback(/* ... */, []);  // for undo toast
  const refreshList = useCallback(
    (id: string, allPartners: Array<{ name: string } & Record<string, unknown>>) => {
      // re-run filters against current partner set, update partnerIds + updatedAt
    },
    [],
  );
  const renameList = useCallback(/* ... */, []);

  return { lists, createList, updateList, deleteList, restoreList, refreshList, renameList };
}
```

### Pattern 3: Active List Context + `filteredRawData` Integration

**What:** Feed the active list's partner-ID set into the SAME filter-before-aggregate pipeline Phase 25 established. No second filter path.

**When to use:** Any top-level client-side filter that needs to cascade into KPIs/charts/table.

**Example:**
```typescript
// src/contexts/active-partner-list.tsx
interface ActivePartnerListState {
  activeListId: string | null;
  activeList: PartnerList | null;  // derived
  setActiveListId: (id: string | null) => void;
  toggleList: (id: string) => void;  // click-active-to-deactivate (CONTEXT lock)
}

// In data-display.tsx, extend filteredRawData:
const filteredRawData = useMemo(() => {
  const rows = data?.data;
  if (!rows) return [];
  let out = rows;
  // 1. Dimension filters (Phase 25 contract)
  if (dimensionFilters.length > 0) {
    out = out.filter((row) => dimensionFilters.every(cf => /* ... */));
  }
  // 2. Active partner list (NEW — Phase 34)
  if (activeList && activeList.partnerIds.length > 0) {
    const partnerSet = new Set(activeList.partnerIds);
    out = out.filter((row) => partnerSet.has(getPartnerName(row)));
  }
  return out;
}, [data?.data, dimensionFilters, activeList]);
```

This preserves the Phase 25 filter-before-aggregate contract and cascades automatically into KPIs, trajectory chart, comparison matrix, and table. The Partners sidebar section's `SidebarDataPopulator` also reads from `data.data` (not `filteredRawData`) today — will need to switch to `filteredRawData` OR receive `activeList` and derive its own filtered partner list. See Pitfall 5.

### Pattern 4: Sidebar Group Composition (mirrors Partners / Views)

**What:** One `SidebarGroup` per concept, with `SidebarGroupLabel` + `SidebarGroupContent` + `SidebarMenu`. Items use `SidebarMenuButton` for primary action, `SidebarMenuAction` for hover-only secondary (delete/rename).

**When to use:** Any new navigation cluster in the left sidebar.

**Example:**
```tsx
// src/components/partner-lists/partner-lists-sidebar-group.tsx
<SidebarGroup>
  <SidebarGroupLabel>
    Partner Lists
    {/* No count badge per CONTEXT lock */}
    <SidebarGroupAction onClick={() => setCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      <span className="sr-only">Create list</span>
    </SidebarGroupAction>
  </SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      {lists.length === 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton disabled className="text-caption text-muted-foreground">
            <List className="h-4 w-4" />
            <span>No lists yet</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {lists.map((list) => (
        <SidebarMenuItem key={list.id}>
          <SidebarMenuButton
            tooltip={list.name}
            isActive={activeListId === list.id}
            onClick={() => toggleList(list.id)}  // active? → deactivate
          >
            <List className="h-4 w-4" />
            <span className="truncate">{list.name}</span>
          </SidebarMenuButton>
          <SidebarMenuAction onClick={(e) => { e.stopPropagation(); openEdit(list.id); }} showOnHover>
            <Pencil className="h-3.5 w-3.5" />
          </SidebarMenuAction>
          {/* Consider context-menu for Refresh / Delete, OR a second action slot.
              Base UI has no nested menu out of box — likely popover or dropdown. */}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

Place this group as the FIRST child of `<SidebarContent>` in `app-sidebar.tsx`, BEFORE the existing Partners group (CONTEXT lock: "Partner Lists section appears ABOVE the Partners section").

### Pattern 5: Dual-Pane Transfer UI (hand-rolled)

**What:** Two parallel `ScrollArea` lists, with Add→ / ←Remove buttons between them. Each list uses `Checkbox` + `Label`. Buttons disabled until at least one checkbox in the source list is selected.

**When to use:** Explicit move-between-buckets interactions. Preferred over a single multi-select when users benefit from seeing both sides at once.

**Core requirements (verified via MUI reference pattern + shadcn best-practices search):**
- Each list is keyboard-navigable (Tab into list, arrow keys between items — use `role="listbox"` + `aria-multiselectable="true"` OR checkbox-per-row).
- Checkboxes linked to labels via `htmlFor` / `id`.
- Transfer buttons are `<button>` not `<div>`, disabled when no selection in source, with accessible names (e.g. "Add 3 partners", "Remove 2 partners").
- Escape closes the parent dialog; focus returns to the "+ New List" trigger.
- Header of each pane shows count: "Available (42)" / "Selected (3)".

**Layout token recipe (inside dialog):**
```tsx
<div className="grid grid-cols-[1fr_auto_1fr] gap-section">
  <Pane title="Available" items={available} ... />
  <div className="flex flex-col justify-center gap-stack">
    <Button variant="outline" disabled={!hasAvailableSel} onClick={moveRight}>→</Button>
    <Button variant="outline" disabled={!hasSelectedSel} onClick={moveLeft}>←</Button>
  </div>
  <Pane title="Selected" items={selected} ... />
</div>
```

### Anti-Patterns to Avoid

- **Don't introduce a second filter path.** Route list activation through `filteredRawData` (Pattern 3). A parallel "filter partners by list" path would diverge from Phase 25's filter-before-aggregate contract and break KPI/chart consistency.
- **Don't put `font-semibold`/`font-medium` next to a type token.** Tokens own weight (AGENTS.md). The StatCard / SectionHeader / filter-popover pilots already exposed this — Phase 27-06 CI guard (`check:tokens`) will fail the build if reintroduced.
- **Don't use Tailwind default `text-xs/sm/lg/xl/2xl`** in app code. Allowlist is `src/components/ui/**`, `src/app/tokens/**`, `src/components/tokens/**`. All new partner-list components live OUTSIDE the allowlist — use `text-display/heading/title/body/label/caption` only.
- **Don't store full row objects in the list** — store only partner IDs (CONTEXT lock: "partnerIds") plus the filter criteria. Avoids localStorage bloat and stale snapshots of the row payload.
- **Don't wrap PopoverTitle/SheetTitle in `SectionHeader`** (Phase 27-04 decision — primitives own the ARIA `data-slot` wiring). If a dialog needs an inner section header, use SectionHeader for that inner section only.
- **Don't nest Dialogs/Sheets** (shadcn best practice 2026). If edit needs a confirm, use an AlertDialog-style pattern OR inline confirm, not a second Sheet inside the first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay + focus trap + ESC close + scroll lock | Custom `<div>` modal | `Sheet` (Base UI Dialog under the hood) | Focus trap, portal, ARIA, escape/click-outside all solved |
| localStorage schema validation | `JSON.parse` + manual shape checks | zod `safeParse` | Pattern already in `views/schema.ts` — identical migration safety for free |
| Undo toast after delete | Custom timer + banner | `sonner` with `action` | `handleDeleteView` in `data-display.tsx:359-374` is the exact template |
| Multi-select dropdown | From scratch | `FilterCombobox` (`src/components/filters/filter-combobox.tsx`) | Keyboard navigation, selected-state, search already wired |
| Keyboard-navigable list with checkboxes | Plain `<ul>` + click handlers | `Checkbox` + `Label` primitives on a scrollable list | ARIA + `htmlFor` linkage gets correct screen reader behavior |
| "Are you sure?" confirm | Native `confirm()` | Inline "Replace?" button swap (see `save-view-popover.tsx:102`) OR destructive-variant button | Matches existing app voice; no native blocking dialog |

**Key insight:** Every primitive you need is already in `src/components/ui/*`. Phase 34 is composition work — the fastest path is to grep-then-imitate the saved-views implementation end-to-end and then add the attribute-filter layer on top.

## Common Pitfalls

### Pitfall 1: Attribute columns don't exist in the schema

**What goes wrong:** Planner writes tasks that reference `row.PRODUCT_TYPE` or `row.REVENUE_BAND`; runtime produces empty filter options because those keys are `undefined` on every row.
**Why it happens:** CONTEXT.md lists three filter dimensions, but `src/lib/columns/config.ts:18-101` only defines `ACCOUNT_TYPE` of the three. `grep -r "PRODUCT_TYPE\|REVENUE_BAND" src/` returns zero matches.
**How to avoid:** **Must be resolved before plan-writing.** See Open Questions §1. Three options:
  (a) Reduce v1 to `ACCOUNT_TYPE` only (ship faster, matches current schema).
  (b) Derive `REVENUE_BAND` from existing `TOTAL_AMOUNT_PLACED` (e.g. bucket `<$100K / $100K-$1M / >$1M`). No new column needed; the evaluator builds bands at runtime.
  (c) Add `PRODUCT_TYPE` and `REVENUE_BAND` to the Snowflake query/schema first as a separate Wave-0 task.
**Warning signs:** Plan task says "show product type in the filter dropdown" without specifying where PRODUCT_TYPE comes from.

### Pitfall 2: Breaking the filter-before-aggregate contract (Phase 25)

**What goes wrong:** Active partner list is applied to the display layer (e.g. inside `DataTable`'s `getFilteredRowModel`) instead of to `filteredRawData` upstream of aggregation. Root KPIs and trajectory chart then compute over ALL partners, while the table shows only filtered — identical to KI-07.
**Why it happens:** It's "easier" to add a filter to the already-wired `dimensionFilters`-state than to thread through `data-display.tsx`.
**How to avoid:** Extend `filteredRawData` memo (Pattern 3). Single filter pipeline. The Partners sidebar list and charts must both read from the same derived dataset.
**Warning signs:** KPIs don't change when a list is activated, but the table does.

### Pitfall 3: SSR hydration mismatch on localStorage read

**What goes wrong:** Reading `localStorage` during render → server and client disagree → Next.js hydration error.
**Why it happens:** Tempting to use `useState(() => localStorage.getItem(...))`.
**How to avoid:** Mirror `use-saved-views.ts` exactly: `useState([])` → hydrate in `useEffect` → persist in second `useEffect` gated on `hasHydrated` ref. This pattern is explicitly locked in Phase 25 Plan D decisions (KI-13 is a deferred intentional pattern, not a fix).
**Warning signs:** Console warning "Text content did not match" or "Hydration failed because the initial UI does not match".

### Pitfall 4: Active list state shape collides with URL

**What goes wrong:** Active list ID serialized to URL using `?list=...`, which collides with future filter param names, or loading a saved view clears the active list unexpectedly.
**Why it happens:** CONTEXT.md does NOT specify where active-list state lives. Phase 32 set a precedent of URL-backed navigation state.
**How to avoid:** CONTEXT explicitly says "active list persists across view switches" and "loading a view without a list reference does NOT clear the active list" — strongly implies memory state, not URL. **Default: React Context** (`ActivePartnerListProvider`). Flag to user as Open Q #3 if planner wants URL-persistence for bookmarkability.
**Warning signs:** Navigating via browser back/forward changes active list unexpectedly.

### Pitfall 5: `SidebarDataPopulator.partners` uses unfiltered `data.data`

**What goes wrong:** Active list doesn't filter the Partners sidebar section (CONTEXT lock requires it should).
**Why it happens:** `SidebarDataPopulator` in `data-display.tsx:625-690` receives `allData={data.data}` — NOT `filteredRawData`. This was intentional for Phase 25 (sidebar kept on unfiltered data for navigation integrity). That decision needs revisiting now.
**How to avoid:** Either (a) switch `SidebarDataPopulator` to `filteredRawData` — risk of breaking navigation with dimension filters active; or (b) pass `activeList?.partnerIds` into `SidebarDataPopulator` separately and filter there. Option (b) preserves Phase 25 decision: "sidebar intentionally kept on data.data for navigation integrity" (STATE.md line 65).
**Warning signs:** User activates a list; Partners section in sidebar still shows all partners.

### Pitfall 6: "Refresh" re-run produces fewer partners than the snapshot

**What goes wrong:** User created list with 5 partners matching `ACCOUNT_TYPE=X`; one partner churned; refresh now shows 4 partners; the one that "disappeared" is silently removed with no warning.
**Why it happens:** CONTEXT locks "snapshot-with-refresh" behavior — refresh overwrites the snapshot.
**How to avoid:** Show a toast with diff summary: "Refreshed 'High Value': +1 added, -2 removed". Consider a confirm before destructive refresh if removals > 0. Track `updatedAt` separately from `createdAt`.
**Warning signs:** Users report "my list shrank and I don't know why".

### Pitfall 7: Hand-picked additions/removals are lost on refresh

**What goes wrong:** User attribute-filters to 10 partners, manually UN-selects 2 before saving (final list = 8). On refresh, the evaluator re-runs filters → gets 10 → overwrites the list back to 10.
**Why it happens:** The list stores `partnerIds` + `filters`, but refresh uses ONLY `filters` to recompute.
**How to avoid:** Three options to flag to planner:
  (a) Store `filters` + `manualAdds: string[]` + `manualRemoves: string[]`; refresh applies filter then adds/removes diff.
  (b) Warn user at refresh time that hand-edits will be lost; require confirm.
  (c) Lock lists as "attribute-derived" vs "hand-picked" at creation; only attribute-derived lists have a Refresh action.
  CONTEXT doesn't specify. **Recommend (c) for v1** — simplest mental model, avoids ambiguous state.
**Warning signs:** Hand-edits silently reverted on refresh.

### Pitfall 8: Saved view references a deleted list

**What goes wrong:** `ViewSnapshot.listId = 'abc'`; user deletes the list; later loads the view. What happens?
**Why it happens:** CONTEXT says views can optionally reference a list; doesn't specify deletion cascading.
**How to avoid:** Two options: (a) cascade — on list delete, strip `listId` from all views; (b) ignore — on view load, if `listId` is not found, load view without activating any list, toast "List 'X' no longer exists". **Recommend (b)** — non-destructive, matches existing sanitization pattern (`sanitizeViews` in `use-saved-views.ts:50-55`).
**Warning signs:** View loads but silently fails to activate a list.

### Pitfall 9: CSS regression from missing type tokens

**What goes wrong:** Plan ships, `npm run check:tokens` fails in CI. Build red.
**Why it happens:** Engineer defaults to `text-xs`, `text-sm`, `font-medium`, etc.
**How to avoid:** All new files under `src/components/partner-lists/**` and `src/hooks/use-partner-lists.ts` are outside the allowlist — use ONLY the 6 named tokens (`text-display/heading/title/body/label/caption`) and their `-numeric` variants. No paired `font-*` weight classes. `uppercase` only on `.text-label` overline.
**Warning signs:** `bash scripts/check-type-tokens.sh` exits non-zero.

## Code Examples

### 1. zod schema for partner list (mirror of `views/schema.ts`)

```typescript
// src/lib/partner-lists/schema.ts
// Source: pattern from src/lib/views/schema.ts (verified 2026-04-17)
import { z } from 'zod';

const attributeFiltersSchema = z.object({
  ACCOUNT_TYPE: z.array(z.string()).optional(),
  PRODUCT_TYPE: z.array(z.string()).optional(),  // PENDING Open Q #1
  REVENUE_BAND: z.array(z.string()).optional(),  // PENDING Open Q #1
});

export const partnerListSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  partnerIds: z.array(z.string()),
  filters: attributeFiltersSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const partnerListsArraySchema = z.array(partnerListSchema);
```

### 2. Filter evaluator (pure function, easy to test mentally)

```typescript
// src/lib/partner-lists/filter-evaluator.ts
import type { PartnerListFilters } from './types';
import { getPartnerName } from '@/lib/utils';

/**
 * Run the filter criteria against the current dataset.
 * Returns the set of matching PARTNER_NAME values.
 *
 * Multi-select semantics: within an attribute, values are OR'd.
 * Across attributes, results are AND'd.
 */
export function evaluateFilters(
  rows: Record<string, unknown>[],
  filters: PartnerListFilters,
): Set<string> {
  const matchingPartners = new Set<string>();
  for (const row of rows) {
    if (matchAttribute(row, 'ACCOUNT_TYPE', filters.ACCOUNT_TYPE) &&
        matchAttribute(row, 'PRODUCT_TYPE', filters.PRODUCT_TYPE) &&
        matchAttribute(row, 'REVENUE_BAND', filters.REVENUE_BAND)) {
      const name = getPartnerName(row);
      if (name) matchingPartners.add(name);
    }
  }
  return matchingPartners;
}

function matchAttribute(
  row: Record<string, unknown>,
  key: string,
  values: string[] | undefined,
): boolean {
  if (!values || values.length === 0) return true;  // no filter set → all match
  const rowValue = row[key];
  if (rowValue == null) return false;
  return values.some((v) => String(v) === String(rowValue));
}
```

### 3. Wiring active list into `filteredRawData`

```typescript
// In src/components/data-display.tsx — extend the existing memo
const { activeList } = useActivePartnerList();

const filteredRawData = useMemo(() => {
  const rows = data?.data;
  if (!rows) return [];
  let out = rows;

  // 1. Dimension filters (existing, Phase 25)
  if (dimensionFilters.length > 0) {
    out = out.filter((row) =>
      dimensionFilters.every((cf) => { /* ... existing ... */ })
    );
  }

  // 2. Active partner list (NEW, Phase 34)
  if (activeList && activeList.partnerIds.length > 0) {
    const allow = new Set(activeList.partnerIds);
    out = out.filter((row) => allow.has(getPartnerName(row) ?? ''));
  }

  return out;
}, [data?.data, dimensionFilters, activeList]);
```

### 4. Sonner undo toast for list deletion (mirror of `handleDeleteView`)

```typescript
// Source: adapted from data-display.tsx:359-374 (verified 2026-04-17)
const handleDeleteList = useCallback(
  (id: string) => {
    const deleted = deleteList(id);  // returns the removed list or undefined
    if (deleted) {
      toast('List deleted', {
        description: `"${deleted.name}" was removed`,
        action: {
          label: 'Undo',
          onClick: () => restoreList(deleted),
        },
        duration: 5000,
      });
    }
  },
  [deleteList, restoreList],
);
```

### 5. Hydration-safe CRUD hook skeleton

```typescript
// src/hooks/use-partner-lists.ts
// Source: mirror of src/hooks/use-saved-views.ts (verified 2026-04-17)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PartnerList, PartnerListFilters } from '@/lib/partner-lists/types';
import { loadPartnerLists, persistPartnerLists } from '@/lib/partner-lists/storage';

export function usePartnerLists() {
  const [lists, setLists] = useState<PartnerList[]>([]);
  const hasHydrated = useRef(false);

  useEffect(() => {
    setLists(loadPartnerLists());
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    persistPartnerLists(lists);
  }, [lists]);

  const createList = useCallback((name: string, partnerIds: string[], filters: PartnerListFilters) => {
    const now = Date.now();
    setLists((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: name.trim(), partnerIds, filters, createdAt: now, updatedAt: now },
    ]);
  }, []);

  const deleteList = useCallback((id: string): PartnerList | undefined => {
    let deleted: PartnerList | undefined;
    setLists((prev) => {
      deleted = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });
    return deleted;
  }, []);

  const restoreList = useCallback((list: PartnerList) => {
    setLists((prev) => [...prev, list]);
  }, []);

  // renameList, updateList (name + filters + partnerIds), refreshList omitted for brevity

  return { lists, createList, deleteList, restoreList /* , renameList, updateList, refreshList */ };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind `text-sm font-medium` ad-hoc | 6 named type tokens + numeric variants; tokens own weight | Phase 27 (2026-04-17) | ALL new partner-list components must use tokens only |
| Ad-hoc surface styling (border/bg mix) | `bg-surface-raised`, `bg-surface-overlay`, `bg-surface-floating` + `shadow-xs/sm/md/lg` | Phase 26-28 (2026-04-17) | Dialog uses `bg-surface-floating`; sidebar list items inherit sidebar surface; any internal card inside dialog uses `bg-surface-raised` |
| `KpiCard`, ad-hoc section titles, hard-coded empty states | `StatCard`, `SectionHeader`, `EmptyState`, `DataPanel`, `ToolbarDivider` patterns | Phase 29 (2026-04-18) | Sidebar empty state uses `EmptyState variant="no-data"` inside the dialog; no custom "No lists" copy ad-hoc |
| React state-only drill | URL-backed `?p=&b=` drill params via `useDrillDown` | Phase 32 (2026-04) | Don't collide partner-list state with `p`/`b`; if serializing, pick a new param (see Open Q #3) |
| `ACCOUNT_TYPE` is the only partner-attribute column in schema | Same as today | N/A | **BLOCKER for PRODUCT_TYPE / REVENUE_BAND** — see Open Q #1 |

**Deprecated/outdated:**
- `KpiCard` → replaced by `StatCard` (don't import the old one).
- Ad-hoc `text-xl`/`text-lg`/`text-sm` — CI guard `check:tokens` blocks on src/.
- Pairing `font-semibold`/`font-medium` with type tokens — CI guard blocks.
- `<h2 className="text-xl">` — use `SectionHeader`.

## Open Questions

1. **Which partner attributes are actually available?**
   - What we know: `ACCOUNT_TYPE` exists in `src/lib/columns/config.ts:23` and is in `FILTER_PARAMS`. `PRODUCT_TYPE` and `REVENUE_BAND` do not exist in the schema (verified by `grep`).
   - What's unclear: Whether CONTEXT.md listed attributes aspirationally, OR whether a Wave-0 Snowflake schema change is expected.
   - **Recommendation:** Planner MUST raise this with the user before writing plans. Options (ranked): (a) Reduce v1 to ACCOUNT_TYPE only; (b) Derive REVENUE_BAND from `TOTAL_AMOUNT_PLACED` at runtime (bucket boundaries TBD); (c) Add new columns to Snowflake + cache + schema validator as Wave 0.

2. **How is hand-edit vs attribute-filter tracked for Refresh?**
   - What we know: CONTEXT says "Refresh re-runs the original filter criteria to capture new matches."
   - What's unclear: Do hand-picked additions/removals survive refresh?
   - **Recommendation:** v1 — restrict Refresh action to attribute-derived lists only (no Refresh shown on hand-picked lists). Planner flag to user if desired.

3. **Does active partner list need URL persistence?**
   - What we know: CONTEXT doesn't mention URL. Phase 32 set a URL-backed-drill precedent.
   - What's unclear: Should a URL like `?p=Acme&b=X&list=xyz` be shareable?
   - **Recommendation:** v1 — in-memory Context only. If bookmarkable lists are needed, that can be a follow-up phase. Matches CONTEXT's "active list persists across view switches" (memory, not URL).

4. **Centered Dialog primitive or reuse Sheet?**
   - What we know: App has `Sheet` (Base UI dialog styled as side-panel). No centered-modal `Dialog` wrapper exists.
   - What's unclear: Whether user mental model of "dialog/modal" in CONTEXT implies centered or accepts side-sheet.
   - **Recommendation:** Start with `Sheet` (side=right or side=bottom); if visual mock requires centered, add `src/components/ui/dialog.tsx` as a thin wrapper over `@base-ui/react/dialog`. Planner should include either choice as a low-risk task.

5. **Saved view reference on list deletion — cascade or ignore?**
   - What we know: CONTEXT says views can reference a list.
   - What's unclear: What happens when the referenced list is deleted.
   - **Recommendation:** Non-destructive sanitization on view load — if `listId` not found, load view without activating list, show info toast.

6. **Partners sidebar section filter source — `data.data` or `filteredRawData`?**
   - What we know: Today `SidebarDataPopulator` uses `data.data` (STATE.md line 65: "sidebar intentionally kept on data.data for navigation integrity").
   - What's unclear: Does CONTEXT's "Partners section filters to only show partners in that list" override the Phase 25 decision, or should it be an additive `activeList`-only filter?
   - **Recommendation:** Additive — `SidebarDataPopulator` receives `activeList?.partnerIds` as a separate prop; when set, filters its displayed partners by that set, but continues reading row source from `data.data` for the underlying partner roster (keeps navigation stable across dimension filters). This reconciles both locks.

## Sources

### Primary (HIGH confidence — verified against existing codebase)

- `src/lib/views/storage.ts` — localStorage load/persist pattern (mirror verbatim)
- `src/lib/views/schema.ts` — zod safeParse pattern (mirror verbatim)
- `src/lib/views/types.ts` — SavedView + ViewSnapshot type structure (template)
- `src/lib/views/defaults.ts` — starter-values pattern (optional for lists; default = `[]`)
- `src/hooks/use-saved-views.ts` — hydration-safe CRUD hook (mirror verbatim)
- `src/components/layout/app-sidebar.tsx` — sidebar group composition (template)
- `src/components/ui/sidebar.tsx` — shadcn Sidebar primitives (SidebarGroup, SidebarMenu, SidebarMenuAction, SidebarMenuSkeleton)
- `src/components/ui/sheet.tsx` — Base UI Dialog wrapper (reuse for dialog)
- `src/components/ui/popover.tsx` — Popover for delete-confirm / attribute filters
- `src/components/patterns/empty-state.tsx` — EmptyState variants
- `src/components/layout/section-header.tsx` — SectionHeader pattern (DS-20)
- `src/components/patterns/stat-card.tsx` — StatCard pattern (DS-18) — reference for token usage
- `src/components/toolbar/save-view-popover.tsx` — "Replace?" inline-confirm pattern
- `src/components/data-display.tsx:170-185` — `filteredRawData` memo (Phase 25 filter-before-aggregate contract)
- `src/components/data-display.tsx:359-374` — sonner undo-toast pattern
- `src/components/data-display.tsx:625-690` — `SidebarDataPopulator`
- `src/contexts/sidebar-data.tsx` — sidebar context shape (template for `ActivePartnerListProvider`)
- `src/hooks/use-drill-down.ts` — URL-backed state precedent (Phase 32)
- `src/hooks/use-filter-state.ts` — URL-backed dimension filters precedent
- `src/lib/columns/config.ts:18-101` — COLUMN_CONFIGS (confirms ACCOUNT_TYPE present, PRODUCT_TYPE/REVENUE_BAND absent)
- `src/components/filters/filter-combobox.tsx` — multi-select combobox (reuse for attribute filters)
- `docs/TYPE-MIGRATION.md` — referenced by AGENTS.md for type-token mapping
- `AGENTS.md` — type-token discipline, SectionHeader guidance
- `.planning/STATE.md` — Accumulated Context for Phases 25, 27, 28, 29, 32
- `.planning/phases/34-partner-lists/34-CONTEXT.md` — user decisions (this phase)

### Secondary (MEDIUM confidence — web-verified)

- [Shadcn Dialog (docs)](https://ui.shadcn.com/docs/components/radix/dialog) — best-practice focus-trap/ARIA (matched by Base UI Dialog)
- [Shadcn UI Best Practices 2026](https://shadcnspace.com/blog/shadcn-ui-handbook) — modal stacking, architecture layers (ui/primitives/blocks)
- [MUI TransferList reference pattern](https://kombai.com/mui/transfer-list/) — dual-pane transfer structure (checkboxes linked to labels, buttons disabled until selection)
- [Patterns.dev React 2026](https://www.patterns.dev/react/react-2026/) — current React state-management leanings (headless primitives + local context)
- [Building accessible modals in React](https://www.nutrient.io/blog/building-accessible-modals-with-react/) — focus trap, escape, return-focus contract

### Tertiary (LOW confidence)

- None — all primary findings verified against codebase; secondary findings corroborated by multiple sources or cited for pattern reference only.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and actively used; no new dependencies required.
- Architecture patterns: HIGH — every pattern (localStorage hook, sidebar group, filter pipeline, sonner undo, EmptyState, Sheet-as-modal) has a verified template in the existing codebase.
- Pitfalls: HIGH — pitfalls 1 (schema gap), 2 (filter contract), 3 (hydration), 5 (sidebar source) are verified from codebase reading + STATE.md decisions. Pitfalls 6, 7, 8 are inferences from CONTEXT ambiguities (MEDIUM-HIGH).
- Open questions: HIGH — every open question is rooted in a specific gap in CONTEXT.md or a specific conflict with an existing decision in STATE.md.

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable stack; web-verified 2026 content; revisit if schema changes or if Phases 30/31 ship new primitives before execution)
