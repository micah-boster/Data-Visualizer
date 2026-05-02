---
phase: 43-boundary-hardening
plan: 02a
subsystem: persistence
tags: [BND-03, versioned-storage, migrations, localStorage, cross-tab-sync]
requires: []
provides:
  - createVersionedStore<T> helper with envelope + migration chain + verified writes + cross-tab subscribe
  - 5 per-module migration chains (views, columns, partner-lists, partner-config, chart-presets) all at schemaVersion 1 with empty maps
  - MissingMigratorError + runMigrations runner with dev-throw / prod-drop policy
  - subscribeX exports on all 5 storage modules; wired into 5 consumer hooks
affects:
  - src/lib/views/storage.ts
  - src/lib/columns/persistence.ts
  - src/lib/partner-lists/storage.ts
  - src/lib/partner-config/storage.ts
  - src/lib/chart-presets/storage.ts
  - src/hooks/use-saved-views.ts
  - src/hooks/use-column-management.ts
  - src/hooks/use-partner-lists.ts
  - src/hooks/use-partner-config.ts
  - src/hooks/use-chart-presets.ts
tech-stack:
  added: []
  patterns:
    - Versioned envelope on every persist; legacy un-enveloped blobs treated as schemaVersion 1 in memory
    - Migration chain runs silently when migrators present; missing migrator throws in dev, drops blob in prod
    - Verified writes via read-back-and-compare; non-blocking sonner toast on mismatch
    - Cross-tab sync via window.addEventListener('storage') filtered by key
key-files:
  created:
    - src/lib/persistence/versioned-storage.ts
    - src/lib/persistence/migrations.ts
    - src/lib/persistence/versioned-storage.smoke.ts
    - src/lib/views/migrations.ts
    - src/lib/columns/migrations.ts
    - src/lib/partner-lists/migrations.ts
    - src/lib/partner-config/migrations.ts
    - src/lib/chart-presets/migrations.ts
  modified:
    - src/lib/views/storage.ts
    - src/lib/columns/persistence.ts
    - src/lib/partner-lists/storage.ts
    - src/lib/partner-config/storage.ts
    - src/lib/chart-presets/storage.ts
    - src/hooks/use-saved-views.ts
    - src/hooks/use-column-management.ts
    - src/hooks/use-partner-lists.ts
    - src/hooks/use-partner-config.ts
    - src/hooks/use-chart-presets.ts
decisions:
  - All 5 storage surfaces seed at schemaVersion 1 with empty migration chain — current shape is the v1 baseline; future schema changes append migrators without touching call sites
  - ColumnState gets an inline Zod schema (not a separate file) because the existing module had ad-hoc shape validation, not Zod; columnStateSchema is non-strict to absorb future TanStack additive fields
  - Legacy un-enveloped blobs wrap IN MEMORY only (no auto-rewrite on load) — first persist after this plan ships writes the full envelope naturally
  - subscribePartnerLists wires only the user-stored slice; derived lists are recomputed from rows in the existing useMemo
  - subscribeSavedViews re-runs sanitizeViews against current knownListIds/knownPairs so cross-tab sync respects this tab's runtime data
  - subscribeChartPresets re-merges BUILTIN_PRESETS ahead of sanitized user presets (built-ins never persisted; rebuilt from code on every hydration)
  - useColumnManagement subscriber falls back to defaults when next === null (key removed in another tab) — keeps tabs aligned even on clear
metrics:
  duration: ~16 minutes
  tasks_completed: 1
  files_created: 8
  files_modified: 10
  commits: 1
  completed_date: "2026-04-30T13:37:00Z"
---

# Phase 43 Plan 02a: Versioned localStorage Layer Summary

Established `createVersionedStore<T>` as the single funnel for all five existing persistent surfaces (views, columns, partner-lists, partner-config, chart-presets), shipping a versioned envelope `{ _meta: { schemaVersion, savedAt }, payload }`, a migration chain runner with the BND-03 dev-throw / prod-drop policy on missing migrators, verified writes via read-back-and-compare, and a cross-tab `storage` event listener wired into all five consumer hooks. Public API (`loadX` / `persistX`) is unchanged — all 12+ existing call sites compile byte-identically.

## Final Shape: createVersionedStore API

