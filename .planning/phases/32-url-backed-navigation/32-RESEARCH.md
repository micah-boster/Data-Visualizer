# Phase 32: URL-Backed Navigation - Research

**Researched:** 2026-04-16
**Domain:** Next.js App Router URL state (drill-down navigation via query params)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**URL format & params**
- Query params, not path segments: `?partner=<slug>&batch=<iso-date>`
- Human-readable slugs for partner (matches existing naming), ISO date for batch
- Only partner + batch are URL-backed. Filters, columns, active saved view, chart tab all stay out of the URL
- Every drill-in pushes a new browser history entry (not replace). Drill-up pops history — no custom handling needed

**Back button behavior**
- Back pops exactly one drill level at a time: `partner+batch` → `partner` → root
- State preserved across back/forward navigation:
  - Active dimension filters
  - Loaded saved view (columns, sort, conditional formats)
  - Scroll position at each drill level
  - Chart tab / chart selection at each drill level
- Remember last viewed state at each level (e.g., if user drilled into Partner A, backed out, then drilled into Partner B, going back lands on Partner B not Partner A)
- Forward button is fully symmetric — free via standard `history` API

**Deep-link edge cases**
- **Stale params** (partner/batch no longer exists): render empty drill state + toast "Partner X not found". User can navigate back manually. Non-destructive — don't auto-redirect, don't show error page
- **Cold load** (URL loaded before data ready): render app shell with loading skeleton, resolve drill state once data arrives. Matches existing initial-load pattern
- **Legacy URLs** (saved-view links pre-NAV with no drill params): treat absence of drill params as root view. Full backward compatibility, zero migration
- **Copy shareable link UI**: the browser URL "just works" for Phase 32. A dedicated copy-link button in the breadcrumb is deferred to a later polish phase

**Saved view integration (NAV-04)**
- Per-view opt-in: when saving a view while drilled in, a checkbox "Include current drill state" appears (defaults unchecked)
- Checkbox only renders if user is currently drilled in — keeps root-level save dialog uncluttered
- View schema extended with an optional `drill: { partner?: string; batch?: string }` field. Existing saved views remain valid (no migration needed)
- When a saved view with drill state is loaded, the URL updates to match (push, not replace) — back button returns the user to their pre-load state

### Claude's Discretion
- Exact param names if they conflict with existing query strings (but prefer `partner` and `batch`)
- How to wire `useSearchParams` safely given the known "freeze" gotcha (research this)
- Loading skeleton styling during cold-load resolution
- Toast component reuse for stale-param warnings
- Exact migration strategy for any in-memory drill state → URL state transition

### Deferred Ideas (OUT OF SCOPE)
- **Copy-shareable-link button** in the breadcrumb with a "Copied!" toast — deferred to a later UI polish phase
- **Filters in URL** (dimension filter state as query params) — out of scope for this phase; a potential future "workspace URL" feature
- **Active saved view in URL** (e.g., `?view=monthly-trends`) — out of scope; blurs the line with the saved-view feature
- **Dedicated 'drilled bookmarks' UI** as a concept separate from saved views — rejected in favor of extending the existing view schema
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Drill state (partner, batch) is reflected in URL params (`?partner=X&batch=Y`) | `useFilterState` already implements this pattern successfully — reuse (see Architecture Pattern 1). Pushed URL shape locked in CONTEXT. |
| NAV-02 | Browser back button navigates up drill levels correctly | `router.push()` appends history entries; native browser back pops them. **Do not** use `router.replace()` for drill transitions — that's the filter-state pattern and would break back navigation. See Pattern 2. |
| NAV-03 | Deep-linking to a URL with partner/batch params loads the correct drill state | Page is already wrapped in `<Suspense>`. `useSearchParams()` reads params on cold load; validation runs against loaded `data.data` to detect stale slugs and fire a toast. See Pattern 3. |
| NAV-04 | Saved views can optionally include drill state for shareable bookmarks | Extend `viewSnapshotSchema` (zod) with optional `drill: { partner?, batch? }`. Existing views remain valid because `.optional()` defaults to undefined. Load handler pushes URL. See Pattern 4. |
</phase_requirements>

## Summary

