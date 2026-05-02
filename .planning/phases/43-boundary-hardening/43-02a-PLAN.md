---
phase: 43-boundary-hardening
plan: 02a
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/persistence/versioned-storage.ts
  - src/lib/persistence/migrations.ts
  - src/lib/persistence/versioned-storage.smoke.ts
  - src/lib/views/storage.ts
  - src/lib/views/migrations.ts
  - src/lib/columns/persistence.ts
  - src/lib/columns/migrations.ts
  - src/lib/partner-lists/storage.ts
  - src/lib/partner-lists/migrations.ts
  - src/lib/partner-config/storage.ts
  - src/lib/partner-config/migrations.ts
  - src/lib/chart-presets/storage.ts
  - src/lib/chart-presets/migrations.ts
autonomous: true
requirements:
  - BND-03

must_haves:
  truths:
    - "Every localStorage blob ships inside an envelope: { _meta: { schemaVersion, savedAt }, payload }"
    - "On load, a migration chain runs from the stored schemaVersion up to current; missing migrator throws a loud error in dev / sends to console.error in prod and drops the unrecognized blob (per BND-03 spec)"
    - "Schema version mismatches that DO have a migrator chain run silently — user does not see a notification (CONTEXT lock: silent migration)"
    - "Writes are verified: read back the blob and compare; on mismatch surface a non-blocking toast (storage quota / private browsing / cross-tab race)"
    - "Cross-tab storage event listener wires in for views / columns / lists / partner-config / chart-presets; in-memory state syncs when another tab writes"
    - "All five persistent surfaces (views, columns, partner-lists, partner-config, chart-presets) delegate to createVersionedStore — no direct localStorage.setItem/getItem in those modules"
  artifacts:
    - path: "src/lib/persistence/versioned-storage.ts"
      provides: "createVersionedStore<T> helper — wraps localStorage with envelope + migration chain + verified write + cross-tab listener"
      exports: ["createVersionedStore", "VersionedBlob", "MigrationChain"]
    - path: "src/lib/persistence/migrations.ts"
      provides: "shared migration runner + missing-migrator-throws contract"
      exports: ["runMigrations", "MissingMigratorError"]
    - path: "src/lib/views/migrations.ts"
      provides: "Saved Views migration chain (current persisted shape → schemaVersion 1)"
      exports: ["VIEWS_SCHEMA_VERSION", "viewsMigrations"]
    - path: "src/lib/columns/migrations.ts"
      provides: "Column state migration chain"
      exports: ["COLUMNS_SCHEMA_VERSION", "columnsMigrations"]
    - path: "src/lib/partner-lists/migrations.ts"
      provides: "Partner Lists migration chain"
      exports: ["LISTS_SCHEMA_VERSION", "listsMigrations"]
    - path: "src/lib/partner-config/migrations.ts"
      provides: "Partner Config migration chain"
      exports: ["CONFIG_SCHEMA_VERSION", "configMigrations"]
    - path: "src/lib/chart-presets/migrations.ts"
      provides: "Chart Presets migration chain"
      exports: ["CHART_PRESETS_SCHEMA_VERSION", "chartPresetsMigrations"]
  key_links:
    - from: "src/lib/views/storage.ts"
      to: "src/lib/persistence/versioned-storage.ts"
      via: "createVersionedStore<SavedView[]>({ key, schemaVersion, migrations: viewsMigrations })"
      pattern: "createVersionedStore"
    - from: "src/lib/columns/persistence.ts"
      to: "src/lib/persistence/versioned-storage.ts"
      via: "createVersionedStore<ColumnState>({ key, schemaVersion, migrations: columnsMigrations })"
      pattern: "createVersionedStore"
    - from: "src/lib/partner-lists/storage.ts"
      to: "src/lib/persistence/versioned-storage.ts"
      via: "createVersionedStore<PartnerList[]>"
      pattern: "createVersionedStore"
    - from: "src/lib/partner-config/storage.ts"
      to: "src/lib/persistence/versioned-storage.ts"
      via: "createVersionedStore<PartnerConfigArray>"
      pattern: "createVersionedStore"
    - from: "src/lib/chart-presets/storage.ts"
      to: "src/lib/persistence/versioned-storage.ts"
      via: "createVersionedStore<ChartPreset[]>"
      pattern: "createVersionedStore"
---

<objective>
Establish a versioned localStorage layer with explicit migration chains so user-saved state (views, columns, lists, partner-config, chart presets) survives schema evolution losslessly.