```ts
// src/lib/persistence/versioned-storage.ts
export interface VersionedBlob<T> {
  _meta: { schemaVersion: number; savedAt: string };
  payload: T;
}

export interface VersionedStoreOptions<T> {
  key: string;
  schemaVersion: number;
  migrations: MigrationChain;
  schema: ZodType<T>;
  defaultValue: T;
}

export interface VersionedStore<T> {
  load(): T;
  persist(value: T): void;
  subscribe(listener: (value: T) => void): () => void;
}

export function createVersionedStore<T>(opts: VersionedStoreOptions<T>): VersionedStore<T>;
```

```ts
// src/lib/persistence/migrations.ts
export class MissingMigratorError extends Error {
  readonly fromVersion: number;
  readonly toVersion: number;
}

export type Migration = (input: unknown) => unknown;
export type MigrationChain = Record<number, Migration>;

export function runMigrations(
  payload: unknown,
  fromVersion: number,
  currentVersion: number,
  chain: MigrationChain,
): unknown;
```

### Load pipeline (BND-03 lock)

1. SSR-safe (`typeof window === 'undefined'` → `defaultValue`).
2. `localStorage.getItem` inside try/catch; private-browsing / disabled-storage → `defaultValue`.
3. JSON.parse inside try/catch; parse failure → `defaultValue`.
4. **Legacy detection** — if the parsed shape lacks `_meta`, wrap as `{ _meta: { schemaVersion: 1, savedAt: 'legacy' }, payload: parsed }` IN MEMORY. Disk shape is NOT rewritten until the next persist (one-shot legacy branch per surface per user).
5. **Future-schema guard** — if `stored > current`, dev-warn + return `defaultValue` (defensive against a downgraded app reading a newer blob across deploy windows).
6. **Migration chain** — `runMigrations(payload, stored, current, chain)`. Silent on success per CONTEXT lock. `MissingMigratorError`: dev throws (visible in error boundary), prod logs + `localStorage.removeItem` + returns `defaultValue`. Migrator-throws-on-its-own: same loud-fail policy.
7. **Schema validation** — Zod `safeParse` on the migrated payload. Failure: dev throws/logs, prod logs + drops + returns `defaultValue`.

### Persist pipeline

1. SSR-safe.
2. Build envelope, `JSON.stringify` (try/catch — circular refs etc. dev-error, prod-swallow).
3. `localStorage.setItem` inside try/catch; on quota / private-browsing failure → non-blocking sonner toast (`toast.warning("Couldn't save your changes — local storage may be full")`), no throw.
4. **Verified write** — read back the same key, compare against the serialized blob byte-for-byte. Mismatch (silent-drop on quota truncation, cross-tab race) → same non-blocking toast. UI keeps working regardless.

### Subscribe pipeline

1. SSR-safe (returns no-op cleanup when `typeof window === 'undefined'`).
2. `window.addEventListener('storage', handler)` with handler filtered on `event.key === opts.key`.
3. `event.newValue` (string | null when removed in another tab) is fed through the same `runLoadPipeline` used by `load()` — listener receives a fully validated value or `defaultValue`.
4. Returns cleanup function for the consumer's `useEffect`.

## Five Module Wirings

| Surface | Module | schemaVersion | Schema Source | Default | Subscribe Export |
|---------|--------|---------------|---------------|---------|------------------|
| Saved Views | `src/lib/views/storage.ts` | `VIEWS_SCHEMA_VERSION = 1` | `savedViewsArraySchema` (existing Zod) | `[]` | `subscribeSavedViews` |
| Column State | `src/lib/columns/persistence.ts` | `COLUMNS_SCHEMA_VERSION = 1` | inline `columnStateSchema.nullable()` (new) | `null` | `subscribeColumnState` |
| Partner Lists | `src/lib/partner-lists/storage.ts` | `LISTS_SCHEMA_VERSION = 1` | `partnerListsArraySchema` (existing Zod) | `[]` | `subscribePartnerLists` |
| Partner Config | `src/lib/partner-config/storage.ts` | `CONFIG_SCHEMA_VERSION = 1` | `partnerConfigArraySchema` (existing Zod) | `[]` | `subscribePartnerConfig` |
| Chart Presets | `src/lib/chart-presets/storage.ts` | `CHART_PRESETS_SCHEMA_VERSION = 1` | `chartPresetsArraySchema` (existing Zod) | `[]` | `subscribeChartPresets` |

All five migration chains start as `Record<number, Migration> = {}` — current shape is the seed; future shape changes append entries (`chain[1] = v1→v2`, `chain[2] = v2→v3`, etc).

### Chart-presets wrapping notes

