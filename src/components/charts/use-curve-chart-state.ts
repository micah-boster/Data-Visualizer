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
import type { BatchCurve, BatchAnomaly } from "@/types/partner-stats";
import { BATCH_KEY_PREFIX } from "@/components/charts/pivot-curve-data";

/** Maximum number of batches shown by default (before "Show all" toggle). */
const DEFAULT_VISIBLE_LIMIT = 8;

export function useCurveChartState(curves: BatchCurve[], batchAnomalies?: BatchAnomaly[]) {
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

  // --- Anomaly awareness ---

  /** Build a map from batch key to anomaly status for O(1) lookups. */
  const anomalyByKey = useMemo(() => {
    if (!batchAnomalies || batchAnomalies.length === 0) return null;
    const map = new Map<string, BatchAnomaly>();
    sortedCurves.forEach((curve, i) => {
      const anomaly = batchAnomalies.find((b) => b.batchName === curve.batchName);
      if (anomaly?.isFlagged) {
        map.set(`${BATCH_KEY_PREFIX}${i}`, anomaly);
      }
    });
    return map.size > 0 ? map : null;
  }, [sortedCurves, batchAnomalies]);

  /** Whether any anomalous batch exists (drives dimming of others). */
  const hasAnyAnomalies = anomalyByKey !== null;

  /** Check if a specific batch key is anomalous. */
  const isBatchAnomalous = useCallback(
    (batchKey: string): boolean => anomalyByKey?.has(batchKey) ?? false,
    [anomalyByKey],
  );

  /** Get the BatchAnomaly for a key, if flagged. */
  const getBatchAnomaly = useCallback(
    (batchKey: string): BatchAnomaly | undefined => anomalyByKey?.get(batchKey),
    [anomalyByKey],
  );

  /**
   * Line opacity based on solo, recency, AND anomaly state.
   * When anomalies present: anomalous = 1, non-anomalous = 0.3.
   * Solo mode takes precedence over anomaly dimming.
   */
  const getLineOpacity = useCallback(
    (batchKey: string): number => {
      if (soloedBatch !== null) {
        return batchKey === soloedBatch ? 1 : 0.08;
      }
      if (hasAnyAnomalies) {
        return isBatchAnomalous(batchKey) ? 1 : 0.3;
      }
      return batchKey === newestBatchKey ? 1 : 0.5;
    },
    [soloedBatch, newestBatchKey, hasAnyAnomalies, isBatchAnomalous],
  );

  /**
   * Line stroke width: anomalous = 3px, newest = 3px, others = 1.5px.
   */
  const getLineStrokeWidth = useCallback(
    (batchKey: string): number => {
      if (isBatchAnomalous(batchKey)) return 3;
      return batchKey === newestBatchKey ? 3 : 1.5;
    },
    [newestBatchKey, isBatchAnomalous],
  );

  /**
   * Get anomaly-override line color. Returns null for non-anomalous batches
   * (caller should use default chart color). Returns red/amber for flagged.
   */
  const getAnomalyLineColor = useCallback(
    (batchKey: string): string | null => {
      const anomaly = anomalyByKey?.get(batchKey);
      if (!anomaly) return null;
      // critical (4+ flags) = red, warning (2-3 flags) = amber
      return anomaly.flags.length >= 4
        ? "hsl(0, 72%, 51%)"   // red-500
        : "hsl(38, 92%, 50%)"; // amber-500
    },
    [anomalyByKey],
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
    // Anomaly helpers
    hasAnyAnomalies,
    isBatchAnomalous,
    getBatchAnomaly,
    getAnomalyLineColor,
  };
}
