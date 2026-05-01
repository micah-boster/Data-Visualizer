# ADR 009: Caching Layers (BND-06)

**Date:** 2026-05-01
**Status:** Accepted
**Phase:** 43-boundary-hardening / Plan 03
**Supersedes:** none

## Cross-references

- `src/app/api/data/route.ts:13` — `revalidate = 3600` + `unstable_cache(...)` wrap
- `src/app/api/revalidate/route.ts` — POST endpoint daily ETL hits to invalidate `batch-data` tag
- `src/lib/query-client.ts:7-10` — React Query staleTime / refetchOnWindowFocus
- `src/components/layout/refresh-button.tsx` — locked client-side cache-bust path
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md` — Next 16 API
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md` — two-arg signature
- `.planning/phases/43-boundary-hardening/43-CONTEXT.md` — BND-06 decisions

## Context

The app reads from Snowflake via three API routes (`/api/data`, `/api/accounts`, `/api/curves-results`). Pre-BND-06, `/api/data` declared `dynamic = 'force-dynamic'` — every page-load triggered a fresh Snowflake query. The upstream ETL job runs **daily**: intra-day data is static. Snowflake credit consumption was running ~10× what the data freshness model justifies.

The v4.5 milestone success criterion requires a measurable ≥10× drop in Snowflake credit consumption (post-deploy observation). This ADR is the architectural decision that lets that drop materialize while preserving:

- Daily-driver UX (no "stale data" surprises during a workday session)
- ETL-cadence freshness (visibility lag of at most 1h after ETL completion)
- Manual-refresh escape hatch for power users
- Single-purpose cache-bust paths (no leaked secrets, no client-side route hits)

## Decision

Three caching layers, each with a clear, single role:

### Layer 1: Next.js route cache (server)

Implementation:

- `/api/data`: `export const revalidate = 3600` + `unstable_cache(fetcher, [keyParts], { revalidate: 3600, tags: ['batch-data'] })`. The wrapper goes AROUND the existing Plan 02b `executeWithReliability` call: cache hits skip retry + circuit-breaker entirely; cache misses go through the reliability wrapper as before.
- `/api/revalidate`: POST endpoint with shared-secret auth. Body `{ tag?: string }`; defaults to `'batch-data'`. Calls `revalidateTag(tag, 'max')` per Next 16's two-argument signature (the single-arg form is deprecated in Next 16 — see `revalidateTag.md`).

Invalidation paths:

- Tag-based: daily ETL POSTs `/api/revalidate` on completion → `revalidateTag('batch-data', 'max')` marks every cached `unstable_cache(..., { tags: ['batch-data'] })` entry as stale → next request through tagged routes uses stale-while-revalidate semantics (cached content served while fresh fetches in background).
- Time-based fallback: 1h `revalidate` window. Belt-and-suspenders against ETL-side bugs (missed POSTs, network errors) — 1h max staleness even if the tag-bust never happens.

### Layer 2: React Query (client)

`src/lib/query-client.ts`:

```typescript
{
  staleTime: 5 * 60 * 1000,    // 5 minutes — data considered fresh
  gcTime:    30 * 60 * 1000,   // 30 minutes — keep in cache
  retry: 1,
  refetchOnWindowFocus: false,
}
```

- 5-min staleTime: covers user-frequent revisits (drilldown navigation, sidebar list switches, view loads) without thrashing the route cache.
- `refetchOnWindowFocus: false`: CONTEXT lock — daily-driver UX. Tab-switch and window-focus do NOT trigger refetches. The user uses the manual `<RefreshButton>` if they want fresher data than Layer 2 has.
- Manual `<RefreshButton>`: invalidates the `['data']` query — that is the ONLY action. The button does NOT bypass Layer 1; if Layer 1 is fresh (within the 1h window), the React-Query refetch hits the Next route cache.

### Layer 3: Snowflake warehouse cache

- Snowflake's own result cache — automatic, identity-of-query keyed.
- Re-runs of the same SQL within 24h hit warehouse cache for free (no compute cost).
- Layer 1 reduces the hit count on this layer further (most reads never reach Snowflake at all).

## Alternatives considered

