/**
 * Column state migration chain — Phase 43 BND-03.
 *
 * Empty chain at schemaVersion 1 — current shape is the seed. Future schema
 * changes (e.g. new VisibilityState semantics, additional pinned-columns
 * field) append migrators here.
 */

import type { MigrationChain } from '../persistence/migrations.ts';

export const COLUMNS_SCHEMA_VERSION = 1;

export const columnsMigrations: MigrationChain = {};
