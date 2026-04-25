# Phase 40 — Deferred Items (out-of-scope discoveries)

## 2026-04-25 (Plan 01 execution)

- **Pre-existing TS error in `tests/a11y/baseline-capture.spec.ts:18`** —
  `Cannot find module 'axe-core'`. Out of scope for Plan 01 (no a11y tests
  touched). Likely needs `npm install --save-dev axe-core @types/axe-core` or
  the test file should be dropped if a11y testing was deferred. Track separately.

- **Phase 39 in-progress consumer errors (out of scope for Plan 40-01)** — A
  linter / Phase 39 in-progress change retargeted `usePartnerStats(pair:
  PartnerProductPair, ...)` from `partnerName: string`. The projection merge
  logic landed by Plan 40-01 is preserved unchanged inside the new signature.
  However, downstream consumers were not yet updated and currently fail tsc:
  - `src/components/data-display.tsx:239,1042`
  - `src/components/filters/filter-bar.tsx:25`
  - `src/components/table/data-table.tsx:373`
  - `src/contexts/sidebar-data.tsx:51`

  These errors are caused by the Phase 39 PCFG-03 pair-aware refactor (in-progress
  on disk in `src/lib/partner-config/`, untracked — visible in `git status` at
  Plan 40-01 execution start). Phase 39 owns wiring the consumers; Plan 40-01
  does not touch any of those files. Verified that none of the errors are
  introduced by Plan 40-01 changes (`projection?: CurvePoint[]` is additive-
  optional and the projection merge inside `usePartnerStats` does not touch
  consumer surfaces).

  **Resolution path:** Phase 39 will update the consumers when its plan
  executes. Plan 40-01 considered the typecheck "clean for files Plan 40-01
  modifies" (verified: `partner-stats.ts`, `use-partner-stats.ts`, `route.ts`,
  `curves-results.ts`, `use-curves-results.ts` all pass tsc).

## 2026-04-25 (Plan 02 execution)

- **Same pre-existing Phase 39 consumer errors persist** — `data-display.tsx`,
  `filter-bar.tsx`, `data-table.tsx`, `table-body.tsx`, `unified-toolbar.tsx`,
  `sidebar-data.tsx`. None touch Plan 02 files. Verified that the four files
  modified by Plan 02 (`pivot-curve-data.ts`, `collection-curve-chart.tsx`,
  `curve-tooltip.tsx`, `compose-batch-tooltip-row.ts`) all pass `tsc --noEmit`
  cleanly. The `axe-core` test error is also unchanged from Plan 01.