Phase 32 replaces the in-memory drill state (`useDrillDown`, currently `useState<DrillState>`) with URL-backed state via Next.js `useSearchParams` + `useRouter`. The app already has a working reference for this exact pattern — `use-filter-state.ts` — which reads params via `useSearchParams()` and writes via `router.replace()`. The NAV-02 difference: drill transitions must use `router.push()` so the browser back/forward buttons navigate between drill levels.

The stack is **Next.js 16.2.3 + React 19.2.4**, with the entry Page (`src/app/page.tsx`) already wrapped in `<Suspense fallback={<LoadingState />}>`. This satisfies the `useSearchParams` Suspense requirement for production builds. The "useSearchParams freezes" gotcha called out in the roadmap is addressed in the existing filter hook by keying memos off `searchParams.toString()` instead of the `searchParams` object reference — this prevents reference-churn re-renders. Same pattern applies here.

Non-URL state (loaded saved view, dimension filters, scroll position, chart tab, chart expanded) must survive drill transitions. Since the entire app lives under a single client component (`DataDisplay` inside `Suspense` inside `RootLayout`) and drill transitions are same-URL query-param changes (not route changes), that component does **not** unmount on `router.push()` — `useState` survives naturally. For scroll position per level and "remember last viewed partner/batch at each level," we need a small in-memory map keyed by drill level, restored on `popstate`-triggered re-renders.

