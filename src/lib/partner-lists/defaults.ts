/**
 * Default partner lists seeded on first load.
 *
 * v1 ships with zero seed lists — new users start with an empty
 * sidebar section and create their own lists from the dialog.
 * Kept as a function (rather than a constant) so future versions
 * can seed example lists without a call-site migration.
 */

import type { PartnerList } from './types';

/** Returns the default partner lists for a brand-new user. */
export function getDefaultPartnerLists(): PartnerList[] {
  return [];
}
