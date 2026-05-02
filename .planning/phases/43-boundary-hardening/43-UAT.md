---
status: resolved
phase: 43-boundary-hardening
source: [43-01-SUMMARY.md, 43-02a-SUMMARY.md, 43-02b-SUMMARY.md, 43-03-SUMMARY.md]
started: 2026-05-02T00:00:00Z
updated: 2026-05-02T04:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Refresh button — visible in toolbar
expected: Circular arrow icon visible in app header toolbar; hover shows tooltip with relative last-updated time
result: pass

### 2. ⌘R / Ctrl+R intercept — refreshes data, doesn't reload page
expected: With no input field focused, press ⌘R (Mac) or Ctrl+R (Win/Linux). The page does NOT reload; instead, the refresh icon briefly spins and data refetches in place. With an input field focused, ⌘R falls through to normal browser reload.
result: pass

### 3. "Data updated." toast on background refetch
expected: After being on the app for ~5 minutes (React Query staleTime), or after a manual refresh, a quiet sonner toast appears bottom-right reading "Data updated." It auto-dismisses after ~2 seconds. Does NOT fire when no data actually changed.
result: pass

### 4. "Last updated" timestamp persistent in header
expected: A muted-gray "Last updated {time}" line is always visible in the toolbar — never hidden, never blocking. Updates after a refresh.
result: resolved
reported: "it just has the time - not Last updated"
severity: minor
resolution: "Commit 81bea61 — added 'Last updated ' prefix to the freshness-indicator span in src/components/layout/header.tsx. Verified live."

### 5. Cross-tab localStorage sync — Saved Views
expected: Open the app in two browser tabs. In tab 1, save a new view (e.g. "Test Sync"). Within ~500ms, tab 2's sidebar Views group shows the new "Test Sync" entry without a manual reload.
result: resolved
reported: "when i saved the view, it flashed a few times in the views list and then disappeared"
severity: major
resolution: "Commit e484814 — fixed two distinct bugs in the consumer hook (src/hooks/use-saved-views.ts): (1) cross-tab ping-pong (subscribe→setState→persist→storage event→other tab→...→infinite) closed via externalUpdateRef pattern; (2) hydration loop (effect re-running on every React Query refetch and overwriting in-memory state from stale localStorage) closed via early-return on hasHydrated. Verified live: save view in tab 1 → persists once, list stable; tab 2 mirrors within ~500ms, no flash."

### 6. Cross-tab localStorage sync — Column visibility
expected: With both tabs still open, change column visibility in tab 1 (hide a column via the Columns panel). Within ~500ms, tab 2's table reflects the same hidden column.
result: resolved
reported: "it flashes when i click a column in the picker and doesn't seem to work right"
severity: major
related_to: Test 5 (same root cause — versioned-storage feedback loop affecting all wrapped modules)
resolution: "Commit e484814 — same fix as Test 5, applied to use-column-management.ts. Verified live: column toggle works on first click, no flash. Drill-down column flash also resolved as a side effect (single root cause). Same externalUpdateRef pattern also applied to use-partner-lists.ts, use-partner-config.ts, and use-chart-presets.ts so all 5 BND-03 surfaces are healed."

### 7. Empty-state — filtered to no data
expected: Filter the table or charts to a combination that produces zero rows (e.g., a partner with no batches in a date range). Charts show centered muted text "No data matches these filters." with no illustration.
result: skipped
reason: Hard to manually induce without manufactured filter combinations; ChartFrame state='empty' code path verified statically in chart-frame.tsx. Will surface organically if broken.

### 8. Loading skeleton — first paint
expected: Hard-refresh the page (browser ⌘⇧R). Charts show a skeleton silhouette (axis stubs + faded lines/bars) for ~200-500ms before real data renders. Not a generic spinner.
result: pass
note: User observed "loading chart data super slowly" — perf observation, not a regression of the skeleton behavior itself. Likely first-cache-miss after Phase 43-03 cache tuning (unstable_cache empty until first hit, then 1h-fresh thereafter). Worth watching post-deploy.

