'use client';

import { Info } from 'lucide-react';

/**
 * Phase 37 Plan 02 — Step 1 of the two-step import wizard.
 *
 * Presents a monospace textarea for the user to paste Metabase SQL plus an
 * inline info note explaining how Metabase template variables are handled
 * during parsing (Pitfall 1: `{{var}}` → NULL, `[[ ... ]]` dropped). The
 * Parse button itself lives in the parent Sheet footer; this leaf only
 * emits the raw value via `onSqlChange`.
 *
 * Type-token discipline:
 *   - `text-label` for the textarea label (categorical tier)
 *   - `text-body` inside the textarea (input-body tier; `font-mono` carve-out
 *     matches Phase 27-02 numeric-cell precedent — monospace family is a
 *     distinct concern from the 6 type tokens)
 *   - `text-caption` for the info helper
 *   - `focus-glow` utility for the Phase 31-02 focus ring
 */
export interface PasteStepProps {
  /** Current SQL contents (controlled). */
  sql: string;
  /** Called on every keystroke with the updated value. */
  onSqlChange: (v: string) => void;
  /**
   * Called when the user explicitly triggers parse. This leaf does NOT
   * render the Parse button (parent Sheet owns the footer action area);
   * kept on the prop surface for potential keyboard-shortcut adoption.
   */
  onParse: () => void;
}

export function PasteStep({ sql, onSqlChange }: PasteStepProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6 overflow-hidden">
      <label className="flex flex-col gap-2">
        <span className="text-label">Metabase SQL</span>
        <textarea
          value={sql}
          onChange={(e) => onSqlChange(e.target.value)}
          rows={16}
          placeholder="SELECT partner_name, batch, total_accounts FROM agg_batch_performance_summary WHERE ..."
          className="w-full flex-1 min-h-[240px] resize-y rounded-md border border-input bg-surface-inset px-3 py-2 font-mono text-body tabular-nums focus-glow"
          aria-label="Metabase SQL to import"
          spellCheck={false}
          autoCorrect="off"
        />
      </label>
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-caption text-muted-foreground">
          Metabase template variables (<code className="font-mono">{'{{var}}'}</code>) are
          replaced with <code className="font-mono">NULL</code> for parsing, and optional
          clauses (<code className="font-mono">{'[[ ... ]]'}</code>) are dropped. Set
          concrete values before importing if the resulting filter should apply.
        </p>
      </div>
    </div>
  );
}
