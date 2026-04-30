/**
 * Versioned localStorage layer — Phase 43 BND-03.
 *
 * Wraps `localStorage` with:
 *   - Envelope shape: `{ _meta: { schemaVersion, savedAt }, payload }`
 *   - Migration chain: applied on load when stored `schemaVersion` < current.
 *   - Verified writes: read back + compare → toast on mismatch.
 *   - Cross-tab listener: `window.addEventListener('storage', ...)` filtered
 *     on the consumer's key.
 *
 * CONTEXT lock (BND-03):
 *   - Schema mismatch WITH migrator chain → silent upgrade (no toast).
 *   - Schema mismatch WITHOUT migrator → loud failure, drop the blob.
 *   - Verified-write mismatch → non-blocking sonner toast warning.
 *   - SSR-safe: every method short-circuits on `typeof window === 'undefined'`.
 *
 * Legacy un-enveloped blob handling: the FIRST load after this plan ships will
 * encounter raw `payload` values (no `_meta` wrapper). Those are treated as
 * `schemaVersion: 1` (the current shape — `_meta` is being added by THIS
 * plan; existing user state has no envelope yet). The legacy payload is
 * wrapped IN MEMORY (not persisted back) — the next persist writes the full
 * envelope naturally, so the legacy branch is only hot for one load per
 * surface per user.
 */

import type { ZodType } from 'zod';
import { toast } from 'sonner';
import {
  type MigrationChain,
  MissingMigratorError,
  runMigrations,
} from './migrations.ts';

/** Envelope written to localStorage. Generic over the consumer's payload `T`. */
export interface VersionedBlob<T> {
  _meta: {
    /** Schema version at write time. Bumped when the consumer's shape changes. */
    schemaVersion: number;
    /** ISO timestamp at write time, or `'legacy'` for in-memory legacy wraps. */
    savedAt: string;
  };
  payload: T;
}

/**
 * Configuration for `createVersionedStore`. The Zod schema gates the FINAL
 * (post-migration) payload — migrators are pure transforms that produce
 * progressively-newer shapes; the schema's `safeParse` is the trust boundary
 * that decides whether the migrated payload is usable or whether the blob
 * gets dropped.
 */
export interface VersionedStoreOptions<T> {
  /** localStorage key (e.g. `'bounce-dv-saved-views'`). */
  key: string;
  /** Current schema version. Starts at 1 for new surfaces. */
  schemaVersion: number;
  /** Migration chain (may be empty if `schemaVersion === 1`). */
  migrations: MigrationChain;
  /** Zod schema validating the migrated payload. */
  schema: ZodType<T>;
  /** Returned on any failure path (SSR, missing, corrupt, future-schema). */
  defaultValue: T;
}

/**
 * Public store interface. Mirrors the existing `loadX / persistX` shape that
 * every storage module already exports (`SavedView[]`, `ColumnState`, ...) so
 * downstream consumers can route their `loadSavedViews = store.load`-style
 * delegation in one line.
 *
 * `subscribe` wires the cross-tab `storage` event for the configured key. The
 * listener fires with the parsed-and-validated NEXT value whenever another
 * tab writes the same key. Consumers (hooks) typically wire it inside a
 * `useEffect` to keep in-memory state in sync.
 */
export interface VersionedStore<T> {
  load(): T;
  persist(value: T): void;
  subscribe(listener: (value: T) => void): () => void;
}

/**
 * Type guard: does the parsed JSON look like a versioned envelope? Used to
 * decide whether to treat the blob as legacy (unwrapped) or versioned.
 */
function isVersionedBlob(value: unknown): value is VersionedBlob<unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as { _meta?: unknown; payload?: unknown };
  if (!v._meta || typeof v._meta !== 'object') return false;
  const m = v._meta as { schemaVersion?: unknown };
  if (typeof m.schemaVersion !== 'number') return false;
  if (!('payload' in v)) return false;
  return true;
}

/** True in dev (`process.env.NODE_ENV !== 'production'`). Mirrors the BND-03 spec. */
function isDev(): boolean {
  // Same gate the apples-and-oranges contract uses (Phase 41-02): any non-prod
  // env (test, staging, undefined) fails loud.
  return (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production'
  );
}

/**
 * Internal load pipeline shared by `load()` and the cross-tab subscriber. Takes
 * a raw string (the stored value) and returns the validated payload OR the
 * defaultValue on any failure path.
 *
 * Failure modes (return defaultValue):
 *   - SSR / null raw / JSON parse error
 *   - Future-schema (`stored > current`) — log warning + return default
 *   - MissingMigratorError — dev throws, prod logs + drops + default
 *   - Schema validation fails — dev throws, prod logs + drops + default
 */
