# Phase 35: Chart Schema & Migration - Research

**Researched:** 2026-04-18
**Domain:** TypeScript discriminated unions + zod schema evolution + lazy-on-read localStorage migration
**Confidence:** HIGH (every finding is grounded in a direct file read of this repo)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema shape**
- `ChartDefinition` is a **discriminated union by `type`** field
- First variant: `{ type: 'collection-curve', ...presetFields }` — preset fields (`metric`, `hiddenBatches`, `showAverage`, `showAllBatches`) carry over **unchanged** from current `ChartViewState`
- Migration is a rename/rewrap only — no data-semantics changes inside the preset
- Base fields shared across variants: **`type` only**. No shared `id`/`name`/`createdAt` at this phase (Phase 36 can add entity metadata when chart save/load lands)
- `ViewSnapshot.chartState` **replaced in-place** with `ChartDefinition` — single source of truth, no parallel slot

**Migration trigger & versioning**
- Migration runs **lazy on read** — each `SavedView` migrates when loaded from localStorage, no boot-time sweep
- Version tracking: **add a version field going forward** on `ChartDefinition` (e.g. `version: 2`); absence of the field signals a legacy record
- Scope of versioning: **on `ChartDefinition` / `chartState`**, not at the `ViewSnapshot` level
- Persistence: **in-memory migration + write-back on next save** — no eager write-back, self-heals as users interact with views
- Migration function is **idempotent** — safe to re-run; passing an already-v2 record returns it unchanged

**Failure handling**
- When migration fails (unparseable JSON, missing required fields, unknown type), the SavedView **falls back to a default CollectionCurve preset** — view still loads, chart is recoverable
- Surface: **silent + `console.warn`** — no user-facing toast; migration is infrastructure
- No raw-payload preservation — **legacy shape discarded** on failure (keeps scope tight, avoids localStorage bloat)
- Tolerance: **only unparseable / missing required fields count as failure**; missing optional fields use defaults. Required = `metric`; optional = `hiddenBatches`, `showAverage`, `showAllBatches`

**Old type lifecycle**
- `ChartViewState` interface **deleted immediately** in this phase — legacy shape lives as an inline/private type inside the migration function, not exported
- **Forward-only** migration — no downgrade/serialize-back path. Rolling back the code means old builds read new data and hit the failure-fallback path
- Type module location: **keep in `src/lib/views/types.ts`** (colocated with `ViewSnapshot` / `SavedView`) — don't split into `src/lib/charts/types.ts` yet. Revisit in Phase 36 if it grows

**Testing**
- **One smoke test with a legacy `ChartViewState` fixture** that round-trips through the migration function — locks the contract Phase 36 will depend on
- Failure-path fixtures (missing `metric`, unknown `type`) should also be covered if the test scaffolding makes it cheap

### Claude's Discretion
- Exact naming (`ChartDefinition` vs `ChartConfig` vs `ChartSpec`)
- Internal helper names / file organization within `src/lib/views/`
- Whether `version` is a number (`2`) or string (`'v2'`)
- Where precisely the migration function is invoked from (SavedView loader) as long as it's the single read-path

### Deferred Ideas (OUT OF SCOPE)
- Partner-list filter fields on `ChartDefinition` — Phase 36 / when the builder exposes series filtering
- Chart entity metadata (`id`, `name`, `createdAt`, `updatedAt`) — Phase 36 preset save/load
- `src/lib/charts/types.ts` module split — revisit after Phase 36 if the chart surface grows
- Downgrade / bi-directional migration — not needed given release discipline
- User-facing migration notifications — unnecessary for an infrastructure change
- Snapshot-level versioning — only versioning `chartState` for now
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHRT-01 | All existing saved views (3 defaults + any user-created) load without errors after the schema change | `src/lib/views/defaults.ts` lines 77-82 and 169-174 hardcode the legacy `ChartViewState` shape and must be rewritten to the new v2 shape in the same commit as the type change. The user-created views go through the single read path in `src/lib/views/storage.ts:loadSavedViews` (line 18) → `useSavedViews` effect (`src/hooks/use-saved-views.ts:88`), which is the lazy-on-read hook point for migration. |
| CHRT-02 | Old `ChartViewState` objects in localStorage are automatically migrated to `ChartDefinition` on first load | The migration belongs inside `sanitizeSnapshot` (`src/hooks/use-saved-views.ts:31`), next to the existing Phase 34 `listId` sanitizer — same call site, same "filter out unknown shape" pattern. The Zod schema in `src/lib/views/schema.ts:27-32` currently validates only the legacy shape and must be updated to accept both (via `z.union` / `z.discriminatedUnion`) OR pre-migrated before `safeParse` — see Section "Architecture Patterns" below. |
</phase_requirements>