Purpose: BND-03 closes the silent-data-loss risk on every localStorage blob today. Each currently lives behind a Zod `safeParse` that returns `[]` on malformed input — schema drift = silent data loss. Versioned envelope + migration chain + missing-migrator-throws turns drift into either silent invisible upgrade (when migrator exists) or loud failure (when it doesn't), per CONTEXT lock.

Output: A `createVersionedStore<T>` helper consumed by all five existing storage modules; per-module migration chains (each starts at schemaVersion 1 = current shape, future versions added as schema evolves).
</objective>

<execution_context>
@/Users/micah/.claude/get-shit-done/workflows/execute-plan.md
@/Users/micah/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/43-boundary-hardening/43-CONTEXT.md
@.planning/milestones/v4.5-REQUIREMENTS.md

@src/lib/views/storage.ts
@src/lib/columns/persistence.ts
@src/lib/partner-lists/storage.ts
@src/lib/partner-config/storage.ts
@src/lib/chart-presets/storage.ts

<interfaces>
<!-- Existing storage modules — pattern is uniform. Each has loadX / persistX with Zod safeParse → returns [] on failure. -->

From src/lib/views/storage.ts:
```typescript
export const VIEWS_STORAGE_KEY = 'bounce-dv-saved-views';
export function loadSavedViews(): SavedView[];
export function persistSavedViews(views: SavedView[]): void;
```

From src/lib/columns/persistence.ts:
```typescript
export const STORAGE_KEY = 'bounce-dv-columns';
export interface ColumnState { visibility: VisibilityState; order: string[] }
export function loadColumnState(): ColumnState | null;
export function persistColumnState(state: ColumnState): void;
```

From src/lib/partner-lists/storage.ts:
```typescript
export const PARTNER_LISTS_STORAGE_KEY = 'bounce-dv-partner-lists';
export function loadPartnerLists(): PartnerList[];
export function persistPartnerLists(lists: PartnerList[]): void;
```

From src/lib/partner-config/storage.ts:
```typescript
export const PARTNER_CONFIG_STORAGE_KEY = 'bounce-dv-partner-config';
export function loadPartnerConfig(): PartnerConfigArray;
export function persistPartnerConfig(config: PartnerConfigArray): void;
```

From src/lib/chart-presets/storage.ts: existing direct-localStorage module for saved chart presets. Public exports follow the same loadX / persistX pattern; envelope and migrations to be wrapped here, NOT a runtime conditional.

CONTEXT.md decisions reproduced for fidelity:
- Schema version mismatch with migrator: migrate silently (no toast).
- Missing migrator: fail loud, drop the blob, log to error tracking in prod.
- Verified writes: read-back-and-compare, surface non-blocking toast on mismatch.
- Cross-tab storage event listener: wire in.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build versioned-storage core + per-module migration chains (5 surfaces)</name>
  <files>src/lib/persistence/versioned-storage.ts, src/lib/persistence/migrations.ts, src/lib/persistence/versioned-storage.smoke.ts, src/lib/views/storage.ts, src/lib/views/migrations.ts, src/lib/columns/persistence.ts, src/lib/columns/migrations.ts, src/lib/partner-lists/storage.ts, src/lib/partner-lists/migrations.ts, src/lib/partner-config/storage.ts, src/lib/partner-config/migrations.ts, src/lib/chart-presets/storage.ts, src/lib/chart-presets/migrations.ts</files>
  <action>
**Step A — Build `src/lib/persistence/versioned-storage.ts` and `src/lib/persistence/migrations.ts`:**

`migrations.ts`:
- `export class MissingMigratorError extends Error` — thrown when a stored `schemaVersion` has no path forward.
- `export type Migration<T> = (input: unknown) => T` — pure transform, throws on invalid input.
- `export type MigrationChain<T> = Record<number, Migration<unknown>>` — keyed by `fromVersion`, value is the migrator that produces `fromVersion + 1`. Final entry's output is parsed against the consumer's Zod schema.
- `export function runMigrations<T>(payload: unknown, fromVersion: number, currentVersion: number, chain: MigrationChain<T>): T` — runs versions sequentially `fromVersion → currentVersion`. Throws `MissingMigratorError` if any step is missing. Returns the migrated payload (caller validates against final schema).

`versioned-storage.ts`:
- `export interface VersionedBlob<T> { _meta: { schemaVersion: number; savedAt: string }; payload: T }` — envelope shape.
- `export interface VersionedStoreOptions<T>` — `{ key: string; schemaVersion: number; migrations: MigrationChain<T>; schema: ZodSchema<T>; defaultValue: T }`.
- `export interface VersionedStore<T> { load(): T; persist(value: T): void; subscribe(listener: (value: T) => void): () => void }` — load returns defaultValue on any failure (storage absent / quota / private browsing), persist verifies write via read-back, subscribe wires `window.addEventListener('storage', ...)` and fires on cross-tab change.
- `export function createVersionedStore<T>(opts: VersionedStoreOptions<T>): VersionedStore<T>`:
  - `load()`:
    1. SSR-safe (`typeof window === 'undefined'` → return `defaultValue`).
    2. Read raw, JSON.parse inside try/catch; on parse failure return `defaultValue`.
    3. If parsed shape is the legacy un-enveloped shape (no `_meta`), treat as `schemaVersion: 1` (the current shape — "_meta" is being added by THIS plan; existing user state has no envelope yet). Wrap as `{ _meta: { schemaVersion: 1, savedAt: 'legacy' }, payload: parsed }` IN MEMORY (do not persist back yet — let the next persist write the envelope naturally).
    4. If `_meta.schemaVersion < currentSchemaVersion`, run `runMigrations(payload, fromVersion, currentVersion, chain)`. On `MissingMigratorError`: in dev throw (visible in error boundary), in prod `console.error(...)` + drop the blob via `localStorage.removeItem(key)` + return `defaultValue`. Per CONTEXT lock — loud failure, not silent drop.
    5. If `_meta.schemaVersion > currentSchemaVersion`, log a warning ("blob from a future schema — ignoring; user may have downgraded the app") + return `defaultValue`. Defensive against version-skew across deploy windows.
    6. Validate migrated payload against `opts.schema.safeParse`. On failure: dev throw, prod console.error + drop + defaultValue.
    7. Return validated payload.
  - `persist(value)`:
    1. SSR-safe.
    2. Build `VersionedBlob`, JSON.stringify, `localStorage.setItem(key, raw)` inside try/catch.
    3. Verify: read back, parse, compare `_meta.schemaVersion === currentSchemaVersion` AND `JSON.stringify(parsed.payload) === JSON.stringify(value)`. On mismatch (quota truncation, private-browsing weirdness, cross-tab race), log + fire a non-blocking sonner toast warning ("Couldn't save your changes — local storage may be full"). Do NOT throw — UI keeps working.
  - `subscribe(listener)`:
    1. SSR-safe (return no-op cleanup if `typeof window === 'undefined'`).
    2. Wire `window.addEventListener('storage', handler)` where handler filters on `event.key === opts.key`. Run the load pipeline against `event.newValue` and fire `listener` with the result.
    3. Return cleanup function.

`versioned-storage.smoke.ts`:
Smoke test (not @-aliased). Covers:
1. Round-trip: `persist(x)` then `load()` returns `x`.
2. Legacy un-enveloped blob: pre-write the legacy shape directly via `localStorage.setItem`, call `load()`, get the original payload back (no in-place upgrade).
3. Migration: persist a v1 blob, set `currentSchemaVersion: 2` with a `1 → 2` migrator, load returns the migrated v2 payload.
4. Missing migrator: persist a v1 blob, set `currentSchemaVersion: 3` with only `2 → 3` migrator (no `1 → 2`), load throws (dev) or returns defaultValue (prod) + drops the blob.
5. Verified write mismatch: monkey-patch `localStorage.setItem` to silently drop, observe the verification fire-warn-toast path (mock the toast).
6. Cross-tab: dispatch a synthetic `storage` event, subscribed listener fires.

Note: jsdom is NOT installed; this smoke runs under `node --experimental-strip-types` against a hand-rolled localStorage stub (an in-memory `Map<string, string>` with `addEventListener`/`dispatchEvent` shims). Plan 41-05 precedent — keep the smoke node-runnable, no @-aliased imports.

**Step B — Wire each existing storage module to `createVersionedStore` (FIVE surfaces):**

For each module, add a `migrations.ts` sibling (versions = empty record initially since current shape = schemaVersion 1; future schema changes append migrators) AND rewrite the `loadX` / `persistX` exports to delegate to a module-private store instance. KEEP the export names identical so downstream consumers (12+ call sites across the app) compile unchanged — this is a swap-internals public-API-first migration (the 39-01 / 32-01 precedent).

Per module:
- `src/lib/views/migrations.ts` — `export const VIEWS_SCHEMA_VERSION = 1` + `export const viewsMigrations: MigrationChain<SavedView[]> = {}`.
- `src/lib/views/storage.ts` — replace the body with a `createVersionedStore<SavedView[]>({ key: VIEWS_STORAGE_KEY, schemaVersion: VIEWS_SCHEMA_VERSION, migrations: viewsMigrations, schema: savedViewsArraySchema, defaultValue: [] })` instance; `loadSavedViews = store.load`, `persistSavedViews = store.persist`. Add `export const subscribeSavedViews = store.subscribe` for cross-tab consumers.
- Same shape for `columns/`, `partner-lists/`, `partner-config/`, **and `chart-presets/`** (the chart-presets surface IS distinct — it's a separate localStorage key and consumer; wrap it explicitly, not via runtime conditional).

For `partner-config` specifically: the existing storage already has a `console.warn` corrupt-payload branch — preserve the dev-visibility intent; the new versioned store inherits via the schema validation step.

For `chart-presets` specifically: read `src/lib/chart-presets/storage.ts` + `src/lib/chart-presets/schema.ts` to identify the existing storage key + schema. Replace the direct `localStorage.setItem`/`getItem` calls with a `createVersionedStore<ChartPreset[]>` instance. Re-use the existing Zod schema as the `schema` option. Empty `chartPresetsMigrations` map at schemaVersion 1.

**Cross-tab listener wiring:** Each module's existing `Provider` / `usePartnerListsContext` / `useSavedViews` / `usePartnerConfig` / chart-presets-consumer hook should subscribe via `useEffect(() => subscribeX((next) => setStateX(next)), [])`. Wire one consumer per storage module — the executor finds the existing consumer hook (grep `loadSavedViews` / `loadChartPresets` etc for the entry points) and adds the subscription. Keep the diff minimal.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -c "error TS" && node --experimental-strip-types src/lib/persistence/versioned-storage.smoke.ts</automated>
  </verify>
  <done>
    `createVersionedStore` exported with the documented shape. Smoke covers all 6 cases. All FIVE existing storage modules (views / columns / lists / partner-config / chart-presets) delegate to the versioned store with `schemaVersion: 1` + empty migration chain. Public API (loadX / persistX) unchanged — existing call sites compile. Cross-tab subscribe wired in at one consumer per module. Missing-migrator throws in dev / drops in prod (per CONTEXT lock).
    `grep -rn "createVersionedStore" src/lib/{views,columns,partner-lists,partner-config,chart-presets}/` — 5 hits, one per module.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — zero new errors.
2. `node --experimental-strip-types src/lib/persistence/versioned-storage.smoke.ts` — passes 6 cases.
3. Manual dev test: open the app in two browser tabs side by side; create a saved view in tab 1; tab 2's saved view list updates within ~500ms (cross-tab subscribe). Persist regression: refresh tab 1 — view survives.
4. `grep -rn "_meta.*schemaVersion" src/lib/persistence/` — exists. `grep -rn "createVersionedStore" src/lib/{views,columns,partner-lists,partner-config,chart-presets}/` — 5 hits, one per module.
5. `grep -rn "localStorage\.\(setItem\|getItem\)" src/lib/{views,columns,partner-lists,partner-config,chart-presets}/` — zero direct hits in those modules (all routed through versioned-storage).
</verification>

<success_criteria>
1. Versioned envelope `{ _meta: { schemaVersion, savedAt }, payload }` lives on every persist; loads via migration chain; missing migrator throws in dev / drops loudly in prod.
2. Verified writes detect quota / corrupt persists; surface non-blocking toast.
3. Cross-tab `storage` listener wired for views / columns / lists / partner-config / chart-presets.
4. All five existing storage public APIs (loadSavedViews / persistSavedViews / loadChartPresets / etc) unchanged — existing consumers compile without edits.
</success_criteria>

<output>
After completion, create `.planning/phases/43-boundary-hardening/43-02a-SUMMARY.md` documenting:
- Final shape of `createVersionedStore` API + the 5 module wirings (with their starting `schemaVersion` values).
- Cross-tab listener implementation pattern (storage event + key filter + parse-validate-emit).
- Verification of the 12+ storage consumers compiling unchanged.
- Chart-presets wrapping notes (any schema differences or corner cases vs the other four surfaces).
</output>
</content>
</invoke>