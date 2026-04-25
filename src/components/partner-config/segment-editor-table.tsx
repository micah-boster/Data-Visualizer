'use client';

/**
 * SegmentEditorTable — staged-edit table for a pair's segment rules.
 *
 * Forwards an imperative `save()` ref so the parent SetupSheet's footer
 * "Save" button can trigger validation + persistence without prop-drilling
 * the entire draft state.
 *
 * Hydration: when `pair` changes (or the sheet open transitions
 * false→true) the editor reads `usePartnerConfigContext().getConfig(pair)`
 * via the `pairKey` dependency. Cancel discards the staged state simply by
 * closing the sheet — the next open re-hydrates from storage.
 *
 * Validation pipeline (save):
 *   1. Empty fields (name / column / values) → block with sonner error
 *   2. Duplicate names (case-insensitive trim) → block
 *   3. Reserved name 'Other' (case-insensitive trim) → block
 *   4. Overlap warning: if `evaluateSegments(...).overlapRowCount > 0`,
 *      show a banner; first save attempt is blocked, second save attempt
 *      after `forceWarnAccepted = true` proceeds.
 *
 * Type-token discipline (AGENTS.md): only the 6 named tiers in src/.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Plus, AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePartnerConfigContext } from '@/contexts/partner-config';
import type { PartnerProductPair } from '@/lib/partner-config/pair';
import { evaluateSegments } from '@/lib/partner-config/segment-evaluator';
import type { SegmentRule } from '@/lib/partner-config/types';
import { getViableSegmentColumns } from '@/lib/partner-config/viable-columns';

import { OtherBucketRow } from './other-bucket-row';
import { SegmentRow } from './segment-row';

export interface SegmentEditorTableHandle {
  /** Validate + persist staged segments. Returns ok=false on failure. */
  save: () => { ok: boolean; error?: string };
}

export interface SegmentEditorTableProps {
  pair: PartnerProductPair;
  /** Pair-scoped + filter-applied rows. Drives Other coverage + value pickers. */
  pairScopedRows: Array<Record<string, unknown>>;
  /** Bumps when the sheet opens; triggers a fresh hydrate from storage. */
  hydrationKey: number;
}

/**
 * Build a function that returns distinct values for a column from the
 * pair-scoped rows. Memoize a single map and lookup per call so each row's
 * picker reuses the same source-of-truth.
 */
function buildValueOptionsLookup(
  rows: Array<Record<string, unknown>>,
): (column: string) => string[] {
  const cache = new Map<string, string[]>();
  return (column: string) => {
    if (!column) return [];
    const cached = cache.get(column);
    if (cached) return cached;
    const distinct = new Set<string>();
    for (const row of rows) {
      const v = row[column];
      if (v == null) continue;
      const t = typeof v;
      if (t !== 'string' && t !== 'number') continue;
      const coerced = String(v);
      if (!coerced) continue;
      distinct.add(coerced);
    }
    const sorted = [...distinct].sort((a, b) => a.localeCompare(b));
    cache.set(column, sorted);
    return sorted;
  };
}

export const SegmentEditorTable = forwardRef<
  SegmentEditorTableHandle,
  SegmentEditorTableProps
