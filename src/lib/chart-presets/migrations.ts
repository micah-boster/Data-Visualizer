/**
 * Chart Presets migration chain — Phase 43 BND-03.
 *
 * Empty chain at schemaVersion 1. Note that chart-preset evolution is
 * primarily driven by the underlying `ChartDefinition` discriminated union
 * (Phase 35) — that union carries its OWN per-variant `version` field, so
 * variant-internal additive evolution doesn't bump the preset envelope's
 * schemaVersion. This chain only fires when the PRESET WRAPPER shape itself
 * changes (e.g. a new top-level field that legacy payloads can't satisfy).
 *
 * `useChartPresets` continues to filter built-ins (locked: true) before
 * persist — the built-ins are rebuilt from code on every hydration.
 */

import type { MigrationChain } from '../persistence/migrations.ts';

export const CHART_PRESETS_SCHEMA_VERSION = 1;

export const chartPresetsMigrations: MigrationChain = {};
