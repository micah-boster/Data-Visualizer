/**
 * localStorage CRUD for per-pair partner configuration.
 *
 * Reads/writes are wrapped in try-catch to handle SSR, private browsing,
 * and quota errors gracefully. Mirrors the SSR-safe pattern in
 * `src/lib/partner-lists/storage.ts`.
 *
 * Storage key: `bounce-dv-partner-config` — single-key array shape (one load,
 * one persist) following the partner-lists convention. The whole array is
 * rewritten on every change; with at most ~36 pairs (current dataset)
 * blast-radius is trivial.
 */

import type { PartnerConfigArray } from './types';
import { partnerConfigArraySchema } from './schema';

export const PARTNER_CONFIG_STORAGE_KEY = 'bounce-dv-partner-config';

/**
 * Load partner config from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadPartnerConfig(): PartnerConfigArray {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(PARTNER_CONFIG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = partnerConfigArraySchema.safeParse(parsed);
    if (result.success) {
      return result.data as PartnerConfigArray;
    }
    // Surface corrupt entries to the dev console (mirrors partner-lists
    // behavior). Returns empty array so the app degrades gracefully rather
    // than crashing on a bad payload.
    console.warn(
      'loadPartnerConfig: corrupt localStorage payload — falling back to empty array',
      result.error,
    );
    return [];
  } catch (err) {
    console.warn('loadPartnerConfig: read failed', err);
    return [];
  }
}

/**
 * Persist partner config to localStorage.
 * Silently warns on SSR, quota errors, or private browsing so the app stays
 * functional even when persistence is unavailable.
 */
export function persistPartnerConfig(configs: PartnerConfigArray): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PARTNER_CONFIG_STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.warn('persistPartnerConfig: write failed', err);
  }
}