**Primary recommendation:** Build `useDrillDown` as a thin adapter over `useSearchParams` that mirrors the shape/API of the existing `use-filter-state.ts` hook — same Suspense wiring, same `paramsString` memo-key discipline, same `next/navigation` imports — but call `router.push()` instead of `router.replace()` for drill transitions. Add a `useDrillMemory` side hook (plain in-memory ref) for remembering last-viewed state at each level.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/navigation` | 16.2.3 (bundled) | `useSearchParams`, `useRouter`, `usePathname` for URL-backed client state | Official App Router API — no alternative for URL reads/writes in App Router client components |
| `react` | 19.2.4 | `useState`, `useMemo`, `useCallback`, `useEffect`, `<Suspense>`, `useTransition` | React 19 ships `useTransition` and improved concurrent rendering — important for smooth drill transitions |
| `sonner` | 2.0.7 | Toast notifications via `toast()` — already mounted at `src/app/layout.tsx` | Existing stack; `toast()` is used throughout (`data-display.tsx`) |
| `zod` | 4.3.6 | Extend `viewSnapshotSchema` with optional `drill` field | Existing schema already validates saved views; minimal additive change |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None — no new dependencies needed | — | — | This phase is an internal refactor using primitives already in the app |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `window.history.pushState` | `router.push()` | `pushState` bypasses Next.js's client router state sync — `useSearchParams` may not see the change. Only use for no-op URL rewrites (already used in `data-display.tsx` line 290 for saved-view load, which is acceptable there since that handler also updates component state). For drill transitions, use `router.push()`. |
| `nuqs` library | Native `next/navigation` | `nuqs` would be a new dependency for two params. Existing `use-filter-state.ts` proves native works fine. Don't add a dep. |
| Path segments (`/partner/acme/batch/2024-01`) | Query params (`?partner=acme&batch=2024-01`) | **Locked in CONTEXT.** Path segments would force creating a dynamic route under `app/` and restructuring Page boundaries. Query params reuse the existing single-page shell. |

**No new installs required.**

## Architecture Patterns

### Recommended Project Structure

```
src/
├── hooks/
│   ├── use-drill-down.ts          # REWRITE: URL-backed via useSearchParams
│   ├── use-filter-state.ts        # REFERENCE pattern (do not touch)
│   ├── use-saved-views.ts         # EXTEND schema validation for drill field
│   └── use-drill-memory.ts        # NEW (optional): remembers last partner/batch at each level
├── lib/
│   ├── navigation/
│   │   └── drill-params.ts        # NEW: param name constants, slug/encode helpers, param↔state mapping
│   └── views/
│       ├── types.ts               # ADD optional drill field to ViewSnapshot
│       └── schema.ts              # ADD optional drill field to viewSnapshotSchema
├── components/
│   ├── data-display.tsx           # CONSUMER: replace useDrillDown return shape usage
│   ├── navigation/
│   │   └── breadcrumb-trail.tsx   # CONSUMER: no change expected (already uses state/onNavigate)
│   └── dialogs/                    # Save-view dialog: add "Include drill state" checkbox
```

### Pattern 1: URL-backed drill-down hook (mirror `use-filter-state.ts`)

**What:** Replace `useState<DrillState>` with reads from `useSearchParams` and writes via `router.push`.

**When to use:** For all drill-down transitions — `drillToPartner`, `drillToBatch`, `navigateToLevel`.

**Critical:** Key memos off `searchParams.toString()`, NOT off the `searchParams` object. The object identity changes on every router tick in Next.js; the string value doesn't. This is the "freeze/re-render" gotcha the roadmap flagged, and it's exactly how the existing filter hook mitigates it.

**Example (adapted from `src/hooks/use-filter-state.ts`):**

```typescript
// Source: src/hooks/use-filter-state.ts lines 40-58 (existing pattern)
'use client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Critical: string key, not object key — prevents reference-churn re-renders
  const paramsString = searchParams.toString();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get('partner');
    const batch = searchParams.get('batch');
    if (batch && partner) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const drillToPartner = useCallback((partnerName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('partner', partnerName);
    params.delete('batch'); // entering partner level drops any batch
    // NAV-02: push (not replace) so back button navigates up one level
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString, pathname, router]);

  // ... drillToBatch, navigateToLevel follow the same pattern
}
```

### Pattern 2: `router.push` vs `router.replace` choice matrix

| Action | Method | Rationale |
|--------|--------|-----------|
| Drill-in (root → partner, partner → batch) | `router.push()` | Creates new history entry; back button returns to previous level |
| Drill-up via breadcrumb click | `router.push()` | Symmetric — user explicitly requesting forward navigation, back should return to deeper level |
| Browser Back/Forward | **Do nothing** — native browser handles popping; `useSearchParams` re-reads, memo recomputes, UI updates |
| Load a saved view that includes drill state | `router.push()` | NAV-04 locked: user can back-button to their pre-load state |
| Load a saved view **without** drill state while drilled in | `router.push()` with cleared drill params | Same back-button-returns-to-pre-load semantics |
| Dimension filter change (existing `use-filter-state.ts`) | `router.replace()` | Filters are not history-worthy — existing behavior, don't change |
| Stale-param resolution (slug not found) | **Do not redirect** — render empty drill state + toast | CONTEXT locked non-destructive behavior |

### Pattern 3: Cold-load / deep-link resolution

**Problem:** URL `/?partner=acme&batch=2024-01` loaded before TanStack Query has fetched `data.data`. Partner/batch slugs must be validated against the real dataset, but the dataset isn't here yet.

**Solution:** `DataDisplay` component already shows `<LoadingState />` when `isLoading` is true (lines 370-372). The drill state is already computed unconditionally, but validation of params against `data.data` must be deferred.

**Validation flow:**
1. `useDrillDown` reads params immediately (synchronous, from URL). `state.partner` and `state.batch` are raw strings from URL.
2. Once `data.data` is available, a `useEffect` (or a derived memo + effect) validates that the slug maps to a real partner/batch.
3. If invalid: call `toast('Partner "X" not found')`, push URL with drill params cleared (silent history replacement is fine here — user never saw the invalid state visibly). Use `router.replace()` for the cleanup push so back button doesn't return to the invalid URL.
4. If valid: carry on, render the drill.

**Key insight:** The entry Page (`src/app/page.tsx`) is already wrapped in `<Suspense fallback={<LoadingState />}>`. `useSearchParams` will suspend during prerendering (not relevant here since the whole thing is `'use client'`, but required to avoid Next.js build errors).

### Pattern 4: Saved view integration (NAV-04)

**Schema additive change (`src/lib/views/types.ts`):**

```typescript
export interface ViewSnapshot {
  // ... existing fields
  /** Optional drill state captured with the view (omitted if saved from root) */
  drill?: {
    partner?: string;
    batch?: string;
  };
}
```

**Zod schema (`src/lib/views/schema.ts`):** Add to `viewSnapshotSchema`:

```typescript
drill: z.object({
  partner: z.string().optional(),
  batch: z.string().optional(),
}).optional(),
```

**Backward compat:** Existing stored views in localStorage have no `drill` field. `safeParse` with `.optional()` accepts that — field defaults to `undefined`. Zero migration needed (matches CONTEXT locked decision).

**Save dialog:** Conditionally render the "Include current drill state" checkbox only when `drillState.level !== 'root'`. Default unchecked. If checked, include `drill: { partner, batch }` in the snapshot; otherwise omit the field entirely (don't write `drill: {}`).

**Load handler:** When loading a view:
- If `view.snapshot.drill?.partner`: `router.push()` with matching `?partner=X&batch=Y`
- If `view.snapshot.drill` is absent or empty: `router.push()` with drill params cleared (if user was drilled in)

This replaces the existing `window.history.replaceState` call in `handleLoadView` for the *drill-specific* slice — but that existing call handles dimensionFilters, which are separate. The drill URL update is a second, orthogonal update.

### Pattern 5: Remember-last-viewed at each level

**Goal:** "If user drilled into Partner A, backed out, then drilled into Partner B, going back lands on Partner B not Partner A." — CONTEXT locked.

**Insight:** The browser's native history already does this! `router.push()` creates a new history entry each time. Back from Partner B's drill goes to the previous entry (root with whatever params were there), forward from root goes to Partner B. There is no need to persist this manually — the History API is the source of truth.

**Edge case:** What "preserve last viewed state at each level" actually means for non-URL state (filters, scroll, chart tab):
- Non-URL state lives in component `useState` on `DataDisplay` — this component **does not unmount** during drill transitions (same URL pathname, only searchParams change). So `useState` values persist automatically.
- Scroll position: the browser restores scroll on back/forward by default for same-document navigations. Next.js `router.push` scrolls to top by default; pass `{ scroll: false }` to disable. **Recommended:** use `router.push(url, { scroll: false })` for drill transitions, then handle scroll explicitly per level if needed (e.g., scroll to top on drill-in, restore prior scroll on drill-out via a small `useRef<Map<level, number>>`).

### Pattern 6: Slug encoding for partner names

Partner names contain spaces, special chars, and potentially slashes. `URLSearchParams.set()` URL-encodes automatically when serialized via `.toString()`. **Do not** hand-roll `encodeURIComponent` — `URLSearchParams` handles it. On read, `searchParams.get('partner')` returns the decoded value.

**Slug format:** CONTEXT says "human-readable slugs for partner." Simplest: use the partner name verbatim and rely on `URLSearchParams` encoding. If the team wants prettier URLs (lowercase-dashed), add a tiny `slugify`/`unslugify` pair in `src/lib/navigation/drill-params.ts`. Since partner names are the canonical keys used for lookup throughout the app (e.g., `getPartnerName(row) === drillState.partner` in `data-display.tsx` line 213), the safest v1 is to URL-encode the canonical name (no transformation) to avoid a reverse-lookup step. Phase-32 plan can add slugification later if desired without breaking anything.

**Batch format:** ISO date (e.g., `2024-01-15`). No special encoding needed.

### Anti-Patterns to Avoid

- **Using `router.replace` for drill transitions.** Breaks NAV-02 (back button). Only use `replace` for filter changes and stale-param cleanups.
- **Memoizing off `searchParams` object identity.** Causes the "freeze/churn" behavior the roadmap warns about. Always use `searchParams.toString()` as the memo key.
- **Redirecting on stale params.** CONTEXT locks non-destructive behavior: render empty state + toast, don't auto-redirect or show error page.
- **Touching `use-filter-state.ts`.** It works. The bug fixed in Phase 25 (HEALTH-01) relied on this hook being correct. Keep it alone.
- **Creating a new dynamic route (`app/partner/[slug]/page.tsx`).** CONTEXT locks query params. Don't restructure the route tree.
- **Calling `window.history.replaceState` for drill changes.** It updates the URL bar but **bypasses Next.js's client router** — `useSearchParams` won't see the change, and nothing re-renders. The existing code does this for dimension-filter restore (line 290 of `data-display.tsx`) only because it then imperatively updates component state. Don't extend this pattern to drill state.
- **Putting scroll position, chart tab, or filter state in the URL.** CONTEXT explicitly locks these out of scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL parameter parsing | Custom string parser | `searchParams.get('partner')` / `new URLSearchParams(str)` | Built-in, handles encoding/multi-value edge cases |
| Partner name encoding | `encodeURIComponent()` manually | `URLSearchParams.set()` + `.toString()` | It encodes at serialization time automatically |
| Back-button history | Custom stack in `useRef` / sessionStorage | Browser History API via `router.push` | History API already does exactly this correctly |
| Forward button | Custom forward-stack state | Browser History API | Same — native forward works automatically when using push |
| Toast infra | New notification component | `toast()` from `sonner` (already imported throughout) | `Toaster` is already mounted in `src/app/layout.tsx` line 47 |
| Saved-view schema validation | Manual shape checks | Extend existing `viewSnapshotSchema` zod schema | Pattern already in place in `src/lib/views/schema.ts` |
| Remembering last-viewed partner/batch at each level | sessionStorage keyed by level | Browser History API (native) | Each `router.push` is a history entry; back/forward already restores exact state |

**Key insight:** Nearly every moving part in this phase already exists in the codebase. The refactor is almost entirely about rewiring the existing `useDrillDown` hook to read/write URL instead of React state, while mirroring the shape of `use-filter-state.ts`.

## Common Pitfalls

### Pitfall 1: The "useSearchParams freeze" (reference-churn re-render loop)

**What goes wrong:** Child components that depend on `searchParams` (the object) inside `useMemo`/`useCallback` deps re-run on every router tick because Next.js returns a new `URLSearchParams` object each render. This causes subtle double-renders and, in components with effects that write back to the URL, infinite loops.

**Why it happens:** `searchParams` is a new reference each time `useSearchParams` is called, even when the underlying query string is unchanged. React's referential equality sees a change and re-runs memos.

**How to avoid:** Always convert to `searchParams.toString()` and use that string as the memo/effect dep. Existing pattern in `use-filter-state.ts` lines 46-75:

```typescript
const paramsString = searchParams.toString();
const columnFilters = useMemo(() => { /* ... */ }, [paramsString]);
```

**Warning signs:** Router transitions that feel "sticky," console warnings about state updates during render, infinite loops when the hook also writes to the URL.

### Pitfall 2: Suspense boundary required at production build time

**What goes wrong:** `next build` fails with "Missing Suspense boundary with useSearchParams" if a page uses `useSearchParams` above a Suspense boundary.

**Why it happens:** Next.js prerenders static pages at build; pages with `useSearchParams` must bail to client-side rendering, which requires a Suspense wrapper.

**How to avoid:** The app already wraps `<DataDisplay />` in `<Suspense fallback={<LoadingState />}>` at `src/app/page.tsx` lines 6-10. Keep this wrapper. If Phase 32 splits `DataDisplay` into sub-components that also call `useSearchParams`, they're inside the same boundary so no additional Suspense is needed.

**Warning signs:** Build breaks, error message explicitly mentions Suspense.

Source: [Next.js docs — use-search-params.md, line 179](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md)

### Pitfall 3: `router.push` scrolls to top by default

**What goes wrong:** On drill-in, page jumps to top. User was looking at row 47 of the table, drill-in to that partner, and now they're at the top of the partner view. Symmetric jump on drill-out. Feels janky.

**Why it happens:** Default Next.js behavior — `router.push()` scrolls to `(0, 0)` to match link-click UX.

**How to avoid:** Pass `{ scroll: false }` as the second arg: `router.push(url, { scroll: false })`. Then decide scroll behavior per level explicitly. CONTEXT locks "preserve scroll position at each drill level" — so: on drill-in, capture current scroll in a `useRef<Map>` keyed by `level`; on drill-out (triggered by route transition that moves up a level), restore the map value for that level. On first drill-in to a level, scroll to top as a sensible default.

**Warning signs:** Drill transitions feel disorienting; user has to re-scroll after every back click.

Source: [Next.js docs — use-router.md, lines 117-138](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md)

### Pitfall 4: Known Next.js 16.2.0+ regression with static exports (NOT affecting this app)

**What goes wrong:** In static-export builds (`output: 'export'`), `router.push`/`router.replace` retain stale query parameters from prior navigations to the same pathname.

**Why it matters for us:** It **does not** — this app's `next.config.ts` has no `output: 'export'` and deploys on Vercel as a dynamically-rendered app. Documenting so the planner can confirm and move on.

**Verification:** Check `next.config.ts` does not get `output: 'export'` added during Phase 32 scope creep. If someone proposes static export, cite this and defer.

Sources:
- [vercel/next.js issue #92187](https://github.com/vercel/next.js/issues/92187) — regression pinned to 16.2.0-16.2.2, this project is on 16.2.3 which may include the fix (PR #92193 merged before release) — **verify empirically during Phase 32 smoke testing**
- [vercel/next.js discussion #88535](https://github.com/vercel/next.js/discussions/88535) — separate Cache Components issue; not enabled in this app

### Pitfall 5: `data-display.tsx` line 290 uses `window.history.replaceState` — do not add drill updates here

**What goes wrong:** A future plan might be tempted to piggyback drill URL updates into the existing `handleLoadView`'s `window.history.replaceState` call. This would not trigger a re-render of `useDrillDown` because `useSearchParams` doesn't observe raw `window.history` mutations.

**Why it happens:** `window.history.replaceState` is a browser-level API; Next.js's client router state is separate and unaware.

**How to avoid:** For drill updates in `handleLoadView`, use `router.push()` as a second, separate call. The existing `window.history.replaceState` call for dimensionFilters can stay as-is (that handler imperatively restores the component state to match the URL, so it works) — but it should **not** be extended to cover drill.

**Warning signs:** Loading a drill-containing saved view updates the URL bar but the page doesn't re-render to show the drill.

### Pitfall 6: Empty URLSearchParams serialization

**What goes wrong:** `new URLSearchParams().toString()` returns `""`, and `router.push(pathname + '?' + '')` produces `/?` which is ugly (and may or may not loop depending on implementation).

**Why it happens:** Easy to forget the empty-string case.

**How to avoid:** Mirror existing pattern in `use-filter-state.ts` line 109: `router.replace(qs ? \`${pathname}?${qs}\` : pathname);`. Same technique for `push`.

## Code Examples

### Example 1: Minimal drill-down hook (core pattern)

```typescript
// Source pattern: src/hooks/use-filter-state.ts (adapted for push + drill semantics)
'use client';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type DrillLevel = 'root' | 'partner' | 'batch';
export interface DrillState {
  level: DrillLevel;
  partner: string | null;
  batch: string | null;
}

export function useDrillDown() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const paramsString = searchParams.toString();

  const state: DrillState = useMemo(() => {
    const partner = searchParams.get('partner');
    const batch = searchParams.get('batch');
    if (partner && batch) return { level: 'batch', partner, batch };
    if (partner) return { level: 'partner', partner, batch: null };
    return { level: 'root', partner: null, batch: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsString]);

  const pushWith = useCallback(
    (next: Partial<Record<'partner' | 'batch', string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [paramsString, pathname, router],
  );

  const drillToPartner = useCallback(
    (partnerName: string) => pushWith({ partner: partnerName, batch: null }),
    [pushWith],
  );

  const drillToBatch = useCallback(
    (batchName: string, partnerName?: string) =>
      pushWith({ partner: partnerName ?? state.partner, batch: batchName }),
    [pushWith, state.partner],
  );

  const navigateToLevel = useCallback(
    (level: DrillLevel) => {
      if (level === 'root') pushWith({ partner: null, batch: null });
      else if (level === 'partner') pushWith({ batch: null });
      // 'batch' is deepest — no-op
    },
    [pushWith],
  );

  return { state, drillToPartner, drillToBatch, navigateToLevel };
}
```

### Example 2: Stale-param validation with toast

```typescript
// Inside DataDisplay, once data loads
useEffect(() => {
  if (!data?.data || drillState.level === 'root') return;

  const partnerExists = drillState.partner
    ? data.data.some((r) => getPartnerName(r) === drillState.partner)
    : true;
  const batchExists = drillState.batch
    ? data.data.some(
        (r) =>
          getPartnerName(r) === drillState.partner &&
          getBatchName(r) === drillState.batch,
      )
    : true;

  if (!partnerExists) {
    toast(`Partner "${drillState.partner}" not found`, {
      description: 'Showing the root view instead.',
    });
    navigateToLevel('root');
  } else if (!batchExists && drillState.level === 'batch') {
    toast(`Batch "${drillState.batch}" not found`, {
      description: 'Showing the partner view instead.',
    });
    navigateToLevel('partner');
  }
}, [data?.data, drillState, navigateToLevel]);
```

Note: For non-destructive behavior per CONTEXT, consider swapping `navigateToLevel` calls here for `router.replace` with cleared drill params, so the invalid URL isn't kept in history. Alternatively, render an empty state and let the user back-button — CONTEXT is slightly ambiguous. **Recommend planner clarify with user.**

### Example 3: Saved-view schema extension

```typescript
// src/lib/views/types.ts — additive
export interface ViewSnapshot {
  // ... existing fields unchanged ...
  /** Optional captured drill state (NAV-04) */
  drill?: { partner?: string; batch?: string };
}

// src/lib/views/schema.ts — additive
export const viewSnapshotSchema = z.object({
  // ... existing fields unchanged ...
  drill: z
    .object({
      partner: z.string().optional(),
      batch: z.string().optional(),
    })
    .optional(),
});
```

### Example 4: Existing reference hook (for the planner to study)

```typescript
// Source: src/hooks/use-filter-state.ts lines 40-120 (EXISTING — do not rewrite)
// Study this file for: paramsString memo-key trick, URLSearchParams mutation,
// auto-clearing cascading params (the batch-on-partner-change logic at lines 89-106
// is the exact shape we need to mirror for drill cascades).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useRouter` from `next/router` (Pages Router) | `useRouter`, `useSearchParams`, `usePathname` from `next/navigation` | Next.js 13 (App Router introduced) | Must import from `next/navigation` — importing from `next/router` silently returns `undefined` in App Router |
| `router.query` object | Separate `useSearchParams()` hook | Next.js 13 | No single merged object for route-params + query; use `useParams` for dynamic segments, `useSearchParams` for query string |
| `router.isReady` check | Not needed | Next.js 13 | Components using `useSearchParams` during prerender auto-bail to client render (with Suspense) |
| `force-dynamic = true` | `connection()` from `next/server` | Next.js 15+ | Only relevant for Server Components reading request-scoped data; not relevant here since `DataDisplay` is `'use client'` |

**Deprecated/outdated:**
- **`next/router`:** Only for Pages Router. This app uses App Router (`src/app/`). Do not import from here.
- **`router.events`:** Removed in App Router. Compose `usePathname` + `useSearchParams` + `useEffect` if navigation events are needed (not needed for Phase 32).

Source: [Next.js docs — app-router-migration.md, lines 469-515](node_modules/next/dist/docs/01-app/02-guides/migrating/app-router-migration.md)

## Open Questions

1. **Should stale-param detection auto-clear the URL (`router.replace`) or leave the invalid URL and show empty state?**
   - CONTEXT says: "render empty drill state + toast 'Partner X not found'. User can navigate back manually. Non-destructive — don't auto-redirect, don't show error page"
   - This suggests **leave the URL alone** and render empty. But "render empty drill state" for `level: 'partner'` with an invalid partner is a weird middle state — nothing to show except the toast.
   - **Recommendation for planner:** clarify with user in Plan 01 scoping. Default to leave URL + show a dedicated "Partner not found" empty state component inside the drilled view (breadcrumb still shows "Partner: <slug>" in muted style). Back button returns user to root.

2. **Slugification: verbatim URL-encoded partner name, or lowercased-dashed slug?**
   - CONTEXT: "human-readable slugs for partner (matches existing naming)"
   - "Matches existing naming" implies no transformation — use the canonical `PARTNER_NAME` value, let `URLSearchParams` encode.
   - **Recommendation:** verbatim. Defer prettier slugs to a future phase if team wants them.

3. **Scroll position persistence: `useRef<Map>` in `DataDisplay`, or sessionStorage?**
   - Native browser back/forward restores scroll for same-document navigations, but `router.push({ scroll: false })` then manual restoration is more reliable.
   - sessionStorage survives full reloads; ref does not. But deep-link cold-load will never have a prior scroll position anyway.
   - **Recommendation:** ref-based, keyed by drill level string. Simple and sufficient. sessionStorage would be overkill.

4. **Chart tab / chart state preservation across drill transitions:**
   - Chart state lives in `useCurveChartState` (per-chart, `useState` inside the chart component).
   - On drill-in, the chart component *may* unmount if a different chart is shown at the new level (e.g., root shows `CrossPartnerTrajectoryChart`, partner shows `CollectionCurveChart`).
   - CONTEXT says "preserve chart tab / chart selection at each drill level"
   - **Recommendation:** lift minimal chart state (which chart is visible, metric selection) into `DataDisplay` — that component does NOT unmount during drill transitions, so its `useState` survives. Already partially done via `chartsExpanded` and `comparisonVisible`. Phase 32 may need to lift one or two more pieces but should be small.

5. **Will the Next.js 16.2.0-16.2.2 stale-params regression bite this app on 16.2.3?**
   - The fix PR (#92193) was in flight at issue-filing time. 16.2.3 may include it.
   - The bug only surfaces in `output: 'export'` static builds — this app is dynamic, so likely not affected either way.
   - **Recommendation:** Smoke-test deep-link → drill-in → drill-out → back → forward cycles during Phase 32 verification. If the bug surfaces, downgrade to 16.1.6 or upgrade to 16.2.4+ as workaround.

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` — verified API behavior, Suspense requirement, prerendering notes (v16.2.3 bundled docs)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md` — verified `push`/`replace`/`back`/`forward`/`scroll` option (v16.2.3 bundled docs)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md` — verified `usePathname` semantics and hydration mismatch edge cases
- `node_modules/next/dist/docs/01-app/02-guides/migrating/app-router-migration.md` — confirmed `next/navigation` import and deprecated `next/router` patterns
- `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md` — details on React `<Activity>` for state preservation (relevant context; this app is NOT using Cache Components so Activity is not engaged, but the patterns inform scroll/chart-state strategies)
- `src/hooks/use-filter-state.ts` (existing app code) — reference implementation of the exact pattern Phase 32 needs; `paramsString` memo-key trick is proven in production
- `src/hooks/use-drill-down.ts` (existing app code) — current in-memory implementation being replaced
- `src/app/page.tsx` — confirmed existing `<Suspense>` wrapper is in place
- `src/app/layout.tsx` — confirmed `<Toaster>` (sonner) is already mounted app-wide
- `src/lib/views/schema.ts` + `src/lib/views/types.ts` — confirmed zod schema extensibility and optional-field migration path
- `src/components/data-display.tsx` — confirmed drill consumers (breadcrumb, sidebar, chart routing, table keying at line 723)
- `src/components/navigation/breadcrumb-trail.tsx` — confirmed breadcrumb wiring uses the `onNavigate` callback interface

### Secondary (MEDIUM confidence)

- [vercel/next.js issue #92187](https://github.com/vercel/next.js/issues/92187) — router.replace/push stale-param regression, affects 16.2.0-16.2.2 static exports (verified via WebFetch). PR #92193 fix pending release
- [vercel/next.js discussion #88535](https://github.com/vercel/next.js/discussions/88535) — Cache Components stale-searchParams issue (not applicable to this app since Cache Components not enabled)

### Tertiary (LOW confidence)

- None — all critical claims cross-verified against Next.js bundled docs and existing working code in this repo.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — zero new dependencies; every primitive is already in use elsewhere in the codebase with a working reference implementation.
- Architecture: **HIGH** — `use-filter-state.ts` is a 1-to-1 template for `useDrillDown`. The only difference is `push` vs `replace` and param names.
- Pitfalls: **HIGH** — the "useSearchParams freeze" was already mitigated in `use-filter-state.ts`, proving the planner has a known-good workaround. The Next.js 16 regression is well-documented and either already fixed at 16.2.3 or not applicable (dynamic app, not static export).
- NAV-04 schema change: **HIGH** — additive optional field; zod `.optional()` already tested in codebase for chart state extension.

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days; Next.js 16 is stable, app code is ground-truth)
