# Polarity Audit (DCR-09)

**Status:** Active. Established Phase 41-03 (2026-04-27).
**Cross-references:** `src/lib/computation/metric-polarity.ts` (registry), `docs/AGGREGATION-CONTRACT.md` (Phase 41-01), Phase 43 BND-05 `<ChartFrame>` polarity prop.

## Why this exists

A metric's "good direction" is metric-dependent: collection rates, recovery rates, and penetration rates are all `higher_is_better`, but `DISPUTE_RATE` is `lower_is_better`. Before this audit, every place that colored a metric by direction (heatmap diverging palette, comparison-matrix bar coloring, sparkline tints, KPI delta arrows) inherited a silent "higher = good" assumption from the codebase's collection-rate origins. As soon as a `lower_is_better` metric (`DISPUTE_RATE` today; v5.0 may add `CHARGE_OFF_RATE`, `COMPLAINT_RATE`) hits one of those surfaces, the color flips its meaning — green looks like good performance when it's actually bad.

This doc enumerates every directional-color surface, its polarity wiring before and after this plan, and the registry that governs it.

## The registry

Source of truth: `src/lib/computation/metric-polarity.ts` `POLARITY_REGISTRY`.

Every metric that displays with directional color **MUST** be registered. Default fallback is `higher_is_better` (the dominant direction in this domain), but unregistered metrics in directional-color contexts emit a dev-mode console warning via `getPolarityWithAuditWarning`.

### Three polarities

| Polarity | Meaning | Color rule |
|----------|---------|-----------|
| `higher_is_better` | Up = good | Positive delta → success tint; high values → "good end" of diverging palette |
| `lower_is_better` | Down = good | Negative delta → success tint; low values → "good end" of diverging palette (palette inverts) |
| `neutral` | No inherent direction | Direction tint suppressed; diverging palette flattens to mid tier |

### Currently registered

| Metric | Polarity | Surfaces consuming this metric |
|--------|----------|-------------------------------|
| `COLLECTION_AFTER_3_MONTH` | higher_is_better | KPI cards, modeled-delta cell, anomaly, trending |
| `COLLECTION_AFTER_6_MONTH` | higher_is_better | KPI cards, heatmap, matrix, sparkline (forward dep), modeled-delta, anomaly, trending |
| `COLLECTION_AFTER_12_MONTH` | higher_is_better | KPI cards, heatmap, matrix, modeled-delta, anomaly, trending |
| `PENETRATION_RATE_POSSIBLE_AND_CONFIRMED` | higher_is_better | KPI cards, table footer (avgWeighted), heatmap, matrix |
| `PENETRATION_RATE_CONFIRMED_ONLY` | higher_is_better | table footer, heatmap (column-picker only) |
| `PENETRATION_RATE_POSSIBLE_ONLY` | higher_is_better | table footer (column-picker only) |
| `RAITO_FIRST_TIME_CONVERTED_ACCOUNTS` | higher_is_better | anomaly (existing column key) |
| `SMS_OPEN_RATE` | higher_is_better | rate-shaped nullable (DCR-08) — anomaly when registered |
| `SMS_CLICK_RATE` | higher_is_better | (same) |
| `EMAIL_OPEN_RATE` | higher_is_better | (same) |
| `EMAIL_CLICK_RATE` | higher_is_better | (same) |
| `CALL_CONNECT_RATE` | higher_is_better | (same) |
| `CALL_RPC_RATE` | higher_is_better | (same) |
| `OUTBOUND_SMS_OPEN_RATE_FROM_DELIVERED` | higher_is_better | anomaly ANOMALY_METRICS (existing Snowflake column) |
| `OUTBOUND_SMS_CLICK_RATE_FROM_OPENED` | higher_is_better | (same) |
| `OUTBOUND_EMAIL_OPEN_RATE_FROM_DELIVERED` | higher_is_better | (same) |
| `OUTBOUND_EMAIL_CLICK_RATE_FROM_OPENED` | higher_is_better | (same) |
| `OUTBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED` | higher_is_better | (same) |
| `INBOUND_PHONE_VERIFY_RATE_FROM_ANSWERED` | higher_is_better | (same) |
| `TOTAL_ACCOUNTS_WITH_PAYMENT` | higher_is_better | diagnostic (count flow) |
| `TOTAL_ACCOUNTS_WITH_PLANS` | higher_is_better | diagnostic (count flow) |
| `AVG_EXPERIAN_CA_SCORE` | higher_is_better | diagnostic (better credit → more collectible) |
| **`DISPUTE_RATE`** | **lower_is_better** | rate-shaped nullable; the canonical lower_is_better rate today |
| `AVG_AMOUNT_PLACED` | lower_is_better | diagnostic — smaller balances are easier to collect at portfolio level |
| `TOTAL_AMOUNT_PLACED` | neutral | volume — no inherent direction (placed is exogenous to the partner) |
| `TOTAL_COLLECTED_LIFE_TIME` | neutral | matrix (currency tile) — magnitude is meaningful but direction depends on placed denominator |
| `TOTAL_ACCOUNTS` | neutral | KPI identity card — count, no direction |
| `TOTAL_CONVERTED_ACCOUNTS` | neutral | count |
| `__BATCH_COUNT` | neutral | sentinel virtual column |

