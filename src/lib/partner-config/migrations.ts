/**
 * Partner Config migration chain — Phase 43 BND-03.
 *
 * Empty chain at schemaVersion 1. Future schema changes append migrators
 * here.
 */

import type { MigrationChain } from '../persistence/migrations.ts';

export const CONFIG_SCHEMA_VERSION = 1;

export const configMigrations: MigrationChain = {};