## Summary

Phase 35 is a narrow, type-layer migration. The legacy `ChartViewState` interface at [src/lib/views/types.ts:17](src/lib/views/types.ts:17) has exactly **three production consumers** (`data-display.tsx`, `use-curve-chart-state.ts`, `collection-curve-chart.tsx`) plus **two default-view fixtures** in `src/lib/views/defaults.ts`. A single zod schema at [src/lib/views/schema.ts:27](src/lib/views/schema.ts:27) guards the localStorage read path, and the read path itself is centralized: `loadSavedViews()` → `sanitizeSnapshot()` inside `useSavedViews`. There is one place to insert the migration, one place to update the schema, and two places to refresh fixture defaults.

The codebase already has all the ingredients — zod 4.3.6 with `discriminatedUnion` support, an established additive-optional schema-evolution pattern (NAV-04 `drill`, LIST-05 `listId`), and a precedent for lazy-on-read sanitization (`sanitizeSnapshot` strips unknown column keys and unknown listIds). Phase 35 extends that exact pattern to the `chartState` field.

There is **no test framework installed** (no vitest/jest config, no `*.test.*` or `*.spec.*` anywhere in `src/`). The CONTEXT.md locks in "one smoke test with a legacy fixture" — the planner must decide whether to install vitest (~2 dev deps, minimal config) or write an in-module assertion harness. See Validation Architecture section.

**Primary recommendation:** Define `ChartDefinition` as a zod-derived discriminated union (`z.discriminatedUnion('type', [...])`) where each variant declares `version` as a literal, export the inferred TypeScript type, add a `migrateChartState` pure function invoked inside `sanitizeSnapshot`, and update `defaults.ts` so the three seeded views ship pre-migrated. Name the type `ChartDefinition` (not `ChartConfig` — `ChartConfig` is already exported by shadcn's `src/components/ui/chart.tsx:15`).

## Standard Stack

### Core (already installed — no new deps needed for the type/migration work)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Runtime schema validation of localStorage-loaded saved views | Already the project's validation layer — every other persisted entity (saved views, partner lists, cached data responses) uses zod `safeParse` |
| TypeScript | ^5 | Discriminated union over literal `type` field | Narrowing via `chartState.type === 'collection-curve'` is idiomatic TS; no runtime cost |

### Supporting (test framework — NOT currently installed; planner decision)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | latest | Unit test harness for `migrateChartState` smoke test | If the planner decides to install a test runner. Matches Next 16 + ESM + Vite ecosystem; no jest bloat. Recommended because this same harness will get reused by Phase 36/37. |
| (alternative) node-inline assertion | n/a | Self-executing module with `assert` calls | If the planner wants zero new deps for a one-off smoke test. Tradeoff: no CI script hook, harder to grow. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `z.discriminatedUnion('type', [...])` | `z.object({ type: z.literal('collection-curve'), ... })` (single variant, plain object schema) | Phase 35 only has one variant. A plain object schema is simpler today but requires a refactor in Phase 36 when `line`/`bar`/`scatter` variants land. Using `discriminatedUnion` now is future-proof at ~4 extra lines; the discriminator is checked automatically and error messages point to the right variant. **Recommend: `discriminatedUnion`.** |
| `z.union([legacySchema, newSchema]).transform(...)` (auto-migrate inside zod) | Pre-migrate raw value, then `safeParse` only the new schema | The zod-transform approach is elegant but couples migration to schema parsing and makes the migration harder to unit-test in isolation. CONTEXT decision locks the migration as an **idempotent pure function** — that rules out a transform that only fires on the legacy branch. **Recommend: keep migrate as a pure function, call it before `safeParse`.** |
| Name the new type `ChartConfig` | `ChartDefinition` or `ChartSpec` | `ChartConfig` is already exported by shadcn's `src/components/ui/chart.tsx:15` and used by `collection-curve-chart.tsx` + `trajectory-chart.tsx`. Collision would force rename-on-import. **Recommend: `ChartDefinition`.** It matches ARCHITECTURE.md and the v4.0-ROADMAP.md wording, and aligns with what Phase 36 will consume. |
| `version: 'v2'` (string) | `version: 2` (number) | Both work. Number is one byte smaller in localStorage and cheaper to compare. String is self-documenting. ARCHITECTURE.md doesn't prescribe. **Recommend (Claude's discretion): `version: 2` (number).** |

