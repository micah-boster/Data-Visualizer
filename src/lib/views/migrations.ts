/**
 * Saved Views migration chain — Phase 43 BND-03.
 *
 * `VIEWS_SCHEMA_VERSION` is the current persisted shape (v1 — the shape that
 * shipped before this plan). The chain is empty: nothing to migrate yet.
 * Future schema changes append entries:
 *
 *   export const VIEWS_SCHEMA_VERSION = 2; // bump
 *   export const viewsMigrations: MigrationChain = {
 *     1: (input) => { ...transform v1 → v2... },
 *   };
 *
 * NOTE: this migration chain operates on the LOCALSTORAGE BLOB shape, NOT the
 * sanitization that `useSavedViews` performs (drop-unknown-listIds, FLT-01
 * batch filter strip, PCFG-04 partner filter strip, chartState shape migration).
 * Sanitization stays in the hook because it depends on runtime data
 * (knownListIds, knownPairs from current dataset). Migrations here are PURE
 * SCHEMA transforms — no runtime data, no IO.
 */

import type { MigrationChain } from '../persistence/migrations.ts';

export const VIEWS_SCHEMA_VERSION = 1;

export const viewsMigrations: MigrationChain = {};