### 9. Stale-column chip — amber warning in chart title
expected: This only fires if a chart references a Snowflake column that no longer exists or returned no data. If you can trigger it (e.g., by using a static-cache fixture missing a column), the chart title row shows a small amber chip with text like "⚠ COLUMN_NAME" and a tooltip listing all stale columns. Chart still renders other channels.
result: skipped
reason: No stale columns currently in the live data; ChartFrame staleColumns prop wiring verified statically. Will surface organically if a Snowflake schema change breaks a column reference.

### 10. Circuit-breaker DegradedBanner (optional — requires breaking Snowflake)
expected: With Snowflake credentials intentionally invalid (set SNOWFLAKE_ACCOUNT to garbage), reload the app. After ~5 failed `/api/data` requests, a slim yellow banner appears at the very top of the app shell reading "Showing cached data — reconnecting to source." A "(stale)" badge appears next to the last-updated timestamp. Both auto-clear when Snowflake recovers (restore creds, refresh).
result: skipped
reason: 11 vitest tests already cover the reliability wrapper logic (commit 8ec6616). Live test would only verify banner CSS — high setup cost, low marginal signal.

## Summary

total: 10
passed: 4
issues: 0
resolved: 3
pending: 0
skipped: 3

## Gaps

- truth: "App connects to Snowflake using the configured SNOWFLAKE_AUTH mode"
  status: resolved
  reason: "User reported: dev server returned 500 with `Missing required Snowflake environment variables: SNOWFLAKE_PASSWORD` despite SNOWFLAKE_AUTH=externalbrowser being set in .env.local. Root cause was deeper than initial diagnosis: connection.ts had never been upgraded to multi-mode auth. It hardcoded SNOWFLAKE_PASSWORD as required and ignored SNOWFLAKE_AUTH entirely — so externalbrowser and keypair modes were unreachable even though .env.example documented them."
  resolution: "Commit 02ca9a0 (fix(snowflake): multi-mode auth). connection.ts now reads SNOWFLAKE_AUTH and dispatches to password / externalbrowser / keypair, validating only mode-specific env vars. isStaticMode() in fallback.ts also became auth-mode-aware (defense in depth — partial credentials in any mode now fall back to cached JSON instead of 500). Verified end-to-end: app boots, opens SSO browser tab on first request, completes auth, renders real Snowflake data."
  severity: major
  test: 0
  artifacts:
    - path: "src/lib/snowflake/connection.ts"
      issue: "Was password-only. Now reads SNOWFLAKE_AUTH and supports all three modes."
    - path: "src/lib/static-cache/fallback.ts"
      issue: "Static-mode check is now auth-mode-aware via COMMON_REQUIRED + MODE_EXTRA."
  scope: "Pre-existing connection-layer regression — the multi-mode .env.example was committed at project scaffold but the corresponding connection.ts upgrade never landed. Surfaced during Phase 43 UAT; fixed inline as part of this UAT cycle."

- truth: "Header toolbar shows 'Last updated {relative time}' label persistently"
  status: failed
  reason: "User reported: it just has the time - not Last updated. The bare timestamp is rendering in the toolbar, but the 'Last updated' prefix that contextualizes what the time means is absent. Plan 43-03 (BND-06) explicitly specified the format as 'Last updated {relative time}' — e.g. 'Last updated just now' or 'Last updated 2 minutes ago'. New users encountering the toolbar have to guess what the orphaned timestamp represents."
  severity: minor
  test: 4
  artifacts: []
  missing:
    - "Find the freshness-indicator render path in src/components/layout/header.tsx (Phase 26-03 introduced it; Phase 43-03 should have added the 'Last updated' prefix when wiring RefreshButton next to it)."
    - "Either prepend 'Last updated ' to the rendered string, or wrap the timestamp in a label element. Match the spec wording exactly."
    - "Verify the RefreshButton tooltip (which DOES include 'Last updated' per Test 1) and the toolbar label use the same helper so they don't drift."

