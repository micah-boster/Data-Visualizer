/**
 * Type definitions for chart presets.
 *
 * A ChartPreset is a reusable, named snapshot of a `ChartDefinition`
 * (Phase 35 discriminated union) that a user can apply to the chart
 * canvas with one click. Presets are addressable as a separate entity
 * from the chart definition itself — presets wrap a definition with
 * identity + metadata so the Presets menu can render + manage them.
 *
 * Built-in presets are code-defined (see ./defaults.ts) and carry the
 * literal `builtin:` id prefix. User presets are persisted to
 * localStorage with `crypto.randomUUID()` ids; built-ins are NEVER
 * persisted (the hook rebuilds them from code on every hydration).
 *
 * `locked: true` disables rename + delete in the UI (built-ins only).
 */

import type { ChartDefinition } from '@/lib/views/types';

/**
 * A named, persisted chart configuration. Built-ins use the literal
 * `builtin:` id prefix; user presets use `crypto.randomUUID()`.
 */
export interface ChartPreset {
  /**
   * Unique identifier. Built-ins: literal `builtin:<slug>` (e.g.
   * `builtin:collection-curves`) to prevent collision with user-generated
   * uuids. User presets: `crypto.randomUUID()`.
   */
  id: string;
  /** User-visible name, required, trimmed before storage. */
  name: string;
  /**
   * `true` for built-ins — disables rename/delete in the UI. User presets
   * are always `false`.
   */
  locked: boolean;
  /** Creation timestamp (Date.now()). Built-ins use 0. */
  createdAt: number;
  /** The chart definition applied when this preset is selected. */
  definition: ChartDefinition;
}