**Installation:**
```bash
# If planner opts into test harness:
pnpm add -D vitest @vitest/ui
# No new runtime deps are required for the type/migration work itself.
```

## Architecture Patterns

### Recommended File Layout (within existing `src/lib/views/`)
```
src/lib/views/
├── types.ts         # ChartDefinition union + ViewSnapshot.chartState: ChartDefinition (replaces ChartViewState)
├── schema.ts        # chartDefinitionSchema (z.discriminatedUnion) + updated viewSnapshotSchema
├── migrate-chart.ts # NEW: migrateChartState() pure function + private LegacyChartState type
├── storage.ts       # UNCHANGED — single read path already exists (loadSavedViews)
├── defaults.ts      # UPDATED — the 2 hardcoded chartState literals rewritten to v2 shape
```

Keeping migration in its own file (`migrate-chart.ts`) makes the smoke test target obvious and avoids bloating `types.ts` with runtime code. The CONTEXT.md grants file-organization discretion.

### Pattern 1: Additive-Optional Zod Evolution (established precedent)
**What:** When a persisted shape gains or changes a field, add `.optional()` and/or `.nullable()` so legacy records `safeParse` successfully, then sanitize on load.
**When to use:** Every time `ViewSnapshot` evolves (Phase 32-02 did this for `drill`, Phase 34-04 did this for `listId`).
**Example:**
```typescript
// src/lib/views/schema.ts — current Phase 34 pattern (line 42)
listId: z.string().nullable().optional(),
```
**Phase 35 application:** Replace the current inline chartState object schema (lines 27-32) with `chartDefinitionSchema.optional()` where `chartDefinitionSchema` is the union. BUT — a legacy `{ metric, hiddenBatches, showAverage, showAllBatches }` record will NOT pass the new union. This is where the migration hooks in **before** `safeParse`: either pre-walk `parsed` JSON and migrate `chartState` on each view, or widen the schema to accept both (less preferred — see Alternatives table).

### Pattern 2: Discriminated Union by Literal Discriminator
**What:** Variants differ by a literal `type` (or other) field; TS narrows automatically with `===` checks; zod validates the right variant based on the discriminator value.
**When to use:** Anywhere you have a closed set of variants that share a distinguishing key.
**Example (zod 4 API — verified via `node_modules/zod/v4/classic/schemas.d.ts:493`):**
```typescript
// src/lib/views/schema.ts (new)
export const chartDefinitionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('collection-curve'),
    version: z.literal(2),
    metric: z.enum(['recoveryRate', 'amount']),
    hiddenBatches: z.array(z.string()),
    showAverage: z.boolean(),
    showAllBatches: z.boolean(),
  }),
  // Phase 36 adds line/bar/scatter here
]);

// src/lib/views/types.ts
export type ChartDefinition = z.infer<typeof chartDefinitionSchema>;
```
Consumers narrow:
```typescript
if (snapshot.chartState?.type === 'collection-curve') {
  // chartState is typed as the collection-curve variant here
}
```
No pre-existing discriminated-union precedent in this repo (verified via grep of `z.discriminatedUnion` and `z.literal` — zero matches). Phase 35 establishes it. This aligns with TypeScript's canonical advice and the zod 4 documented API.

### Pattern 3: Lazy-on-Read Sanitization (established precedent)
**What:** A pure function re-shapes snapshots inside `sanitizeSnapshot` after `loadSavedViews` returns. Legacy or invalid shapes are normalized in-memory; write-back happens the next time the user saves.
**When to use:** Any evolution of the `ViewSnapshot` shape.
**Example (current code, `src/hooks/use-saved-views.ts:31-61`):**
```typescript
function sanitizeSnapshot(
  snapshot: ViewSnapshot,
  knownListIds: Set<string>,
): ViewSnapshot {
  return {
    ...snapshot,
    sorting: (snapshot.sorting ?? []).filter((s) => KNOWN_COLUMNS.has(s.id)),
    // ... column filters, column order, column sizing stripped of unknown keys ...
    listId:
      snapshot.listId && knownListIds.has(snapshot.listId)
        ? snapshot.listId
        : undefined,
  };
}
```
**Phase 35 application:** Add `chartState: migrateChartState(snapshot.chartState)` to the returned object. The migration function accepts `unknown` (because pre-schema-update values may be the legacy shape), detects legacy vs v2 vs invalid, and returns a valid `ChartDefinition | undefined`.