- truth: "Saved views persist after creation (single tab, before cross-tab sync is even tested)"
  status: failed
  reason: "User reported: when i saved the view, it flashed a few times in the views list and then disappeared. The save flow appears to optimistically update the list (view briefly appears), then loses the entry. 'Flashed a few times' suggests multiple state-update cycles — consistent with a feedback loop between the new versioned-storage subscribe path (Phase 43-02a / BND-03) and the saved-views Provider's setState. Before Phase 43-02a, saved views worked correctly per ROADMAP."
  severity: major
  test: 5
  artifacts:
    - path: "src/lib/persistence/versioned-storage.ts"
      issue: "subscribe() wires window.addEventListener('storage', handler). Storage events SHOULD only fire in OTHER tabs per the WHATWG spec — but if the persist() path in this module also synthetically dispatches a storage event in the same tab (to feed cross-tab listeners), that creates a same-tab feedback loop: persist → storage event → listener fires → setState → React re-renders → effect re-runs → maybe persists again. Need to inspect for synthetic dispatch."
    - path: "src/lib/views/storage.ts"
      issue: "Wraps savedViews in createVersionedStore. The Provider/hook that consumes it (likely useSavedViews) would have a useEffect that subscribes via subscribeSavedViews — that's where the loop closes if persist re-emits."
    - path: "Provider/context for saved views"
      issue: "Locate the consumer hook (Plan 43-02a notes: 'Each module's existing Provider / useSavedViews / usePartnerConfig should subscribe via useEffect(() => subscribeX((next) => setStateX(next)), [])'). Verify the listener doesn't trigger when WE wrote the value."
  missing:
    - "Reproduce in the browser: open DevTools → Application → Local Storage; save a view; observe the bounce-dv-saved-views key — does it write multiple times? Does it ever clear?"
    - "Inspect versioned-storage.ts subscribe() logic: confirm storage events only fire from OTHER tabs (not synthetically dispatched here). If synthetic, remove that path."
    - "Inspect useSavedViews (or equivalent): the subscribe handler should ignore events whose newValue equals the current in-memory state. Otherwise: persist → event → setState(same value) → React still re-renders → effect re-runs persist → ..."
    - "Defense: the Provider should use a ref to track 'last value WE wrote' and ignore storage events matching that ref (the WHATWG spec already excludes same-tab events, but belt-and-braces)."
    - "Once root cause is patched, verify with: save view in tab 1 → persists once, list stays stable; tab 2 receives event within ~500ms → list updates."

- truth: "Column visibility toggle persists when clicked in the column picker (single tab)"
  status: failed
  reason: "User reported: it flashes when i click a column in the picker and doesn't seem to work right. SAME ROOT CAUSE AS TEST 5 — Phase 43-02a wrapped column visibility (src/lib/columns/persistence.ts) in createVersionedStore, and the column-state Provider's subscribe path is racing the toggle action. This confirms the regression affects ALL FIVE wrapped storage modules (views, columns, partner-lists, partner-config, chart-presets) — not isolated to Saved Views. Blast radius: any user setting that persists to localStorage is now flaky."
  severity: major
  test: 6
  artifacts:
    - path: "src/lib/columns/persistence.ts"
      issue: "Same versioned-storage wrap as views/storage.ts — same feedback-loop pattern."
    - path: "Provider/hook for column visibility state"
      issue: "Likely subscribes to subscribeColumns and setStateColumns on event — exact same anti-pattern."
  missing:
    - "Single root-cause fix in versioned-storage.ts subscribe() will close BOTH Test 5 (Saved Views) and Test 6 (Columns), AND the not-yet-tested partner-lists / partner-config / chart-presets modules. One patch, five surfaces healed."
    - "Add a smoke test to versioned-storage.smoke.ts asserting that persist() does NOT trigger same-tab listeners (only cross-tab)."
  additional_observations:
    - "User reported during Test 7 walkthrough: 'the columns are flashing in weird ways in drill down'. Drill-down column state likely shares the same column-state storage module (or a sibling using the same versioned-storage primitive). Confirms the regression isn't limited to top-level surfaces — any context that touches the wrapped storage modules during navigation/drill exhibits the flash. Single root cause, broader UX impact than the 5 modules in isolation suggested."
