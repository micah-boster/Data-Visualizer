/**
 * localStorage CRUD for saved views — Phase 43 BND-03 wired through
 * `createVersionedStore`.
 *
 * Public API (loadSavedViews / persistSavedViews) UNCHANGED — every existing
 * consumer compiles without edits. The internal implementation now ships an
 * envelope `{ _meta: { schemaVersion, savedAt }, payload }`, runs the
 * (currently-empty) `viewsMigrations` chain on load, verifies writes, and
 * exposes `subscribeSavedViews` for cross-tab sync.
 */

import type { SavedView } from './types';
import { savedViewsArraySchema } from './schema';
import { createVersionedStore } from '../persistence/versioned-storage';
import { VIEWS_SCHEMA_VERSION, viewsMigrations } from './migrations';

export const VIEWS_STORAGE_KEY = 'bounce-dv-saved-views';

const store = createVersionedStore<SavedView[]>({
  key: VIEWS_STORAGE_KEY,
  schemaVersion: VIEWS_SCHEMA_VERSION,
  migrations: viewsMigrations,
  schema: savedViewsArraySchema as unknown as import('zod').ZodType<SavedView[]>,
  defaultValue: [],
});

/**
 * Load saved views from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadSavedViews(): SavedView[] {
  return store.load();
}

/**
 * Persist saved views to localStorage.
 * Silently fails on SSR; surfaces a non-blocking toast on quota / verified-write
 * mismatch.
 */
export function persistSavedViews(views: SavedView[]): void {
  store.persist(views);
}

/**
 * Cross-tab subscription. Fires when another tab writes the same key.
 * Returns an unsubscribe function. SSR-safe (no-op when window is undefined).
 */
export function subscribeSavedViews(
  listener: (views: SavedView[]) => void,
): () => void {
  return store.subscribe(listener);
}
