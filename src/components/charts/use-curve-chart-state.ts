"use client";

/**
 * Chart interaction state hook for the collection curve chart.
 *
 * Manages: metric toggle, solo mode, batch visibility, average line toggle,
 * show-all toggle. Derives visible batch keys, opacity, and stroke width.
 *
 * The hook sorts curves by ageInMonths ascending (newest = lowest age first)
 * so the newest batch always maps to batch_0 and gets the first chart color.
 */

import { useState, useMemo, useCallback } from "react";
import type { BatchCurve } from "@/types/partner-stats";
import { BATCH_KEY_PREFIX } from "@/components/charts/pivot-curve-data";

/** Maximum number of batches shown by default (before "Show all" toggle). */
const DEFAULT_VISIBLE_LIMIT = 8;

export function useCurveChartState(curves: BatchCurve[]) {
  // --- State ---
  const [metric, setMetric] = useState<"recoveryRate" | "amount">(
    "recoveryRate",
  );
  const [soloedBatch, setSoloedBatch] = useState<string | null>(null);
  const [hiddenBatches, setHiddenBatches] = useState<Set<string>>(
    () => new Set(),
  );
  const [showAverage, setShowAverage] = useState(true);
  const [showAllBatches, setShowAllBatches] = useState(false);

  // --- Derived ---

  /** Curves sorted by ageInMonths ascending (newest first). */
  const sortedCurves = useMemo(
    () => [...curves].sort((a, b) => a.ageInMonths - b.ageInMonths),
    [curves],
  );

  /** Sanitized key of the most recent batch (index 0 after sort). */
  const newestBatchKey = useMemo(
    () => (sortedCurves.length > 0 ? `${BATCH_KEY_PREFIX}0` : ""),
    [sortedCurves],
  );

  /** Keys of the first N batches (before hidden filter) -- used by legend. */
  const defaultVisibleKeys = useMemo(() => {
    const limit = showAllBatches
      ? sortedCurves.length
      : Math.min(DEFAULT_VISIBLE_LIMIT, sortedCurves.length);
    return Array.from({ length: limit }, (_, i) => `${BATCH_KEY_PREFIX}${i}`);
  }, [sortedCurves, showAllBatches]);

  /** Batch keys that should actually render (respects hidden set). */
  const visibleBatchKeys = useMemo(
    () => defaultVisibleKeys.filter((key) => !hiddenBatches.has(key)),
    [defaultVisibleKeys, hiddenBatches],
  );

  // --- Handlers ---

  const toggleMetric = useCallback(() => {
    setMetric((prev) => (prev === "recoveryRate" ? "amount" : "recoveryRate"));
  }, []);

  const handleLineClick = useCallback((batchKey: string) => {
    setSoloedBatch((prev) => (prev === batchKey ? null : batchKey));
  }, []);

  const toggleBatchVisibility = useCallback((batchKey: string) => {
    setHiddenBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchKey)) {
        next.delete(batchKey);
      } else {
        next.add(batchKey);
      }
      return next;
    });
  }, []);

  const toggleAverage = useCallback(() => {
    setShowAverage((prev) => !prev);
  }, []);

  const toggleShowAll = useCallback(() => {
    setShowAllBatches((prev) => !prev);
  }, []);

  // --- Visual helpers ---

  /**
   * Line opacity based on solo and recency state.
   * - Solo mode: soloed = 1, others = 0.08
   * - Normal: newest = 1, others = 0.5
   */
  const getLineOpacity = useCallback(
    (batchKey: string): number => {
      if (soloedBatch !== null) {
        return batchKey === soloedBatch ? 1 : 0.08;
      }
      return batchKey === newestBatchKey ? 1 : 0.5;
    },
    [soloedBatch, newestBatchKey],
  );

  /**
   * Line stroke width: newest = 3px, others = 1.5px.
   */
  const getLineStrokeWidth = useCallback(
    (batchKey: string): number => {
      return batchKey === newestBatchKey ? 3 : 1.5;
    },
    [newestBatchKey],
  );

  return {
    // State
    metric,
    soloedBatch,
    hiddenBatches,
    showAverage,
    showAllBatches,
    // Derived
    sortedCurves,
    newestBatchKey,
    visibleBatchKeys,
    defaultVisibleKeys,
    // Handlers
    toggleMetric,
    handleLineClick,
    toggleBatchVisibility,
    toggleAverage,
    toggleShowAll,
    // Visual helpers
    getLineOpacity,
    getLineStrokeWidth,
  };
}
