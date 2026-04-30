/**
 * Smoke test for versioned-storage — Phase 43 BND-03.
 *
 * Runs under `node --experimental-strip-types` against a hand-rolled
 * localStorage stub. NO @/-aliased imports — the smoke runs before any
 * Next.js / TS-path-alias machinery is available.
 *
 * Six cases (per plan):
 *   1. Round-trip: persist(x) then load() returns x.
 *   2. Legacy un-enveloped blob: pre-write the legacy shape directly via
 *      localStorage.setItem, call load(), get the original payload back
 *      (no in-place upgrade).
 *   3. Migration: persist a v1 blob, set currentSchemaVersion: 2 with a
 *      1 → 2 migrator, load returns the migrated v2 payload.
 *   4. Missing migrator: persist a v1 blob, set currentSchemaVersion: 3 with
 *      only 2 → 3 migrator (no 1 → 2), load throws (dev) and drops the blob.
 *   5. Verified write mismatch: monkey-patch localStorage.setItem to silently
 *      drop, observe the verification fire-warn-toast path (mock the toast).
 *   6. Cross-tab: dispatch a synthetic storage event, subscribed listener
 *      fires.
 *
 * Run: node --experimental-strip-types src/lib/persistence/versioned-storage.smoke.ts
 */

import assert from 'node:assert/strict';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. Hand-rolled `window` + `localStorage` stub. Mirrors the surface the
//    versioned-storage module uses: getItem, setItem, removeItem, key
//    enumeration is not needed. addEventListener / removeEventListener /
//    dispatchEvent on the `window` so the cross-tab test can fire a synthetic
//    StorageEvent.
// ---------------------------------------------------------------------------

interface StorageStub {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  // Test-only escape hatch to corrupt writes for case 5.
  __setSilentDrop(active: boolean): void;
  __reset(): void;
}

function makeLocalStorageStub(): StorageStub {
  const store = new Map<string, string>();
  let silentDrop = false;
  return {
    getItem(k) {
      return store.has(k) ? (store.get(k) as string) : null;
    },
    setItem(k, v) {
      if (silentDrop) return; // pretend the write succeeded but drop the value
      store.set(k, v);
    },
    removeItem(k) {
      store.delete(k);
    },
    __setSilentDrop(active) {
      silentDrop = active;
    },
    __reset() {
      store.clear();
      silentDrop = false;
    },
  };
}

type Listener = (event: { key: string | null; newValue: string | null }) => void;

interface WindowStub {
  addEventListener(t: 'storage', l: Listener): void;
  removeEventListener(t: 'storage', l: Listener): void;
  dispatchEvent(e: { type: 'storage'; key: string | null; newValue: string | null }): void;
}

function makeWindowStub(): WindowStub {
  const listeners = new Set<Listener>();
  return {
    addEventListener(_t, l) {
      listeners.add(l);
    },
    removeEventListener(_t, l) {
      listeners.delete(l);
    },
    dispatchEvent(e) {
      for (const l of listeners) l({ key: e.key, newValue: e.newValue });
    },
  };
}

// Install stubs on the global object BEFORE importing versioned-storage so
// the module's `typeof window === 'undefined'` checks see the stub.
const localStorageStub = makeLocalStorageStub();
const windowStub = makeWindowStub();

(globalThis as unknown as { window: WindowStub }).window = windowStub;
(globalThis as unknown as { localStorage: StorageStub }).localStorage =
  localStorageStub;

// Mock sonner so the verified-write path can be observed without pulling in
// the real toast UI module. node --experimental-strip-types resolves bare
// imports against package.json, so we need a stub registered before
// versioned-storage.ts imports `from 'sonner'`. We use an import-mocking
// trick: pre-register the module in node's loader cache.
//
// Simpler approach: the toast call in versioned-storage is wrapped in
// try/catch — if the import succeeds but the call throws (because we replace
// `toast.warning` with a tracking function via an exported handle), we get
// the same observability without runtime mocking. But 'sonner' is a real dep
// so the import resolves cleanly. We track invocations by patching the
// real module's export at runtime AFTER import.

let toastWarningCount = 0;
const originalToastWarning = (await import('sonner')).toast.warning;
(await import('sonner')).toast.warning = ((msg: string) => {
  toastWarningCount++;
  return originalToastWarning?.(msg) ?? '';
}) as typeof originalToastWarning;

