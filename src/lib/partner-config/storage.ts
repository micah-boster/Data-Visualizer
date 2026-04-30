/**
 * localStorage CRUD for per-pair partner configuration — Phase 43 BND-03
 * wired through `createVersionedStore`.
 *
 * Public API (loadPartnerConfig / persistPartnerConfig) UNCHANGED — every
 * existing consumer compiles without edits.
 *
 * Storage key: `bounce-dv-partner-config` — single-key array shape (one load,
 * one persist) following the partner-lists convention. The whole array is
 * rewritten on every change; with at most ~36 pairs (current dataset)
 * blast-radius is trivial.
 *
 * The pre-existing `console.warn` corrupt-payload branch is now subsumed by
 * versioned-storage's loud-fail policy — schema validation failures surface
 * via `console.error` on the same channel and DROP the blob in prod (per
 * BND-03 CONTEXT lock).
 */

import type { PartnerConfigArray } from './types';
import { partnerConfigArraySchema } from './schema';
import { createVersionedStore } from '../persistence/versioned-storage';
import { CONFIG_SCHEMA_VERSION, configMigrations } from './migrations';

export const PARTNER_CONFIG_STORAGE_KEY = 'bounce-dv-partner-config';

const store = createVersionedStore<PartnerConfigArray>({
  key: PARTNER_CONFIG_STORAGE_KEY,
  schemaVersion: CONFIG_SCHEMA_VERSION,
  migrations: configMigrations,
  schema: partnerConfigArraySchema as unknown as import('zod').ZodType<PartnerConfigArray>,
  defaultValue: [],
});

/**
 * Load partner config from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadPartnerConfig(): PartnerConfigArray {
  return store.load();
}

/**
 * Persist partner config to localStorage.
 * Silently fails on SSR; surfaces a non-blocking toast on quota / verified-
 * write mismatch.
 */
export function persistPartnerConfig(configs: PartnerConfigArray): void {
  store.persist(configs);
}

/**
 * Cross-tab subscription. Fires when another tab writes the same key.
 * Returns an unsubscribe function. SSR-safe (no-op when window is undefined).
 */
export function subscribePartnerConfig(
  listener: (configs: PartnerConfigArray) => void,
): () => void {
  return store.subscribe(listener);
}