### Adding new metrics

When a new column lands in Snowflake / `agg_batch_performance_summary`:

1. Decide if it ships with directional color anywhere (heatmap? sparkline? KPI delta? modeled-delta cell?). If yes, registration is required.
2. Pick the polarity:
   - **higher_is_better** — collection, recovery, engagement, penetration rates; better credit scores; more accounts on plans
   - **lower_is_better** — dispute, charge-off, complaint, churn rates; smaller average balance (easier to collect)
   - **neutral** — counts, dollar volumes, raw scalars where direction depends on benchmark
3. Add to `POLARITY_REGISTRY` in `src/lib/computation/metric-polarity.ts`.
4. Update this doc (registry table + relevant surface row).
5. If the new metric appears on a directional-color surface that does not yet take a `metric` prop, add the prop and route through `getPolarityWithAuditWarning`.

## Surface audit

| Surface | File | Status (pre-Phase 41-03) | Status (post-Phase 41-03) | Notes |
|---------|------|--------------------------|---------------------------|-------|
| Anomaly z-score direction | `src/lib/computation/compute-anomalies.ts` | ✅ Already polarity-aware | ✅ Verified correct | Pre-existing — pinned by anomaly-detection logic; uses `getPolarity(metric)` |
| Trending delta arrow | `src/components/table/trend-indicator.tsx` | ✅ Already polarity-aware | ✅ Verified correct | `getPolarity(trend.metric)` |
| KPI delta arrow | `src/components/patterns/stat-card.tsx` | ✅ Already polarity-aware | ✅ Verified correct | `getPolarity(trend.metric)` at line 133 |
| Modeled-vs-actual delta cell | `src/components/table/modeled-delta-cell.tsx` | ✅ Already polarity-aware | ✅ Verified correct | Phase 40.1 — `getPolarity(metricKey)` |
| Tooltip row delta tint (chart) | `src/components/charts/compose-batch-tooltip-row.ts` | ✅ Already polarity-aware | ✅ Verified correct | Phase 40-02 — `getPolarity(metric)` for emerald/red delta |
| **Heatmap diverging palette** | `src/components/cross-partner/matrix-heatmap.tsx` | ❌ Polarity-blind | 🔧 Routed through `polarityForMatrixMetric` | Inverts via `polarityAwarePercentile` for `lower_is_better`; flattens to mid-tier for `neutral` |
| **Matrix bar-ranking direction** | `src/components/cross-partner/matrix-bar-ranking.tsx` | ❌ Polarity-blind | 🔧 Routed through `polarityForMatrixMetric` | Asc vs desc sort by polarity (`lower_is_better` flips comparator sign) |
| **Comparison-matrix shell (sort default)** | `src/components/cross-partner/comparison-matrix.tsx` | ❌ Polarity-blind | 🔧 Routed through `polarityForMatrixMetric` | Default sort direction on metric switch is polarity-aware (best partner first) |
| **Sparkline scaffold** | `src/components/charts/chart-sparkline.tsx`, `partner-sparkline.tsx`, `root-sparkline.tsx` | ❌ Polarity-blind | 🔧 Audit hook wired (`getPolarityWithAuditWarning`) | Current rotational palette ignores polarity; metric prop accepts `COLLECTION_AFTER_6_MONTH` for forward compatibility with Phase 43 BND-05 single-line trend tint mode |
| KPI summary cards (cards) | `src/components/kpi/kpi-summary-cards.tsx` | ✅ Inherits from StatCard | ✅ Verified end-to-end | Every `<StatCard>` passes a registered Snowflake metric key (`COLLECTION_AFTER_*_MONTH`); StatCard's `getPolarity(trend.metric)` resolves correctly |

