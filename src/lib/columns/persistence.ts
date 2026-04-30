/**
 * localStorage persistence for column visibility and order — Phase 43 BND-03
 * wired through `createVersionedStore`.
 *
 * Public API (loadColumnState / saveColumnState) UNCHANGED — every existing
 * consumer compiles without edits. The internal implementation now ships an
 * envelope, runs the (currently-empty) `columnsMigrations` chain on load,
 * verifies writes, and exposes `subscribeColumnState` for cross-tab sync.
 */

import { z } from 'zod';
import type { VisibilityState } from '@tanstack/react-table';
import { createVersionedStore } from '../persistence/versioned-storage';
import { COLUMNS_SCHEMA_VERSION, columnsMigrations } from './migrations';

export const STORAGE_KEY = 'bounce-dv-columns';

export interface ColumnState {
  visibility: VisibilityState;
  order: string[];
}

/**
 * Inline schema for ColumnState. VisibilityState is `Record<string, boolean>`
 * (TanStack contract) — match that exactly. order is a string array.
 *
 * Intentionally NOT `.strict()` — TanStack may add additive fields in the
 * future (e.g. column pinning state); the schema accepts the extra keys
 * gracefully.
 */
const columnStateSchema = z.object({
  visibility: z.record(z.string(), z.boolean()),
  order: z.array(z.string()),
}) as unknown as z.ZodType<ColumnState>;

const store = createVersionedStore<ColumnState | null>({
  key: STORAGE_KEY,
  schemaVersion: COLUMNS_SCHEMA_VERSION,
  migrations: columnsMigrations,
  schema: columnStateSchema.nullable(),
  defaultValue: null,
});

/**
 * Load column state from localStorage.
 * Returns null if missing, corrupt, or in SSR.
 */
export function loadColumnState(): ColumnState | null {
  return store.load();
}

/**
 * Save column state to localStorage.
 * Silently fails on SSR; surfaces a non-blocking toast on quota / verified-
 * write mismatch.
 */
export function saveColumnState(state: ColumnState): void {
  store.persist(state);
}

/**
 * Cross-tab subscription. Fires when another tab writes the same key.
 * Returns an unsubscribe function. SSR-safe (no-op when window is undefined).
 */
export function subscribeColumnState(
  listener: (state: ColumnState | null) => void,
): () => void {
  return store.subscribe(listener);
}
