# Phase 43: Boundary Hardening - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish typed parsing boundaries (`BatchRow` / `AccountRow`), versioned localStorage with migration chain, Snowflake reliability primitives (retry / circuit-breaker / request-id correlation), a unified `<ChartFrame>` primitive owning shell concerns (legend, tooltip, empty/loading/error, polarity), and tuned caching (`revalidate: 3600` + tag-invalidation; React Query `staleTime: 5min`).

Scope is the existing surface of the app — not new chart types, not OAuth, not full chart-grammar redesign. The point is to make v5.0 inherit a typed, versioned, reliable substrate so its three new data shapes (scorecards, targets, triangulation rows) don't amplify current representation debt.

Requirements: BND-01 through BND-06. Co-implements DCR-08 (NULL semantics) at the parser boundary.

</domain>

<decisions>
## Implementation Decisions

### Parser strictness (BND-01, BND-02)
- **On malformed/missing fields: filter + warn.** Drop the bad row, surface count + sample of dropped rows in dev console, non-blocking UI toast (e.g. "3 rows skipped: invalid BATCH_AGE_MONTHS"). Don't crash on ETL drift; don't silently lie either.
- **Rate-shaped fields carry `number | null`** (per DCR-08). Compute layer suppresses on null — no contribution to averages, anomaly detector ignores. UI suppresses everywhere: em-dash / "N/A" in cells, hides delta arrows, omits from sparklines. Matches DCR-08 intent ("not applicable" ≠ "zero").
- Single parser at `src/lib/data/parse-batch-row.ts`. Static cache JSON loads through the same parser. Branded `BatchAgeMonths` resolves the days-vs-months ambiguity at construction, not in compute.

### Persistence migration policy (BND-03)
- **Schema version mismatch: migrate silently.** Apply migration chain on load; user's saved views / columns / lists / chart presets continue working without notification. Standard "invisible upgrade" pattern.
- **Missing migrator: fail loud, drop the blob, log error.** Per BND-03 spec ("missing migrator = loud failure, not silent drop"). Surface in dev console, send to error tracking in prod, drop the unrecognized blob, start fresh. Don't try to guess.
- Verified writes (read-back-and-compare) and cross-tab `storage` event listener are spec-locked.

### Snowflake degraded-mode UX (BND-04)
- **Circuit-breaker open: subtle banner + stale badge.** Top-of-page slim yellow banner ("Showing cached data — reconnecting to source") plus a small "stale" badge near the last-updated timestamp. Auto-dismisses when fresh data returns. Visible but not alarming.
- **Queue-wait visibility: dev tools / network panel only.** Server logs queue-wait separately from execution time, response includes timing headers, no UI surface in normal use. Preserves polish.
- **Sanitized error surface: friendly message + request-id.** User sees "Couldn't load this data. Reference: req_abc123. Try again or refresh." `X-Request-Id` correlates to server logs with the full error.
- **Retry policy: exponential backoff, 3 retries, transparent.** 1s / 2s / 4s before showing failure. Spinner stays up — no UI flicker. Counts toward circuit-breaker only after retries are exhausted.

### ChartFrame state treatments (BND-05)
- **Empty state: minimal text + suggested action.** Centered short message in muted color ("No batches match these filters.") + smaller secondary line ("Clear filters or expand date range."). No illustration. Matches the daily-driver, low-decoration aesthetic.
- **Loading state: skeleton on first load, subtle overlay on refetch.** First load uses chart-shaped skeleton (axes, faded bars/lines). Refetch keeps current data visible with a subtle overlay + corner spinner. Maps to React Query's `isLoading` vs `isFetching`.
- **Stale-column warning: inline warning chip in title row.** Small amber chip next to chart title ("⚠ Column 'foo' missing") with tooltip explaining. Chart still renders other channels — never blocks viewing.
- **Polarity prop default: resolve via `getPolarity(metric)` automatically.** If a channel binds to a known metric, look up polarity from the registry (DCR-09). Falls back to neutral (no directional color) for unknown metrics. Implements DCR-09's "route every color-encoded metric through `getPolarity()`" intent.

### Refresh affordance & cache freshness (BND-06)
- **Manual Refresh: toolbar button + keyboard shortcut.** Visible refresh icon in top toolbar (tooltip with last-updated time on hover) plus ⌘R / Ctrl+R intercepted in-app. Discoverable for new users, fast for daily users.
- **Last-updated timestamp: persistent in toolbar, subtle.** Small muted text ("Updated 2h ago" / "just now" / "yesterday") with exact timestamp on hover. Always visible — daily-driver tool, freshness matters for confidence in the numbers.
- **Daily ETL `revalidateTag` fires: auto-refetch + subtle toast.** React Query refetches in background; quiet toast "Data updated." Numbers update in place — user notices but isn't interrupted.
- **Tab-switch / window-focus: no refetch.** Honor the spec's `refetchOnWindowFocus: false`. User uses Refresh button if they want fresh. Calmer UX, lower Snowflake bill, daily ETL cadence makes aggressive refetching unnecessary.

### Claude's Discretion
- Exact toast / banner / chip styling (already governed by Phase 26-31 design tokens)
- Skeleton geometry per chart type
- Density-aware padding breakpoints inside `<ChartFrame>` (mentioned in spec, no specific breakpoints decided)
- Cross-tab `storage` event listener implementation details
- Request-id format (uuid v4 vs ulid)
- Specific list of "transient" error codes warranting retry (vs hard-fail)
- Whether the stale-cache used during degraded mode is per-query or global

</decisions>

<specifics>
## Specific Ideas

- "Filter + warn" is the working pattern across the app — match how DCR-09 polarity audit and Wave 0 anomaly fixes already handle bad inputs.
- Last-updated timestamp should mirror how mature analytics tools (Linear, Notion, Vercel dashboard) show freshness — tiny, ambient, never the focal point.
- The degraded-mode banner is closer to GitHub's "We're having problems" thin yellow strip than a modal — informative, dismissible, not alarming.
- Skeleton-then-overlay loading pattern matches how the chart UI already feels in Phase 36 — preserve that.

</specifics>

<deferred>
## Deferred Ideas

- Full chart-grammar redesign (legend / tooltip / axis components rebuilt from scratch) — v6.0 design pass, not Phase 43. ChartFrame is a primitive lift, not a rebuild.
- Snowflake observability dashboards / SLO tracking — infrastructure work, separate from app reliability primitives.
- ETL job authentication for `revalidateTag` endpoint — security concern, belongs in Phase 42 (Ingestion-Surface Security Review).
- Property-based tests on parser via fast-check — DEBT-09 in v5.5 tech-debt sweep.
- Component decomposition of `data-display.tsx` (1458 lines) — DEBT-07 in v5.5; the right seams emerge after v5.0 ships.
- Bundle-size / Lighthouse CI budget — DEBT-10 in v5.5; calibrates against v5.0's bundle, not the current one.

</deferred>

---

*Phase: 43-boundary-hardening*
*Context gathered: 2026-04-29*
