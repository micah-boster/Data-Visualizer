/**
 * localStorage persistence for column visibility and order.
 *
 * Reads/writes are wrapped in try-catch to handle SSR,
 * private browsing, and quota errors gracefully.
 */

import type { VisibilityState } from '@tanstack/react-table';

export const STORAGE_KEY = 'bounce-dv-columns';

export interface ColumnState {
  visibility: VisibilityState;
  order: string[];
}

/**
 * Load column state from localStorage.
 * Returns null if missing, corrupt, or in SSR.
 */
export function loadColumnState(): ColumnState | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ColumnState;
    // Basic shape validation
    if (
      parsed &&
      typeof parsed.visibility === 'object' &&
      Array.isArray(parsed.order)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save column state to localStorage.
 * Silently fails on SSR, quota errors, or private browsing.
 */
export function saveColumnState(state: ColumnState): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent fail — quota exceeded, private browsing, etc.
  }
}
