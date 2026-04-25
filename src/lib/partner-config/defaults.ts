/**
 * Default partner-config payload.
 *
 * Returns an empty array — segments are user-authored, never seeded. Kept as
 * a separate export (instead of inlining `[]` at the call site) so future
 * defaults (e.g. system-derived segments) have an obvious extension point.
 */

import type { PartnerConfigArray } from './types';

export function getDefaultPartnerConfig(): PartnerConfigArray {
  return [];
}