### Anti-Patterns to Avoid
- **Do NOT migrate during render or inside consumer components.** The read path is centralized (`loadSavedViews` → `sanitizeSnapshot`). Migrating anywhere else creates multiple truths and duplicate warns.
- **Do NOT preserve the raw legacy payload.** CONTEXT decision #6 locks this: "legacy shape discarded on failure".
- **Do NOT export the `LegacyChartState` type.** CONTEXT decision: "legacy shape lives as an inline/private type inside the migration function, not exported."
- **Do NOT widen the zod schema with a permissive `.passthrough()` or `z.any()` to let legacy through.** That defeats the validation contract the next-save write-back depends on.
- **Do NOT version at the ViewSnapshot level.** CONTEXT decision locks versioning scope to `ChartDefinition` / `chartState` only.
- **Do NOT forget to update `defaults.ts`.** The 3 seeded views ship with a hardcoded legacy `chartState` shape. If types change but defaults don't, TypeScript fails the build and the "3 defaults load cleanly" success criterion fails at the source.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime shape validation of the migrated value | Manual `typeof` checks across every field | `chartDefinitionSchema.safeParse` | zod is already the project's validation layer; reusing keeps error semantics consistent with the rest of the read path |
| Discriminated-union narrowing | Hand-written type guards (`function isCollectionCurve(x): x is ...`) | TypeScript's built-in narrowing via `chartState.type === 'collection-curve'` | Free at compile time, zero runtime cost, automatic exhaustiveness when a variant is added |
| Legacy shape detection | Ad-hoc `if ('metric' in x && !('type' in x))` at multiple sites | Single `migrateChartState` function that switches on `'type' in input` + shape checks | One detection site = one source of bugs |
| Deep-clone of a snapshot for in-memory migration | `JSON.parse(JSON.stringify(snapshot))` | Spread-based shallow clone — `sanitizeSnapshot` already does this pattern (line 35-60) | All fields are primitives/plain arrays/plain objects; deep clone is unnecessary cost |

**Key insight:** Every piece of machinery this phase needs already has a precedent in the repo or is one zod primitive. The phase risk is **not technical** — it's making sure every consumer's narrow (`chartState.type === 'collection-curve'`) is added at the right place in the same commit as the type delete.

## Common Pitfalls

### Pitfall 1: Schema vs Migration ordering
**What goes wrong:** You update `viewSnapshotSchema` to validate `ChartDefinition` first, but `loadSavedViews` runs `safeParse` BEFORE `sanitizeSnapshot`. Legacy records fail `safeParse` → `loadSavedViews` returns `[]` → `getDefaultViews()` silently overwrites every user view.
**Why it happens:** `src/lib/views/storage.ts:18` returns empty array on parse failure (line 28: `if (result.success) return ...; return [];`). The whole array is discarded, not per-view.
**How to avoid:** One of:
- (a) Pre-migrate the parsed JSON (before `safeParse`) — walk the array, rewrite each `snapshot.chartState` through `migrateChartState`, then parse.
- (b) Make the zod schema accept both shapes via `z.union([legacyChartStateSchema, chartDefinitionSchema]).transform(migrate)` — but this contradicts CONTEXT's "idempotent pure function" decision because zod transforms only fire in one direction.
- (c) Relax the chartState schema field to `z.unknown().optional()` at parse time and let `sanitizeSnapshot` do the narrowing + migration + validation.
**Recommended:** Option (c) or (a). Option (c) keeps parse permissive and centralizes the chart-state logic in one place.
**Warning signs:** After implementing, load a seeded user's view with an explicit legacy chartState fixture — if `loadSavedViews` returns empty, you hit this pitfall.

### Pitfall 2: Defaults-file drift
**What goes wrong:** You update `types.ts` and `schema.ts`, but forget `defaults.ts`. TypeScript's structural typing catches it via build failure — but only if `defaults.ts` is built as part of `tsc` / `next build`. If not, the 3 seeded views load and crash at the first consumer narrow.
**Why it happens:** The two literal chartState blocks at `defaults.ts:77-82` and `defaults.ts:169-174` match `ChartViewState` exactly. After the type rename, they'll be structurally incompatible with `ChartDefinition`.
**How to avoid:** Update `defaults.ts` in the same task/commit as `types.ts`. The success criterion "all 3 defaults load cleanly" is directly tied to this file.
**Warning signs:** `pnpm build` fails with a type error at defaults.ts:77 or :169.

