/**
 * Phase 43 BND-05 — `<ChartFrame>` shape-only smoke.
 *
 * jsdom is NOT installed in this project — vitest runs against a node
 * environment for pure-compute tests. We can't actually render the component
 * tree to assert pixels. Instead this file pins the props *contract* via
 * typed expressions: each `state` variant is constructed in a typed
 * expression, and each prop combination is exercised at the type-check
 * level. If anyone changes the props surface in a backward-incompatible way
 * (renames `kind`, drops `staleColumns`, requires `metric`, etc.), `tsc`
 * will flag this file immediately.
 *
 * This file is intentionally NOT a `.test.ts` — vitest's include glob picks
 * up `*.test.ts` and `src/lib/snowflake/*.smoke.ts` only (see
 * vitest.config.ts). Type-checking via `npx tsc --noEmit` IS the smoke;
 * grep for "ChartFrame" in this file proves the contract is exercised.
 *
 * When jsdom (or a server-side React renderer) lands in v5.5 DEBT-09, port
 * this to a runtime test and assert:
 *   1. ready  → children render, no skeleton present
 *   2. loading → skeleton present, children NOT in DOM
 *   3. fetching → children render AND fetching-overlay slot present
 *   4. empty → custom message + suggestion render in centered text
 *   5. error → message + requestId render in error slot
 *   6. staleColumns chip appears with the requested column names
 *   7. polarity defaults via getPolarity(metric) when only metric is passed
 *   8. polarity prop overrides metric-derived polarity
 */

import {
  ChartFrame,
  useChartFramePolarity,
  type ChartFrameProps,
  type ChartFrameState,
} from './chart-frame';
import { getPolarity } from '@/lib/computation/metric-polarity';

/* eslint-disable @typescript-eslint/no-unused-vars */

// --- Case 1: ready state with title + children ---
const _case1: ChartFrameProps = {
  title: 'Recovery Rate',
  state: { kind: 'ready' },
  children: 'chart body',
};

// --- Case 2: loading state ---
const _case2: ChartFrameProps = {
  title: 'Recovery Rate',
  state: { kind: 'loading' },
  children: 'skeleton path renders, children should not appear',
};

// --- Case 3: fetching state — children visible behind overlay ---
const _case3: ChartFrameProps = {
  title: 'Recovery Rate',
  state: { kind: 'fetching' },
  children: 'children stay visible, overlay layered on top',
};

// --- Case 4: empty state with custom message + suggestion ---
const _case4: ChartFrameProps = {
  title: 'Recovery Rate',
  state: {
    kind: 'empty',
    message: 'No batches match these filters.',
    suggestion: 'Clear filters or expand the date range.',
  },
  children: null,
};

// --- Case 5: error state with sanitized message + requestId ---
const _case5: ChartFrameProps = {
  title: 'Recovery Rate',
  state: {
    kind: 'error',
    message: 'Failed to load data. Try again or refresh.',
    requestId: '8f3c1a2b-9c0e-4f5b-9d3e-7a1b2c3d4e5f',
  },
  children: null,
};

// --- Case 6: stale columns chip surfaces flagged columns ---
const _case6: ChartFrameProps = {
  title: 'Recovery Rate',
  state: { kind: 'ready' },
  staleColumns: ['DISPUTE_RATE_OLD', 'CHARGEOFF_OLD'],
  children: 'chart still renders other channels',
};

// --- Case 7: polarity defaults via getPolarity(metric) ---
//   COLLECTION_AFTER_6_MONTH → 'higher_is_better' per the registry.
const _case7: ChartFrameProps = {
  title: 'Recovery Rate',
  metric: 'COLLECTION_AFTER_6_MONTH',
  state: { kind: 'ready' },
  children: 'metric drives polarity context',
};
// Type-level assertion that the registry includes the expected metric. The
// runtime value of getPolarity('COLLECTION_AFTER_6_MONTH') is
// 'higher_is_better' per src/lib/computation/metric-polarity.ts:53; tsc only
// sees the MetricPolarity union return type, so we exercise the call signature
// here rather than narrowing the literal.
const _case7Polarity: 'higher_is_better' | 'lower_is_better' | 'neutral' =
  getPolarity('COLLECTION_AFTER_6_MONTH');

// --- Case 8: explicit polarity overrides metric-derived default ---
//   metric maps to 'higher_is_better' but explicit prop wins.
const _case8: ChartFrameProps = {
  title: 'Dispute Rate',
  metric: 'COLLECTION_AFTER_6_MONTH',
  polarity: 'lower_is_better',
  state: { kind: 'ready' },
  children: 'explicit polarity prop wins over metric-derived default',
};

// --- Case 9: density variants compile cleanly ---
const _density1: ChartFrameProps['density'] = 'compact';
const _density2: ChartFrameProps['density'] = 'comfortable';
const _density3: ChartFrameProps['density'] = 'spacious';

// --- Case 10: state union exhaustiveness check ---
function _exhaust(s: ChartFrameState): string {
  switch (s.kind) {
    case 'ready':
      return 'ready';
    case 'loading':
      return 'loading';
    case 'fetching':
      return 'fetching';
    case 'empty':
      return s.message ?? 'no data';
    case 'error':
      return s.message;
  }
}

// --- Case 11: useChartFramePolarity hook signature ---
function _consumer() {
  const polarity = useChartFramePolarity();
  // Type-level assertion that the hook returns MetricPolarity, not unknown:
  const _ok: 'higher_is_better' | 'lower_is_better' | 'neutral' = polarity;
  return polarity;
}

// --- Case 12: ChartFrame can be used as a React element ---
//   This isn't executed (no jsdom), but tsc verifies the JSX usage typechecks.
function _renderShapeCheck() {
  return (
    <ChartFrame title="" state={{ kind: 'ready' }}>
      {/* empty title collapses the header — sparkline use case */}
      <div>body</div>
    </ChartFrame>
  );
}

/* eslint-enable @typescript-eslint/no-unused-vars */

export {};