- Chart-presets ships its own corner case: the discriminated `ChartDefinition` union (Phase 35) carries a per-variant `version` field. Variant-internal additive evolution is therefore handled inside the chart definition's own union — it does NOT bump `CHART_PRESETS_SCHEMA_VERSION`. The preset envelope only bumps when the wrapper shape itself changes (e.g. a new top-level `description` field becomes required).
- The existing `sanitizeUserPresets` filter (drop `locked: true` user-storage entries; drop preset whose definition fails schema) stays in `useChartPresets`. It runs on top of the versioned store's schema gate — defense in depth.
- `subscribeChartPresets` re-merges `BUILTIN_PRESETS` ahead of the sanitized user presets so this tab's view of the merged list matches the writer tab.
- File uses `.ts`-suffixed imports (chart-presets is the one storage module that already used `.ts` import suffixes); persistence-module imports updated to match locally.

### Partner-config corner case

The pre-existing `console.warn` corrupt-payload branch in `loadPartnerConfig` is now subsumed by versioned-storage's loud-fail policy: schema validation failures surface via `console.error` on the same channel and DROP the blob in prod (per BND-03 CONTEXT lock — stricter than the prior "warn + return empty" behavior). Dev-time visibility intent is preserved; the only behavioral change is the prod-drop, which matches the BND-03 spec.

## Cross-Tab Listener Wiring (Hook Patterns)

All five hooks follow the same shape: an `useEffect` subscribes once on mount, returns the cleanup. The listener receives the parsed-and-validated next value; the hook decides how to merge it with any in-memory derived state.

### use-saved-views

```ts
useEffect(() => {
  const ids = knownListIds ?? new Set<string>();
  const unsub = subscribeSavedViews((next) => {
    setViews(sanitizeViews(next, ids, pairs));
  });
  return unsub;
}, [knownListIds, pairs]);
```

Re-runs `sanitizeViews` against THIS tab's `knownListIds` + `knownPairs` (Phase 34 stale-listId stripping + Phase 39 PCFG-03 multi-product drill migration). The cross-tab payload is schema-valid but may reference listIds that don't exist in THIS tab's runtime data.

### use-column-management

```ts
useEffect(() => {
  const unsub = subscribeColumnState((next) => {
    if (next) {
      setColumnVisibility(next.visibility);
      setColumnOrder(next.order);
    } else {
      setColumnVisibility(getDefaultVisibility());
      setColumnOrder(getDefaultColumnOrder());
    }
  });
  return unsub;
}, []);
```

`null` next-value means the key was removed in another tab — fall back to defaults to keep both tabs aligned.

### use-partner-lists

```ts
useEffect(() => {
  const unsub = subscribePartnerLists((next) => {
    setStoredLists(next.filter((l) => !l.id.startsWith(DERIVED_LIST_ID_PREFIX)));
  });
  return unsub;
}, []);
```

Wires only the user-stored slice. Derived lists are recomputed from `rows` in the existing useMemo, so the cross-tab path doesn't need to touch them.

### use-partner-config

```ts
useEffect(() => {
  const unsub = subscribePartnerConfig((next) => {
    setConfigs(next);
  });
  return unsub;
}, []);
```

Direct mirror — no merge logic needed since partner-config is a flat array.

### use-chart-presets

```ts
useEffect(() => {
  const unsub = subscribeChartPresets((nextRawUser) => {
    const sanitizedUser = sanitizeUserPresets(nextRawUser);
    setPresets([...BUILTIN_PRESETS, ...sanitizedUser]);
  });
  return unsub;
}, []);
```

Re-merges `BUILTIN_PRESETS` ahead of the sanitized user presets (built-ins are NEVER persisted; rebuilt from code on every hydration / sync).

## Verification

| Gate | Command | Result |
|------|---------|--------|
| TypeScript clean | `npx tsc --noEmit` | 5 pre-existing errors (parser-parity.smoke.ts × 4 from Phase 43-01 BND-01 work, baseline-capture.spec.ts × 1 axe-core); ZERO new errors from this plan |
| Smoke (6 cases) | `node --experimental-strip-types src/lib/persistence/versioned-storage.smoke.ts` | `versioned-storage.smoke: ALL 6 CASES PASS` |
| Persistence module shape | `grep -rn "_meta.*schemaVersion" src/lib/persistence/` | `versioned-storage.ts` exists, multiple matches |
| 5-surface delegation | `grep -rn "createVersionedStore" src/lib/{views,columns,partner-lists,partner-config,chart-presets}/` | 5 hits, one per module (matches done criterion exactly) |
| Zero direct localStorage | `grep -rn "localStorage\.\(setItem\|getItem\)" src/lib/{views,columns,partner-lists,partner-config,chart-presets}/` | ZERO hits — all routed through versioned-storage |
| Regression: chart-presets | `npm run smoke:chart-presets` | `✓ chart-presets smoke test passed (9 assertions)` |