### Pitfall 3: Missing consumer narrow
**What goes wrong:** `use-curve-chart-state.ts:171` (getChartSnapshot returns `ChartViewState`) and `use-curve-chart-state.ts:190` (restoreChartState accepts `ChartViewState`) currently declare `ChartViewState` as return/param type. Delete that type without retyping to `Extract<ChartDefinition, { type: 'collection-curve' }>` (or the variant type) and TypeScript errors.
**Why it happens:** The hook produces/consumes ONLY the collection-curve variant — it doesn't know about line/bar/scatter. The narrowed variant type is what it needs.
**How to avoid:** Export a type alias for the collection-curve variant (e.g. `export type CollectionCurveDefinition = Extract<ChartDefinition, { type: 'collection-curve' }>`), use it in the hook's snapshot/restore signatures, and narrow at the boundary (data-display.tsx's `chartLoadRef`) with `if (snapshot.chartState?.type === 'collection-curve') chartLoadRef.current(snapshot.chartState)`.
**Warning signs:** TS errors at `data-display.tsx:484-485`, `data-display.tsx:385-386`, `collection-curve-chart.tsx:33-35`, and both `use-curve-chart-state.ts` sites.

### Pitfall 4: Silent migration = silent data corruption
**What goes wrong:** CONTEXT locks "silent + console.warn" for failure handling. If the migration silently swallows malformed legacy records AND never warns, you lose visibility into real-world shape drift.
**Why it happens:** It's tempting to use a bare `try/catch` with no log.
**How to avoid:** On any failure branch (parse-fail, missing `metric`, unknown `type`), emit ONE `console.warn` with a stable prefix like `[chartState migration]` and the view id — enough to diagnose without spamming.
**Warning signs:** Post-ship, a saved view renders with defaults but the browser console has no evidence — no way to tell if migration intervened.

### Pitfall 5: Idempotency regression
**What goes wrong:** `migrateChartState` is called twice (once on load, once when data-display.tsx restores via `chartLoadRef`) and the second call corrupts the already-v2 value.
**Why it happens:** The function double-wraps or re-runs legacy-detection assuming legacy shape every time.
**How to avoid:** First branch in the function: `if (input && typeof input === 'object' && 'type' in input && 'version' in input) { /* already v2 — re-validate, return */ }`. CONTEXT explicitly locks this: "idempotent — safe to re-run".
**Warning signs:** Round-trip test (save view → load → save → load) mutates the chartState across hops.

### Pitfall 6: Zod 4 API drift
**What goes wrong:** Assuming zod 3 API surface (`z.discriminatedUnion(discriminator, [variants], { errorMap })`) when repo is on 4.3.6. The 4.x signature is `discriminatedUnion<Types, Disc>(discriminator, options, params?)` per `node_modules/zod/v4/classic/schemas.d.ts:493`.
**Why it happens:** Training data is dominated by zod 3 examples.
**How to avoid:** Reference the installed `node_modules/zod/v4/classic/schemas.d.ts` or the v4 zod docs directly. Syntax for the common case is unchanged in practice — just don't rely on zod 3 error-map ergonomics.
**Warning signs:** TypeScript errors about unexpected argument types when constructing the union, or runtime `z.ZodError` shapes that differ from zod 3 expectations.

## Code Examples

### Example 1: Discriminated-union schema + type inference
```typescript
// src/lib/views/schema.ts (proposed)
import { z } from 'zod';

const collectionCurveVariantSchema = z.object({
  type: z.literal('collection-curve'),
  version: z.literal(2),
  metric: z.enum(['recoveryRate', 'amount']),
  hiddenBatches: z.array(z.string()),
  showAverage: z.boolean(),
  showAllBatches: z.boolean(),
});

export const chartDefinitionSchema = z.discriminatedUnion('type', [
  collectionCurveVariantSchema,
  // Phase 36: add line/bar/scatter variants here
]);
```

```typescript
// src/lib/views/types.ts (proposed)
import type { z } from 'zod';
import type { chartDefinitionSchema } from './schema';

export type ChartDefinition = z.infer<typeof chartDefinitionSchema>;
export type CollectionCurveDefinition = Extract<ChartDefinition, { type: 'collection-curve' }>;
```

Source: zod 4 docs — discriminated unions (`node_modules/zod/v4/classic/schemas.d.ts:493`); TypeScript handbook on discriminated unions.

