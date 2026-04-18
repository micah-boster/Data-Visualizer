/**
 * localStorage CRUD for partner lists.
 *
 * Reads/writes are wrapped in try-catch to handle SSR,
 * private browsing, and quota errors gracefully.
 * Mirrors the SSR-safe pattern in src/lib/views/storage.ts.
 */

import type { PartnerList } from './types';
import { partnerListsArraySchema } from './schema';

export const PARTNER_LISTS_STORAGE_KEY = 'bounce-dv-partner-lists';

/**
 * Load partner lists from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadPartnerLists(): PartnerList[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(PARTNER_LISTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = partnerListsArraySchema.safeParse(parsed);
    if (result.success) {
      return result.data as PartnerList[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Persist partner lists to localStorage.
 * Silently fails on SSR, quota errors, or private browsing.
 */
export function persistPartnerLists(lists: PartnerList[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PARTNER_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // Silent fail — quota exceeded, private browsing, etc.
  }
}
