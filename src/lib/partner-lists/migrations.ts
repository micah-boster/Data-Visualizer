/**
 * Partner Lists migration chain — Phase 43 BND-03.
 *
 * Empty chain at schemaVersion 1. The Phase 39 additive-segment evolution
 * (PRODUCT_TYPE + SEGMENT optional fields, derived 'derived' source) was
 * absorbed into the schema with `.optional()` fields, so legacy payloads
 * parse cleanly without a migrator. Future BREAKING shape changes append
 * migrators here.
 */

import type { MigrationChain } from '../persistence/migrations.ts';

export const LISTS_SCHEMA_VERSION = 1;

export const listsMigrations: MigrationChain = {};