### Example 2: Migration function skeleton
```typescript
// src/lib/views/migrate-chart.ts (new file, proposed)
import type { ChartDefinition, CollectionCurveDefinition } from './types';
import { chartDefinitionSchema } from './schema';

/** Legacy shape — kept PRIVATE (not exported). */
type LegacyChartState = {
  metric: 'recoveryRate' | 'amount';
  hiddenBatches?: string[];
  showAverage?: boolean;
  showAllBatches?: boolean;
};

const DEFAULT_COLLECTION_CURVE: CollectionCurveDefinition = {
  type: 'collection-curve',
  version: 2,
  metric: 'recoveryRate',
  hiddenBatches: [],
  showAverage: true,
  showAllBatches: false,
};

/**
 * Lazy-on-read migration. Idempotent — already-v2 records pass through unchanged.
 * Falls back to DEFAULT_COLLECTION_CURVE on any unrecoverable failure.
 * Returns undefined when input is undefined (view had no chart state to begin with).
 */
export function migrateChartState(input: unknown): ChartDefinition | undefined {
  if (input === undefined || input === null) return undefined;

  // Already v2 — revalidate and pass through (idempotent path).
  if (
    typeof input === 'object' &&
    'type' in input &&
    'version' in input
  ) {
    const parsed = chartDefinitionSchema.safeParse(input);
    if (parsed.success) return parsed.data;
    console.warn('[chartState migration] v2 record failed revalidation, falling back', input);
    return DEFAULT_COLLECTION_CURVE;
  }

  // Legacy detection: object with `metric` but no `type`.
  if (typeof input === 'object' && 'metric' in input) {
    const legacy = input as LegacyChartState;
    const candidate: CollectionCurveDefinition = {
      type: 'collection-curve',
      version: 2,
      metric: legacy.metric,
      hiddenBatches: legacy.hiddenBatches ?? [],
      showAverage: legacy.showAverage ?? true,
      showAllBatches: legacy.showAllBatches ?? false,
    };
    const parsed = chartDefinitionSchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    console.warn('[chartState migration] legacy record missing required fields, falling back', input);
    return DEFAULT_COLLECTION_CURVE;
  }

  console.warn('[chartState migration] unrecognized shape, falling back', input);
  return DEFAULT_COLLECTION_CURVE;
}
```

Source: adapts this repo's existing `sanitizeSnapshot` pattern at `src/hooks/use-saved-views.ts:31-61`.

### Example 3: Sanitizer integration (the "one place" to hook)
```typescript
// src/hooks/use-saved-views.ts (proposed diff around line 31-61)
import { migrateChartState } from '@/lib/views/migrate-chart';

function sanitizeSnapshot(
  snapshot: ViewSnapshot,
  knownListIds: Set<string>,
): ViewSnapshot {
  return {
    ...snapshot,
    // ... existing column/filter/list sanitization ...
    chartState: migrateChartState(snapshot.chartState),
    listId:
      snapshot.listId && knownListIds.has(snapshot.listId)
        ? snapshot.listId
        : undefined,
  };
}
```

Source: `src/hooks/use-saved-views.ts:31-61` (current pattern).

### Example 4: Permissive chartState at parse time (Pitfall 1 mitigation)
```typescript
// src/lib/views/schema.ts — viewSnapshotSchema chartState field
// BEFORE (current, line 27-32):
//   chartState: z.object({ metric, hiddenBatches, showAverage, showAllBatches }).optional()
// AFTER:
chartState: z.unknown().optional(),  // migration happens in sanitizeSnapshot; schema is permissive here
```

This keeps `safeParse` at `storage.ts:24` from rejecting an entire array because one view has legacy chartState. The dedicated `chartDefinitionSchema` is used INSIDE `migrateChartState`.

Source: read-path architecture — `src/lib/views/storage.ts:18-32`, `src/hooks/use-saved-views.ts:88-96`.

### Example 5: Consumer narrow at the boundary
```typescript
// src/components/data-display.tsx (proposed diff around line 385)
// BEFORE:
//   if (snapshot.chartState && chartLoadRef.current) {
//     chartLoadRef.current(snapshot.chartState);
//   }
// AFTER:
if (snapshot.chartState?.type === 'collection-curve' && chartLoadRef.current) {
  chartLoadRef.current(snapshot.chartState);
}
```
The type `chartState` narrows inside the `if` to the `collection-curve` variant automatically. `chartLoadRef` becomes `React.MutableRefObject<((state: CollectionCurveDefinition) => void) | null>` (exported variant type from `types.ts`).

Source: TypeScript discriminated-union narrowing.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat `ChartViewState` interface coupled to one chart shape | Discriminated union `ChartDefinition` with `type` + `version` discriminators | Phase 35 (this phase) | Unlocks Phase 36's line/bar/scatter variants without a second migration |
| Zod 3 `z.discriminatedUnion(disc, options, errorMap)` | Zod 4 `z.discriminatedUnion(disc, options, params?)` | Zod 4 release (repo is on 4.3.6) | API surface unchanged for the common case; error-map ergonomics differ |