- **Drop the React Query layer entirely.** Pushes all freshness logic to server cache + manual refresh. Rejected because optimistic UI, saved-view loading, and partner-list switching depend on React Query's in-memory cache; redoing them would be a major Phase 44+ rewrite — out of scope.
- **Drop the Next route cache.** React Query alone handles freshness. Rejected because cold-cache means each first-page-load hits Snowflake; multiple users compounding this regresses the credit-consumption goal. The ETL-cadence dataset doesn't justify the savings.
- **Have the `<RefreshButton>` ALSO call `/api/revalidate`.** Rejected. Either leaks the revalidate secret to the browser bundle (`NEXT_PUBLIC_REVALIDATE_SECRET` — anyone can DoS the cache) or requires a server proxy that adds complexity for no user benefit. The 1h Layer-1 stale window is acceptable; the daily ETL is the authoritative refresh trigger. The user-facing "I want fresh now" UX is the React-Query bust above — that's sufficient because (a) Layer 1 is at most 1h stale by definition, and (b) the daily ETL cadence makes intra-hour staleness functionally invisible.
- **Migrate to Next 16 `'use cache'` directive.** The `unstable_cache.md` Note recommends this for Cache Components projects. Rejected for now: `'use cache'` requires the `cacheComponents` flag in `next.config.ts` which is NOT enabled here; the docs explicitly call `unstable_cache` the right surface for "projects not using Cache Components" (see `caching-without-cache-components.md`). When v6+ enables Cache Components we'll migrate.
- **4h revalidate window instead of 1h.** Matches the daily ETL cadence more conservatively but means ETL-completion → user-visibility lag of up to 4h on the first user. 1h is the right balance — the tag-invalidation hook covers the "fresh immediately after ETL" case, and 1h is the worst-case fallback if the ETL POST fails.
- **Per-route route-segment-config dynamic flag instead of `unstable_cache`.** Setting `export const revalidate = 3600` alone caches the whole route response. We additionally use `unstable_cache` around the Snowflake query so the cache key incorporates `selectedColumns` (different column subsets get distinct entries) — preserving the Plan 41-04 column-picker UX without splitting it across multiple stale-window timers.

## Why this one

- **Daily ETL means data IS static for ~24h** — serving cached for 1h is minimal-risk. The numbers don't change that fast.
- **Tag-invalidation gives ETL a precise hook** — Layer 1 freshness is event-driven, not timer-driven, in the steady state.
- **React Query's 5min staleTime** covers user-frequent revisits (drilldown nav) without thrashing Layer 1.
- **Manual Refresh covers the "I just need fresh now" edge case** via React-Query bust only — single locked path, no secrets in the browser, no double-bust complexity.
- **Auto-toast on background refetch** signals freshness without interrupting flow ("Data updated." 2s sonner toast).

## Partner overrides: NONE

Caching is global. Per Phase 41-04 ADR convention: partner-specific tuning invites p-hacking and erodes the cross-partner triangulation surface that v5.0 builds on. v5.5+ revisits this convention only if specific partners need tuning that doesn't compromise triangulation.

## When to revisit

- **Snowflake credit consumption did NOT drop ≥10× post-deploy** — the v4.5 milestone success criterion. Revisit Layer 1 settings (longer revalidate window? Per-handler `unstable_cache` over multiple read paths? Pre-warming?).
- **ETL job missed the `/api/revalidate` POST and users saw 1h-stale data.** Add a heartbeat/monitor on the revalidate endpoint; consider tightening Layer 1 `revalidate` if missed-POST rate exceeds tolerance.
- **v5.0 introduces user-uploaded scorecards (Phase 45)** — ingestion timing differs from daily ETL; per-tag cache keys may diverge. The current single `'batch-data'` tag may need to split into `'batch-data:scorecards'`, `'batch-data:internals'`, etc.
- **Cache Components flag (`cacheComponents: true`) becomes default in Next 17+** — migrate from `unstable_cache` to `'use cache'` directive per the deprecation guidance. Codemod likely available.

## Manual `<RefreshButton>` path is locked

The button onClick body is one line:

```typescript
queryClient.invalidateQueries({ queryKey: ['data'] });
```

It does NOT:

- Hit `/api/revalidate` from the client.
- Use `NEXT_PUBLIC_REVALIDATE_SECRET` (no such variable; the secret is server-only).
- Bypass Layer 1 directly.

The `⌘R` / `Ctrl+R` keyboard interceptor calls the same handler. Edge case: when the user is typing in an `<input>` / `<textarea>` / contentEditable surface, the interceptor steps aside so the browser's reload escape hatch remains available.

## References

- ADR 007: Dollar-weighted penetration is canonical primary (analogous "lock the canonical path, document the deviation" pattern).
- Next 16 docs: `unstable_cache`, `revalidateTag`, `caching-without-cache-components`.
- Phase 43-CONTEXT.md § "Refresh affordance & cache freshness" — BND-06 decisions reproduced verbatim in the must-have list.