>(function SegmentEditorTable(
  { pair, pairScopedRows, hydrationKey },
  ref,
) {
  const { getConfig, upsertSegments } = usePartnerConfigContext();

  // Staged segment state. Initialized from storage and re-hydrated on
  // hydrationKey bump (parent signals a fresh open transition).
  const [draftSegments, setDraftSegments] = useState<SegmentRule[]>(() => {
    return getConfig(pair)?.segments ?? [];
  });

  // forceWarnAccepted lets a second save attempt bypass the overlap warning
  // banner. Reset on every hydrate so a stale acceptance can't leak across
  // sheet opens.
  const [forceWarnAccepted, setForceWarnAccepted] = useState(false);
  const [showOverlapBanner, setShowOverlapBanner] = useState(false);

  // hydrationKey + pair identity drive a fresh read from storage.
  // We intentionally exclude `getConfig` from the dep list — it's a stable
  // hook callback but recomputes on `configs` changes; including it would
  // re-hydrate mid-edit when the user is partway through staging changes.
  useEffect(() => {
    setDraftSegments(getConfig(pair)?.segments ?? []);
    setForceWarnAccepted(false);
    setShowOverlapBanner(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationKey, pair.partner, pair.product]);

  const viableColumns = useMemo(
    () => getViableSegmentColumns(pairScopedRows),
    [pairScopedRows],
  );

  const valueOptionsLookup = useMemo(
    () => buildValueOptionsLookup(pairScopedRows),
    [pairScopedRows],
  );

  // Lifted handlers — the parent forwards-ref save() needs access to the
  // current draftSegments via a ref so we don't recompute the imperative
  // handle on every state tick.
  const draftRef = useRef<SegmentRule[]>(draftSegments);
  draftRef.current = draftSegments;

  const updateSegment = useCallback((next: SegmentRule) => {
    setDraftSegments((prev) =>
      prev.map((s) => (s.id === next.id ? next : s)),
    );
    setShowOverlapBanner(false);
    setForceWarnAccepted(false);
  }, []);

  const moveSegment = useCallback((index: number, direction: -1 | 1) => {
    setDraftSegments((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const deleteSegment = useCallback((id: string) => {
    setDraftSegments((prev) => prev.filter((s) => s.id !== id));
    setShowOverlapBanner(false);
    setForceWarnAccepted(false);
  }, []);

  const addSegment = useCallback(() => {
    setDraftSegments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        column: '',
        values: [],
      },
    ]);
  }, []);

  // Imperative save — invoked by parent SetupSheet's footer button.
  useImperativeHandle(
    ref,
    () => ({
      save(): { ok: boolean; error?: string } {
        const draft = draftRef.current;

        // 1. Empty fields
        for (const s of draft) {
          if (!s.name.trim() || !s.column || s.values.length === 0) {
            return {
              ok: false,
              error:
                'Every segment needs a name, a column, and at least one value.',
            };
          }
        }

        // 2. Duplicate names (case-insensitive trim)
        const seenNames = new Set<string>();
        for (const s of draft) {
          const key = s.name.trim().toLowerCase();
          if (seenNames.has(key)) {
            return {
              ok: false,
              error: 'Segment names must be unique within a pair.',
            };
          }
          seenNames.add(key);
        }

        // 3. Reserved name 'Other'
        for (const s of draft) {
          if (s.name.trim().toLowerCase() === 'other') {
            return {
              ok: false,
              error:
                "'Other' is reserved — the app generates it automatically for uncovered rows.",
            };
          }
        }

        // 4. Overlap warning — first hit blocks; second hit (after user
        //    confirms via the inline banner button) proceeds.
        const { overlapRowCount } = evaluateSegments(pairScopedRows, draft);
        if (overlapRowCount > 0 && !forceWarnAccepted) {
          setShowOverlapBanner(true);
          return {
            ok: false,
            error: `${overlapRowCount} row${
              overlapRowCount === 1 ? '' : 's'
            } match multiple segments — confirm to save anyway.`,
          };
        }

        // Persist + hide banner.
        upsertSegments(pair, draft);
        setShowOverlapBanner(false);
        setForceWarnAccepted(false);
        return { ok: true };
      },
    }),
    [pair, pairScopedRows, upsertSegments, forceWarnAccepted],
  );

  return (
    <div className="flex flex-col gap-stack">
      {/* Empty-state alert when no viable columns exist. Setup still
          renders — scaffold-now-empty-state-until-ETL-lands per Plan 01
          resolution. */}
      {viableColumns.length === 0 && (
        <Alert>
          <AlertTitle className="text-title">
            No viable segmenting columns yet
          </AlertTitle>
          <AlertDescription className="text-body text-muted-foreground">
            This pair&rsquo;s dataset has no plausible segmenting columns
            today. The Setup panel is available so segments can be configured
            once additional columns (language, bank subsidiary, sub-cohort,
            etc.) land in the source data.
          </AlertDescription>
        </Alert>
      )}

      {/* Overlap warning banner — visible after a save attempt with overlapping
          value-sets. Confirm flips forceWarnAccepted so the next save bypasses
          the check. */}
      {showOverlapBanner && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle className="text-title">
            Segments overlap
          </AlertTitle>
          <AlertDescription className="text-body">
            Some rows match more than one segment. Segments should be
            mutually exclusive. Save anyway?
            <div className="mt-stack flex gap-inline">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOverlapBanner(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setForceWarnAccepted(true);
                  setShowOverlapBanner(false);
                }}
              >
                Confirm and save anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header row */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-inline px-card-padding py-stack border-b">
        <span className="text-label text-muted-foreground uppercase">Name</span>
        <span className="text-label text-muted-foreground uppercase">
          Column
        </span>
        <span className="text-label text-muted-foreground uppercase">
          Values
        </span>
        <span className="text-label text-muted-foreground uppercase">
          Order
        </span>
        <span aria-hidden="true" />
      </div>

      {/* Segment rows */}
      {draftSegments.length === 0 ? (
        <div className="px-card-padding py-card-padding text-caption text-muted-foreground text-center">
          No segments yet. Click &ldquo;Add segment&rdquo; below to create one.
        </div>
      ) : (
        <div>
          {draftSegments.map((s, i) => (
            <SegmentRow
              key={s.id}
              segment={s}
              availableColumns={viableColumns}
              valueOptionsForColumn={valueOptionsLookup}
              index={i}
              total={draftSegments.length}
              onChange={updateSegment}
              onMoveUp={() => moveSegment(i, -1)}
              onMoveDown={() => moveSegment(i, 1)}
              onDelete={() => deleteSegment(s.id)}
            />
          ))}
        </div>
      )}

      {/* Add segment + Other bucket — Other is always visible. */}
      <div className="px-card-padding">
        <Button variant="outline" size="sm" onClick={addSegment}>
          <Plus className="h-4 w-4" />
          <span>Add segment</span>
        </Button>
      </div>

      <OtherBucketRow
        pairScopedRows={pairScopedRows}
        segments={draftSegments}
      />
    </div>
  );
});