### Smoke test cases (all 6 pass)

1. **Round-trip** — `persist(x)` then `load()` returns `x` byte-identically; envelope correctly stamped on disk.
2. **Legacy un-enveloped blob** — pre-write raw shape via stub `setItem`, `load()` returns original payload; on-disk blob NOT auto-upgraded.
3. **Migration** — persist v1 blob via v1 store, load via v2 store with `1 → 2` migrator that doubles `n`; loaded payload reflects migration.
4. **Missing migrator** — persist v1 blob, load via v3 store with only `2 → 3` migrator; dev path throws `MissingMigratorError`, prod path returns `defaultValue` AND drops the orphaned blob.
5. **Verified write mismatch** — monkey-patch stub `setItem` to silently drop, observe `toast.warning` invocation count ≥ 1.
6. **Cross-tab subscriber** — dispatch synthetic storage event on the stub window, listener fires with parsed payload; events for other keys are ignored; unsubscribe stops the listener.

### 12+ Storage Consumer Compile Verification

Existing callers across the app touch the storage modules through:

- `loadSavedViews` / `persistSavedViews` — useSavedViews hook + sanitizeSnapshot tests
- `loadColumnState` / `saveColumnState` — useColumnManagement hook
- `loadPartnerLists` / `persistPartnerLists` — usePartnerLists hook + derived-lists.ts (5 hits)
- `loadPartnerConfig` / `persistPartnerConfig` — usePartnerConfig hook
- `loadChartPresets` / `persistChartPresets` — useChartPresets hook

Public API names + signatures unchanged. The `tsc --noEmit` run reports ZERO errors traceable to this plan's modifications across all modules + hooks. The 5 pre-existing errors are in unrelated files (parser-parity.smoke.ts and baseline-capture.spec.ts) per Phase 41-05 / Phase 43-01 documentation.

## Deviations from Plan

**None — plan executed exactly as written.** All 6 smoke cases land per the spec. All 5 storage surfaces wired through `createVersionedStore` at `schemaVersion: 1` with empty migration chains. Cross-tab subscribers wired into all 5 hooks with surface-specific merge logic (sanitize for views, defaults-fallback for columns, derived-filter for partner-lists, direct mirror for partner-config, builtin-merge for chart-presets).

Two narrow implementation notes (NOT deviations from intent — design choices the plan said to make):

1. **`MissingMigratorError` constructor** — initially used TS parameter-properties, which are unsupported under `node --experimental-strip-types` (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Refactored to explicit field assignments. Same external API.

2. **Smoke test `process.env.NODE_ENV` mutation** — `@types/node` types `NODE_ENV` as readonly. Used a one-line `const env = process.env as Record<string, string | undefined>` cast to flip it for the dev-vs-prod assertion in CASE 4. Production code reads NODE_ENV through the standard string-or-undefined contract, so no runtime drift.

## Authentication Gates

None. All five storage surfaces are localStorage-only — no network IO, no auth surface.

## Self-Check: PASSED

Verification gates:
- [x] `src/lib/persistence/versioned-storage.ts` exists
- [x] `src/lib/persistence/migrations.ts` exists
- [x] `src/lib/persistence/versioned-storage.smoke.ts` exists + passes 6 cases
- [x] All 5 per-module migrations files exist (views, columns, partner-lists, partner-config, chart-presets)
- [x] All 5 storage modules updated; zero direct `localStorage.setItem`/`getItem`
- [x] All 5 hooks wired with `subscribeX` cross-tab listener
- [x] Commit `308da47` exists in git history
- [x] `tsc --noEmit` reports zero NEW errors traceable to this plan
- [x] All success criteria met (envelope, migration chain, verified writes, cross-tab listener, public API unchanged)

## Manual Browser Verification (Recommended Follow-up)

The plan's manual verification step asks for cross-tab dev test: open the app in two tabs, create a saved view in tab 1, observe tab 2's saved-view list update within ~500ms. This is a runtime check that requires the dev server — it lives outside the executor's automation surface but is appropriate post-deploy or during the next Phase 43 in-flight session.
