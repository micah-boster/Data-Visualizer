# Phase 40 Plan 01 — Empirical Confirmation Probes

**Date:** 2026-04-25
**Plan:** 40-01 (API + hook + projection merge)
**Status:** Probes deferred to live-run smoke. RESEARCH defaults applied.

## Probe environment availability

- `SNOWFLAKE_AUTH=externalbrowser` configured in `.env.local`. This auth mode opens
  an interactive browser tab on first connection — incompatible with non-interactive
  scratch-script execution from the agent's CLI context.
- No `npm run query` script exists in `package.json`; the only programmatic Snowflake
  entry point is `executeQuery()` from `@/lib/snowflake/queries.ts`, which would
  require an interactive auth flow on first call.
- Per Plan 01 fallback clause: **"If any probe cannot be run (Snowflake creds
  unavailable), fall back to RESEARCH recommendations"** — applying that now.

## Probe SQL (recorded for live-run smoke verification post-deploy)

When the dev server is running and the user has authed in the browser once, the
following probes can be executed against the live warehouse to confirm the units +
join shape decisions empirically. Plan 02 (chart) should run these as a one-time
smoke before landing the dashed-line render.

### Probe 1 — UNITS (`PROJECTED_FRACTIONAL` scale)

```sql
-- Compare modeled vs actual at month 6 for a known recent bounce_af batch
WITH known_batch AS (
  SELECT PARTNER_NAME, LENDER_ID, BATCH_, TOTAL_AMOUNT_PLACED, COLLECTION_AFTER_6_MONTH
  FROM agg_batch_performance_summary
  WHERE PARTNER_NAME = 'bounce_af'
    AND BATCH_AGE_IN_MONTHS >= 6
  ORDER BY BATCH_AGE_IN_MONTHS DESC
  LIMIT 1
),
modeled AS (
  SELECT c.PROJECTED_FRACTIONAL
  FROM BOUNCE.FINANCE.CURVES_RESULTS c
  JOIN known_batch k
    ON c.LENDER_ID = k.LENDER_ID AND c.BATCH_ = k.BATCH_
  WHERE c.COLLECTION_MONTH = 6
  ORDER BY c.VERSION DESC
  LIMIT 1
)
SELECT
  k.BATCH_,
  k.COLLECTION_AFTER_6_MONTH / NULLIF(k.TOTAL_AMOUNT_PLACED, 0) * 100 AS actual_pct,
  m.PROJECTED_FRACTIONAL AS projected_raw
FROM known_batch k, modeled m;
```

**Decision rule:**
- If `projected_raw` ≈ `actual_pct / 100` (e.g. 0.42 vs 42) → fractional; route multiplies ×100.
- If `projected_raw` ≈ `actual_pct` (e.g. 42 vs 42) → already percentage; no conversion.

### Probe 2 — JOIN SHAPE (`PARTNER_NAME` ↔ `LENDER_ID` cardinality)

```sql
SELECT PARTNER_NAME, COUNT(DISTINCT LENDER_ID) AS lender_count
FROM agg_batch_performance_summary
GROUP BY PARTNER_NAME
ORDER BY lender_count DESC, PARTNER_NAME
LIMIT 20;
```

**Decision rule:**
- If max `lender_count` = 1 → partner-uniform lender lookup is safe.
- If any `lender_count` > 1 → must use per-batch lender lookup (RESEARCH default).

### Probe 3 — `PRICING_TYPE` cardinality per batch

```sql
SELECT LENDER_ID, BATCH_, COUNT(DISTINCT PRICING_TYPE) AS pt_count
FROM BOUNCE.FINANCE.CURVES_RESULTS
GROUP BY 1, 2
ORDER BY pt_count DESC
LIMIT 10;
```

**Decision rule:**
- If max `pt_count` = 1 → simple latest-VERSION-per-pricing JOIN suffices.
- If any `pt_count` > 1 → need a per-(batch, month) ROW_NUMBER tiebreak to dedupe
  cross-pricing rows down to one curve per batch (the RESEARCH-recommended default
  approach in Pattern 1).

## Decisions applied (RESEARCH defaults)

1. **Route multiplies ×100: YES**
   - Rationale: column name `PROJECTED_FRACTIONAL` strongly implies 0..1 scale;
     `recoveryRate` in the app is 0..100 (`reshape-curves.ts:44` formula);
     applying ×100 at the API boundary keeps the client-side `CurvePoint.recoveryRate`
     contract consistent (Pitfall 7).
   - Reversibility: if live probe shows already-percentage units, drop the `* 100`
     in the SQL alias — single-line change in `route.ts`.

2. **lenderId-per-batch lookup (not partner-uniform): YES**
   - Rationale: CONTEXT + Pitfall 1 flag that a single `PARTNER_NAME` may span
     multiple `LENDER_ID`s. Partner-uniform lookup would silently miss projections
     for batches under a non-default lender. Per-batch lookup is correct in both
     1:1 and 1:N partner→lender mappings.
   - Implementation: `usePartnerStats` walks `partnerRows` once to build
     `Map<batchName, lenderId>`, then merges via `${lenderId}||${batchName}` key.

3. **Single-pricing-row dedup via `ROW_NUMBER() OVER (PARTITION BY LENDER_ID,
   BATCH_, COLLECTION_MONTH ORDER BY VERSION DESC)`: YES**
   - Rationale: CONTEXT mentions AF vs CCB pricing variants within the same batch
     can differ. Without a per-(batch, month) tiebreak, cross-pricing rows would
     appear as duplicate month entries on a single batch's modeled line, producing
     "wavy" or doubled visuals (Pitfall 2 warning sign). The `ROW_NUMBER`
     deterministic dedup picks the latest-VERSION row per (LENDER_ID, BATCH_,
     COLLECTION_MONTH) regardless of pricing type. Multi-pricing overlay is a
     v5.0 deferred concern.

## Post-deploy smoke checklist (Plan 02 author)

When the dev server boots with live Snowflake creds:
- [ ] Run Probe 1 in the Snowflake console (or via a one-shot Next.js API debug
      route). Confirm `projected_raw` vs `actual_pct` magnitudes.
- [ ] Run Probe 2. If max `lender_count` > 1 anywhere, the per-batch lookup is
      load-bearing — note in Plan 02 SUMMARY.
- [ ] Run Probe 3. If max `pt_count` > 1, confirm the ROW_NUMBER dedup is producing
      a single curve per batch in the deployed `/api/curves-results` response.
- [ ] If Probe 1 shows already-percentage units, remove `* 100` from
      `src/app/api/curves-results/route.ts` and re-deploy.