function runLoadPipeline<T>(
  raw: string | null,
  opts: VersionedStoreOptions<T>,
): T {
  if (raw == null) return opts.defaultValue;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return opts.defaultValue;
  }

  // Legacy un-enveloped blob: wrap in memory as schemaVersion 1.
  let blob: VersionedBlob<unknown>;
  if (isVersionedBlob(parsed)) {
    blob = parsed;
  } else {
    blob = {
      _meta: { schemaVersion: 1, savedAt: 'legacy' },
      payload: parsed,
    };
  }

  // Future-schema guard: stored shape is NEWER than this build knows about
  // (user downgraded the app, or a deploy window straddles two versions).
  if (blob._meta.schemaVersion > opts.schemaVersion) {
    if (isDev()) {
      console.warn(
        `[versioned-storage:${opts.key}] blob from future schemaVersion ${blob._meta.schemaVersion} > current ${opts.schemaVersion} — ignoring`,
      );
    }
    return opts.defaultValue;
  }

  // Migration chain: run from stored → current. Per CONTEXT lock, this is the
  // SILENT upgrade path (no toast). Only MissingMigratorError surfaces.
  let migrated: unknown;
  try {
    migrated = runMigrations(
      blob.payload,
      blob._meta.schemaVersion,
      opts.schemaVersion,
      opts.migrations,
    );
  } catch (err) {
    if (err instanceof MissingMigratorError) {
      // Loud failure: dev throws (visible in error boundary), prod logs and
      // drops the blob.
      if (isDev()) {
        throw err;
      }
      console.error(
        `[versioned-storage:${opts.key}] missing migrator — dropping blob`,
        err,
      );
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(opts.key);
        }
      } catch {
        // Ignore quota / private-browsing failures on remove — the load still
        // returns defaultValue regardless of whether the drop succeeded.
      }
      return opts.defaultValue;
    }
    // Migrator threw on its own (not MissingMigratorError) — same loud-fail
    // policy: dev re-throws, prod drops.
    if (isDev()) throw err;
    console.error(
      `[versioned-storage:${opts.key}] migrator threw — dropping blob`,
      err,
    );
    return opts.defaultValue;
  }

  // Schema validation gate. If the migrated payload doesn't match, the blob
  // is corrupt or the schema has drifted in a way the migration chain didn't
  // cover. Same loud-fail policy.
  const result = opts.schema.safeParse(migrated);
  if (!result.success) {
    if (isDev()) {
      console.error(
        `[versioned-storage:${opts.key}] schema validation failed`,
        result.error,
      );
    } else {
      console.error(
        `[versioned-storage:${opts.key}] schema validation failed — dropping blob`,
        result.error,
      );
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(opts.key);
        }
      } catch {
        // See note above.
      }
    }
    return opts.defaultValue;
  }

  return result.data;
}

/**
 * Build a versioned store bound to a single localStorage key. Returns the
 * `{ load, persist, subscribe }` triple consumed by the existing
 * `loadX / persistX` exports across the five storage modules.
 */
export function createVersionedStore<T>(
  opts: VersionedStoreOptions<T>,
): VersionedStore<T> {
  function load(): T {
    if (typeof window === 'undefined') return opts.defaultValue;
    let raw: string | null;
    try {
      raw = localStorage.getItem(opts.key);
    } catch {
      // Private-browsing / quota / disabled-storage path.
      return opts.defaultValue;
    }
    return runLoadPipeline(raw, opts);
  }

  function persist(value: T): void {
    if (typeof window === 'undefined') return;
    const blob: VersionedBlob<T> = {
      _meta: {
        schemaVersion: opts.schemaVersion,
        savedAt: new Date().toISOString(),
      },
      payload: value,
    };
    let serialized: string;
    try {
      serialized = JSON.stringify(blob);
    } catch (err) {
      // structuredClone would also fail on these inputs — surface it loudly
      // in dev, swallow in prod.
      if (isDev()) {
        console.error(
          `[versioned-storage:${opts.key}] JSON.stringify failed`,
          err,
        );
      }
      return;
    }
    try {
      localStorage.setItem(opts.key, serialized);
    } catch (err) {
      // Quota / private-browsing / disabled-storage — non-blocking toast,
      // never throw (UI keeps working).
      if (isDev()) {
        console.warn(
          `[versioned-storage:${opts.key}] write failed`,
          err,
        );
      }
      try {
        toast.warning("Couldn't save your changes — local storage may be full");
      } catch {
        // Defensive — sonner not mounted in some contexts (tests, etc.).
      }
      return;
    }

    // Verified write: read back, compare. Catches quota truncation, private-
    // browsing weirdness, and cross-tab races where another writer landed
    // between our setItem and the next paint.
    let readback: string | null;
    try {
      readback = localStorage.getItem(opts.key);
    } catch {
      return;
    }
    if (readback !== serialized) {
      if (isDev()) {
        console.warn(
          `[versioned-storage:${opts.key}] verified-write mismatch — readback differs from write`,
        );
      }
      try {
        toast.warning("Couldn't save your changes — local storage may be full");
      } catch {
        // See note above.
      }
    }
  }

  function subscribe(listener: (value: T) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: StorageEvent) => {
      if (event.key !== opts.key) return;
      // event.newValue is null when the key was removed in another tab.
      const next = runLoadPipeline(event.newValue, opts);
      listener(next);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  return { load, persist, subscribe };
}