**Legend:** ✅ verified correct (pre-existing), 🔧 fixed in Phase 41-03, ❌ polarity-blind (pre-fix state), ⏭️ deferred.

## Codebase audit findings (Phase 41-03 sweep)

**Search 1:** `grep -rn "delta > 0\\|delta < 0\\|increased\\|decreased" src/components/ src/lib/`
- **Result:** 0 matches.
- **Interpretation:** No code path encodes "value direction" via raw scalar comparisons against zero outside the polarity-aware delta cell logic. The pattern in this codebase is to pre-classify direction as `'up' | 'down' | 'flat'` upstream (in `computeTrending` / `computeModeledDelta`) and let polarity-aware consumers tint the result.

**Search 2:** `grep -rn "direction === 'up'\\|direction === 'down'" src/`
- **Result:** 5 hits across 3 files: `stat-card.tsx`, `modeled-delta-cell.tsx`, `trend-indicator.tsx`. All three are pre-existing polarity-aware callsites that consult `getPolarity(metric)` and combine direction with polarity to pick `text-success-fg` vs `text-error-fg`. No fixes needed — this is the canonical pattern.

**Search 3:** `grep -rn "text-success\\|text-error" src/components/ --include="*.tsx"`
- **Result:** Hits split into two categories:
  - **Polarity-relevant (already correct):** `stat-card.tsx`, `modeled-delta-cell.tsx`, `trend-indicator.tsx` — all route through `getPolarity`.
  - **Polarity-irrelevant (semantic state, not value direction):** `empty-state.tsx`, `metabase-import/preview-row.tsx`, `metabase-import/preview-step.tsx`, `partner-lists/create-list-dialog.tsx`, `tokens/type-specimen.tsx`. These render success/error state for non-metric concerns (form validation, import preview row status, token specimen demo). No polarity wiring needed — they are not "metric value direction" surfaces.

**Conclusion:** No additional polarity-blind surfaces discovered during the sweep. The pre-Phase 41-03 inventory was accurate; the only fixes needed were the four cross-partner / sparkline rows above.

## Deferred

| Surface | Why deferred | Owning phase / next step |
|---------|--------------|--------------------------|
| `<ChartFrame>` polarity prop | Primitive doesn't exist yet | Phase 43 BND-05 — consumes the registry |
| GenericChart Recharts series colors | Series-color palette is rotational (one hue per series), not value-direction; revisit when ChartFrame consolidates chart shells | Phase 43 BND-05 |
| Sparkline single-line trend-tint mode | Today the sparkline is multi-line rotational palette (per-batch / per-partner curves). Single-line trend-tint variant (delta first→last, polarity-tinted) is a Phase 43 BND-05 pattern. The metric prop ships now to surface unregistered metrics via the audit hook | Phase 43 BND-05 |
| Trajectory-chart "best in class" overlay | Already uses portfolio-avg as the comparator; polarity is implicit (best = furthest from avg in the polarity-good direction). Revisit if v5.0 introduces lower_is_better metrics on the trajectory view | Future (v5.0 Phase 49 trajectory rework) |
| Account-level table conditional formatting | Account-level audit out of scope for v4.5 (CONTEXT § Domain — root → partner → (partner, product) → batch) | v5.5+ |
| Comparison-matrix "best in class" badge / explicit per-row Math.max calls | Spot-check showed comparison-matrix uses `getPercentile()` from `MatrixMetric` definitions (already polarity-corrected via `polarityAwarePercentile` upstream) — no inline `Math.max` / `Math.min` value comparators bypassing polarity. No additional fix needed; if a future "winner badge" lands, route it through `polarityForMatrixMetric` | N/A — verified clean |

## Open questions surfaced during audit