**Deprecated/outdated:**
- None. The codebase has no prior chart-variant system to deprecate — CollectionCurveChart is the only chart surface.

## Open Questions

1. **Where to call `migrateChartState` relative to zod parse?**
   - What we know: `loadSavedViews` returns `[]` if ANY view fails parse (Pitfall 1). `sanitizeSnapshot` runs after parse succeeds, so migration belongs there.
   - What's unclear: Whether to (a) pre-migrate the raw array before `safeParse`, or (b) relax the chartState field to `z.unknown()` and migrate in `sanitizeSnapshot`.
   - Recommendation: Option (b) — it keeps storage.ts untouched, keeps the "one read path, one migration point" invariant, and matches the existing Phase 34 sanitization pattern 1:1. Flag for planner.

2. **Should `version` be a number or a string?**
   - What we know: CONTEXT flags this as Claude's discretion.
   - What's unclear: No ecosystem pressure either way.
   - Recommendation: `version: 2` (number). One byte smaller in the persisted JSON, trivial numeric comparison. If future versions need semver-style strings ("v2.1"), promote then.

3. **Should the 3 defaults get `version: 2` explicitly, or default via migration?**
   - What we know: Defaults never hit `sanitizeSnapshot` unless `loadSavedViews()` returns empty (first load, cleared storage).
   - What's unclear: Actually — they DO hit `sanitizeSnapshot` (`use-saved-views.ts:94`: `setViews(sanitizeViews(loaded, ids))`, where `loaded = getDefaultViews()` when storage is empty). So migration WOULD normalize them.
   - Recommendation: Still author defaults in v2 shape directly. Defense in depth; catches TS errors at build time if the type changes again.

4. **Test harness: install vitest or write inline assertions?**
   - What we know: No test framework currently installed (confirmed: no jest/vitest/playwright config files, no `*.test.*` or `*.spec.*` in src/).
   - What's unclear: CONTEXT.md locks "one smoke test" but explicitly doesn't prescribe the harness. Project has history of deferring test-infra (Phase 25 CONTEXT: "don't absorb test-infra setup").
   - Recommendation: Planner decides. Low-cost option: vitest (2 dev deps, ~5-line config, future-proof). No-new-deps option: a dedicated `migrate-chart.smoke.ts` module that runs `node --experimental-strip-types` with inline `assert.deepStrictEqual` calls, invoked via an npm script.

## Validation Architecture

> `.planning/config.json` does NOT contain a `workflow.nyquist_validation` key. The `workflow` block is `{ research, plan_check, verifier, auto_advance }`. Including this section anyway because the CONTEXT.md **explicitly requires** "one smoke test with a legacy `ChartViewState` fixture" — the planner must land validation infra either way.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed. Planner to pick: vitest (recommended) or inline Node assert harness. |
| Config file | None — see Wave 0 |
| Quick run command | TBD by Wave 0. For vitest: `pnpm vitest run src/lib/views/migrate-chart.test.ts` |
| Full suite command | TBD. For vitest: `pnpm vitest run` (will match 1 file after this phase) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHRT-01 | Build compiles after type rename | unit (typecheck) | `pnpm build` | Existing build script |
| CHRT-01 | 3 default views load without errors through `getDefaultViews` → `sanitizeViews` | unit | `pnpm vitest run migrate-chart` asserting `migrateChartState(defaultChartState).type === 'collection-curve'` | Wave 0 creates |
| CHRT-01 | 3 default views' `chartState` pass `chartDefinitionSchema.safeParse` | unit | Same harness, assert `.success === true` for each default | Wave 0 creates |
| CHRT-02 | Legacy `ChartViewState` fixture migrates to v2 shape | unit | `pnpm vitest run migrate-chart` with a hand-written `{ metric: 'amount', hiddenBatches: [], showAverage: true, showAllBatches: false }` fixture | Wave 0 creates |
| CHRT-02 | Idempotency — re-running migration on a v2 output returns the same value | unit | Same harness, `migrateChartState(migrateChartState(legacy))` deep-equals first call | Wave 0 creates |
| CHRT-02 | Failure path — missing `metric` → DEFAULT fallback | unit | Same harness, assert fallback equals DEFAULT_COLLECTION_CURVE | Wave 0 creates (cheap per CONTEXT) |
| CHRT-02 | Failure path — unknown `type` → DEFAULT fallback | unit | Same harness | Wave 0 creates |
| CHRT-02 | (manual) Browser localStorage with hand-written legacy shape loads without crash | manual-only | Open devtools, seed legacy `{ metric:'amount', ... }` into `bounce-dv-saved-views`, reload, confirm view loads | Manual verification |