// ---------------------------------------------------------------------------
// 2. Import versioned-storage AFTER stubs + toast patch are in place.
// ---------------------------------------------------------------------------

const { createVersionedStore } = await import('./versioned-storage.ts');
const { MissingMigratorError } = await import('./migrations.ts');

// Prod gate: NODE_ENV is undefined under node --experimental-strip-types,
// which the module treats as dev (loud-fail). For case 4 we want to assert
// the dev throw; for case 5 we want the toast to fire (toast fires in both
// dev and prod). Keep NODE_ENV undefined throughout.

const PayloadSchema = z.array(z.object({ id: z.string(), n: z.number() }));
type Payload = z.infer<typeof PayloadSchema>;

// ---------------------------------------------------------------------------
// CASE 1 — Round-trip: persist(x) then load() returns x.
// ---------------------------------------------------------------------------

localStorageStub.__reset();
const store1 = createVersionedStore<Payload>({
  key: 'test:case1',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
const fixture1: Payload = [
  { id: 'a', n: 1 },
  { id: 'b', n: 2 },
];
store1.persist(fixture1);
const loaded1 = store1.load();
assert.deepEqual(loaded1, fixture1, 'CASE 1: round-trip persists & loads identically');

// Confirm the on-disk shape carries the envelope.
const raw1 = localStorageStub.getItem('test:case1');
assert.ok(raw1, 'CASE 1: raw blob written');
const parsed1 = JSON.parse(raw1 as string);
assert.equal(parsed1._meta.schemaVersion, 1, 'CASE 1: envelope schemaVersion stamped');
assert.ok(parsed1._meta.savedAt, 'CASE 1: envelope savedAt stamped');
assert.deepEqual(parsed1.payload, fixture1, 'CASE 1: payload nested under envelope');

// ---------------------------------------------------------------------------
// CASE 2 — Legacy un-enveloped blob: pre-write the legacy shape directly via
// localStorage.setItem, call load(), get the original payload back.
// ---------------------------------------------------------------------------

localStorageStub.__reset();
const legacyFixture: Payload = [{ id: 'legacy', n: 99 }];
localStorageStub.setItem('test:case2', JSON.stringify(legacyFixture)); // raw shape
const store2 = createVersionedStore<Payload>({
  key: 'test:case2',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
const loaded2 = store2.load();
assert.deepEqual(loaded2, legacyFixture, 'CASE 2: legacy un-enveloped blob loads as schemaVersion 1');
// Verify the legacy blob was NOT auto-rewritten — disk shape unchanged until
// the next persist.
const raw2 = localStorageStub.getItem('test:case2') as string;
const parsed2 = JSON.parse(raw2);
assert.ok(!('_meta' in parsed2), 'CASE 2: legacy blob NOT auto-upgraded on disk');

// ---------------------------------------------------------------------------
// CASE 3 — Migration: persist a v1 blob, set currentSchemaVersion: 2 with a
// 1 → 2 migrator, load returns the migrated v2 payload.
// ---------------------------------------------------------------------------

localStorageStub.__reset();
// Persist a v1 blob via a v1 store.
const v1Store = createVersionedStore<Payload>({
  key: 'test:case3',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
v1Store.persist([{ id: 'old', n: 5 }]);

// Now load via a v2 store with a 1 → 2 migrator that doubles `n`.
const v2Schema = z.array(z.object({ id: z.string(), n: z.number() }));
const v2Store = createVersionedStore<Payload>({
  key: 'test:case3',
  schemaVersion: 2,
  migrations: {
    1: (input: unknown) => {
      const arr = input as Array<{ id: string; n: number }>;
      return arr.map((r) => ({ ...r, n: r.n * 2 }));
    },
  },
  schema: v2Schema,
  defaultValue: [],
});
const loaded3 = v2Store.load();
assert.deepEqual(
  loaded3,
  [{ id: 'old', n: 10 }],
  'CASE 3: 1 → 2 migrator runs and doubles n',
);

// ---------------------------------------------------------------------------
// CASE 4 — Missing migrator: persist a v1 blob, set currentSchemaVersion: 3
// with only 2 → 3 migrator, load throws MissingMigratorError (dev path —
// NODE_ENV is undefined).
// ---------------------------------------------------------------------------

localStorageStub.__reset();
const v1StoreCase4 = createVersionedStore<Payload>({
  key: 'test:case4',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
v1StoreCase4.persist([{ id: 'orphan', n: 1 }]);

const v3Store = createVersionedStore<Payload>({
  key: 'test:case4',
  schemaVersion: 3,
  migrations: {
    // intentionally missing 1 → 2; only 2 → 3 present
    2: (input: unknown) => input,
  },
  schema: PayloadSchema,
  defaultValue: [],
});
let case4Threw = false;
try {
  v3Store.load();
} catch (err) {
  case4Threw = err instanceof MissingMigratorError;
}
assert.ok(case4Threw, 'CASE 4: dev path throws MissingMigratorError on missing 1 → 2');

// Now flip to prod and assert the drop-and-default path. NODE_ENV is typed
// read-only by @types/node; cast to a mutable shape just for the smoke. This
// is a one-line escape hatch — the production code reads `process.env.NODE_ENV`
// via the standard string-or-undefined contract, so there's no runtime drift.
const env = process.env as Record<string, string | undefined>;
const prevNodeEnv = env.NODE_ENV;
env.NODE_ENV = 'production';
const v3StoreProd = createVersionedStore<Payload>({
  key: 'test:case4',
  schemaVersion: 3,
  migrations: { 2: (input: unknown) => input },
  schema: PayloadSchema,
  defaultValue: [],
});
const loaded4Prod = v3StoreProd.load();
assert.deepEqual(loaded4Prod, [], 'CASE 4: prod path returns defaultValue on missing migrator');
assert.equal(
  localStorageStub.getItem('test:case4'),
  null,
  'CASE 4: prod path drops the orphaned blob',
);
env.NODE_ENV = prevNodeEnv;

// ---------------------------------------------------------------------------
// CASE 5 — Verified write mismatch: monkey-patch setItem to silently drop the
// write, observe the toast fire.
// ---------------------------------------------------------------------------

localStorageStub.__reset();
toastWarningCount = 0;
const store5 = createVersionedStore<Payload>({
  key: 'test:case5',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
localStorageStub.__setSilentDrop(true);
store5.persist([{ id: 'lost', n: 1 }]);
localStorageStub.__setSilentDrop(false);
assert.ok(
  toastWarningCount >= 1,
  'CASE 5: silent-drop write triggers verified-write toast',
);

// ---------------------------------------------------------------------------
// CASE 6 — Cross-tab: dispatch a synthetic storage event, subscribed listener
// fires with the parsed-and-validated next value.
// ---------------------------------------------------------------------------

localStorageStub.__reset();
const store6 = createVersionedStore<Payload>({
  key: 'test:case6',
  schemaVersion: 1,
  migrations: {},
  schema: PayloadSchema,
  defaultValue: [],
});
let received: Payload | undefined;
const unsubscribe = store6.subscribe((next) => {
  received = next;
});
const newPayload: Payload = [{ id: 'cross-tab', n: 42 }];
const newBlob = {
  _meta: { schemaVersion: 1, savedAt: new Date().toISOString() },
  payload: newPayload,
};
windowStub.dispatchEvent({
  type: 'storage',
  key: 'test:case6',
  newValue: JSON.stringify(newBlob),
});
assert.deepEqual(
  received,
  newPayload,
  'CASE 6: cross-tab storage event delivers parsed payload to subscriber',
);

// Filter on key — events with a different key should be ignored.
let receivedOther: Payload | undefined;
windowStub.dispatchEvent({
  type: 'storage',
  key: 'test:other',
  newValue: JSON.stringify(newBlob),
});
// `received` should still be the prior value; receivedOther never fired.
assert.deepEqual(
  received,
  newPayload,
  'CASE 6: events for other keys are ignored',
);
assert.equal(receivedOther, undefined, 'CASE 6: subscriber only fires on matching key');

unsubscribe();
// After unsubscribe, dispatch should NOT fire the listener again.
const stalePayload: Payload = [{ id: 'stale', n: 0 }];
const staleBlob = {
  _meta: { schemaVersion: 1, savedAt: new Date().toISOString() },
  payload: stalePayload,
};
windowStub.dispatchEvent({
  type: 'storage',
  key: 'test:case6',
  newValue: JSON.stringify(staleBlob),
});
assert.deepEqual(
  received,
  newPayload,
  'CASE 6: unsubscribe stops the listener (received unchanged)',
);

// ---------------------------------------------------------------------------
// Done.
// ---------------------------------------------------------------------------

console.log('versioned-storage.smoke: ALL 6 CASES PASS');