- **Q:** Should `TOTAL_COLLECTED_LIFE_TIME` be `higher_is_better` (more collected = better) or `neutral` (depends on placed denominator)?
  **Decision (Phase 41-03):** `neutral` — magnitude alone is not a quality judgment; the collection RATE is. KPI cards already display the rate, not the raw collected dollars, so the user already gets the polarity-meaningful surface. The matrix currency tile uses neutral coloring (mid-tier) which correctly avoids judging "Partner A collected $5M, Partner B collected $1M" as good/bad without context.

- **Q:** What about computed deltas like "modeled - actual"?
  **Decision (Phase 40-02 precedent, re-affirmed Phase 41-03):** the delta inherits the underlying metric's polarity — beating modeled on a `higher_is_better` metric is good (positive delta direction = success tint), beating modeled on a `lower_is_better` metric is also good (i.e., lower than modeled on dispute rate = success tint). `modeled-delta-cell.tsx` and `compose-batch-tooltip-row.ts` both implement this correctly.

- **Q:** Is `AVG_AMOUNT_PLACED` actually `lower_is_better`? Doesn't placing more money mean the partner does more business?
  **Decision (Phase 41-03, preserving pre-existing classification):** `AVG_AMOUNT_PLACED` is `lower_is_better` because the metric measures **average per-account balance**, not total placed volume. Smaller balances are easier to collect on at the portfolio level (collection rate scales inversely with average balance size). Total placed volume (`TOTAL_AMOUNT_PLACED`) is `neutral` — that's the volume metric. The pre-existing smoke-test contract (Phase 14 anomaly tests) depends on this classification; flipping it would regress.

- **Q:** Should the registry require canonical Snowflake column keys only, or also accept internal aliases (`recoveryRate`, `disputeRate`, `perDollarPlacedRate`)?
  **Decision (Phase 41-03):** Snowflake column keys are the canonical registry keys. Internal aliases without a 1:1 Snowflake mapping (e.g., `perDollarPlacedRate` is a derived rate computed from two columns) should map to the underlying Snowflake column whose business polarity governs the derived rate. See `matrix-types.ts:67` — `perDollarPlacedRate` registers `metricKey: 'COLLECTION_AFTER_12_MONTH'` because the derived per-dollar rate inherits the same `higher_is_better` direction. This avoids registry sprawl and keeps Snowflake columns as the single source of truth.

## Phase 43 BND-05 forward dependency

When `<ChartFrame>` ships (Phase 43 BND-05), it will require a `polarity` prop on color-encoded metric channels. The current registry is the source of truth — `<ChartFrame>` consumers pass the metric key, and `<ChartFrame>` internally calls `getPolarity(metric)` (or `getPolarityWithAuditWarning(metric)` in dev) to resolve the prop. No new API surface required; **this audit's registry IS the API surface**.

The sparkline scaffold (Phase 41-03) already accepts a `metric` prop and runs the audit hook. When BND-05 lands, the sparkline's single-line trend-tint mode reads `getPolarity(metric)` directly — zero migration cost.

## Reference: helper APIs

```typescript
// src/lib/computation/metric-polarity.ts

// Stable callsites (pass canonical Snowflake keys) — no console noise
getPolarity(metric: string): MetricPolarity

// Newly-touched directional-color surfaces — surfaces unregistered metrics in dev
getPolarityWithAuditWarning(metric: string): MetricPolarity

// Used by audit doc to verify coverage
isPolarityRegistered(metric: string): boolean
```

```typescript
// src/components/cross-partner/matrix-types.ts

// Polarity-aware percentile transform (1 - p for lower_is_better; 0.5 for neutral)
polarityAwarePercentile(percentile: number, polarity: MetricPolarity): number

// Convenience: look up polarity for a MatrixMetric definition (with audit warning)
polarityForMatrixMetric(metric: MatrixMetric): MetricPolarity
```

---

_Created: Phase 41-03 (DCR-09), 2026-04-27. Living doc — update when adding metrics to the registry or auditing new surfaces. Cross-references: `src/lib/computation/metric-polarity.ts` (registry), Phase 43 BND-05 (ChartFrame polarity prop consumer), Phase 41-04 ADR-007 (penetration weighting cites this doc), Phase 41-05 audit (verifies polarity coloring on visual surfaces)._
