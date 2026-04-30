/**
 * localStorage CRUD for partner lists — Phase 43 BND-03 wired through
 * `createVersionedStore`.
 *
 * Public API (loadPartnerLists / persistPartnerLists) UNCHANGED — every
 * existing consumer compiles without edits.
 */

import type { PartnerList } from './types';
import { partnerListsArraySchema } from './schema';
import { createVersionedStore } from '../persistence/versioned-storage';
import { LISTS_SCHEMA_VERSION, listsMigrations } from './migrations';

export const PARTNER_LISTS_STORAGE_KEY = 'bounce-dv-partner-lists';

const store = createVersionedStore<PartnerList[]>({
  key: PARTNER_LISTS_STORAGE_KEY,
  schemaVersion: LISTS_SCHEMA_VERSION,
  migrations: listsMigrations,
  schema: partnerListsArraySchema as unknown as import('zod').ZodType<PartnerList[]>,
  defaultValue: [],
});

/**
 * Load partner lists from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadPartnerLists(): PartnerList[] {
  return store.load();
}

/**
 * Persist partner lists to localStorage.
 * Silently fails on SSR; surfaces a non-blocking toast on quota / verified-
 * write mismatch.
 */
export function persistPartnerLists(lists: PartnerList[]): void {
  store.persist(lists);
}

/**
 * Cross-tab subscription. Fires when another tab writes the same key.
 * Returns an unsubscribe function. SSR-safe (no-op when window is undefined).
 */
export function subscribePartnerLists(
  listener: (lists: PartnerList[]) => void,
): () => void {
  return store.subscribe(listener);
}
