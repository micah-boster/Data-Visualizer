/**
 * localStorage CRUD for saved views.
 *
 * Reads/writes are wrapped in try-catch to handle SSR,
 * private browsing, and quota errors gracefully.
 * Follows the same SSR-safe pattern as columns/persistence.ts.
 */

import type { SavedView } from './types';
import { savedViewsArraySchema } from './schema';

export const VIEWS_STORAGE_KEY = 'bounce-dv-saved-views';

/**
 * Load saved views from localStorage.
 * Returns empty array if missing, corrupt, or in SSR.
 */
export function loadSavedViews(): SavedView[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = savedViewsArraySchema.safeParse(parsed);
    if (result.success) {
      return result.data as SavedView[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Persist saved views to localStorage.
 * Silently fails on SSR, quota errors, or private browsing.
 */
export function persistSavedViews(views: SavedView[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Silent fail — quota exceeded, private browsing, etc.
  }
}