### Sampling Rate
- **Per task commit:** `pnpm tsc --noEmit` (fast, catches type drift at every task); `pnpm vitest run migrate-chart` if the vitest path is chosen (< 1s for a single file)
- **Per wave merge:** `pnpm build` + full vitest run
- **Phase gate:** Both of the above + manual localStorage verification before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Test framework decision + install (vitest + `vitest.config.ts` if selected). Optional per CONTEXT; recommended.
- [ ] `src/lib/views/migrate-chart.test.ts` — covers CHRT-02 main + failure fixtures + idempotency
- [ ] If no test framework: `scripts/smoke-migrate-chart.mjs` as node-executable fallback + npm script entry
- [ ] No conftest/shared-fixture needs beyond the test file itself (fixtures are plain literals)

## Sources

### Primary (HIGH confidence — direct file reads)
- `src/lib/views/types.ts` (complete file) — current `ChartViewState` and `ViewSnapshot` definitions
- `src/lib/views/schema.ts` (complete file) — current zod `viewSnapshotSchema.chartState` shape and Phase 34 `listId` precedent
- `src/lib/views/storage.ts` (complete file) — the single localStorage read path
- `src/lib/views/defaults.ts` (complete file) — two hardcoded `chartState` literals at lines 77-82 and 169-174
- `src/hooks/use-saved-views.ts` (complete file) — `sanitizeSnapshot` pattern at lines 31-61, hydration effect at line 88
- `src/components/charts/use-curve-chart-state.ts` (complete file) — `getChartSnapshot` returns `ChartViewState` (line 171), `restoreChartState` accepts `ChartViewState` (line 190)
- `src/components/charts/collection-curve-chart.tsx` (complete file) — `chartSnapshotRef` and `chartLoadRef` typed as `ChartViewState` at lines 33-35
- `src/components/data-display.tsx` lines 40, 370-485 — load path (line 385), save paths (lines 433, 460), ref declarations (lines 484-485), Phase 32/34 additive-evolution precedents
- `src/lib/partner-lists/schema.ts` — `.strict()` + `z.enum` precedent
- `src/components/ui/chart.tsx:15` — existing `ChartConfig` export (name collision evidence)
- `node_modules/zod/v4/classic/schemas.d.ts:493` — zod 4 `discriminatedUnion` signature
- `package.json` — no test framework installed; zod 4.3.6 confirmed
- `.planning/phases/35-chart-schema-migration/35-CONTEXT.md` — phase boundary, decisions, discretion, deferred ideas
- `.planning/milestones/v4.0-ROADMAP.md:236-252` — phase goal, effort, success criteria
- `.planning/REQUIREMENTS.md:22` — CHRT-01, CHRT-02 mapping to Phase 35
- `.planning/research/ARCHITECTURE.md:120-250` — long-range ChartDefinition vision (Phase 36); notes that collection-curve preset stays intact during migration (important scope clarifier)
- `.planning/STATE.md` — project-wide precedents for additive-optional schema evolution (Phase 32-02, Phase 34-04)
- `CLAUDE.md`/`AGENTS.md` — type-token rules (not directly relevant; Phase 35 has no UI), project's Next.js-has-breaking-changes warning

### Secondary (MEDIUM confidence)
- Zod 4 documentation pattern for `z.discriminatedUnion` — verified against installed type declarations (above), cross-checked with the library README in `node_modules/zod/README.md`

### Tertiary (LOW confidence)
- None. Every claim in this research is anchored in a direct read of a file that exists in the repo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zod and TypeScript are confirmed installed; no new runtime deps required
- Architecture: HIGH — every pattern has a direct precedent in the same codebase (`sanitizeSnapshot`, additive-optional zod, lazy-on-read)
- Pitfalls: HIGH — Pitfalls 1, 2, 3 are grounded in the exact lines of existing code that will change; Pitfall 4 is locked by CONTEXT; Pitfalls 5-6 are zod/TypeScript generalities verified against installed versions
- Test infrastructure: MEDIUM — no framework installed is factual; the vitest-vs-inline choice is a real open question the planner resolves

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — the relevant surface is all internal to this repo and stable; zod/TypeScript are not fast-moving here)
